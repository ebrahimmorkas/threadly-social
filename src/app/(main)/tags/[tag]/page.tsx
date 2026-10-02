import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Hash } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Feed } from "@/components/posts/feed";
import { EmptyState } from "@/components/ui/empty-state";
import { getCurrentUser } from "@/lib/auth/session";
import { getFeed } from "@/lib/queries/posts";

const TAG_PATTERN = /^[a-z][a-z0-9_]{0,49}$/;

export async function generateMetadata(props: PageProps<"/tags/[tag]">): Promise<Metadata> {
  const { tag } = await props.params;
  return { title: `#${tag}`, description: `Posts tagged #${tag} on Threadly.` };
}

export default async function TagPage(props: PageProps<"/tags/[tag]">) {
  const tag = decodeURIComponent((await props.params).tag).toLowerCase();
  if (!TAG_PATTERN.test(tag)) notFound();

  const user = await getCurrentUser();
  const { posts, nextCursor } = await getFeed({ kind: "tag", tag }, { viewerId: user?.id ?? null });

  return (
    <>
      <PageHeader title={`#${tag}`} subtitle="Latest posts" backHref="/explore" />
      <Feed
        key={posts[0]?.id ?? "empty"}
        initialPosts={posts}
        initialCursor={nextCursor}
        params={{ kind: "tag", tag }}
        viewerId={user?.id ?? null}
        emptyState={
          <div className="p-4">
            <EmptyState icon={Hash} title={`No posts tagged #${tag} yet`} />
          </div>
        }
      />
    </>
  );
}
