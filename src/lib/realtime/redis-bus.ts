import Redis from "ioredis";
import type { EventBus, EventHandler } from "./types";

/**
 * Redis pub/sub event bus. A subscribed Redis connection cannot run other commands,
 * so publishing and subscribing use separate connections. Many local handlers share
 * a single Redis subscription per channel.
 */
export class RedisEventBus implements EventBus {
  readonly driver = "redis" as const;
  private readonly publisher: Redis;
  private readonly subscriber: Redis;
  private readonly handlers = new Map<string, Set<EventHandler>>();

  constructor(url: string) {
    const options = { maxRetriesPerRequest: 1, connectTimeout: 2_000 };
    this.publisher = new Redis(url, options);
    this.subscriber = new Redis(url, options);
    this.publisher.on("error", () => {});
    this.subscriber.on("error", () => {});

    this.subscriber.on("message", (channel: string, message: string) => {
      this.handlers.get(channel)?.forEach((handler) => handler(message));
    });
  }

  async publish(channel: string, message: string) {
    await this.publisher.publish(channel, message);
  }

  async subscribe(channel: string, handler: EventHandler) {
    let channelHandlers = this.handlers.get(channel);
    if (!channelHandlers) {
      channelHandlers = new Set();
      this.handlers.set(channel, channelHandlers);
      await this.subscriber.subscribe(channel);
    }
    channelHandlers.add(handler);

    return async () => {
      const current = this.handlers.get(channel);
      if (!current) return;
      current.delete(handler);
      if (current.size === 0) {
        this.handlers.delete(channel);
        await this.subscriber.unsubscribe(channel).catch(() => {});
      }
    };
  }

  async close() {
    await Promise.all([this.publisher.quit(), this.subscriber.quit()]).catch(() => {});
  }
}
