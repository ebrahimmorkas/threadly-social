"use client";

import { useEffect, useState } from "react";

type RealtimeEvent = { type: "notification"; unread: number };

const listeners = new Set<(count: number) => void>();
let source: EventSource | null = null;

/** One shared EventSource per tab, no matter how many components need the count. */
function connect() {
  if (source || typeof window === "undefined") return;
  source = new EventSource("/api/notifications/stream");
  source.onmessage = (message) => {
    try {
      const event = JSON.parse(message.data) as RealtimeEvent;
      if (event.type === "notification") {
        listeners.forEach((listener) => listener(event.unread));
      }
    } catch {
      // Ignore malformed events.
    }
  };
  // EventSource reconnects automatically using the server-provided retry interval.
}

function disconnectIfUnused() {
  if (listeners.size === 0 && source) {
    source.close();
    source = null;
  }
}

export function useUnreadCount(initial = 0) {
  const [count, setCount] = useState(initial);

  useEffect(() => {
    listeners.add(setCount);
    connect();
    return () => {
      listeners.delete(setCount);
      disconnectIfUnused();
    };
  }, []);

  return count;
}

export function subscribeToUnreadCount(listener: (count: number) => void) {
  listeners.add(listener);
  connect();
  return () => {
    listeners.delete(listener);
    disconnectIfUnused();
  };
}
