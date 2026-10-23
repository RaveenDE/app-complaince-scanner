import type { Finding } from "@acs/shared";
import type { ScanContext } from "../context.js";

const GOOGLE_FONT_HOSTS = new Set(["fonts.googleapis.com", "fonts.gstatic.com"]);

export function checkGoogleFontsRemote(ctx: ScanContext): Finding[] {
  const urls = ctx.requests
    .map((request) => request.url)
    .filter((url) => {
      try {
        return GOOGLE_FONT_HOSTS.has(new URL(url).hostname);
      } catch {
        return false;
      }
    });

  if (urls.length === 0) return [];

  return [
    {
      ruleId: "google-fonts-remote",
      confidence: "high",
      evidence: {
        urls: [...new Set(urls)],
        notes: "Detected requests to Google Fonts servers before any user interaction.",
      },
    },
  ];
}
