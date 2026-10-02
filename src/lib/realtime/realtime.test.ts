import { describe, expect, it, vi } from "vitest";
import { MemoryEventBus } from "./memory-bus";

describe("MemoryEventBus", () => {
  it("delivers messages only to subscribers of the channel", async () => {
    const bus = new MemoryEventBus();
    const alice = vi.fn();
    const bob = vi.fn();

    await bus.subscribe("user:alice", alice);
    await bus.subscribe("user:bob", bob);
    await bus.publish("user:alice", "hello");

    expect(alice).toHaveBeenCalledWith("hello");
    expect(bob).not.toHaveBeenCalled();
  });

  it("supports several subscribers and unsubscribing", async () => {
    const bus = new MemoryEventBus();
    const first = vi.fn();
    const second = vi.fn();

    const unsubscribe = await bus.subscribe("user:alice", first);
    await bus.subscribe("user:alice", second);
    await unsubscribe();
    await bus.publish("user:alice", "ping");

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledOnce();
    expect(bus.listenerCount("user:alice")).toBe(1);
  });
});
