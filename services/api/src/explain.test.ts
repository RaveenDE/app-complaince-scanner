import { loadRules } from "@acs/rules";
import type { Answers, Issue, ScanResult } from "@acs/shared";
import { describe, expect, it } from "vitest";
import { explainIssues, runExplainStage } from "./explain.js";
import { TEMPLATE_PROVIDER } from "./llm/provider.js";

const issue: Issue = {
  confidence: "high",
  reviewStatus: "not_yet_reviewed",
  evidence: { notes: "Detected HTTP after redirects." },
  rule: {
    id: "insecure-http",
    title: "Site is not served over HTTPS",
    regimes: ["General"],
    applies_when: { regions: [], flags: [] },
    detect: { type: "scanner", scanner_rule: "insecure-http" },
    severity: "high",
    requirement: "The live site should be served over HTTPS after redirects.",
    fix: "Enable HTTPS and redirect all HTTP traffic to it.",
    source_url: null,
    last_verified: null,
    reviewed_by: null,
    penalty_note: null,
  },
};

describe("explainIssues", () => {
  it("attaches a template explanation on the fallback path", async () => {
    const [explained] = await explainIssues([issue], TEMPLATE_PROVIDER);
    expect(explained?.explanation).toContain("Site is not served over HTTPS");
    expect(explained?.evidence.notes).toBe(issue.evidence.notes);
  });
});

describe("runExplainStage", async () => {
  const rules = await loadRules();
  const answers: Answers = {
    regions: ["EU"],
    collectsPersonalData: true,
    collectsLocationPhotosContacts: false,
    minorsCanUseApp: false,
    takesPayments: false,
    hasSubscriptions: false,
    sendsMarketingEmail: false,
    sendsSms: false,
    usesAnalyticsAdsOrSessionReplay: true,
    hasAiFeaturesOrChat: false,
    acceptsUserUploadsOrReviews: false,
    hasPrivacyPolicyToday: true,
    hasTermsToday: true,
    hasCookieBannerToday: false,
  };
  const scanResult: ScanResult = {
    url: "https://example.com",
    finalUrl: "https://example.com/",
    title: "Example",
    findings: [
      {
        ruleId: "trackers-before-consent",
        confidence: "high",
        evidence: { notes: "Detected Google Analytics." },
      },
    ],
  };

  it("adds policy-mismatch issues from the template fallback", async () => {
    const ranked = await runExplainStage({
      issues: [issue],
      policyText:
        "This privacy policy describes how we handle personal data. We collect personal information when you create an account. Email us at hello@example.com.",
      scanResult,
      answers,
      rules,
      provider: TEMPLATE_PROVIDER,
    });
    expect(ranked.some((item) => item.rule.id === "insecure-http")).toBe(true);
    expect(
      ranked.some((item) => item.rule.id === "policy-analytics-unmentioned"),
    ).toBe(true);
    expect(ranked.every((item) => item.explanation)).toBe(true);
  });
});
