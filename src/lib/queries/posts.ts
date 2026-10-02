import "server-only";
import { aliasedTable, and, asc, desc, eq, inArray, isNull, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { follows, likes, posts, postTags, users } from "@/db/schema";
import { encodeCursor, type Cursor } from "@/lib/posts/cursor";

export const FEED_PAGE_SIZE = 20;

/** Serialisable post shape shared by server components, the feed API and client components. */
export type PostView = {
  id: string;
  content: string;
  createdAt: string;
  likeCount: number;
  replyCount: number;
  parentId: string | null;
  replyingTo: string | null;
  likedByMe: boolean;
  author: { id: string; username: string; name: string };
};

export type FeedQuery =
  | { kind: "explore" }
  | { kind: "following"; userId: string }
  | { kind: "profile"; authorId: string; replies?: boolean }
  | { kind: "tag"; tag: string };

const parent = aliasedTable(posts, "parent");
const parentAuthor = aliasedTable(users, "parent_author");

function selectPosts(viewerId: string | null) {
  return db
    .select({
      id: posts.id,
      content: posts.content,
      createdAt: posts.createdAt,
      likeCount: posts.likeCount,
      replyCount: posts.replyCount,
      parentId: posts.parentId,
      replyingTo: parentAuthor.username,
      likedByMe: viewerId
        ? sql<boolean>`exists (select 1 from ${likes} where ${likes.postId} = ${posts.id} and ${likes.userId} = ${viewerId})`
        : sql<boolean>`false`,
      author: { id: users.id, username: users.username, name: users.name },
    })
    .from(posts)
    .innerJoin(users, eq(posts.authorId, users.id))
    .leftJoin(parent, eq(posts.parentId, parent.id))
    .leftJoin(parentAuthor, eq(parent.authorId, parentAuthor.id));
}

/** Raw row as returned by `selectPosts` (dates as Date, likedByMe as a SQL boolean). */
type PostRow = Omit<PostView, "createdAt" | "likedByMe"> & { createdAt: Date; likedByMe: unknown };

function toView(row: PostRow): PostView {
  return { ...row, createdAt: row.createdAt.toISOString(), likedByMe: Boolean(row.likedByMe) };
}

function feedFilter(query: FeedQuery): SQL | undefined {
  switch (query.kind) {
    case "explore":
      return isNull(posts.parentId);
    case "following":
      // The viewer's own posts plus top-level posts from everyone they follow.
      return and(
        isNull(posts.parentId),
        or(
          eq(posts.authorId, query.userId),
          inArray(
            posts.authorId,
            db
              .select({ id: follows.followingId })
              .from(follows)
              .where(eq(follows.followerId, query.userId)),
          ),
        ),
      );
    case "profile":
      return and(
        eq(posts.authorId, query.authorId),
        query.replies ? undefined : isNull(posts.parentId),
      );
    case "tag":
      return inArray(
        posts.id,
        db.select({ id: postTags.postId }).from(postTags).where(eq(postTags.tag, query.tag)),
      );
  }
}

/** Keyset-paginated feed. Returns one page of posts and the cursor for the next page. */
export async function getFeed(
  query: FeedQuery,
  {
    viewerId,
    cursor,
    limit = FEED_PAGE_SIZE,
  }: { viewerId: string | null; cursor?: Cursor | null; limit?: number },
) {
  const rows = await selectPosts(viewerId)
    .where(
      and(
        feedFilter(query),
        cursor
          ? sql`(${posts.createdAt}, ${posts.id}) < (${cursor.createdAt}::timestamptz, ${cursor.id}::uuid)`
          : undefined,
      ),
    )
    .orderBy(desc(posts.createdAt), desc(posts.id))
    // Fetch one extra row to know whether another page exists without a COUNT query.
    .limit(limit + 1);

  const page = rows.slice(0, limit).map(toView);
  const last = page.at(-1);
  const nextCursor =
    rows.length > limit && last ? encodeCursor({ createdAt: last.createdAt, id: last.id }) : null;

  return { posts: page, nextCursor };
}

export async function getPost(postId: string, viewerId: string | null) {
  const [row] = await selectPosts(viewerId).where(eq(posts.id, postId)).limit(1);
  return row ? toView(row) : null;
}

/**
 * Loads the chain of parent posts above a reply using a recursive CTE,
 * so an entire conversation is fetched in a single round trip.
 */
export async function getAncestors(postId: string, viewerId: string | null, maxDepth = 20) {
  const chain = await db.execute<{ id: string; depth: number }>(sql`
    with recursive ancestors as (
      select p.parent_id as id, 1 as depth from posts p where p.id = ${postId}
      union all
      select p.parent_id, a.depth + 1
      from posts p join ancestors a on p.id = a.id
      where p.parent_id is not null and a.depth < ${maxDepth}
    )
    select id, depth from ancestors where id is not null
  `);
  if (chain.length === 0) return [];

  const rows = await selectPosts(viewerId).where(
    inArray(
      posts.id,
      chain.map((row) => row.id),
    ),
  );
  const depthById = new Map(chain.map((row) => [row.id, Number(row.depth)]));
  // Oldest ancestor first.
  return rows.map(toView).sort((a, b) => depthById.get(b.id)! - depthById.get(a.id)!);
}

export async function getReplies(postId: string, viewerId: string | null, limit = 50) {
  const rows = await selectPosts(viewerId)
    .where(eq(posts.parentId, postId))
    .orderBy(asc(posts.createdAt))
    .limit(limit);
  return rows.map(toView);
}
