import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { users } from "@/db/schema";
import { setFollow } from "./follows";

const run = randomUUID().slice(0, 6);
let alice: string;
let bob: string;

async function counts(id: string) {
  const user = await db.query.users.findFirst({ where: eq(users.id, id) });
  return { followers: user!.followersCount, following: user!.followingCount };
}

beforeAll(async () => {
  const created = await db
    .insert(users)
    .values(
      ["alice", "bob"].map((name) => ({
        username: `${name}_${run}`,
        name,
        email: `${name}-${run}@test.dev`,
        passwordHash: "x",
      })),
    )
    .returning({ id: users.id });
  [alice, bob] = created.map((user) => user.id) as [string, string];
});

afterAll(async () => {
  await db.delete(users).where(inArray(users.id, [alice, bob]));
});

describe("setFollow", () => {
  it("updates both users' counters exactly once under concurrent follows", async () => {
    await Promise.all([1, 2, 3].map(() => setFollow(alice, bob, true)));
    expect(await counts(bob)).toMatchObject({ followers: 1 });
    expect(await counts(alice)).toMatchObject({ following: 1 });
  });

  it("unfollows idempotently without going negative", async () => {
    await setFollow(alice, bob, false);
    await setFollow(alice, bob, false);
    expect(await counts(bob)).toMatchObject({ followers: 0 });
    expect(await counts(alice)).toMatchObject({ following: 0 });
  });

  it("rejects self-follows and unknown users", async () => {
    expect(await setFollow(alice, alice, true)).toBeNull();
    expect(await setFollow(alice, randomUUID(), true)).toBeNull();
  });
});
