import { randomUUID } from "node:crypto";
import { inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { posts, users } from "@/db/schema";
import { getEventBus, userChannel } from "@/lib/realtime";
import {
  getUnreadCount,
  listNotifications,
  markAllRead,
  notifyLike,
  notifyPostCreated,
} from "./notifications";

const run = randomUUID().slice(0, 6);
let author: { id: string; username: string };
let fan: { id: string; username: string };
let postId: string;

beforeAll(async () => {
  [author, fan] = (await db
    .insert(users)
    .values(
      ["author", "fan"].map((name) => ({
        username: `${name}_${run}`,
        name,
        email: `${name}-${run}@test.dev`,
        passwordHash: "x",
      })),
    )
    .returning({ id: users.id, username: users.username })) as [typeof author, typeof fan];

  const [post] = await db
    .insert(posts)
    .values({ authorId: author.id, content: "hello" })
    .returning({ id: posts.id });
  postId = post!.id;
});

afterAll(async () => {
  await db.delete(users).where(inArray(users.id, [author.id, fan.id]));
});

describe("notifications", () => {
  it("stores a like once and pushes the unread count in real time", async () => {
    const received = vi.fn();
    const unsubscribe = await getEventBus().subscribe(userChannel(author.id), received);

    await notifyLike(fan.id, postId, author.id);
    await notifyLike(fan.id, postId, author.id); // like → unlike → like again

    expect(await getUnreadCount(author.id)).toBe(1);
    // With Redis pub/sub, delivery is asynchronous.
    await vi.waitFor(() =>
      expect(received).toHaveBeenCalledWith(JSON.stringify({ type: "notification", unread: 1 })),
    );
    await unsubscribe();
  });

  it("notifies the parent author of a reply and mentioned users, never the actor", async () => {
    await notifyPostCreated({
      actorId: fan.id,
      postId,
      parentId: postId,
      mentions: [author.username, fan.username],
    });

    const items = await listNotifications(author.id);
    expect(items.map((item) => item.type).sort()).toEqual(["like", "reply"]);
    expect(await getUnreadCount(fan.id)).toBe(0);
  });

  it("marks everything as read", async () => {
    await markAllRead(author.id);
    expect(await getUnreadCount(author.id)).toBe(0);
  });
});
