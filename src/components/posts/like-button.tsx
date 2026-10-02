"use client";

import { useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { toggleLike } from "@/app/(main)/like-actions";
import { cn, compactNumber } from "@/lib/utils";

type LikeState = { liked: boolean; count: number };

/**
 * Like button with optimistic UI: the heart and counter update instantly, the server
 * action runs in a transition, and React automatically rolls back if it fails.
 */
export function LikeButton({
  postId,
  initialLiked,
  initialCount,
  signedIn,
  size = "md",
}: {
  postId: string;
  initialLiked: boolean;
  initialCount: number;
  signedIn: boolean;
  size?: "md" | "lg";
}) {
  const router = useRouter();
  const [state, setState] = useState<LikeState>({ liked: initialLiked, count: initialCount });
  const [optimistic, setOptimistic] = useOptimistic(state, (_current, next: LikeState) => next);
  const [, startTransition] = useTransition();

  function onClick(event: React.MouseEvent) {
    event.stopPropagation();
    if (!signedIn) {
      router.push(`/login?next=/post/${postId}`);
      return;
    }

    const next = {
      liked: !optimistic.liked,
      count: Math.max(0, optimistic.count + (optimistic.liked ? -1 : 1)),
    };

    startTransition(async () => {
      setOptimistic(next);
      const result = await toggleLike(postId, next.liked);
      if (result.ok) {
        // Reconcile with the server's authoritative count.
        setState({ liked: result.liked, count: result.likeCount });
      } else {
        toast.error(
          result.error === "rate-limited" ? "Slow down a little!" : "Couldn't update like",
        );
      }
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={optimistic.liked}
      aria-label={optimistic.liked ? "Unlike" : "Like"}
      className={cn(
        "group flex items-center gap-1.5 transition-colors hover:text-rose-600",
        optimistic.liked && "text-rose-600",
      )}
    >
      <span className="rounded-full p-1.5 group-hover:bg-rose-50">
        <Heart
          className={cn(
            size === "lg" ? "size-6" : "size-[18px]",
            "transition-transform group-active:scale-90",
            optimistic.liked && "fill-rose-500 text-rose-500",
          )}
          aria-hidden
        />
      </span>
      {optimistic.count > 0 && <span>{compactNumber(optimistic.count)}</span>}
    </button>
  );
}
