import { describe, expect, it } from "vitest";
import {
  CreateScanRequestSchema,
  FindingSchema,
  ReportSchema,
  reviewStatusFromRule,
  RuleSchema,
} from "./schemas.js";
import { formatReviewStatus, NOT_YET_REVIEWED_LABEL } from "./wording.js";

const validFinding = {
  ruleId: "google-fonts-remote",
  evidence: {
    urls: ["https://fonts.googleapis.com/css2?family=Inter"],
    notes: "Detected a request to Google Fonts before any user interaction.",
  },
  confidence: "high" as const,
};

describe("FindingSchema", () => {
  it("parses a valid finding", () => {
    const result = FindingSchema.parse(validFinding);
    expect(result.ruleId).toBe("google-fonts-remote");
    expect(result.confidence).toBe("high");
    expect(result.evidence.urls).toEqual([
      "https://fonts.googleapis.com/css2?family=Inter",
    ]);
  });

  it("rejects a finding without ruleId or with an invalid confidence", () => {
    expect(() =>
      FindingSchema.parse({
        evidence: {},
        confidence: "high",
      }),
    ).toThrow();

    expect(() =>
      FindingSchema.parse({
        ...validFinding,
        confidence: "certain",
      }),
    ).toThrow();
  });
});

describe("review status", () => {
  it("treats a null last_verified as not yet reviewed", () => {
    const rule = RuleSchema.parse({
      id: "google-fonts-remote",
      title: "Fonts loaded from Google's servers",
      regimes: ["GDPR"],
      applies_when: { regions: ["EU"], flags: [] },
      detect: { type: "scanner", scanner_rule: "google-fonts-remote" },
      severity: "medium",
      requirement: "Avoid loading fonts from a third-party CDN in the EU.",
      fix: "Self-host the font files.",
      source_url: null,
      last_verified: null,
      reviewed_by: null,
      penalty_note: null,
    });

    expect(reviewStatusFromRule(rule)).toBe("not_yet_reviewed");
    expect(formatReviewStatus(rule.last_verified)).toBe(NOT_YET_REVIEWED_LABEL);
  });

  it("accepts a policy-mismatch detect type", () => {
    const rule = RuleSchema.parse({
      id: "policy-analytics-unmentioned",
      title: "Analytics detected, privacy policy does not mention analytics",
      regimes: ["GDPR"],
      applies_when: { regions: ["EU"], flags: [] },
      detect: { type: "policy", policy_topic: "analytics" },
      severity: "medium",
      requirement: "If analytics run on the site, the privacy policy should say so.",
      fix: "Name the analytics tools you use.",
      source_url: null,
      last_verified: null,
      reviewed_by: null,
      penalty_note: null,
    });

    expect(rule.detect).toEqual({ type: "policy", policy_topic: "analytics" });
  });
});

describe("CreateScanRequest and Report", () => {
  it("parses a create-scan request and a key-only report", () => {
    const request = CreateScanRequestSchema.parse({
      url: "https://example.com",
      ownerConfirmed: true,
      answers: {
        regions: ["EU"],
        collectsPersonalData: false,
        collectsLocationPhotosContacts: false,
        minorsCanUseApp: false,
        takesPayments: false,
        hasSubscriptions: false,
        sendsMarketingEmail: false,
        sendsSms: false,
        usesAnalyticsAdsOrSessionReplay: false,
        hasAiFeaturesOrChat: false,
        acceptsUserUploadsOrReviews: false,
        hasPrivacyPolicyToday: false,
        hasTermsToday: false,
        hasCookieBannerToday: false,
      },
    });
    expect(request.ownerConfirmed).toBe(true);

    const report = ReportSchema.parse({
      issues: [],
      screenshotKey: "scans/abc/screenshot.png",
    });
    expect(report.screenshotKey).toBe("scans/abc/screenshot.png");
    expect(report).not.toHaveProperty("privacyPolicyText");
  });
});
