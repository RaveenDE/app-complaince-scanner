/** Collapse whitespace so quote checks survive HTML and line wrapping. */
export function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function quoteAppearsInText(quote: string, source: string): boolean {
  const needle = normalizeWhitespace(quote);
  if (needle.length === 0) return false;
  return normalizeWhitespace(source).includes(needle);
}

export type MentionVerdict = {
  mentioned: boolean | "unknown";
  quote: string | null;
};

export function verifiedMention(
  mentioned: boolean,
  quote: string | null | undefined,
  source: string,
): MentionVerdict {
  if (mentioned !== true) {
    return { mentioned: false, quote: null };
  }
  if (!quote || !quoteAppearsInText(quote, source)) {
    return { mentioned: "unknown", quote: null };
  }
  return { mentioned: true, quote };
}
