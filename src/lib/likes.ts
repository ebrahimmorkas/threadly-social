import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { PG_FOREIGN_KEY_VIOLATION, pgErrorCode } from "@/db/errors";
import { likes, posts } from "@/db/schema";

export type LikeResult = { liked: boolean; likeCount: number; changed: boolean; authorId: string };

/**
 * Sets the like state for a user/post pair. Idempotent: liking twice (double click,
 * retried request, two tabs) changes the counter only once, because the counter is
 * only touched when the insert/delete actually affected a row.
 */
export async function setLike(
  userId: string,
  postId: string,
  liked: boolean,
): Promise<LikeResult | null> {
  try {
    return await applyLike(userId, postId, liked);
  } catch (error) {
    // Foreign key violation: the post does not exist (or was just deleted).
    if (pgErrorCode(error) === PG_FOREIGN_KEY_VIOLATION) return null;
    throw error;
  }
}

function applyLike(userId: string, postId: string, liked: boolean) {
  return db.transaction(async (tx): Promise<LikeResult | null> => {
    const changed = liked
      ? (
          await tx
            .insert(likes)
            .values({ userId, postId })
            .onConflictDoNothing()
            .returning({ postId: likes.postId })
        ).length > 0
      : (
          await tx
            .delete(likes)
            .where(and(eq(likes.userId, userId), eq(likes.postId, postId)))
            .returning({ postId: likes.postId })
        ).length > 0;

    const delta = changed ? (liked ? 1 : -1) : 0;
    const [post] = await tx
      .update(posts)
      .set({ likeCount: sql`greatest(${posts.likeCount} + ${delta}, 0)` })
      .where(eq(posts.id, postId))
      .returning({ likeCount: posts.likeCount, authorId: posts.authorId });

    if (!post) return null;
    return { liked, likeCount: post.likeCount, changed, authorId: post.authorId };
  });
}
