import {
  users,
  posts,
  actions,
  votes,
  rateLimits,
  type User,
  type UpsertUser,
  type Post,
  type InsertPost,
  type Action,
  type InsertAction,
  type Vote,
  type InsertVote,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, count, sql, gte, inArray } from "drizzle-orm";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Post operations
  createPost(post: InsertPost): Promise<Post>;
  getPosts(status?: 'pending' | 'approved' | 'rejected', category?: string, limit?: number, offset?: number): Promise<Post[]>;
  getPostById(id: string): Promise<Post | undefined>;
  updatePostStatus(id: string, status: 'approved' | 'rejected'): Promise<void>;
  deletePost(id: string): Promise<void>;
  searchPosts(query: string, category?: string): Promise<Post[]>;
  
  // Action operations
  getActions(approved?: boolean): Promise<Action[]>;
  createAction(action: InsertAction): Promise<Action>;
  updateActionApproval(id: string, approved: boolean): Promise<void>;
  getActionById(id: string): Promise<Action | undefined>;
  
  // Vote operations
  createVote(vote: InsertVote): Promise<Vote>;
  getPostVotes(postId: string): Promise<{ action: Action; count: number }[]>;
  hasUserVoted(postId: string, actionId: string, ipAddress: string): Promise<boolean>;
  
  // Leaderboard operations
  getLeaderboard(actionId: string, limit?: number): Promise<{ post: Post; voteCount: number }[]>;
  getTrendingPosts(hours?: number, limit?: number): Promise<{ post: Post; voteCount: number }[]>;
  
  // Rate limiting operations
  checkRateLimit(ipAddress: string, actionType: string, limit: number, windowMinutes: number): Promise<boolean>;
  incrementRateLimit(ipAddress: string, actionType: string): Promise<void>;
  
  // Stats operations
  getStats(): Promise<{ totalPosts: number; totalVotes: number; pendingPosts: number; pendingActions: number }>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Post operations
  async createPost(post: InsertPost): Promise<Post> {
    const [newPost] = await db.insert(posts).values(post).returning();
    return newPost;
  }

  async getPosts(status?: 'pending' | 'approved' | 'rejected', category?: string, limit = 20, offset = 0): Promise<Post[]> {
    let query = db.select().from(posts);
    
    const conditions = [];
    if (status) {
      conditions.push(eq(posts.status, status));
    }
    if (category) {
      conditions.push(eq(posts.category, category as any));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    return await query
      .orderBy(desc(posts.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async getPostById(id: string): Promise<Post | undefined> {
    const [post] = await db.select().from(posts).where(eq(posts.id, id));
    return post;
  }

  async updatePostStatus(id: string, status: 'approved' | 'rejected'): Promise<void> {
    await db.update(posts)
      .set({ status, updatedAt: new Date() })
      .where(eq(posts.id, id));
  }

  async deletePost(id: string): Promise<void> {
    await db.delete(posts).where(eq(posts.id, id));
  }

  async searchPosts(query: string, category?: string): Promise<Post[]> {
    let dbQuery = db.select().from(posts)
      .where(
        and(
          eq(posts.status, 'approved'),
          sql`${posts.name} ILIKE ${`%${query}%`}`,
          category ? eq(posts.category, category as any) : undefined
        )
      );
    
    return await dbQuery.orderBy(desc(posts.createdAt));
  }

  // Action operations
  async getActions(approved?: boolean): Promise<Action[]> {
    let query = db.select().from(actions);
    
    if (approved !== undefined) {
      query = query.where(eq(actions.approved, approved));
    }
    
    return await query.orderBy(desc(actions.isDefault), desc(actions.createdAt));
  }

  async createAction(action: InsertAction): Promise<Action> {
    const [newAction] = await db.insert(actions).values(action).returning();
    return newAction;
  }

  async updateActionApproval(id: string, approved: boolean): Promise<void> {
    await db.update(actions)
      .set({ approved })
      .where(eq(actions.id, id));
  }

  async getActionById(id: string): Promise<Action | undefined> {
    const [action] = await db.select().from(actions).where(eq(actions.id, id));
    return action;
  }

  // Vote operations
  async createVote(vote: InsertVote): Promise<Vote> {
    const [newVote] = await db.insert(votes).values(vote).returning();
    return newVote;
  }

  async getPostVotes(postId: string): Promise<{ action: Action; count: number }[]> {
    return await db
      .select({
        action: actions,
        count: count(votes.id).as('count'),
      })
      .from(votes)
      .innerJoin(actions, eq(votes.actionId, actions.id))
      .where(eq(votes.postId, postId))
      .groupBy(actions.id)
      .orderBy(desc(count(votes.id)));
  }

  async hasUserVoted(postId: string, actionId: string, ipAddress: string): Promise<boolean> {
    const [vote] = await db
      .select()
      .from(votes)
      .where(
        and(
          eq(votes.postId, postId),
          eq(votes.actionId, actionId),
          eq(votes.ipAddress, ipAddress)
        )
      );
    return !!vote;
  }

  // Leaderboard operations
  async getLeaderboard(actionId: string, limit = 10): Promise<{ post: Post; voteCount: number }[]> {
    return await db
      .select({
        post: posts,
        voteCount: count(votes.id).as('voteCount'),
      })
      .from(posts)
      .innerJoin(votes, eq(posts.id, votes.postId))
      .where(
        and(
          eq(posts.status, 'approved'),
          eq(votes.actionId, actionId)
        )
      )
      .groupBy(posts.id)
      .orderBy(desc(count(votes.id)))
      .limit(limit);
  }

  async getTrendingPosts(hours = 24, limit = 10): Promise<{ post: Post; voteCount: number }[]> {
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    return await db
      .select({
        post: posts,
        voteCount: count(votes.id).as('voteCount'),
      })
      .from(posts)
      .innerJoin(votes, eq(posts.id, votes.postId))
      .where(
        and(
          eq(posts.status, 'approved'),
          gte(votes.createdAt, cutoffTime)
        )
      )
      .groupBy(posts.id)
      .orderBy(desc(count(votes.id)))
      .limit(limit);
  }

  // Rate limiting operations
  async checkRateLimit(ipAddress: string, actionType: string, limit: number, windowMinutes: number): Promise<boolean> {
    const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000);
    
    const [result] = await db
      .select({ count: count(rateLimits.id) })
      .from(rateLimits)
      .where(
        and(
          eq(rateLimits.ipAddress, ipAddress),
          eq(rateLimits.actionType, actionType),
          gte(rateLimits.windowStart, windowStart)
        )
      );
    
    return (result?.count || 0) < limit;
  }

  async incrementRateLimit(ipAddress: string, actionType: string): Promise<void> {
    await db.insert(rateLimits).values({
      ipAddress,
      actionType,
      count: 1,
    });
  }

  // Stats operations
  async getStats(): Promise<{ totalPosts: number; totalVotes: number; pendingPosts: number; pendingActions: number }> {
    const [totalPosts] = await db
      .select({ count: count(posts.id) })
      .from(posts)
      .where(eq(posts.status, 'approved'));

    const [totalVotes] = await db
      .select({ count: count(votes.id) })
      .from(votes);

    const [pendingPosts] = await db
      .select({ count: count(posts.id) })
      .from(posts)
      .where(eq(posts.status, 'pending'));

    const [pendingActions] = await db
      .select({ count: count(actions.id) })
      .from(actions)
      .where(eq(actions.approved, false));

    return {
      totalPosts: totalPosts?.count || 0,
      totalVotes: totalVotes?.count || 0,
      pendingPosts: pendingPosts?.count || 0,
      pendingActions: pendingActions?.count || 0,
    };
  }
}

export const storage = new DatabaseStorage();

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
