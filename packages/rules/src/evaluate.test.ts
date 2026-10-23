import {
  type Answers,
  type Finding,
  type Region,
  type Rule,
  type ScanResult,
} from "@acs/shared";
import { describe, expect, it } from "vitest";
import { evaluate } from "./evaluate.js";
import { loadRules } from "./load-rules.js";

function answers(overrides: Partial<Answers> = {}): Answers {
  return {
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
    ...overrides,
  };
}

function scanOf(findings: Finding[] = []): ScanResult {
  return {
    url: "https://example.com",
    finalUrl: "https://example.com/",
    title: "Example",
    findings,
  };
}

function finding(ruleId: string): Finding {
  return {
    ruleId,
    confidence: "high",
    evidence: { notes: "Detected in fixture." },
  };
}

function hasIssue(rules: Rule[], ruleId: string, a: Answers, findings: Finding[]) {
  return evaluate(a, scanOf(findings), rules).some(
    (issue) => issue.rule.id === ruleId,
  );
}

describe("evaluate", async () => {
  const rules = await loadRules();
  const byId = new Map(rules.map((rule) => [rule.id, rule]));

  it("loads 23 unique starter rules", () => {
    expect(rules).toHaveLength(23);
    expect(new Set(rules.map((rule) => rule.id)).size).toBe(23);
  });

  it("sorts issues by severity then confidence", () => {
    const issues = evaluate(
      answers({
        regions: ["EU", "US-other"],
        takesPayments: true,
        collectsPersonalData: true,
      }),
      scanOf([
        { ...finding("insecure-http"), confidence: "low" },
        finding("trackers-before-consent"),
        finding("no-refund-link"),
      ]),
      rules,
    );
    const keys = issues.map((issue) => `${issue.rule.severity}:${issue.confidence}`);
    const ranked = [...keys].sort((a, b) => {
      const rank = { high: 0, medium: 1, low: 2 };
      const [aSev, aConf] = a.split(":") as [string, string];
      const [bSev, bConf] = b.split(":") as [string, string];
      const sev = rank[aSev as keyof typeof rank] - rank[bSev as keyof typeof rank];
      if (sev !== 0) return sev;
      return rank[aConf as keyof typeof rank] - rank[bConf as keyof typeof rank];
    });
    expect(keys).toEqual(ranked);
  });

  it("marks bundled rules as not yet reviewed", () => {
    const issues = evaluate(
      answers({ regions: ["EU"] }),
      scanOf([finding("trackers-before-consent")]),
      rules,
    );
    expect(issues[0]?.reviewStatus).toBe("not_yet_reviewed");
  });

  for (const rule of rules) {
    describe(rule.id, () => {
      const applicable = answers({
        regions: (rule.applies_when.regions.length > 0
          ? rule.applies_when.regions
          : ["EU"]) as Region[],
        collectsPersonalData: true,
        minorsCanUseApp: true,
        takesPayments: true,
        hasSubscriptions: true,
        sendsMarketingEmail: true,
        sendsSms: true,
        hasAiFeaturesOrChat: true,
        acceptsUserUploadsOrReviews: true,
      });

      it("match", () => {
        const findings =
          rule.detect.type === "scanner" ? [finding(rule.detect.scanner_rule)] : [];
        expect(hasIssue(rules, rule.id, applicable, findings)).toBe(true);
      });

      it("no-match", () => {
        if (rule.detect.type === "manual") {
          const gated: Rule = {
            ...rule,
            applies_when: { ...rule.applies_when, flags: ["takes_payments"] },
          };
          expect(
            hasIssue(
              [gated],
              rule.id,
              answers({ regions: applicable.regions, takesPayments: false }),
              [],
            ),
          ).toBe(false);
          return;
        }
        if (rule.detect.type === "question") {
          const off = answers({
            ...applicable,
            collectsPersonalData: false,
            minorsCanUseApp: false,
            takesPayments: false,
            hasSubscriptions: false,
            sendsMarketingEmail: false,
            sendsSms: false,
            hasAiFeaturesOrChat: false,
            acceptsUserUploadsOrReviews: false,
          });
          expect(hasIssue(rules, rule.id, off, [])).toBe(false);
          return;
        }
        expect(hasIssue(rules, rule.id, applicable, [])).toBe(false);
      });

      it("not-applicable", () => {
        const naAnswers = answers({
          regions: ["Brazil"],
          collectsPersonalData: true,
          minorsCanUseApp: true,
          takesPayments: true,
          hasSubscriptions: true,
          sendsMarketingEmail: true,
          sendsSms: true,
          hasAiFeaturesOrChat: true,
          acceptsUserUploadsOrReviews: true,
        });
        const findings =
          rule.detect.type === "scanner" ? [finding(rule.detect.scanner_rule)] : [];

        if (rule.applies_when.regions.length > 0) {
          expect(hasIssue(rules, rule.id, naAnswers, findings)).toBe(false);
          return;
        }
        if (rule.applies_when.flags.length > 0) {
          const noFlag = answers({
            regions: ["EU"],
            takesPayments: false,
          });
          expect(hasIssue(rules, rule.id, noFlag, findings)).toBe(false);
          return;
        }
        const narrowed: Rule = {
          ...rule,
          applies_when: { regions: ["EU"], flags: [] },
        };
        expect(hasIssue([narrowed], rule.id, naAnswers, findings)).toBe(false);
      });
    });
  }

  it("keeps a lookup for every shipped rule", () => {
    expect(byId.size).toBe(rules.length);
  });
});
