import { type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { decodeCursor } from "@/lib/posts/cursor";
import { getFeed, type FeedQuery } from "@/lib/queries/posts";

const paramsSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("explore") }),
  z.object({ kind: z.literal("following") }),
  z.object({
    kind: z.literal("profile"),
    username: z.string().toLowerCase(),
    replies: z.enum(["1", "0"]).optional(),
  }),
  z.object({ kind: z.literal("tag"), tag: z.string().toLowerCase().max(50) }),
]);

/** Next page of any feed, used by the infinite-scroll client component. */
export async function GET(request: NextRequest) {
  const params = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = paramsSchema.safeParse(params);
  if (!parsed.success) return Response.json({ error: "Invalid feed" }, { status: 400 });

  const viewer = await getCurrentUser();
  let query: FeedQuery;

  switch (parsed.data.kind) {
    case "explore":
      query = { kind: "explore" };
      break;
    case "following":
      if (!viewer) return Response.json({ error: "Unauthorized" }, { status: 401 });
      query = { kind: "following", userId: viewer.id };
      break;
    case "profile": {
      const author = await db.query.users.findFirst({
        where: eq(users.username, parsed.data.username),
        columns: { id: true },
      });
      if (!author) return Response.json({ error: "Not found" }, { status: 404 });
      query = { kind: "profile", authorId: author.id, replies: parsed.data.replies === "1" };
      break;
    }
    case "tag":
      query = { kind: "tag", tag: parsed.data.tag };
      break;
  }

  const page = await getFeed(query, {
    viewerId: viewer?.id ?? null,
    cursor: decodeCursor(params.cursor),
  });

  return Response.json(page, { headers: { "Cache-Control": "private, no-store" } });
}
