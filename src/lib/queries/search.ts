import "server-only";
import { desc, gt, ilike, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { follows, postTags, users } from "@/db/schema";
import { cached } from "@/lib/cache";
import { escapeLike } from "@/lib/utils";
import { getFeed, type PostView } from "./posts";

export async function searchUsers(query: string, viewerId: string | null, limit = 5) {
  const pattern = `%${escapeLike(query.replace(/^@/, ""))}%`;
  const rows = await db
    .select({
      id: users.id,
      username: users.username,
      name: users.name,
      bio: users.bio,
      isFollowing: viewerId
        ? sql<boolean>`exists (select 1 from ${follows} where ${follows.followerId} = ${viewerId} and ${follows.followingId} = ${users.id})`
        : sql<boolean>`false`,
    })
    .from(users)
    .where(or(ilike(users.username, pattern), ilike(users.name, pattern)))
    .orderBy(desc(users.followersCount))
    .limit(limit);
  return rows.map((row) => ({ ...row, isFollowing: Boolean(row.isFollowing) }));
}

/**
 * Full-text search over posts. `websearch_to_tsquery` accepts natural input such as
 * `"server actions" -redux`, the GIN index keeps it fast, and `ts_rank` orders by relevance.
 */
export async function searchPosts(
  query: string,
  viewerId: string | null,
  limit = 30,
): Promise<PostView[]> {
  const matches = await db.execute<{ id: string }>(sql`
    select id
    from posts
    where to_tsvector('english', content) @@ websearch_to_tsquery('english', ${query})
    order by ts_rank(to_tsvector('english', content), websearch_to_tsquery('english', ${query})) desc,
             created_at desc
    limit ${limit}
  `);
  if (matches.length === 0) return [];

  const order = new Map(matches.map((row, index) => [row.id, index]));
  const { posts } = await getFeed(
    { kind: "ids", ids: matches.map((row) => row.id) },
    { viewerId, limit },
  );
  return posts.sort((a, b) => order.get(a.id)! - order.get(b.id)!);
}

export type TrendingTag = { tag: string; posts: number };

/** Most used hashtags over the last 7 days. Cached for 5 minutes (Redis or memory). */
export async function getTrendingTags(limit = 6): Promise<TrendingTag[]> {
  return cached(`trending-tags:${limit}`, 300, async () => {
    const rows = await db
      .select({ tag: postTags.tag, posts: sql<number>`count(*)`.mapWith(Number) })
      .from(postTags)
      .where(gt(postTags.createdAt, sql`now() - interval '7 days'`))
      .groupBy(postTags.tag)
      .orderBy(desc(sql`count(*)`), postTags.tag)
      .limit(limit);
    return rows;
  });
}
