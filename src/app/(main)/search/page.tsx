import type { Metadata } from "next";
import { SearchX } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { PostCard } from "@/components/posts/post-card";
import { SearchBox } from "@/components/search/search-box";
import { EmptyState } from "@/components/ui/empty-state";
import { UserRow } from "@/components/users/user-row";
import { getCurrentUser } from "@/lib/auth/session";
import { getCache } from "@/lib/cache";
import { searchPosts, searchUsers } from "@/lib/queries/search";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request";

export async function generateMetadata(props: PageProps<"/search">): Promise<Metadata> {
  const { q } = await props.searchParams;
  return {
    title: typeof q === "string" && q ? `“${q}” – Search` : "Search",
    robots: { index: false },
  };
}

export default async function SearchPage(props: PageProps<"/search">) {
  const { q } = await props.searchParams;
  const query = typeof q === "string" ? q.trim().slice(0, 100) : "";
  const viewer = await getCurrentUser();

  let content: React.ReactNode = (
    <p className="px-4 py-8 text-center text-slate-500">Search for people and posts.</p>
  );

  if (query) {
    const limit = await rateLimit(getCache(), {
      key: `search:${viewer?.id ?? (await getClientIp())}`,
      limit: 30,
      windowSeconds: 60,
    });

    if (!limit.success) {
      content = (
        <p className="px-4 py-8 text-center text-slate-500">
          Too many searches. Try again shortly.
        </p>
      );
    } else {
      const [people, posts] = await Promise.all([
        searchUsers(query, viewer?.id ?? null),
        searchPosts(query, viewer?.id ?? null),
      ]);

      content =
        people.length === 0 && posts.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={SearchX}
              title={`No results for “${query}”`}
              description="Try different keywords, a username, or remove filters like -word."
            />
          </div>
        ) : (
          <>
            {people.length > 0 && (
              <section className="border-b border-slate-200">
                <h2 className="px-4 pt-3 text-lg font-bold text-slate-900">People</h2>
                {people.map((person) => (
                  <UserRow key={person.id} user={person} viewerId={viewer?.id ?? null} />
                ))}
              </section>
            )}
            {posts.length > 0 && (
              <section>
                <h2 className="border-b border-slate-200 px-4 py-3 text-lg font-bold text-slate-900">
                  Posts
                </h2>
                {posts.map((post) => (
                  <PostCard key={post.id} post={post} viewerId={viewer?.id ?? null} />
                ))}
              </section>
            )}
          </>
        );
    }
  }

  return (
    <>
      <PageHeader title="Search" />
      <div className="border-b border-slate-200 p-4">
        <SearchBox defaultValue={query} autoFocus={!query} />
        <p className="mt-2 text-xs text-slate-500">
          Tip: use quotes for exact phrases and a minus sign to exclude words, e.g.{" "}
          <code>&quot;server actions&quot; -redux</code>
        </p>
      </div>
      {content}
    </>
  );
}
