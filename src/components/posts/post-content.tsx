"use client";

import Link from "next/link";
import { tokenize } from "@/lib/posts/parse";

/** Renders post text with clickable #hashtags, @mentions and links. React escapes everything else. */
export function PostContent({ content, className }: { content: string; className?: string }) {
  return (
    <p
      className={
        className ?? "text-[15px] leading-6 break-words whitespace-pre-wrap text-slate-900"
      }
    >
      {tokenize(content).map((segment, index) => {
        switch (segment.type) {
          case "tag":
            return (
              <Link
                key={index}
                href={`/tags/${segment.tag}`}
                className="text-brand-600 hover:underline"
                onClick={(event) => event.stopPropagation()}
              >
                {segment.value}
              </Link>
            );
          case "mention":
            return (
              <Link
                key={index}
                href={`/${segment.username}`}
                className="text-brand-600 hover:underline"
                onClick={(event) => event.stopPropagation()}
              >
                {segment.value}
              </Link>
            );
          case "url":
            return (
              <a
                key={index}
                href={segment.value}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="text-brand-600 hover:underline"
                onClick={(event) => event.stopPropagation()}
              >
                {segment.value.replace(/^https?:\/\//, "")}
              </a>
            );
          default:
            return <span key={index}>{segment.value}</span>;
        }
      })}
    </p>
  );
}
