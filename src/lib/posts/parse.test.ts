import { describe, expect, it } from "vitest";
import { extractHashtags, extractMentions, tokenize } from "./parse";

describe("tokenize", () => {
  it("splits text, hashtags, mentions and links", () => {
    expect(tokenize("Hi @Ada, loving #NextJS! See https://nextjs.org/docs.")).toEqual([
      { type: "text", value: "Hi " },
      { type: "mention", value: "@Ada", username: "ada" },
      { type: "text", value: ", loving " },
      { type: "tag", value: "#NextJS", tag: "nextjs" },
      { type: "text", value: "! See " },
      { type: "url", value: "https://nextjs.org/docs" },
      { type: "text", value: "." },
    ]);
  });

  it("ignores symbols inside words and URLs", () => {
    const segments = tokenize("email me@example.com or visit https://site.com/#section");
    expect(segments.some((segment) => segment.type === "mention")).toBe(false);
    expect(segments.some((segment) => segment.type === "tag")).toBe(false);
  });

  it("returns plain text unchanged", () => {
    expect(tokenize("just text")).toEqual([{ type: "text", value: "just text" }]);
  });

  it("requires hashtags to start with a letter", () => {
    expect(tokenize("#1 fan").some((segment) => segment.type === "tag")).toBe(false);
  });
});

describe("extractHashtags", () => {
  it("returns unique lowercase tags", () => {
    expect(extractHashtags("#React and #react and #TypeScript")).toEqual(["react", "typescript"]);
  });
});

describe("extractMentions", () => {
  it("returns unique lowercase usernames", () => {
    expect(extractMentions("@Ada @ada @grace_h hi")).toEqual(["ada", "grace_h"]);
  });

  it("ignores handles that are too short", () => {
    expect(extractMentions("@ab")).toEqual([]);
  });
});
