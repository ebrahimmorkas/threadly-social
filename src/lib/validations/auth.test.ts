import { describe, expect, it } from "vitest";
import { registerSchema, usernameSchema } from "./auth";

describe("usernameSchema", () => {
  it("normalises usernames to lowercase", () => {
    expect(usernameSchema.parse("  Ada_Lovelace ")).toBe("ada_lovelace");
  });

  it.each(["ab", "a".repeat(21), "has space", "dash-name", "emoji😀"])(
    "rejects invalid username %s",
    (value) => {
      expect(usernameSchema.safeParse(value).success).toBe(false);
    },
  );

  it("rejects reserved route names", () => {
    expect(usernameSchema.safeParse("Explore").success).toBe(false);
    expect(usernameSchema.safeParse("settings").success).toBe(false);
  });
});

describe("registerSchema", () => {
  it("accepts a valid registration", () => {
    const result = registerSchema.parse({
      name: "Ada Lovelace",
      username: "Ada",
      email: " ADA@example.com",
      password: "engines123",
    });
    expect(result).toMatchObject({ username: "ada", email: "ada@example.com" });
  });

  it("requires a password with letters and digits", () => {
    const result = registerSchema.safeParse({
      name: "Ada",
      username: "ada",
      email: "ada@example.com",
      password: "12345678",
    });
    expect(result.success).toBe(false);
  });
});
