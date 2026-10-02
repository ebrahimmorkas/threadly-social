"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { createPost } from "@/app/(main)/post-actions";
import { Avatar } from "@/components/avatar";
import { Button } from "@/components/ui/button";
import type { SessionUser } from "@/lib/auth/session";
import { MAX_POST_LENGTH } from "@/lib/posts/parse";
import { cn } from "@/lib/utils";

function CharacterRing({ count }: { count: number }) {
  const radius = 9;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(count / MAX_POST_LENGTH, 1);
  const remaining = MAX_POST_LENGTH - count;
  const color = remaining < 0 ? "#dc2626" : remaining <= 20 ? "#f59e0b" : "#0284c7";

  return (
    <div className="flex items-center gap-2">
      {remaining <= 20 && (
        <span className={cn("text-xs", remaining < 0 ? "text-red-600" : "text-amber-600")}>
          {remaining}
        </span>
      )}
      <svg className="size-6 -rotate-90" viewBox="0 0 24 24" aria-hidden>
        <circle cx="12" cy="12" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="2.5" />
        <circle
          cx="12"
          cy="12"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

export function Composer({
  user,
  parentId,
  placeholder = "What's happening?",
  autoFocus,
}: {
  user: SessionUser;
  parentId?: string;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const [content, setContent] = useState("");
  const [state, formAction, pending] = useActionState(
    async (previous: Awaited<ReturnType<typeof createPost>>, formData: FormData) => {
      const result = await createPost(previous, formData);
      if (result?.success) setContent("");
      return result;
    },
    null,
  );
  const textarea = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (state?.success) {
      toast.success(state.message);
    } else if (state?.message) {
      toast.error(state.message);
    }
  }, [state]);

  // Grow the textarea with its content.
  useEffect(() => {
    const element = textarea.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${element.scrollHeight}px`;
  }, [content]);

  const length = content.trim().length;
  const invalid = length === 0 || content.length > MAX_POST_LENGTH;

  return (
    <form action={formAction} className="flex gap-3 border-b border-slate-200 px-4 py-3">
      <Avatar name={user.name} username={user.username} />
      <div className="min-w-0 flex-1">
        {parentId && <input type="hidden" name="parentId" value={parentId} />}
        <textarea
          ref={textarea}
          name="content"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          autoFocus={autoFocus}
          rows={2}
          className="w-full resize-none bg-transparent py-2 text-lg text-slate-900 placeholder:text-slate-500 focus:outline-none"
        />
        {state?.errors?.content && (
          <p className="text-sm text-red-600">{state.errors.content[0]}</p>
        )}
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-3">
          {content.length > 0 && <CharacterRing count={content.length} />}
          <Button type="submit" size="sm" disabled={invalid || pending}>
            {pending ? "Posting…" : parentId ? "Reply" : "Post"}
          </Button>
        </div>
      </div>
    </form>
  );
}
