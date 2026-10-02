import { getCurrentUser } from "@/lib/auth/session";
import { getSuggestions } from "@/lib/queries/users";
import { UserRow } from "./user-row";

export async function WhoToFollow() {
  const viewer = await getCurrentUser();
  const suggestions = await getSuggestions(viewer?.id ?? null, 3);
  if (suggestions.length === 0) return null;

  return (
    <section className="overflow-hidden rounded-2xl bg-slate-50">
      <h2 className="px-4 pt-3 pb-1 text-lg font-bold text-slate-900">Who to follow</h2>
      {suggestions.map((user) => (
        <UserRow key={user.id} user={user} viewerId={viewer?.id ?? null} showBio={false} />
      ))}
    </section>
  );
}
