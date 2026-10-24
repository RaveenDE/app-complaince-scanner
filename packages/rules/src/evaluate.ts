import {
  reviewStatusFromRule,
  type Answers,
  type Confidence,
  type Issue,
  type Region,
  type Rule,
  type ScanResult,
  type Severity,
} from "@acs/shared";
import { answerForFlag } from "./flags.js";

const SEVERITY_RANK: Record<Severity, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

const CONFIDENCE_RANK: Record<Confidence, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

export function ruleApplies(rule: Rule, answers: Answers): boolean {
  const needed = rule.applies_when.regions;
  if (
    needed.length > 0 &&
    !needed.some((region) => answers.regions.includes(region as Region))
  ) {
    return false;
  }
  return rule.applies_when.flags.every((flag) => answerForFlag(answers, flag));
}

function issueFrom(
  rule: Rule,
  evidence: Issue["evidence"],
  confidence: Confidence,
): Issue {
  return {
    rule,
    evidence,
    confidence,
    reviewStatus: reviewStatusFromRule(rule),
  };
}

export function evaluate(
  answers: Answers,
  scanResult: ScanResult,
  rules: Rule[],
): Issue[] {
  const issues: Issue[] = [];

  for (const rule of rules) {
    if (!ruleApplies(rule, answers)) continue;

    const detect = rule.detect;
    // Policy-mismatch rules are emitted later, after quote-checked policy comparison.
    if (detect.type === "policy") continue;

    if (detect.type === "scanner") {
      const finding = scanResult.findings.find(
        (item) => item.ruleId === detect.scanner_rule,
      );
      if (!finding) continue;
      issues.push(issueFrom(rule, finding.evidence, finding.confidence));
      continue;
    }

    if (detect.type === "question") {
      if (!answerForFlag(answers, detect.question_id)) continue;
      issues.push(
        issueFrom(
          rule,
          {
            notes:
              "This item comes from the questionnaire, not from a page scan. It is a likely risk to review, not proof of a violation.",
          },
          "medium",
        ),
      );
      continue;
    }

    issues.push(
      issueFrom(
        rule,
        {
          notes:
            "Manual check: no automation ran for this item. Review it by hand.",
        },
        "low",
      ),
    );
  }

  return sortIssues(issues);
}

export function sortIssues(issues: Issue[]): Issue[] {
  return [...issues].sort((a, b) => {
    const bySeverity =
      SEVERITY_RANK[a.rule.severity] - SEVERITY_RANK[b.rule.severity];
    if (bySeverity !== 0) return bySeverity;
    return CONFIDENCE_RANK[a.confidence] - CONFIDENCE_RANK[b.confidence];
  });
}
