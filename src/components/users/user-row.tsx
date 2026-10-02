import Link from "next/link";
import { Avatar } from "@/components/avatar";
import type { UserSummary } from "@/lib/queries/users";
import { FollowButton } from "./follow-button";

export function UserRow({
  user,
  viewerId,
  showBio = true,
}: {
  user: UserSummary;
  viewerId: string | null;
  showBio?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50">
      <Link href={`/${user.username}`}>
        <Avatar name={user.name} username={user.username} />
      </Link>
      <div className="min-w-0 flex-1">
        <Link
          href={`/${user.username}`}
          className="block truncate font-semibold text-slate-900 hover:underline"
        >
          {user.name}
        </Link>
        <p className="truncate text-sm text-slate-500">@{user.username}</p>
        {showBio && user.bio && <p className="mt-1 text-sm text-slate-700">{user.bio}</p>}
      </div>
      {viewerId !== user.id && (
        <FollowButton
          userId={user.id}
          initialFollowing={user.isFollowing}
          signedIn={viewerId !== null}
        />
      )}
    </div>
  );
}
