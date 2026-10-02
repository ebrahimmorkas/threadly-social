"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { subscribeToUnreadCount } from "@/components/notifications/use-unread-count";
import { markNotificationsRead } from "./actions";

/**
 * While the notifications page is open: mark everything as read, and when a new
 * notification arrives over SSE, re-render the list and mark it read again.
 */
export function LiveUpdates() {
  const router = useRouter();
  const busy = useRef(false);

  useEffect(() => {
    void markNotificationsRead();

    return subscribeToUnreadCount((unread) => {
      if (unread === 0 || busy.current) return;
      busy.current = true;
      router.refresh();
      void markNotificationsRead().finally(() => {
        busy.current = false;
      });
    });
  }, [router]);

  return null;
}
