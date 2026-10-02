import { Suspense } from "react";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { WhoToFollow } from "@/components/users/who-to-follow";
import { getCurrentUser } from "@/lib/auth/session";
import { getUnreadCount } from "@/lib/notifications";

/** Three-column social layout: navigation, main column, and a widgets sidebar. */
export default async function MainLayout({ children }: LayoutProps<"/">) {
  const user = await getCurrentUser();
  const unreadCount = user ? await getUnreadCount(user.id) : 0;

  return (
    <div className="mx-auto flex min-h-screen max-w-7xl">
      <header className="sticky top-0 h-screen w-20 shrink-0 border-r border-slate-200 px-2 xl:w-64">
        <SidebarNav user={user} unreadCount={unreadCount} />
      </header>
      <main className="min-w-0 flex-1 border-r border-slate-200 lg:max-w-[600px]">{children}</main>
      <aside className="hidden flex-1 px-6 py-4 lg:block">
        <div className="sticky top-4 space-y-4">
          <Suspense fallback={<div className="h-48 animate-pulse rounded-2xl bg-slate-50" />}>
            <WhoToFollow />
          </Suspense>
          <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
            <p className="font-semibold text-slate-900">Welcome to Threadly</p>
            <p className="mt-1">
              Share what&apos;s on your mind and follow the conversations you love.
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}
