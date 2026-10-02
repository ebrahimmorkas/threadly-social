export type EventHandler = (message: string) => void;

/**
 * Minimal publish/subscribe contract used to push real-time events
 * (e.g. new notifications) to connected clients.
 */
export interface EventBus {
  readonly driver: "redis" | "memory";
  publish(channel: string, message: string): Promise<void>;
  /** Subscribes to a channel and returns an unsubscribe function. */
  subscribe(channel: string, handler: EventHandler): Promise<() => Promise<void>>;
}
