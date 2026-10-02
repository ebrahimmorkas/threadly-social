"use client";

import { useUnreadCount } from "./use-unread-count";

export function UnreadBadge({ initial }: { initial: number }) {
  const count = useUnreadCount(initial);
  if (count === 0) return null;
  return (
    <span
      className="absolute -top-1.5 -right-2 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand-600 px-1 text-[11px] font-bold text-white"
      aria-label={`${count} unread notifications`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
