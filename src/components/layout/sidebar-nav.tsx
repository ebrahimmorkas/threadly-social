import Link from "next/link";
import { AtSign, Bell, Compass, Home, LogOut, User } from "lucide-react";
import { logout } from "@/app/(auth)/actions";
import { Avatar } from "@/components/avatar";
import { UnreadBadge } from "@/components/notifications/unread-badge";
import { buttonVariants } from "@/components/ui/button";
import type { SessionUser } from "@/lib/auth/session";
import { NavLink } from "./nav-link";

export function SidebarNav({
  user,
  unreadCount = 0,
}: {
  user: SessionUser | null;
  unreadCount?: number;
}) {
  return (
    <div className="flex h-full flex-col justify-between py-4">
      <div className="space-y-1">
        <Link
          href={user ? "/home" : "/"}
          className="mb-4 flex items-center gap-2 px-3 text-xl font-bold text-slate-900"
        >
          <span className="flex size-9 items-center justify-center rounded-xl bg-brand-600 text-white">
            <AtSign className="size-5" aria-hidden />
          </span>
          <span className="hidden xl:inline">Threadly</span>
        </Link>

        {user && <NavLink href="/home" icon={<Home />} label="Home" />}
        <NavLink href="/explore" icon={<Compass />} label="Explore" />
        {user && (
          <NavLink
            href="/notifications"
            icon={<Bell />}
            label="Notifications"
            badge={<UnreadBadge initial={unreadCount} />}
          />
        )}
        {user && <NavLink href={`/${user.username}`} icon={<User />} label="Profile" />}
      </div>

      {user ? (
        <div className="space-y-2">
          <div className="flex items-center gap-3 rounded-full px-3 py-2">
            <Avatar name={user.name} username={user.username} />
            <div className="hidden min-w-0 xl:block">
              <p className="truncate text-sm font-semibold text-slate-900">{user.name}</p>
              <p className="truncate text-sm text-slate-500">@{user.username}</p>
            </div>
          </div>
          <form action={logout}>
            <button
              type="submit"
              className="flex w-full items-center gap-4 rounded-full px-3 py-2.5 text-slate-700 hover:bg-slate-100"
            >
              <LogOut className="size-6" aria-hidden />
              <span className="hidden xl:inline">Log out</span>
            </button>
          </form>
        </div>
      ) : (
        <div className="hidden space-y-2 px-3 xl:block">
          <Link href="/register" className={buttonVariants({ className: "w-full" })}>
            Sign up
          </Link>
          <Link
            href="/login"
            className={buttonVariants({ variant: "outline", className: "w-full" })}
          >
            Log in
          </Link>
        </div>
      )}
    </div>
  );
}
