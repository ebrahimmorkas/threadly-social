export const MAX_POST_LENGTH = 280;

export type Segment =
  | { type: "text"; value: string }
  | { type: "tag"; value: string; tag: string }
  | { type: "mention"; value: string; username: string }
  | { type: "url"; value: string };

// One pass over the content: URLs first so "#" or "@" inside links are not treated as tags.
const TOKEN_PATTERN =
  /(https?:\/\/[^\s]+)|(?<=^|[^\w])#([a-zA-Z][a-zA-Z0-9_]{0,49})|(?<=^|[^\w])@([a-zA-Z0-9_]{3,20})/g;

/** Splits post content into renderable segments (plain text, #tags, @mentions and links). */
export function tokenize(content: string): Segment[] {
  const segments: Segment[] = [];
  let lastIndex = 0;

  for (const match of content.matchAll(TOKEN_PATTERN)) {
    const [value, url, tag, username] = match;
    const index = match.index!;
    if (index > lastIndex) segments.push({ type: "text", value: content.slice(lastIndex, index) });

    if (url) {
      // Trailing punctuation is almost always sentence punctuation, not part of the URL.
      const trimmed = url.replace(/[.,!?;:)]+$/, "");
      segments.push({ type: "url", value: trimmed });
      if (trimmed.length < url.length) {
        segments.push({ type: "text", value: url.slice(trimmed.length) });
      }
    } else if (tag) {
      segments.push({ type: "tag", value, tag: tag.toLowerCase() });
    } else if (username) {
      segments.push({ type: "mention", value, username: username.toLowerCase() });
    }
    lastIndex = index + value.length;
  }

  if (lastIndex < content.length) segments.push({ type: "text", value: content.slice(lastIndex) });
  return segments;
}

export function extractHashtags(content: string): string[] {
  const tags = tokenize(content).flatMap((segment) =>
    segment.type === "tag" ? [segment.tag] : [],
  );
  return [...new Set(tags)];
}

export function extractMentions(content: string): string[] {
  const names = tokenize(content).flatMap((segment) =>
    segment.type === "mention" ? [segment.username] : [],
  );
  return [...new Set(names)];
}
