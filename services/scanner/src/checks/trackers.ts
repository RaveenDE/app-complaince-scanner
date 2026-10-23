import type { Finding } from "@acs/shared";
import type { ScanContext } from "../context.js";
import { matchTrackers } from "../trackers.js";

export function checkTrackersBeforeConsent(ctx: ScanContext): Finding[] {
  const urls = ctx.requests.map((request) => request.url);
  const matches = matchTrackers(urls);
  if (matches.length === 0) return [];

  const uniqueUrls = [...new Set(matches.map((match) => match.url))];
  const names = [...new Set(matches.map((match) => match.tracker.name))];
  return [
    {
      ruleId: "trackers-before-consent",
      confidence: "high",
      evidence: {
        urls: uniqueUrls,
        notes: `Detected requests to known tracker domains before any user interaction: ${names.join(", ")}. This list is marked for human verification.`,
      },
    },
  ];
}

export function checkSessionReplay(ctx: ScanContext): Finding[] {
  const urls = ctx.requests.map((request) => request.url);
  const matches = matchTrackers(urls, "session-replay");
  if (matches.length === 0) return [];

  const uniqueUrls = [...new Set(matches.map((match) => match.url))];
  const names = [...new Set(matches.map((match) => match.tracker.name))];
  return [
    {
      ruleId: "session-replay-detected",
      confidence: "high",
      evidence: {
        urls: uniqueUrls,
        notes: `Detected likely session-replay tooling before any user interaction: ${names.join(", ")}.`,
      },
    },
  ];
}
