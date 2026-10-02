import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, Link2, MapPin, MessageSquareText } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { PageHeader } from "@/components/layout/page-header";
import { Feed } from "@/components/posts/feed";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { FollowButton } from "@/components/users/follow-button";
import { getCurrentUser } from "@/lib/auth/session";
import { getFeed } from "@/lib/queries/posts";
import { getProfile } from "@/lib/queries/users";
import { cn, compactNumber } from "@/lib/utils";

export async function generateMetadata(props: PageProps<"/[username]">): Promise<Metadata> {
  const { username } = await props.params;
  const profile = await getProfile(username, null);
  if (!profile) return { title: "Profile not found" };
  const title = `${profile.name} (@${profile.username})`;
  return {
    title,
    description: profile.bio || `Posts from ${profile.name} on Threadly.`,
    openGraph: { title, description: profile.bio, type: "profile" },
  };
}

const joined = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" });

export default async function ProfilePage(props: PageProps<"/[username]">) {
  const { username } = await props.params;
  const { tab } = await props.searchParams;
  const viewer = await getCurrentUser();
  const profile = await getProfile(username, viewer?.id ?? null);
  if (!profile) notFound();

  const showReplies = tab === "replies";
  const { posts, nextCursor } = await getFeed(
    { kind: "profile", authorId: profile.id, replies: showReplies },
    { viewerId: viewer?.id ?? null },
  );
  const isSelf = viewer?.id === profile.id;

  return (
    <>
      <PageHeader
        title={profile.name}
        subtitle={`${compactNumber(profile.postsCount)} posts`}
        backHref="/explore"
      />

      <div className="h-36 bg-gradient-to-r from-brand-500 via-sky-400 to-indigo-500" />
      <div className="border-b border-slate-200 px-4 pb-4">
        <div className="flex items-end justify-between">
          <Avatar name={profile.name} username={profile.username} size="xl" className="-mt-14" />
          <div className="pt-3">
            {isSelf ? (
              <Link href="/settings" className={buttonVariants({ variant: "outline", size: "sm" })}>
                Edit profile
              </Link>
            ) : (
              <FollowButton
                userId={profile.id}
                initialFollowing={Boolean(profile.isFollowing)}
                signedIn={viewer !== null}
                refreshOnChange
                size="md"
              />
            )}
          </div>
        </div>

        <h2 className="mt-3 text-xl font-extrabold text-slate-900">{profile.name}</h2>
        <p className="text-slate-500">
          @{profile.username}
          {profile.followsYou && (
            <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">
              Follows you
            </span>
          )}
        </p>
        {profile.bio && <p className="mt-3 text-slate-900">{profile.bio}</p>}

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
          {profile.location && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-4" aria-hidden /> {profile.location}
            </span>
          )}
          {profile.website && (
            <a
              href={profile.website}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="inline-flex items-center gap-1 text-brand-600 hover:underline"
            >
              <Link2 className="size-4" aria-hidden />
              {profile.website.replace(/^https?:\/\//, "")}
            </a>
          )}
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="size-4" aria-hidden /> Joined{" "}
            {joined.format(profile.createdAt)}
          </span>
        </div>

        <div className="mt-3 flex gap-5 text-sm">
          <Link href={`/${profile.username}/following`} className="hover:underline">
            <strong className="text-slate-900">{compactNumber(profile.followingCount)}</strong>{" "}
            <span className="text-slate-500">Following</span>
          </Link>
          <Link href={`/${profile.username}/followers`} className="hover:underline">
            <strong className="text-slate-900">{compactNumber(profile.followersCount)}</strong>{" "}
            <span className="text-slate-500">Followers</span>
          </Link>
        </div>
      </div>

      <nav className="flex border-b border-slate-200" aria-label="Profile tabs">
        {[
          { label: "Posts", href: `/${profile.username}`, active: !showReplies },
          { label: "Replies", href: `/${profile.username}?tab=replies`, active: showReplies },
        ].map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className={cn(
              "flex-1 py-3 text-center text-sm font-medium text-slate-500 hover:bg-slate-50",
              item.active && "border-b-4 border-brand-500 font-bold text-slate-900",
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <Feed
        key={`${showReplies}-${posts[0]?.id ?? "empty"}`}
        initialPosts={posts}
        initialCursor={nextCursor}
        params={{ kind: "profile", username: profile.username, replies: showReplies ? "1" : "0" }}
        viewerId={viewer?.id ?? null}
        emptyState={
          <div className="p-4">
            <EmptyState
              icon={MessageSquareText}
              title={showReplies ? "No replies yet" : "No posts yet"}
              description={
                isSelf
                  ? "When you post, it will show up here."
                  : `@${profile.username} hasn't posted yet.`
              }
            />
          </div>
        }
      />
    </>
  );
}
