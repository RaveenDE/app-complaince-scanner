import type { Answers, PolicyTopic, ScanResult } from "@acs/shared";

export function detectedPractices(
  scan: ScanResult,
  answers: Answers,
): Record<PolicyTopic, boolean> {
  const ids = new Set(scan.findings.map((finding) => finding.ruleId));
  const analytics =
    ids.has("trackers-before-consent") ||
    ids.has("session-replay-detected") ||
    answers.usesAnalyticsAdsOrSessionReplay === true;
  return {
    analytics,
    third_party:
      analytics ||
      ids.has("google-fonts-remote") ||
      ids.has("trackers-before-consent"),
    ai: answers.hasAiFeaturesOrChat === true,
    children: answers.minorsCanUseApp === true,
    retention: answers.collectsPersonalData === true,
    deletion: answers.collectsPersonalData === true,
  };
}
