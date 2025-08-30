import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { storage } from "./storage";
import { isAdmin, passport } from "./auth";
import { insertPostSchema, insertActionSchema, insertVoteSchema, actions, users } from "@shared/schema";
import { z } from "zod";
import { db } from "./db";
import bcrypt from 'bcrypt';
import { eq } from "drizzle-orm";
import { v2 as cloudinary } from 'cloudinary';
import { nanoid } from 'nanoid';

// Allowed image mime types and extension mapping
const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
]);
const MIME_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
};

// Cloudinary configuration (set CLOUDINARY_* env vars in Render)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME as string,
  api_key: process.env.CLOUDINARY_API_KEY as string,
  api_secret: process.env.CLOUDINARY_API_SECRET as string,
  secure: true,
});

// Configure multer for image uploads (memory storage; upload buffer to Cloudinary)
// Disk path kept for reference but not used on Render Free
// const uploadDir = path.resolve(import.meta.dirname, '..', 'uploads', 'images');
const storageEngine = multer.memoryStorage();

const upload = multer({
  storage: storageEngine,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype && ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPG, PNG, GIF, or WEBP image files are allowed'));
    }
  },
});

// Helper functions to get accurate client IP behind proxies/CDNs
function normalizeIP(ip: string | undefined): string {
  if (!ip) return '127.0.0.1';
  // Normalize IPv6-mapped IPv4 and loopback
  if (ip.startsWith('::ffff:')) ip = ip.substring(7);
  if (ip === '::1') return '127.0.0.1';
  return ip;
}

function getClientIP(req: any): string {
  // Prefer Cloudflare and reverse proxy headers
  const cfIp = (req.headers['cf-connecting-ip'] as string | undefined)?.trim();
  if (cfIp) return normalizeIP(cfIp);

  const realIp = (req.headers['x-real-ip'] as string | undefined)?.trim();
  if (realIp) return normalizeIP(realIp);

  // Express trust proxy aware parsing
  if (Array.isArray(req.ips) && req.ips.length > 0) {
    return normalizeIP(req.ips[0]);
  }
  if (req.ip) {
    return normalizeIP(req.ip as string);
  }

  // Fallback to X-Forwarded-For (first entry is original client)
  const xffFirst = (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim();
  if (xffFirst) return normalizeIP(xffFirst);

  // Lowest-level socket addresses
  return normalizeIP(req.connection?.remoteAddress || req.socket?.remoteAddress);
}

// Basic cookie parsing without external middleware
function parseCookies(req: any): Record<string, string> {
  const header = (req.headers['cookie'] as string | undefined) || '';
  const out: Record<string, string> = {};
  header.split(';').forEach(part => {
    const [k, ...v] = part.trim().split('=');
    if (k) out[k] = decodeURIComponent(v.join('='));
  });
  return out;
}

function getOrSetDeviceId(req: any, res: any): string {
  const cookies = parseCookies(req);
  let deviceId = cookies['device_id'];
  if (!deviceId) {
    deviceId = nanoid(21);
    const isProd = (process.env.NODE_ENV || 'production') !== 'development';
    // Set long-lived httpOnly cookie
    res.cookie('device_id', deviceId, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProd,
      maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
      path: '/',
    });
  }
  return deviceId;
}

// Verify Google reCAPTCHA v3 token
async function verifyRecaptcha(token: string, ip: string): Promise<boolean> {
  const secret = process.env.RECAPTCHA_SECRET_KEY as string | undefined;
  if (!secret) {
    console.error('RECAPTCHA_SECRET_KEY is not set');
    return false;
  }
  try {
    const params = new URLSearchParams();
    params.append('secret', secret);
    params.append('response', token);
    if (ip) params.append('remoteip', ip);

    const resp = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    const data = await resp.json();
    if (!data.success) return false;
    // If v3 returns score, enforce a minimal threshold
    if (typeof data.score === 'number' && data.score < 0.5) return false;
    return true;
  } catch (e) {
    console.error('reCAPTCHA verify error:', e);
    return false;
  }
}

// Get absolute origin (supports proxies)
function getRequestOrigin(req: any): string {
  const xfProto = (req.headers['x-forwarded-proto'] || '').toString().split(',')[0].trim();
  const xfHost = (req.headers['x-forwarded-host'] || '').toString().split(',')[0].trim();
  const proto = xfProto || req.protocol;
  const host = xfHost || req.get('host');
  return `${proto}://${host}`;
}

// Simple image upload handler returning public URL for saved file (Cloudinary)
async function uploadImage(file: Express.Multer.File): Promise<string> {
  return await new Promise((resolve, reject) => {
    const upload = cloudinary.uploader.upload_stream(
      { folder: 'celebrity-voting', resource_type: 'image' },
      (err, result) => {
        if (err || !result) return reject(err || new Error('Cloudinary upload failed'));
        resolve(result.secure_url);
      }
    );
    upload.end(file.buffer);
  });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // No auto-auth middleware; use session-based auth

  // Initialize default actions
  const initializeDefaultActions = async () => {
    try {
      const defaultActions = ['slap', 'hug', 'kiss', 'love', 'hate'];
      const existingActions = await storage.getActions(true);
      const existingNames = existingActions.map(a => a.name);
      
      for (const actionName of defaultActions) {
        if (!existingNames.includes(actionName)) {
          await db.insert(actions).values({
            name: actionName,
            approved: true,
            isDefault: true,
          });
        }
      }
    } catch (error) {
      console.error('Failed to initialize default actions:', error);
    }
  };

  // Initialize default actions on startup
  await initializeDefaultActions();

  // Auth routes
  // Simple admin login endpoint
  app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    console.log('Login attempt:', email);

    try {
      // Fetch admin user from the database
      const [adminUser] = await db.select().from(users).where(eq(users.email, email));

      if (!adminUser) {
        console.log('Login failed: User not found');
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, adminUser.passwordHash);
      if (!isPasswordValid) {
        console.log('Login failed: Invalid password');
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Create session user object
      const sessionUser = {
        id: adminUser.id,
        email: adminUser.email,
        isAdmin: !!adminUser.isAdmin, // Ensure boolean type
      };

      console.log('Admin user fetched from database:', adminUser);
      console.log('Password verification result:', isPasswordValid);
      console.log('Session user object:', sessionUser);

      // Store in session
      req.session.user = sessionUser;
      await req.session.save();

      console.log('Login successful:', sessionUser);
      console.log('Session after login:', req.session);
      return res.json({ success: true, user: sessionUser });
    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }); // Close the login route

  app.get('/api/auth/user', (req: any, res) => {
    try {
      const user = (req.session as any).user;
      if (!user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      console.log('Session data:', req.session);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.post('/api/auth/logout', (req: any, res) => {
    req.logout((err: any) => {
      if (err) {
        return res.status(500).json({ message: 'Failed to logout' });
      }
      res.json({ message: 'Logged out successfully' });
    });
  });

  // Public endpoints

  // Get approved posts with vote counts
  app.get('/api/posts', async (req, res) => {
    try {
      const { category, limit = '20', offset = '0', sort = 'recent', action } = req.query;
      const posts = await storage.getPosts(
        'approved',
        category as string,
        parseInt(limit as string),
        parseInt(offset as string),
        action as string,
        sort as string
      );
      
      // Get vote counts for each post
      const postsWithVotes = await Promise.all(
        posts.map(async (post) => {
          const voteCounts = await storage.getPostVotes(post.id);
          const votes = voteCounts.reduce((acc, vc) => {
            acc[vc.action.name] = Number(vc.count);
            return acc;
          }, {} as Record<string, number>);
          
          const totalVotes = Object.values(votes).reduce((sum, count) => sum + count, 0);
          
          return {
            ...post,
            votes,
            totalVotes,
          };
        })
      );

      res.json(postsWithVotes);
    } catch (error) {
      console.error('Error fetching posts:', error);
      res.status(500).json({ message: 'Failed to fetch posts' });
    }
  });

  // Submit new post
  app.post('/api/posts', upload.single('image'), async (req, res) => {
    try {
      const ipAddress = getClientIP(req);
      
      // Rate limiting check
      const canPost = await storage.checkRateLimit(ipAddress, 'post', 5, 60); // 5 posts per hour
      if (!canPost) {
        return res.status(429).json({ message: 'Rate limit exceeded. Please try again later.' });
      }

      const { name, category } = req.body;
      
      // Validate input
      const validatedData = insertPostSchema.parse({
        name,
        category,
        imageUrl: 'placeholder', // Will be replaced after image upload
      });

      if (!req.file) {
        return res.status(400).json({ message: 'Image is required' });
      }

      const imageUrl = await uploadImage(req.file);

      const post = await storage.createPost({
        ...validatedData,
        imageUrl,
      });

      await storage.incrementRateLimit(ipAddress, 'post');

      res.status(201).json(post);
    } catch (error) {
      console.error('Error creating post:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Validation error', errors: error.errors });
      } else {
        res.status(500).json({ message: 'Failed to create post' });
      }
    }
  });

  // Get approved actions
  app.get('/api/actions', async (req, res) => {
    try {
      const actions = await storage.getActions(true);
      res.json(actions);
    } catch (error) {
      console.error('Error fetching actions:', error);
      res.status(500).json({ message: 'Failed to fetch actions' });
    }
  });

  // Vote on a post action
  app.post('/api/vote/:actionId', async (req, res) => {
    try {
      const { actionId } = req.params;
      const { postId, captchaToken } = req.body;
      const ipAddress = getClientIP(req);
      const deviceId = getOrSetDeviceId(req, res);

      if (!captchaToken) {
        return res.status(400).json({ message: 'Missing captcha token' });
      }
      const captchaOk = await verifyRecaptcha(captchaToken, ipAddress);
      if (!captchaOk) {
        return res.status(403).json({ message: 'Captcha verification failed' });
      }

      // Allow repeated votes: no toggling, no rate limiting

      // Validate post and action exist
      const post = await storage.getPostById(postId);
      const action = await storage.getActionById(actionId);

      if (!post || post.status !== 'approved') {
        return res.status(404).json({ message: 'Post not found or not approved' });
      }

      if (!action || !action.approved) {
        return res.status(404).json({ message: 'Action not found or not approved' });
      }

      const vote = await storage.createVote({
        postId,
        actionId,
        ipAddress,
        deviceId,
      });

      res.status(201).json(vote);
    } catch (error) {
      console.error('Error creating vote:', error);
      res.status(500).json({ message: 'Failed to create vote' });
    }
  });

  // Search posts
  app.get('/api/search', async (req, res) => {
    try {
      const { q: query, category } = req.query;
      
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ message: 'Search query is required' });
      }

      const posts = await storage.searchPosts(query, category as string);
      
      // Get vote counts for each post
      const postsWithVotes = await Promise.all(
        posts.map(async (post) => {
          const voteCounts = await storage.getPostVotes(post.id);
          const votes = voteCounts.reduce((acc, vc) => {
            acc[vc.action.name] = Number(vc.count);
            return acc;
          }, {} as Record<string, number>);
          
          const totalVotes = Object.values(votes).reduce((sum, count) => sum + count, 0);
          
          return {
            ...post,
            votes,
            totalVotes,
          };
        })
      );

      res.json(postsWithVotes);
    } catch (error) {
      console.error('Error searching posts:', error);
      res.status(500).json({ message: 'Failed to search posts' });
    }
  });

  // Get leaderboard
  app.get('/api/leaderboard', async (req, res) => {
    try {
      const { action: actionName = 'love', limit = '10' } = req.query;
      
      // Get action by name
      const actions = await storage.getActions(true);
      const action = actions.find(a => a.name === actionName);
      
      if (!action) {
        return res.status(404).json({ message: 'Action not found' });
      }

      const leaderboard = await storage.getLeaderboard(action.id, parseInt(limit as string));
      res.json(leaderboard);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      res.status(500).json({ message: 'Failed to fetch leaderboard' });
    }
  });

  // Get trending posts
  app.get('/api/trending', async (req, res) => {
    try {
      const { hours = '24', limit = '10' } = req.query;
      const trending = await storage.getTrendingPosts(parseInt(hours as string), parseInt(limit as string));
      res.json(trending);
    } catch (error) {
      console.error('Error fetching trending posts:', error);
      res.status(500).json({ message: 'Failed to fetch trending posts' });
    }
  });

  // Suggest new action
  app.post('/api/actions', async (req, res) => {
    try {
      const ipAddress = getClientIP(req);
      
      // Rate limiting check
      const canSuggest = await storage.checkRateLimit(ipAddress, 'action_suggestion', 3, 60); // 3 suggestions per hour
      if (!canSuggest) {
        return res.status(429).json({ message: 'Rate limit exceeded. Please wait before suggesting another action.' });
      }

      const validatedData = insertActionSchema.parse(req.body);
      
      // Create action with approval status set to false
      const [action] = await db.insert(actions).values({
        ...validatedData,
        approved: false,
      }).returning();

      await storage.incrementRateLimit(ipAddress, 'action_suggestion');

      res.status(201).json(action);
    } catch (error) {
      console.error('Error creating action suggestion:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Validation error', errors: error.errors });
      } else {
        res.status(500).json({ message: 'Failed to suggest action' });
      }
    }
  });

  // Get stats (public)
  app.get('/api/stats', async (req, res) => {
    try {
      const stats = await storage.getStats();
      res.json(stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
      res.status(500).json({ message: 'Failed to fetch stats' });
    }
  });

  // Admin endpoints
  
  // Get pending posts (admin only)
  app.get('/api/admin/posts/pending', isAdmin, async (req: any, res) => {
    try {
  // req.adminUser is set by the isAdmin middleware
  const user = req.adminUser;
  console.log('[ADMIN] /api/admin/posts/pending called. req.session.user:', req.session?.user, 'req.user:', req.user, 'req.adminUser:', user?.id);
  const pendingPosts = await storage.getPosts('pending');
  console.log('[ADMIN] pendingPosts count:', (pendingPosts || []).length);
  res.json(pendingPosts);
    } catch (error) {
      console.error('Error fetching pending posts:', error);
      res.status(500).json({ message: 'Failed to fetch pending posts' });
    }
  });

  // Temporary debug endpoint (unauthenticated) to list pending posts for troubleshooting
  // REMOVE or protect this in production
  app.get('/api/_debug/pending-posts', async (_req: any, res) => {
    try {
      const pendingPosts = await storage.getPosts('pending');
      console.log('[DEBUG] /api/_debug/pending-posts count:', (pendingPosts || []).length);
      res.json(pendingPosts);
    } catch (err) {
      console.error('Debug pending posts error:', err);
      res.status(500).json({ message: 'Failed to fetch pending posts (debug)' });
    }
  });

  // Approve/reject post (admin only)
  app.patch('/api/admin/posts/:id', isAdmin, async (req: any, res) => {
    try {
  const user = req.adminUser;
  const { id } = req.params;
      const { status } = req.body;

      if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status' });
      }

      await storage.updatePostStatus(id, status);
      res.json({ message: 'Post status updated' });
    } catch (error) {
      console.error('Error updating post status:', error);
      res.status(500).json({ message: 'Failed to update post status' });
    }
  });

  // Delete post (admin only)
  app.delete('/api/admin/posts/:id', isAdmin, async (req: any, res) => {
    try {
  const user = req.adminUser;
  const { id } = req.params;
  await storage.deletePost(id);
      res.json({ message: 'Post deleted' });
    } catch (error) {
      console.error('Error deleting post:', error);
      res.status(500).json({ message: 'Failed to delete post' });
    }
  });

  // Get pending actions (admin only)
  app.get('/api/admin/actions/pending', isAdmin, async (req: any, res) => {
    try {
  const user = req.adminUser;
  const pendingActions = await storage.getActions(false);
      res.json(pendingActions);
    } catch (error) {
      console.error('Error fetching pending actions:', error);
      res.status(500).json({ message: 'Failed to fetch pending actions' });
    }
  });

  // Approve/reject action (admin only)
  app.patch('/api/admin/actions/:id', isAdmin, async (req: any, res) => {
    try {
  const user = req.adminUser;
  const { id } = req.params;
  const { approved } = req.body;

      if (typeof approved !== 'boolean') {
        return res.status(400).json({ message: 'Approved must be boolean' });
      }

      await storage.updateActionApproval(id, approved);
      res.json({ message: 'Action status updated' });
    } catch (error) {
      console.error('Error updating action status:', error);
      res.status(500).json({ message: 'Failed to update action status' });
    }
  });

  // Bulk approve posts (admin only)
  app.post('/api/admin/posts/bulk-approve', isAdmin, async (req: any, res) => {
    try {
  const user = req.adminUser;
  const { postIds } = req.body;
      
      if (!Array.isArray(postIds)) {
        return res.status(400).json({ message: 'Post IDs must be an array' });
      }

      await Promise.all(postIds.map(id => storage.updatePostStatus(id, 'approved')));
      res.json({ message: 'Posts approved successfully' });
    } catch (error) {
      console.error('Error bulk approving posts:', error);
      res.status(500).json({ message: 'Failed to bulk approve posts' });
    }
  });

  // Get admin stats
  app.get('/api/admin/stats', isAdmin, async (req: any, res) => {
    try {
  const user = req.adminUser;
  const stats = await storage.getStats();
      res.json(stats);
    } catch (error) {
      console.error('Error fetching admin stats:', error);
      res.status(500).json({ message: 'Failed to fetch admin stats' });
    }
  });

  // Get approved posts (admin only)
  app.get('/api/admin/posts/approved', isAdmin, async (req: any, res) => {
    try {
  const user = req.adminUser;
  const approvedPosts = await storage.getPosts('approved');
      res.json(approvedPosts);
    } catch (error) {
      console.error('Error fetching approved posts:', error);
      res.status(500).json({ message: 'Failed to fetch approved posts' });
    }
  });

  // Get approved actions (admin only)
  app.get('/api/admin/actions/approved', isAdmin, async (req: any, res) => {
    try {
  const user = req.adminUser;
  const approvedActions = await storage.getActions(true);
      res.json(approvedActions);
    } catch (error) {
      console.error('Error fetching approved actions:', error);
      res.status(500).json({ message: 'Failed to fetch approved actions' });
    }
  });

  // Delete action (admin only)
  app.delete('/api/admin/actions/:id', isAdmin, async (req: any, res) => {
    try {
  const user = req.adminUser;
  const { id } = req.params;
  await storage.deleteAction(id);
      res.json({ message: 'Action deleted' });
    } catch (error) {
      console.error('Error deleting action:', error);
      res.status(500).json({ message: 'Failed to delete action' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Extend the Session type to include the user property
declare module 'express-session' {
  interface Session {
    user?: {
      id: string;
      email: string;
      isAdmin: boolean;
    };
  }
}
