import type { Metadata } from "next";
import Link from "next/link";
import { Users } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Composer } from "@/components/posts/composer";
import { Feed } from "@/components/posts/feed";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { requireUser } from "@/lib/auth/guards";
import { getFeed } from "@/lib/queries/posts";

export const metadata: Metadata = { title: "Home" };

export default async function HomePage() {
  const user = await requireUser("/home");
  const { posts, nextCursor } = await getFeed(
    { kind: "following", userId: user.id },
    { viewerId: user.id },
  );

  return (
    <>
      <PageHeader title="Home" />
      <Composer user={user} />
      <Feed
        // Remount when the server sends a fresh first page (e.g. after posting).
        key={posts[0]?.id ?? "empty"}
        initialPosts={posts}
        initialCursor={nextCursor}
        params={{ kind: "following" }}
        viewerId={user.id}
        emptyState={
          <div className="p-4">
            <EmptyState
              icon={Users}
              title="Your timeline is quiet"
              description="Follow people to see their posts here, or share your first post above."
              action={
                <Link href="/explore" className={buttonVariants()}>
                  Explore posts
                </Link>
              }
            />
          </div>
        }
      />
    </>
  );
}
