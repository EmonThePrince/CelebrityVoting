import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from 'multer';
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertPostSchema, insertActionSchema, insertVoteSchema } from "@shared/schema";
import { z } from "zod";

// Configure multer for image uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// Helper function to get client IP
function getClientIP(req: any): string {
  return req.headers['x-forwarded-for']?.split(',')[0] || 
         req.connection?.remoteAddress || 
         req.socket?.remoteAddress || 
         '127.0.0.1';
}

// Simple image upload handler (in production, use Cloudinary)
async function uploadImage(file: Express.Multer.File): Promise<string> {
  // For now, we'll just return a placeholder URL
  // In production, upload to Cloudinary and return the URL
  return `https://via.placeholder.com/400x300?text=${encodeURIComponent(file.originalname)}`;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Initialize default actions
  const initializeDefaultActions = async () => {
    try {
      const defaultActions = ['slap', 'hug', 'kiss', 'love', 'hate'];
      const existingActions = await storage.getActions(true);
      const existingNames = existingActions.map(a => a.name);
      
      for (const actionName of defaultActions) {
        if (!existingNames.includes(actionName)) {
          await storage.createAction({
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
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Public endpoints

  // Get approved posts with vote counts
  app.get('/api/posts', async (req, res) => {
    try {
      const { category, limit = '20', offset = '0', sort = 'recent' } = req.query;
      const posts = await storage.getPosts('approved', category as string, parseInt(limit as string), parseInt(offset as string));
      
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

      let imageUrl = 'https://via.placeholder.com/400x300?text=No+Image';
      
      if (req.file) {
        imageUrl = await uploadImage(req.file);
      }

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
      const { postId } = req.body;
      const ipAddress = getClientIP(req);

      // Rate limiting check
      const canVote = await storage.checkRateLimit(ipAddress, 'vote', 5, 1); // 5 votes per minute
      if (!canVote) {
        return res.status(429).json({ message: 'Rate limit exceeded. Please wait before voting again.' });
      }

      // Check if user already voted for this action on this post
      const hasVoted = await storage.hasUserVoted(postId, actionId, ipAddress);
      if (hasVoted) {
        return res.status(400).json({ message: 'You have already voted for this action on this post.' });
      }

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
      });

      await storage.incrementRateLimit(ipAddress, 'vote');

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
      
      const action = await storage.createAction({
        ...validatedData,
        approved: false, // Requires admin approval
      });

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
  app.get('/api/admin/posts/pending', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user?.isAdmin) {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const pendingPosts = await storage.getPosts('pending');
      res.json(pendingPosts);
    } catch (error) {
      console.error('Error fetching pending posts:', error);
      res.status(500).json({ message: 'Failed to fetch pending posts' });
    }
  });

  // Approve/reject post (admin only)
  app.patch('/api/admin/posts/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user?.isAdmin) {
        return res.status(403).json({ message: 'Admin access required' });
      }

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
  app.delete('/api/admin/posts/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user?.isAdmin) {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const { id } = req.params;
      await storage.deletePost(id);
      res.json({ message: 'Post deleted' });
    } catch (error) {
      console.error('Error deleting post:', error);
      res.status(500).json({ message: 'Failed to delete post' });
    }
  });

  // Get pending actions (admin only)
  app.get('/api/admin/actions/pending', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user?.isAdmin) {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const pendingActions = await storage.getActions(false);
      res.json(pendingActions);
    } catch (error) {
      console.error('Error fetching pending actions:', error);
      res.status(500).json({ message: 'Failed to fetch pending actions' });
    }
  });

  // Approve/reject action (admin only)
  app.patch('/api/admin/actions/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user?.isAdmin) {
        return res.status(403).json({ message: 'Admin access required' });
      }

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
  app.post('/api/admin/posts/bulk-approve', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user?.isAdmin) {
        return res.status(403).json({ message: 'Admin access required' });
      }

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
  app.get('/api/admin/stats', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user?.isAdmin) {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const stats = await storage.getStats();
      res.json(stats);
    } catch (error) {
      console.error('Error fetching admin stats:', error);
      res.status(500).json({ message: 'Failed to fetch admin stats' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
