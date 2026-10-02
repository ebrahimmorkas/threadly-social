import type { Metadata } from "next";
import { Compass } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Feed } from "@/components/posts/feed";
import { EmptyState } from "@/components/ui/empty-state";
import { getCurrentUser } from "@/lib/auth/session";
import { getFeed } from "@/lib/queries/posts";

export const metadata: Metadata = {
  title: "Explore",
  description: "The latest posts from everyone on Threadly.",
};

export default async function ExplorePage() {
  const user = await getCurrentUser();
  const { posts, nextCursor } = await getFeed({ kind: "explore" }, { viewerId: user?.id ?? null });

  return (
    <>
      <PageHeader title="Explore" subtitle="Latest posts from everyone" />
      <Feed
        key={posts[0]?.id ?? "empty"}
        initialPosts={posts}
        initialCursor={nextCursor}
        params={{ kind: "explore" }}
        viewerId={user?.id ?? null}
        emptyState={
          <div className="p-4">
            <EmptyState
              icon={Compass}
              title="Nothing here yet"
              description="Be the first to post!"
            />
          </div>
        }
      />
    </>
  );
}
