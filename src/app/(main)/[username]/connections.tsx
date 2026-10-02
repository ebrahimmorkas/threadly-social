import Link from "next/link";
import { notFound } from "next/navigation";
import { Users } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { UserRow } from "@/components/users/user-row";
import { getCurrentUser } from "@/lib/auth/session";
import { getConnections, getProfile } from "@/lib/queries/users";
import { cn } from "@/lib/utils";

/** Shared page body for /{username}/followers and /{username}/following. */
export async function ConnectionsPage({
  username,
  direction,
}: {
  username: string;
  direction: "followers" | "following";
}) {
  const viewer = await getCurrentUser();
  const profile = await getProfile(username, viewer?.id ?? null);
  if (!profile) notFound();

  const people = await getConnections(profile.id, direction, viewer?.id ?? null);

  return (
    <>
      <PageHeader
        title={profile.name}
        subtitle={`@${profile.username}`}
        backHref={`/${profile.username}`}
      />
      <nav className="flex border-b border-slate-200">
        {(["followers", "following"] as const).map((item) => (
          <Link
            key={item}
            href={`/${profile.username}/${item}`}
            className={cn(
              "flex-1 py-3 text-center text-sm font-medium text-slate-500 capitalize hover:bg-slate-50",
              item === direction && "border-b-4 border-brand-500 font-bold text-slate-900",
            )}
          >
            {item}
          </Link>
        ))}
      </nav>
      {people.length === 0 ? (
        <div className="p-4">
          <EmptyState
            icon={Users}
            title={direction === "followers" ? "No followers yet" : "Not following anyone yet"}
          />
        </div>
      ) : (
        people.map((person) => (
          <UserRow key={person.id} user={person} viewerId={viewer?.id ?? null} />
        ))
      )}
    </>
  );
}
