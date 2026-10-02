import { afterAll, describe, expect, it } from "vitest";
import { RedisEventBus } from "./redis-bus";

const url = process.env.REDIS_URL;

describe.skipIf(!url)("RedisEventBus (requires REDIS_URL)", () => {
  // Two buses simulate two app instances connected to the same Redis.
  const instanceA = new RedisEventBus(url!);
  const instanceB = new RedisEventBus(url!);

  afterAll(async () => {
    await Promise.all([instanceA.close(), instanceB.close()]);
  });

  it("delivers events published on one instance to subscribers on another", async () => {
    const channel = `test:${Date.now()}`;
    const received = new Promise<string>((resolve) => {
      void instanceB.subscribe(channel, resolve);
    });
    // Give Redis a moment to register the subscription.
    await new Promise((resolve) => setTimeout(resolve, 200));

    await instanceA.publish(channel, "hello from A");
    await expect(received).resolves.toBe("hello from A");
  });
});
