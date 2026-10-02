"use server";

import { requireUser } from "@/lib/auth/guards";
import { markAllRead } from "@/lib/notifications";

export async function markNotificationsRead() {
  const user = await requireUser();
  await markAllRead(user.id);
}
