import { describe, expect, it } from "vitest";
import {
  FindingSchema,
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
});
