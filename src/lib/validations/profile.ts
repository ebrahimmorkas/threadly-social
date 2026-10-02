import { z } from "zod";

export const profileSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(50),
  bio: z.string().trim().max(160, "Bio must be 160 characters or fewer").default(""),
  location: z.string().trim().max(50).default(""),
  website: z
    .string()
    .trim()
    .max(100)
    // Bare domains get https://; anything with another scheme is kept and rejected below.
    .transform((value) =>
      value && !/^[a-z][a-z0-9+.-]*:/i.test(value) ? `https://${value}` : value,
    )
    .pipe(z.union([z.literal(""), z.url({ protocol: /^https?$/, error: "Enter a valid URL" })]))
    .default(""),
});

export type ProfileInput = z.infer<typeof profileSchema>;
