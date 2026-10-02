"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireUser } from "@/lib/auth/guards";
import { getCurrentUser } from "@/lib/auth/session";
import { getCache } from "@/lib/cache";
import { setFollow } from "@/lib/follows";
import { rateLimit } from "@/lib/rate-limit";
import type { FormState } from "@/lib/validations/auth";
import { profileSchema } from "@/lib/validations/profile";

export type ToggleFollowResult =
  | { ok: true; following: boolean; followersCount: number }
  | { ok: false; error: "unauthenticated" | "not-found" | "rate-limited" };

export async function toggleFollow(userId: string, follow: boolean): Promise<ToggleFollowResult> {
  if (!z.uuid().safeParse(userId).success) return { ok: false, error: "not-found" };

  const viewer = await getCurrentUser();
  if (!viewer) return { ok: false, error: "unauthenticated" };

  const limit = await rateLimit(getCache(), {
    key: `follow:${viewer.id}`,
    limit: 30,
    windowSeconds: 60,
  });
  if (!limit.success) return { ok: false, error: "rate-limited" };

  const result = await setFollow(viewer.id, userId, follow);
  if (!result) return { ok: false, error: "not-found" };

  revalidatePath("/home");
  return { ok: true, following: result.following, followersCount: result.followersCount };
}

export async function updateProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const raw = Object.fromEntries(formData) as Record<string, string>;
  const parsed = profileSchema.safeParse(raw);
  if (!parsed.success) return { errors: z.flattenError(parsed.error).fieldErrors, fields: raw };

  await db.update(users).set(parsed.data).where(eq(users.id, user.id));

  revalidatePath(`/${user.username}`);
  revalidatePath("/settings");
  return { success: true, message: "Profile updated" };
}
