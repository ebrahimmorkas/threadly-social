import { z } from "zod";
import { MAX_POST_LENGTH } from "@/lib/posts/parse";

export const postSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "Write something first")
    .max(MAX_POST_LENGTH, `Posts are limited to ${MAX_POST_LENGTH} characters`),
  parentId: z
    .uuid()
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

export type PostInput = z.infer<typeof postSchema>;
