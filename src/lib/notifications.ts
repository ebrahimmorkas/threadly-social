import "server-only";
import { and, count, desc, eq, inArray, isNull, ne } from "drizzle-orm";
import { db } from "@/db";
import { notifications, posts, users, type NotificationType } from "@/db/schema";
import { publishToUser } from "@/lib/realtime";

type NewNotification = {
  recipientId: string;
  actorId: string;
  type: NotificationType;
  postId?: string | null;
};

export async function getUnreadCount(userId: string) {
  // Served by the partial index on unread notifications.
  const [{ value }] = await db
    .select({ value: count() })
    .from(notifications)
    .where(and(eq(notifications.recipientId, userId), isNull(notifications.readAt)));
  return value;
}

/** Pushes the latest unread count to every open tab of the recipient (any instance). */
async function pushUnreadCount(userId: string) {
  await publishToUser(userId, { type: "notification", unread: await getUnreadCount(userId) });
}

/**
 * Stores notifications and pushes real-time updates. Self-notifications are skipped.
 * Failures are logged, never thrown: notifying is a side effect of the user's action.
 */
export async function notify(items: NewNotification[]) {
  const rows = items.filter((item) => item.recipientId !== item.actorId);
  if (rows.length === 0) return;

  try {
    await db.insert(notifications).values(rows);
    const recipients = [...new Set(rows.map((row) => row.recipientId))];
    await Promise.all(recipients.map(pushUnreadCount));
  } catch (error) {
    console.error("[notifications] failed to notify:", error);
  }
}

/** Avoids notification spam when someone likes, unlikes and likes again. */
export async function notifyLike(actorId: string, postId: string, authorId: string) {
  const existing = await db.query.notifications.findFirst({
    where: and(
      eq(notifications.actorId, actorId),
      eq(notifications.postId, postId),
      eq(notifications.type, "like"),
    ),
    columns: { id: true },
  });
  if (!existing) await notify([{ recipientId: authorId, actorId, type: "like", postId }]);
}

export async function notifyFollow(actorId: string, followingId: string) {
  const existing = await db.query.notifications.findFirst({
    where: and(
      eq(notifications.actorId, actorId),
      eq(notifications.recipientId, followingId),
      eq(notifications.type, "follow"),
    ),
    columns: { id: true },
  });
  if (!existing) await notify([{ recipientId: followingId, actorId, type: "follow" }]);
}

/** Notifies the parent author of a reply and anyone @mentioned in the post. */
export async function notifyPostCreated({
  actorId,
  postId,
  parentId,
  mentions,
}: {
  actorId: string;
  postId: string;
  parentId?: string;
  mentions: string[];
}) {
  const items: NewNotification[] = [];
  let parentAuthorId: string | undefined;

  if (parentId) {
    const parent = await db.query.posts.findFirst({
      where: eq(posts.id, parentId),
      columns: { authorId: true },
    });
    parentAuthorId = parent?.authorId;
    if (parentAuthorId) items.push({ recipientId: parentAuthorId, actorId, type: "reply", postId });
  }

  if (mentions.length > 0) {
    const mentioned = await db
      .select({ id: users.id })
      .from(users)
      .where(and(inArray(users.username, mentions.slice(0, 10)), ne(users.id, actorId)));
    for (const user of mentioned) {
      // The parent author already gets a "reply" notification.
      if (user.id !== parentAuthorId) {
        items.push({ recipientId: user.id, actorId, type: "mention", postId });
      }
    }
  }

  await notify(items);
}

export async function listNotifications(userId: string, limit = 50) {
  return db
    .select({
      id: notifications.id,
      type: notifications.type,
      readAt: notifications.readAt,
      createdAt: notifications.createdAt,
      actor: { username: users.username, name: users.name },
      post: { id: posts.id, content: posts.content },
    })
    .from(notifications)
    .innerJoin(users, eq(notifications.actorId, users.id))
    .leftJoin(posts, eq(notifications.postId, posts.id))
    .where(eq(notifications.recipientId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function markAllRead(userId: string) {
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.recipientId, userId), isNull(notifications.readAt)));
  await pushUnreadCount(userId);
}
