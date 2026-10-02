import "server-only";
import { and, desc, eq, ne, notInArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { follows, users } from "@/db/schema";

export type UserSummary = {
  id: string;
  username: string;
  name: string;
  bio: string;
  isFollowing: boolean;
};

function isFollowingExpr(viewerId: string | null) {
  return viewerId
    ? sql<boolean>`exists (select 1 from ${follows} where ${follows.followerId} = ${viewerId} and ${follows.followingId} = ${users.id})`
    : sql<boolean>`false`;
}

export async function getProfile(username: string, viewerId: string | null) {
  const [profile] = await db
    .select({
      id: users.id,
      username: users.username,
      name: users.name,
      bio: users.bio,
      location: users.location,
      website: users.website,
      followersCount: users.followersCount,
      followingCount: users.followingCount,
      postsCount: users.postsCount,
      createdAt: users.createdAt,
      isFollowing: isFollowingExpr(viewerId),
      followsYou: viewerId
        ? sql<boolean>`exists (select 1 from ${follows} where ${follows.followerId} = ${users.id} and ${follows.followingId} = ${viewerId})`
        : sql<boolean>`false`,
    })
    .from(users)
    .where(eq(users.username, username.toLowerCase()))
    .limit(1);
  return profile ?? null;
}

/** "Who to follow": popular accounts the viewer does not follow yet. */
export async function getSuggestions(viewerId: string | null, limit = 3): Promise<UserSummary[]> {
  const rows = await db
    .select({
      id: users.id,
      username: users.username,
      name: users.name,
      bio: users.bio,
      isFollowing: sql<boolean>`false`,
    })
    .from(users)
    .where(
      viewerId
        ? and(
            ne(users.id, viewerId),
            notInArray(
              users.id,
              db
                .select({ id: follows.followingId })
                .from(follows)
                .where(eq(follows.followerId, viewerId)),
            ),
          )
        : undefined,
    )
    .orderBy(desc(users.followersCount), users.username)
    .limit(limit);
  return rows.map((row) => ({ ...row, isFollowing: false }));
}

/** Followers of a user, or accounts a user follows, newest first. */
export async function getConnections(
  userId: string,
  direction: "followers" | "following",
  viewerId: string | null,
  limit = 100,
): Promise<UserSummary[]> {
  const joinColumn = direction === "followers" ? follows.followerId : follows.followingId;
  const filterColumn = direction === "followers" ? follows.followingId : follows.followerId;

  const rows = await db
    .select({
      id: users.id,
      username: users.username,
      name: users.name,
      bio: users.bio,
      isFollowing: isFollowingExpr(viewerId),
    })
    .from(follows)
    .innerJoin(users, eq(joinColumn, users.id))
    .where(eq(filterColumn, userId))
    .orderBy(desc(follows.createdAt))
    .limit(limit);
  return rows.map((row) => ({ ...row, isFollowing: Boolean(row.isFollowing) }));
}
