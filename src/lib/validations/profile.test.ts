import { describe, expect, it } from "vitest";
import { profileSchema } from "./profile";

describe("profileSchema", () => {
  it("adds https:// to bare domains", () => {
    expect(profileSchema.parse({ name: "Ada", website: "ada.dev" }).website).toBe(
      "https://ada.dev",
    );
  });

  it("allows an empty website", () => {
    expect(profileSchema.parse({ name: "Ada", website: "" }).website).toBe("");
  });

  it.each(["javascript:alert(1)", "ftp://files.example.com", "not a url"])(
    "rejects unsafe or invalid website %s",
    (website) => {
      expect(profileSchema.safeParse({ name: "Ada", website }).success).toBe(false);
    },
  );

  it("limits bio length", () => {
    expect(profileSchema.safeParse({ name: "Ada", bio: "x".repeat(161) }).success).toBe(false);
  });
});
