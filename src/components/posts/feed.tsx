"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import type { PostView } from "@/lib/queries/posts";
import { PostCard } from "./post-card";

type FeedParams = Record<string, string>;

/**
 * Infinite-scrolling feed. The first page is rendered on the server; further pages
 * are fetched from /api/feed with an opaque keyset cursor when the sentinel element
 * scrolls into view.
 */
export function Feed({
  initialPosts,
  initialCursor,
  params,
  viewerId,
  emptyState,
}: {
  initialPosts: PostView[];
  initialCursor: string | null;
  params: FeedParams;
  viewerId: string | null;
  emptyState?: React.ReactNode;
}) {
  const [posts, setPosts] = useState(initialPosts);
  const [cursor, setCursor] = useState(initialCursor);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);
  const inFlight = useRef(false);

  const loadMore = useCallback(async () => {
    if (!cursor || inFlight.current) return;
    inFlight.current = true;
    setLoading(true);
    setError(false);
    try {
      const search = new URLSearchParams({ ...params, cursor });
      const response = await fetch(`/api/feed?${search}`);
      if (!response.ok) throw new Error(`Feed request failed: ${response.status}`);
      const page: { posts: PostView[]; nextCursor: string | null } = await response.json();
      setPosts((current) => {
        // De-duplicate in case a post appears on two pages.
        const seen = new Set(current.map((post) => post.id));
        return [...current, ...page.posts.filter((post) => !seen.has(post.id))];
      });
      setCursor(page.nextCursor);
    } catch {
      setError(true);
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }, [cursor, params]);

  useEffect(() => {
    const element = sentinel.current;
    if (!element || !cursor) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) void loadMore();
      },
      { rootMargin: "600px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [cursor, loadMore]);

  if (posts.length === 0 && emptyState) return <>{emptyState}</>;

  return (
    <div>
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          viewerId={viewerId}
          onDeleted={(id) => setPosts((current) => current.filter((item) => item.id !== id))}
        />
      ))}

      <div ref={sentinel} className="flex justify-center py-6 text-sm text-slate-500">
        {loading && <Loader2 className="size-5 animate-spin text-brand-600" aria-label="Loading" />}
        {error && (
          <button
            type="button"
            onClick={() => void loadMore()}
            className="text-brand-600 hover:underline"
          >
            Couldn&apos;t load more posts. Retry
          </button>
        )}
        {!cursor && posts.length > 0 && <span>You&apos;re all caught up ✨</span>}
      </div>
    </div>
  );
}
