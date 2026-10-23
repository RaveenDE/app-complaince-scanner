import { describe, expect, it } from "vitest";
import { loadRules, parseRuleFile, RuleLoadError } from "./load-rules.js";

describe("loadRules", () => {
  it("validates every bundled YAML file", async () => {
    const rules = await loadRules();
    expect(rules.length).toBeGreaterThanOrEqual(20);
    for (const rule of rules) {
      expect(rule.source_url).toBeNull();
      expect(rule.last_verified).toBeNull();
      expect(rule.penalty_note).toBeNull();
    }
  });

  it("rejects unknown flags", () => {
    expect(() =>
      parseRuleFile(`
rules:
  - id: bad-flag
    title: Bad
    regimes: [General]
    applies_when: { regions: [], flags: [not_a_real_flag] }
    detect: { type: manual }
    severity: low
    requirement: x
    fix: y
    source_url: null
    last_verified: null
    reviewed_by: null
    penalty_note: null
`),
    ).toThrow(RuleLoadError);
  });

  it("rejects invalid YAML", () => {
    expect(() => parseRuleFile("rules: [")).toThrow();
  });

  it("rejects a rule that fails schema validation", () => {
    expect(() =>
      parseRuleFile(`
rules:
  - id: missing-fields
    title: Incomplete
`),
    ).toThrow();
  });

  it("rejects duplicate rule ids across files", async () => {
    const rules = await loadRules();
    const ids = rules.map((rule) => rule.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
