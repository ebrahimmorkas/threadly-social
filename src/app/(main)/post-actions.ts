"use server";

import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { posts, postTags, users } from "@/db/schema";
import { requireUser } from "@/lib/auth/guards";
import { getCache } from "@/lib/cache";
import { extractHashtags } from "@/lib/posts/parse";
import { rateLimit } from "@/lib/rate-limit";
import type { FormState } from "@/lib/validations/auth";
import { postSchema } from "@/lib/validations/post";

export async function createPost(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = postSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: z.flattenError(parsed.error).fieldErrors };

  const limit = await rateLimit(getCache(), {
    key: `post:${user.id}`,
    limit: 10,
    windowSeconds: 60,
  });
  if (!limit.success) {
    return { message: `You're posting too fast. Try again in ${limit.retryAfter}s.` };
  }

  const { content, parentId } = parsed.data;

  const created = await db.transaction(async (tx) => {
    if (parentId) {
      // Increment the parent's reply counter; zero rows means the parent was deleted.
      const updated = await tx
        .update(posts)
        .set({ replyCount: sql`${posts.replyCount} + 1` })
        .where(eq(posts.id, parentId))
        .returning({ id: posts.id });
      if (updated.length === 0) return null;
    }

    const [post] = await tx
      .insert(posts)
      .values({ authorId: user.id, content, parentId })
      .returning({ id: posts.id });

    await tx
      .update(users)
      .set({ postsCount: sql`${users.postsCount} + 1` })
      .where(eq(users.id, user.id));

    const tags = extractHashtags(content);
    if (tags.length > 0) {
      await tx.insert(postTags).values(tags.map((tag) => ({ postId: post!.id, tag })));
    }

    return post!;
  });

  if (!created) return { message: "The post you are replying to no longer exists." };

  revalidatePath("/home");
  revalidatePath("/explore");
  if (parentId) revalidatePath(`/post/${parentId}`);
  return { success: true, message: parentId ? "Reply posted" : "Post published" };
}

export async function deletePost(postId: string) {
  if (!z.uuid().safeParse(postId).success) return;
  const user = await requireUser();

  await db.transaction(async (tx) => {
    const [deleted] = await tx
      .delete(posts)
      .where(and(eq(posts.id, postId), eq(posts.authorId, user.id)))
      .returning({ parentId: posts.parentId });
    if (!deleted) return;

    await tx
      .update(users)
      .set({ postsCount: sql`greatest(${users.postsCount} - 1, 0)` })
      .where(eq(users.id, user.id));

    if (deleted.parentId) {
      await tx
        .update(posts)
        .set({ replyCount: sql`greatest(${posts.replyCount} - 1, 0)` })
        .where(eq(posts.id, deleted.parentId));
    }
  });

  revalidatePath("/home");
  revalidatePath("/explore");
}
