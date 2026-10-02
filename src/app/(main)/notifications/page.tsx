import type { Metadata } from "next";
import Link from "next/link";
import { AtSign, Bell, Heart, MessageCircle, UserPlus } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import type { NotificationType } from "@/db/schema";
import { requireUser } from "@/lib/auth/guards";
import { listNotifications } from "@/lib/notifications";
import { cn, relativeTime } from "@/lib/utils";
import { LiveUpdates } from "./live-updates";

export const metadata: Metadata = { title: "Notifications" };

const config: Record<NotificationType, { icon: typeof Heart; color: string; text: string }> = {
  like: { icon: Heart, color: "text-rose-500 fill-rose-500", text: "liked your post" },
  reply: { icon: MessageCircle, color: "text-brand-600", text: "replied to your post" },
  follow: { icon: UserPlus, color: "text-brand-600", text: "followed you" },
  mention: { icon: AtSign, color: "text-emerald-600", text: "mentioned you" },
};

export default async function NotificationsPage() {
  const user = await requireUser("/notifications");
  const items = await listNotifications(user.id);

  return (
    <>
      <PageHeader title="Notifications" />
      <LiveUpdates />

      {items.length === 0 ? (
        <div className="p-4">
          <EmptyState
            icon={Bell}
            title="Nothing to see here — yet"
            description="Likes, replies, mentions and new followers will show up here in real time."
          />
        </div>
      ) : (
        <ul>
          {items.map((item) => {
            const { icon: Icon, color, text } = config[item.type];
            const href = item.post?.id ? `/post/${item.post.id}` : `/${item.actor.username}`;
            return (
              <li key={item.id}>
                <Link
                  href={href}
                  className={cn(
                    "flex gap-3 border-b border-slate-200 px-4 py-3 hover:bg-slate-50",
                    !item.readAt && "bg-brand-50/60",
                  )}
                >
                  <Icon className={cn("mt-1 size-6 shrink-0", color)} aria-hidden />
                  <div className="min-w-0 flex-1">
                    <Avatar name={item.actor.name} username={item.actor.username} size="sm" />
                    <p className="mt-2 text-[15px] text-slate-900">
                      <strong>{item.actor.name}</strong> {text}
                      <span className="text-slate-500"> · {relativeTime(item.createdAt)}</span>
                    </p>
                    {item.post?.content && (
                      <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                        {item.post.content}
                      </p>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
