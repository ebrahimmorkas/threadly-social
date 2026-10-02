import { getCurrentUser } from "@/lib/auth/session";
import { getUnreadCount } from "@/lib/notifications";
import { getEventBus, userChannel } from "@/lib/realtime";

export const dynamic = "force-dynamic";

const HEARTBEAT_MS = 25_000;

/**
 * Server-Sent Events stream of real-time updates for the signed-in user.
 * Each connection subscribes to the user's channel on the event bus (Redis pub/sub
 * when configured, so updates published by any instance reach this connection).
 */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const encoder = new TextEncoder();
  let cleanup: (() => Promise<void>) | undefined;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (data: string) => {
        try {
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        } catch {
          // Stream already closed.
        }
      };

      // Tell the browser to wait 5s before reconnecting after a drop.
      controller.enqueue(encoder.encode("retry: 5000\n\n"));
      send(JSON.stringify({ type: "notification", unread: await getUnreadCount(user.id) }));

      const unsubscribe = await getEventBus().subscribe(userChannel(user.id), send);
      // Comment lines keep proxies and load balancers from closing an idle connection.
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": ping\n\n"));
        } catch {
          clearInterval(heartbeat);
        }
      }, HEARTBEAT_MS);

      cleanup = async () => {
        clearInterval(heartbeat);
        await unsubscribe();
      };

      request.signal.addEventListener("abort", () => {
        void cleanup?.();
        try {
          controller.close();
        } catch {
          // Already closed.
        }
      });
    },
    async cancel() {
      await cleanup?.();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
