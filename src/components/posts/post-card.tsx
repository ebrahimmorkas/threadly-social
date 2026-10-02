"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, MessageCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deletePost } from "@/app/(main)/post-actions";
import { Avatar } from "@/components/avatar";
import type { PostView } from "@/lib/queries/posts";
import { cn, compactNumber, relativeTime } from "@/lib/utils";
import { PostContent } from "./post-content";

export function PostCard({
  post,
  viewerId,
  onDeleted,
  className,
}: {
  post: PostView;
  viewerId: string | null;
  onDeleted?: (id: string) => void;
  className?: string;
}) {
  const router = useRouter();
  const [deleting, startDelete] = useTransition();
  const href = `/post/${post.id}`;

  function remove(event: React.MouseEvent) {
    event.stopPropagation();
    startDelete(async () => {
      await deletePost(post.id);
      onDeleted?.(post.id);
      toast.success("Post deleted");
    });
  }

  return (
    <article
      className={cn(
        "flex cursor-pointer gap-3 border-b border-slate-200 px-4 py-3 transition-colors hover:bg-slate-50",
        deleting && "opacity-50",
        className,
      )}
      onClick={() => router.push(href)}
    >
      <Link href={`/${post.author.username}`} onClick={(event) => event.stopPropagation()}>
        <Avatar name={post.author.name} username={post.author.username} />
      </Link>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1 text-[15px]">
          <Link
            href={`/${post.author.username}`}
            className="truncate font-semibold text-slate-900 hover:underline"
            onClick={(event) => event.stopPropagation()}
          >
            {post.author.name}
          </Link>
          <span className="truncate text-slate-500">@{post.author.username}</span>
          <span className="text-slate-500">·</span>
          <time
            dateTime={post.createdAt}
            className="shrink-0 text-slate-500"
            title={new Date(post.createdAt).toLocaleString()}
          >
            {relativeTime(post.createdAt)}
          </time>
        </div>

        {post.replyingTo && (
          <p className="text-sm text-slate-500">
            Replying to{" "}
            <Link
              href={`/${post.replyingTo}`}
              className="text-brand-600 hover:underline"
              onClick={(event) => event.stopPropagation()}
            >
              @{post.replyingTo}
            </Link>
          </p>
        )}

        <PostContent content={post.content} />

        <div className="mt-2 flex max-w-sm items-center justify-between text-sm text-slate-500">
          <Link
            href={href}
            className="group flex items-center gap-1.5 hover:text-brand-600"
            aria-label={`${post.replyCount} replies`}
            onClick={(event) => event.stopPropagation()}
          >
            <span className="rounded-full p-1.5 group-hover:bg-brand-50">
              <MessageCircle className="size-[18px]" aria-hidden />
            </span>
            {post.replyCount > 0 && compactNumber(post.replyCount)}
          </Link>

          <span className="flex items-center gap-1.5" aria-label={`${post.likeCount} likes`}>
            <span className="p-1.5">
              <Heart
                className={cn("size-[18px]", post.likedByMe && "fill-rose-500 text-rose-500")}
                aria-hidden
              />
            </span>
            {post.likeCount > 0 && compactNumber(post.likeCount)}
          </span>

          {viewerId === post.author.id ? (
            <button
              type="button"
              onClick={remove}
              disabled={deleting}
              className="group rounded-full p-1.5 hover:bg-red-50 hover:text-red-600"
              aria-label="Delete post"
            >
              <Trash2 className="size-[18px]" aria-hidden />
            </button>
          ) : (
            <span className="w-8" />
          )}
        </div>
      </div>
    </article>
  );
}
