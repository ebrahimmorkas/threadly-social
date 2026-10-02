import { cn, initials } from "@/lib/utils";

const palette = [
  "bg-sky-500",
  "bg-violet-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-indigo-500",
  "bg-teal-500",
  "bg-fuchsia-500",
];

const sizes = {
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-16 text-xl",
  xl: "size-28 text-4xl border-4 border-white",
} as const;

function colorFor(seed: string) {
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return palette[hash % palette.length];
}

/** Deterministic initials avatar: the same user always gets the same colour. */
export function Avatar({
  name,
  username,
  size = "md",
  className,
}: {
  name: string;
  username: string;
  size?: keyof typeof sizes;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white select-none",
        colorFor(username),
        sizes[size],
        className,
      )}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}
