import type { Metadata } from "next";
import { MessageCircle } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { requireUser } from "@/lib/auth/guards";

export const metadata: Metadata = { title: "Home" };

export default async function HomePage() {
  const user = await requireUser("/home");

  return (
    <>
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 px-4 py-3 backdrop-blur">
        <h1 className="text-xl font-bold text-slate-900">Home</h1>
      </div>
      <div className="p-4">
        <EmptyState
          icon={MessageCircle}
          title={`Welcome, ${user.name.split(" ")[0]}!`}
          description="Your timeline will appear here."
        />
      </div>
    </>
  );
}
