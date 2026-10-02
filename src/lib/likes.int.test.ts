import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { posts, users } from "@/db/schema";
import { setLike } from "./likes";

const run = randomUUID().slice(0, 6);
let userIds: string[] = [];
let postId: string;

async function likeCount() {
  const post = await db.query.posts.findFirst({ where: eq(posts.id, postId) });
  return post!.likeCount;
}

beforeAll(async () => {
  const created = await db
    .insert(users)
    .values(
      Array.from({ length: 5 }, (_, index) => ({
        username: `like_${run}_${index}`,
        name: `Liker ${index}`,
        email: `like-${run}-${index}@test.dev`,
        passwordHash: "x",
      })),
    )
    .returning({ id: users.id });
  userIds = created.map((user) => user.id);

  const [post] = await db
    .insert(posts)
    .values({ authorId: userIds[0]!, content: "integration test post" })
    .returning({ id: posts.id });
  postId = post!.id;
});

afterAll(async () => {
  await db.delete(users).where(inArray(users.id, userIds));
});

describe("setLike", () => {
  it("is idempotent for repeated likes from the same user", async () => {
    await Promise.all([1, 2, 3].map(() => setLike(userIds[1]!, postId, true)));
    expect(await likeCount()).toBe(1);
  });

  it("counts concurrent likes from different users correctly", async () => {
    await Promise.all(userIds.slice(2).map((userId) => setLike(userId, postId, true)));
    expect(await likeCount()).toBe(4);
  });

  it("never drops below zero and ignores unlikes that change nothing", async () => {
    await setLike(userIds[1]!, postId, false);
    await setLike(userIds[1]!, postId, false);
    expect(await likeCount()).toBe(3);
  });

  it("returns null for missing posts", async () => {
    expect(await setLike(userIds[1]!, randomUUID(), true)).toBeNull();
  });
});
