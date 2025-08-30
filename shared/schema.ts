import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique().notNull(),
  passwordHash: text("password_hash").notNull(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  isAdmin: boolean("is_admin").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Celebrity/Character/Politician posts
export const categoryEnum = pgEnum('category', ['film', 'fictional', 'political']);
export const statusEnum = pgEnum('status', ['pending', 'approved', 'rejected']);

export const posts = pgTable("posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  category: categoryEnum("category").notNull(),
  imageUrl: text("image_url").notNull(),
  status: statusEnum("status").default('pending'),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("posts_status_idx").on(table.status),
  index("posts_category_idx").on(table.category),
  index("posts_created_at_idx").on(table.createdAt),
]);

// Voting actions (slap, hug, kiss, love, hate + custom ones)
export const actions = pgTable("actions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 50 }).notNull().unique(),
  approved: boolean("approved").default(false),
  isDefault: boolean("is_default").default(false), // for the 5 default actions
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("actions_approved_idx").on(table.approved),
]);

// Vote tracking by IP
export const votes = pgTable("votes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: varchar("post_id").references(() => posts.id, { onDelete: 'cascade' }).notNull(),
  actionId: varchar("action_id").references(() => actions.id, { onDelete: 'cascade' }).notNull(),
  ipAddress: varchar("ip_address", { length: 45 }).notNull(), // IPv6 support
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("votes_post_id_idx").on(table.postId),
  index("votes_action_id_idx").on(table.actionId),
  index("votes_ip_address_idx").on(table.ipAddress),
  index("votes_created_at_idx").on(table.createdAt),
  // Unique constraint to prevent duplicate votes from same IP on same post for same action
  index("votes_unique_idx").on(table.postId, table.actionId, table.ipAddress),
]);

// Rate limiting table
export const rateLimits = pgTable("rate_limits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ipAddress: varchar("ip_address", { length: 45 }).notNull(),
  actionType: varchar("action_type", { length: 50 }).notNull(), // 'vote', 'post', 'action_suggestion'
  count: integer("count").default(1),
  windowStart: timestamp("window_start").defaultNow(),
}, (table) => [
  index("rate_limits_ip_action_idx").on(table.ipAddress, table.actionType),
]);

// Relations
export const postsRelations = relations(posts, ({ many }) => ({
  votes: many(votes),
}));

export const actionsRelations = relations(actions, ({ many }) => ({
  votes: many(votes),
}));

export const votesRelations = relations(votes, ({ one }) => ({
  post: one(posts, {
    fields: [votes.postId],
    references: [posts.id],
  }),
  action: one(actions, {
    fields: [votes.actionId],
    references: [actions.id],
  }),
}));

// Insert schemas
export const insertPostSchema = createInsertSchema(posts).omit({
  id: true,
  status: true,
  createdAt: true,
  updatedAt: true,
});

export const insertActionSchema = createInsertSchema(actions).omit({
  id: true,
  approved: true,
  isDefault: true,
  createdAt: true,
});

export const insertVoteSchema = createInsertSchema(votes).omit({
  id: true,
  createdAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type Post = typeof posts.$inferSelect;
export type InsertPost = z.infer<typeof insertPostSchema>;
export type Action = typeof actions.$inferSelect;
export type InsertAction = z.infer<typeof insertActionSchema>;
export type Vote = typeof votes.$inferSelect;
export type InsertVote = z.infer<typeof insertVoteSchema>;
