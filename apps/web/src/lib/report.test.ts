import { describe, expect, it } from "vitest";
import type { Issue } from "@acs/shared";
import { countBySeverity, splitIssues } from "./report";

function issue(
  id: string,
  type: "scanner" | "manual",
  severity: "high" | "medium" | "low",
): Issue {
  return {
    confidence: "medium",
    reviewStatus: "not_yet_reviewed",
    evidence: { notes: "Detected in a test fixture." },
    rule: {
      id,
      title: id,
      regimes: ["General"],
      applies_when: { regions: [], flags: [] },
      detect: type === "manual" ? { type: "manual" } : { type: "scanner", scanner_rule: id },
      severity,
      requirement: "Review this likely issue.",
      fix: "Fix it.",
      source_url: null,
      last_verified: null,
      reviewed_by: null,
      penalty_note: null,
    },
  };
}

describe("report helpers", () => {
  it("counts severity and splits manual checks", () => {
    const issues = [
      issue("insecure-http", "scanner", "high"),
      issue("trademark-conflict-check", "manual", "low"),
    ];
    expect(countBySeverity(issues)).toEqual({ high: 1, medium: 0, low: 1 });
    const split = splitIssues(issues);
    expect(split.automated.map((item) => item.rule.id)).toEqual(["insecure-http"]);
    expect(split.manual.map((item) => item.rule.id)).toEqual([
      "trademark-conflict-check",
    ]);
  });
});
