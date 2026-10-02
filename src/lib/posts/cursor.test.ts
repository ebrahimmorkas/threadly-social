import { describe, expect, it } from "vitest";
import { decodeCursor, encodeCursor } from "./cursor";

describe("feed cursor", () => {
  const cursor = {
    createdAt: "2026-06-15T12:34:56.789Z",
    id: "3f1c2b8e-7a6d-4c5b-9e8f-1a2b3c4d5e6f",
  };

  it("round-trips through an opaque URL-safe string", () => {
    const encoded = encodeCursor(cursor);
    expect(encoded).toMatch(/^[\w-]+$/);
    expect(decodeCursor(encoded)).toEqual(cursor);
  });

  it.each([null, undefined, "", "not-base64!!", encodeCursor({ ...cursor, id: "nope" })])(
    "rejects invalid cursor %s",
    (value) => {
      expect(decodeCursor(value)).toBeNull();
    },
  );
});
