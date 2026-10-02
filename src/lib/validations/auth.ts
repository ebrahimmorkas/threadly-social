import { z } from "zod";

/** Top-level routes that would clash with profile URLs (/{username}). */
export const RESERVED_USERNAMES = new Set([
  "admin",
  "api",
  "explore",
  "home",
  "login",
  "logout",
  "notifications",
  "post",
  "register",
  "search",
  "settings",
  "tags",
]);

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Username must be at least 3 characters")
  .max(20, "Username must be 20 characters or fewer")
  .regex(/^[a-z0-9_]+$/, "Use only letters, numbers and underscores")
  .refine((value) => !RESERVED_USERNAMES.has(value), "This username is not available");

const emailField = z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address"));

export const loginSchema = z.object({
  identifier: z.string().trim().toLowerCase().min(1, "Enter your email or username"),
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(50),
  username: usernameSchema,
  email: emailField,
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password is too long")
    .regex(/[a-zA-Z]/, "Password must contain a letter")
    .regex(/[0-9]/, "Password must contain a number"),
});

/** Shape returned by form server actions and consumed by `useActionState`. */
export type FormState = {
  message?: string;
  errors?: Record<string, string[] | undefined>;
  fields?: Record<string, string>;
  success?: boolean;
} | null;
