import { EventEmitter } from "node:events";
import type { EventBus, EventHandler } from "./types";

/**
 * In-process event bus. Perfect for development and single-instance deployments;
 * with several instances, use Redis so events reach clients connected to any instance.
 */
export class MemoryEventBus implements EventBus {
  readonly driver = "memory" as const;
  private readonly emitter = new EventEmitter();

  constructor() {
    // Each open SSE connection adds a listener; lift the default warning threshold.
    this.emitter.setMaxListeners(0);
  }

  async publish(channel: string, message: string) {
    this.emitter.emit(channel, message);
  }

  async subscribe(channel: string, handler: EventHandler) {
    this.emitter.on(channel, handler);
    return async () => {
      this.emitter.off(channel, handler);
    };
  }

  listenerCount(channel: string) {
    return this.emitter.listenerCount(channel);
  }
}
