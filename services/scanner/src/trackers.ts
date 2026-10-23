import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const TrackerSchema = z.object({
  name: z.string(),
  domain: z.string(),
  category: z.enum([
    "analytics",
    "advertising",
    "session-replay",
    "social-pixel",
  ]),
});

const TrackerListSchema = z.object({
  toBeVerifiedByHuman: z.literal(true),
  note: z.string(),
  trackers: z.array(TrackerSchema),
});

export type Tracker = z.infer<typeof TrackerSchema>;

const trackersPath = fileURLToPath(new URL("../trackers.json", import.meta.url));

export const trackerList = TrackerListSchema.parse(
  JSON.parse(readFileSync(trackersPath, "utf8")),
);

export function hostnameMatchesDomain(
  hostname: string,
  domain: string,
): boolean {
  const host = hostname.toLowerCase();
  const needle = domain.toLowerCase();
  return host === needle || host.endsWith(`.${needle}`);
}

export function matchTrackers(
  urls: string[],
  category?: Tracker["category"],
): Array<{ tracker: Tracker; url: string }> {
  const matches: Array<{ tracker: Tracker; url: string }> = [];
  for (const url of urls) {
    let hostname: string;
    try {
      hostname = new URL(url).hostname;
    } catch {
      continue;
    }
    for (const tracker of trackerList.trackers) {
      if (category && tracker.category !== category) continue;
      if (hostnameMatchesDomain(hostname, tracker.domain)) {
        matches.push({ tracker, url });
      }
    }
  }
  return matches;
}
