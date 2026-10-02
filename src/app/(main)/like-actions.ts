"use server";

import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { getCache } from "@/lib/cache";
import { setLike } from "@/lib/likes";
import { rateLimit } from "@/lib/rate-limit";

export type ToggleLikeResult =
  | { ok: true; liked: boolean; likeCount: number }
  | { ok: false; error: "unauthenticated" | "not-found" | "rate-limited" };

export async function toggleLike(postId: string, liked: boolean): Promise<ToggleLikeResult> {
  if (!z.uuid().safeParse(postId).success) return { ok: false, error: "not-found" };

  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthenticated" };

  const limit = await rateLimit(getCache(), {
    key: `like:${user.id}`,
    limit: 60,
    windowSeconds: 60,
  });
  if (!limit.success) return { ok: false, error: "rate-limited" };

  const result = await setLike(user.id, postId, liked);
  if (!result) return { ok: false, error: "not-found" };

  return { ok: true, liked: result.liked, likeCount: result.likeCount };
}
