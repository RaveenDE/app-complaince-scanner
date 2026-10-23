import type { Finding } from "@acs/shared";
import type { ScanContext } from "../context.js";
import { checkAccessibility } from "./accessibility.js";
import { checkConsentBanner } from "./consent.js";
import { checkCookiesBeforeConsent } from "./cookies.js";
import { checkGoogleFontsRemote } from "./fonts.js";
import { checkInsecureHttp } from "./insecure.js";
import { checkPolicyLinks, type PolicyCheckResult } from "./policies.js";
import {
  checkSessionReplay,
  checkTrackersBeforeConsent,
} from "./trackers.js";

export async function runChecks(
  ctx: ScanContext,
): Promise<{ findings: Finding[]; policy: PolicyCheckResult }> {
  const policy = await checkPolicyLinks(ctx);
  const findings: Finding[] = [
    ...checkTrackersBeforeConsent(ctx),
    ...checkCookiesBeforeConsent(ctx),
    ...checkGoogleFontsRemote(ctx),
    ...checkSessionReplay(ctx),
    ...(await checkConsentBanner(ctx)),
    ...policy.findings,
    ...(await checkAccessibility(ctx)),
    ...checkInsecureHttp(ctx),
  ];
  return { findings, policy };
}
