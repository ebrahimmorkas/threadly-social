import Link from "next/link";
import { getTrendingTags } from "@/lib/queries/search";
import { compactNumber } from "@/lib/utils";

export async function TrendingTags() {
  const tags = await getTrendingTags(6);
  if (tags.length === 0) return null;

  return (
    <section className="overflow-hidden rounded-2xl bg-slate-50">
      <h2 className="px-4 pt-3 pb-1 text-lg font-bold text-slate-900">Trending this week</h2>
      <ol>
        {tags.map((item, index) => (
          <li key={item.tag}>
            <Link href={`/tags/${item.tag}`} className="block px-4 py-2.5 hover:bg-slate-100">
              <p className="text-xs text-slate-500">{index + 1} · Trending</p>
              <p className="font-semibold text-slate-900">#{item.tag}</p>
              <p className="text-xs text-slate-500">{compactNumber(item.posts)} posts</p>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
