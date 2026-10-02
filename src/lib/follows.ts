import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { PG_FOREIGN_KEY_VIOLATION, pgErrorCode } from "@/db/errors";
import { follows, users } from "@/db/schema";

export type FollowResult = { following: boolean; followersCount: number; changed: boolean };

/**
 * Follows or unfollows a user. Idempotent like likes: both users' counters are only
 * adjusted when the follow row was actually inserted or deleted.
 */
export async function setFollow(
  followerId: string,
  followingId: string,
  follow: boolean,
): Promise<FollowResult | null> {
  if (followerId === followingId) return null;
  try {
    return await db.transaction(async (tx) => {
      const changed = follow
        ? (
            await tx
              .insert(follows)
              .values({ followerId, followingId })
              .onConflictDoNothing()
              .returning({ id: follows.followingId })
          ).length > 0
        : (
            await tx
              .delete(follows)
              .where(and(eq(follows.followerId, followerId), eq(follows.followingId, followingId)))
              .returning({ id: follows.followingId })
          ).length > 0;

      const delta = changed ? (follow ? 1 : -1) : 0;

      const [target] = await tx
        .update(users)
        .set({ followersCount: sql`greatest(${users.followersCount} + ${delta}, 0)` })
        .where(eq(users.id, followingId))
        .returning({ followersCount: users.followersCount });
      if (!target) return null;

      if (delta !== 0) {
        await tx
          .update(users)
          .set({ followingCount: sql`greatest(${users.followingCount} + ${delta}, 0)` })
          .where(eq(users.id, followerId));
      }

      return { following: follow, followersCount: target.followersCount, changed };
    });
  } catch (error) {
    if (pgErrorCode(error) === PG_FOREIGN_KEY_VIOLATION) return null;
    throw error;
  }
}
