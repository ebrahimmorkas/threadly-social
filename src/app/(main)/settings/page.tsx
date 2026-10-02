import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { PageHeader } from "@/components/layout/page-header";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireUser } from "@/lib/auth/guards";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const session = await requireUser("/settings");
  const profile = await db.query.users.findFirst({
    where: eq(users.id, session.id),
    columns: { name: true, bio: true, location: true, website: true },
  });

  return (
    <>
      <PageHeader title="Edit profile" backHref={`/${session.username}`} />
      <div className="p-4">
        <ProfileForm defaults={profile!} />
      </div>
    </>
  );
}
