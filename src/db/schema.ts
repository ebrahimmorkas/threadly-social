import { relations, sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  varchar,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

export const notificationType = pgEnum("notification_type", ["like", "reply", "follow", "mention"]);

const createdAt = timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Stored lowercase; uniqueness is therefore case-insensitive. */
    username: varchar("username", { length: 20 }).notNull().unique(),
    name: varchar("name", { length: 50 }).notNull(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    bio: varchar("bio", { length: 160 }).notNull().default(""),
    location: varchar("location", { length: 50 }).notNull().default(""),
    website: varchar("website", { length: 100 }).notNull().default(""),
    // Denormalised counters keep profile pages to a single-row read.
    followersCount: integer("followers_count").notNull().default(0),
    followingCount: integer("following_count").notNull().default(0),
    postsCount: integer("posts_count").notNull().default(0),
    createdAt,
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [check("users_username_format", sql`${t.username} ~ '^[a-z0-9_]{3,20}$'`)],
);

export const sessions = pgTable(
  "sessions",
  {
    /** SHA-256 hash of the session token. The raw token only lives in the user's cookie. */
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt,
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const posts = pgTable(
  "posts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    content: varchar("content", { length: 280 }).notNull(),
    /** Set when the post is a reply. */
    parentId: uuid("parent_id").references((): AnyPgColumn => posts.id, { onDelete: "cascade" }),
    likeCount: integer("like_count").notNull().default(0),
    replyCount: integer("reply_count").notNull().default(0),
    // Millisecond precision matches JavaScript dates, so feed cursors compare exactly.
    createdAt: timestamp("created_at", { withTimezone: true, precision: 3 }).notNull().defaultNow(),
  },
  (t) => [
    // Keyset pagination for feeds orders by (created_at, id).
    index("posts_created_idx").on(t.createdAt.desc(), t.id.desc()),
    index("posts_author_created_idx").on(t.authorId, t.createdAt.desc()),
    index("posts_parent_created_idx").on(t.parentId, t.createdAt),
    // Full-text search over post content (used with websearch_to_tsquery + ts_rank).
    index("posts_content_search_idx").using("gin", sql`to_tsvector('english', ${t.content})`),
    check("posts_counts_non_negative", sql`${t.likeCount} >= 0 and ${t.replyCount} >= 0`),
  ],
);

export const likes = pgTable(
  "likes",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    createdAt,
  },
  (t) => [primaryKey({ columns: [t.userId, t.postId] }), index("likes_post_idx").on(t.postId)],
);

export const follows = pgTable(
  "follows",
  {
    followerId: uuid("follower_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    followingId: uuid("following_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt,
  },
  (t) => [
    primaryKey({ columns: [t.followerId, t.followingId] }),
    index("follows_following_idx").on(t.followingId),
    check("follows_no_self_follow", sql`${t.followerId} <> ${t.followingId}`),
  ],
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    recipientId: uuid("recipient_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    actorId: uuid("actor_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: notificationType("type").notNull(),
    postId: uuid("post_id").references(() => posts.id, { onDelete: "cascade" }),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt,
  },
  (t) => [
    index("notifications_recipient_created_idx").on(t.recipientId, t.createdAt.desc()),
    // Partial index: the unread badge only ever looks at unread rows.
    index("notifications_unread_idx")
      .on(t.recipientId)
      .where(sql`${t.readAt} is null`),
  ],
);

export const postTags = pgTable(
  "post_tags",
  {
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    tag: varchar("tag", { length: 50 }).notNull(),
    createdAt,
  },
  (t) => [
    primaryKey({ columns: [t.postId, t.tag] }),
    index("post_tags_tag_created_idx").on(t.tag, t.createdAt.desc()),
  ],
);

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------

export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  author: one(users, { fields: [posts.authorId], references: [users.id] }),
  parent: one(posts, { fields: [posts.parentId], references: [posts.id], relationName: "replies" }),
  replies: many(posts, { relationName: "replies" }),
  tags: many(postTags),
}));

export const postTagsRelations = relations(postTags, ({ one }) => ({
  post: one(posts, { fields: [postTags.postId], references: [posts.id] }),
}));

export type User = typeof users.$inferSelect;
export type Post = typeof posts.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type NotificationType = (typeof notificationType.enumValues)[number];
