import { z } from "zod";

/**
 * Keyset pagination cursor. Feeds are ordered by (created_at desc, id desc); the cursor
 * is the position of the last item returned, so the next page is "everything strictly
 * older than this". Unlike OFFSET, this stays fast and never skips or repeats posts
 * when new posts are inserted while a user scrolls.
 */
export type Cursor = { createdAt: string; id: string };

const cursorSchema = z.object({ createdAt: z.iso.datetime({ offset: true }), id: z.uuid() });

export function encodeCursor(cursor: Cursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString("base64url");
}

/** Returns null for missing or tampered cursors instead of throwing. */
export function decodeCursor(value: string | null | undefined): Cursor | null {
  if (!value) return null;
  try {
    const parsed = cursorSchema.safeParse(JSON.parse(Buffer.from(value, "base64url").toString()));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
