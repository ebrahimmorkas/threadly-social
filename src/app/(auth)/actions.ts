"use server";

import { redirect } from "next/navigation";
import { eq, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession } from "@/lib/auth/session";
import { safeRedirectPath } from "@/lib/auth/tokens";
import { getCache } from "@/lib/cache";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request";
import { loginSchema, registerSchema, type FormState } from "@/lib/validations/auth";

// Keeps response times similar whether or not an account exists (prevents user enumeration).
const DUMMY_HASH = "scrypt$00000000000000000000000000000000$" + "0".repeat(128);

function tooManyAttempts(retryAfter: number, fields: Record<string, string>): FormState {
  const minutes = Math.ceil(retryAfter / 60);
  return {
    message: `Too many attempts. Please try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`,
    fields,
  };
}

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const raw = Object.fromEntries(formData);
  const fields = { identifier: String(raw.identifier ?? "") };
  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) return { errors: z.flattenError(parsed.error).fieldErrors, fields };

  const { identifier, password } = parsed.data;
  const limit = await rateLimit(getCache(), {
    key: `login:${await getClientIp()}:${identifier}`,
    limit: 5,
    windowSeconds: 60 * 5,
  });
  if (!limit.success) return tooManyAttempts(limit.retryAfter, fields);

  // Accept either an email address or a username (with or without a leading @).
  const handle = identifier.replace(/^@/, "");
  const user = await db.query.users.findFirst({
    where: or(eq(users.email, identifier), eq(users.username, handle)),
  });
  const passwordOk = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);

  if (!user || !passwordOk) {
    return { message: "Incorrect username/email or password.", fields };
  }

  await createSession(user.id);
  redirect(safeRedirectPath(formData.get("next")?.toString()));
}

export async function register(_prev: FormState, formData: FormData): Promise<FormState> {
  const raw = Object.fromEntries(formData);
  const fields = {
    name: String(raw.name ?? ""),
    username: String(raw.username ?? ""),
    email: String(raw.email ?? ""),
  };
  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) return { errors: z.flattenError(parsed.error).fieldErrors, fields };

  const limit = await rateLimit(getCache(), {
    key: `register:${await getClientIp()}`,
    limit: 5,
    windowSeconds: 60 * 60,
  });
  if (!limit.success) return tooManyAttempts(limit.retryAfter, fields);

  const { name, username, email, password } = parsed.data;

  const existing = await db
    .select({ username: users.username, email: users.email })
    .from(users)
    .where(or(eq(users.username, username), eq(users.email, email)));

  const errors: Record<string, string[]> = {};
  if (existing.some((row) => row.username === username))
    errors.username = ["This username is taken."];
  if (existing.some((row) => row.email === email))
    errors.email = ["An account with this email already exists."];
  if (Object.keys(errors).length > 0) return { errors, fields };

  try {
    const [user] = await db
      .insert(users)
      .values({ name, username, email, passwordHash: await hashPassword(password) })
      .returning({ id: users.id });
    await createSession(user!.id);
  } catch (error) {
    // Unique violation from a concurrent registration with the same username/email.
    if ((error as { code?: string }).code === "23505") {
      return { message: "That username or email was just taken. Please try another.", fields };
    }
    throw error;
  }

  redirect("/home?welcome=1");
}

export async function logout() {
  await destroySession();
  redirect("/");
}
