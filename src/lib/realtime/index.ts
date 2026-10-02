import "server-only";
import { env } from "@/lib/env";
import { MemoryEventBus } from "./memory-bus";
import { RedisEventBus } from "./redis-bus";
import type { EventBus } from "./types";

export type { EventBus } from "./types";

const globalForBus = globalThis as unknown as { eventBus?: EventBus };

/** Redis pub/sub when `REDIS_URL` is set (multi-instance), otherwise in-process. */
export function getEventBus(): EventBus {
  globalForBus.eventBus ??= env.REDIS_URL ? new RedisEventBus(env.REDIS_URL) : new MemoryEventBus();
  return globalForBus.eventBus;
}

export const userChannel = (userId: string) => `user:${userId}`;

export type RealtimeEvent = { type: "notification"; unread: number };

/** Publishing is best-effort: a real-time hiccup must never fail the user's action. */
export async function publishToUser(userId: string, event: RealtimeEvent) {
  try {
    await getEventBus().publish(userChannel(userId), JSON.stringify(event));
  } catch (error) {
    console.warn("[realtime] publish failed:", error);
  }
}
