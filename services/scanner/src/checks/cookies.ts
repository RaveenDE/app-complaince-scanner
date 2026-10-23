import type { Finding } from "@acs/shared";
import type { ScanContext } from "../context.js";

export function checkCookiesBeforeConsent(ctx: ScanContext): Finding[] {
  if (ctx.cookies.length === 0) return [];

  return [
    {
      ruleId: "cookies-before-consent",
      confidence: "high",
      evidence: {
        cookies: ctx.cookies.map((cookie) => ({
          name: cookie.name,
          domain: cookie.domain,
        })),
        notes: `Detected ${String(ctx.cookies.length)} cookie(s) set before any user interaction.`,
      },
    },
  ];
}
