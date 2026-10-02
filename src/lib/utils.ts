import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const compactFormatter = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

/** 1234 -> "1.2K" */
export function compactNumber(value: number) {
  return compactFormatter.format(value);
}

const dateFormatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
const yearFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

/** Social-style timestamps: "now", "5m", "3h", "Sep 14", "Sep 14, 2024". */
export function relativeTime(date: Date | string, now: Date = new Date()) {
  const value = typeof date === "string" ? new Date(date) : date;
  const seconds = Math.floor((now.getTime() - value.getTime()) / 1000);

  if (seconds < 45) return "now";
  if (seconds < 60 * 60) return `${Math.max(1, Math.round(seconds / 60))}m`;
  if (seconds < 60 * 60 * 24) return `${Math.round(seconds / 3600)}h`;
  if (seconds < 60 * 60 * 24 * 7) return `${Math.round(seconds / 86400)}d`;
  return value.getFullYear() === now.getFullYear()
    ? dateFormatter.format(value)
    : yearFormatter.format(value);
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
