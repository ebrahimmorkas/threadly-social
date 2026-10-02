import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { Avatar } from "@/components/avatar";
import { PageHeader } from "@/components/layout/page-header";
import { Composer } from "@/components/posts/composer";
import { LikeButton } from "@/components/posts/like-button";
import { PostCard } from "@/components/posts/post-card";
import { PostContent } from "@/components/posts/post-content";
import { getCurrentUser } from "@/lib/auth/session";
import { getAncestors, getPost, getReplies } from "@/lib/queries/posts";
import { compactNumber } from "@/lib/utils";

async function load(id: string, viewerId: string | null) {
  if (!z.uuid().safeParse(id).success) return null;
  return getPost(id, viewerId);
}

export async function generateMetadata(props: PageProps<"/post/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const post = await load(id, null);
  if (!post) return { title: "Post not found" };
  const title = `${post.author.name} on Threadly`;
  return { title, description: post.content, openGraph: { title, description: post.content } };
}

const fullDate = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  month: "short",
  day: "numeric",
  year: "numeric",
});

export default async function PostPage(props: PageProps<"/post/[id]">) {
  const { id } = await props.params;
  const user = await getCurrentUser();
  const viewerId = user?.id ?? null;

  const post = await load(id, viewerId);
  if (!post) notFound();

  const [ancestors, replies] = await Promise.all([
    getAncestors(post.id, viewerId),
    getReplies(post.id, viewerId),
  ]);

  return (
    <>
      <PageHeader title="Post" backHref={user ? "/home" : "/explore"} />

      {ancestors.map((ancestor) => (
        <PostCard key={ancestor.id} post={ancestor} viewerId={viewerId} className="border-b-0" />
      ))}

      <article className="border-b border-slate-200 px-4 pt-3">
        <div className="flex items-center gap-3">
          <Link href={`/${post.author.username}`}>
            <Avatar name={post.author.name} username={post.author.username} />
          </Link>
          <div>
            <Link
              href={`/${post.author.username}`}
              className="font-semibold text-slate-900 hover:underline"
            >
              {post.author.name}
            </Link>
            <p className="text-sm text-slate-500">@{post.author.username}</p>
          </div>
        </div>
        <PostContent
          content={post.content}
          className="mt-3 text-xl leading-8 break-words whitespace-pre-wrap text-slate-900"
        />
        <time dateTime={post.createdAt} className="mt-3 block text-sm text-slate-500">
          {fullDate.format(new Date(post.createdAt))}
        </time>
        <div className="mt-3 flex gap-6 border-t border-slate-200 py-3 text-sm text-slate-500">
          <span>
            <strong className="text-slate-900">{compactNumber(post.replyCount)}</strong> Replies
          </span>
          <span>
            <strong className="text-slate-900">{compactNumber(post.likeCount)}</strong> Likes
          </span>
        </div>
        <div className="flex border-t border-slate-200 py-1 text-slate-500">
          <LikeButton
            key={post.likeCount}
            postId={post.id}
            initialLiked={post.likedByMe}
            initialCount={post.likeCount}
            signedIn={user !== null}
            size="lg"
          />
        </div>
      </article>

      {user ? (
        <Composer user={user} parentId={post.id} placeholder="Post your reply" />
      ) : (
        <p className="border-b border-slate-200 px-4 py-4 text-sm text-slate-600">
          <Link href={`/login?next=/post/${post.id}`} className="text-brand-600 hover:underline">
            Log in
          </Link>{" "}
          to join the conversation.
        </p>
      )}

      {replies.map((reply) => (
        <PostCard key={reply.id} post={reply} viewerId={viewerId} />
      ))}
    </>
  );
}
