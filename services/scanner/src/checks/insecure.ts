import type { Finding } from "@acs/shared";
import type { ScanContext } from "../context.js";

export function checkInsecureHttp(ctx: ScanContext): Finding[] {
  let parsed: URL;
  try {
    parsed = new URL(ctx.finalUrl);
  } catch {
    return [];
  }
  if (parsed.protocol === "https:") return [];

  return [
    {
      ruleId: "insecure-http",
      confidence: "high",
      evidence: {
        urls: [ctx.finalUrl],
        notes: "Detected that the final URL after redirects is not HTTPS.",
      },
    },
  ];
}
