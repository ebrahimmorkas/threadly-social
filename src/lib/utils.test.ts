import { describe, expect, it } from "vitest";
import { compactNumber, escapeLike, initials, relativeTime } from "./utils";

describe("compactNumber", () => {
  it("abbreviates large numbers", () => {
    expect(compactNumber(999)).toBe("999");
    expect(compactNumber(1234)).toBe("1.2K");
    expect(compactNumber(2_500_000)).toBe("2.5M");
  });
});

describe("relativeTime", () => {
  const now = new Date("2026-06-15T12:00:00Z");
  const ago = (ms: number) => new Date(now.getTime() - ms);

  it.each([
    [10_000, "now"],
    [5 * 60_000, "5m"],
    [3 * 3_600_000, "3h"],
    [2 * 86_400_000, "2d"],
  ])("formats %ims ago as %s", (ms, expected) => {
    expect(relativeTime(ago(ms), now)).toBe(expected);
  });

  it("uses dates for older posts", () => {
    expect(relativeTime(new Date("2026-03-01T12:00:00Z"), now)).toBe("Mar 1");
    expect(relativeTime(new Date("2024-03-01T12:00:00Z"), now)).toBe("Mar 1, 2024");
  });
});

describe("initials", () => {
  it("returns up to two initials", () => {
    expect(initials("Ada Lovelace")).toBe("AL");
    expect(initials("Grace  Brewster Hopper")).toBe("GB");
    expect(initials("plato")).toBe("P");
  });
});

describe("escapeLike", () => {
  it("escapes LIKE wildcards and backslashes", () => {
    expect(escapeLike(String.raw`100%_done\ `)).toBe(String.raw`100\%\_done\\ `);
  });

  it("leaves normal text untouched", () => {
    expect(escapeLike("ada lovelace")).toBe("ada lovelace");
  });
});
