"use client";

import { useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { toggleFollow } from "@/app/(main)/user-actions";
import { Button } from "@/components/ui/button";

export function FollowButton({
  userId,
  initialFollowing,
  signedIn,
  onChange,
  refreshOnChange = false,
  size = "sm",
}: {
  userId: string;
  initialFollowing: boolean;
  signedIn: boolean;
  onChange?: (following: boolean, followersCount: number) => void;
  /** Re-render server components (e.g. profile follower counts) after a change. */
  refreshOnChange?: boolean;
  size?: "sm" | "md";
}) {
  const router = useRouter();
  const [following, setFollowing] = useState(initialFollowing);
  const [optimistic, setOptimistic] = useOptimistic(following);
  const [hovering, setHovering] = useState(false);
  const [, startTransition] = useTransition();

  function onClick(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (!signedIn) {
      router.push("/login");
      return;
    }
    const next = !optimistic;
    startTransition(async () => {
      setOptimistic(next);
      const result = await toggleFollow(userId, next);
      if (result.ok) {
        setFollowing(result.following);
        onChange?.(result.following, result.followersCount);
        if (refreshOnChange) router.refresh();
      } else {
        toast.error(
          result.error === "rate-limited" ? "Slow down a little!" : "Couldn't update follow",
        );
      }
    });
  }

  if (optimistic) {
    return (
      <Button
        size={size}
        variant={hovering ? "destructive" : "outline"}
        onClick={onClick}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        aria-pressed
        className="min-w-24"
      >
        {hovering ? "Unfollow" : "Following"}
      </Button>
    );
  }

  return (
    <Button
      size={size}
      onClick={onClick}
      aria-pressed={false}
      className="min-w-24 bg-slate-900 hover:bg-slate-700"
    >
      Follow
    </Button>
  );
}
