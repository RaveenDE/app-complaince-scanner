import { ruleApplies, sortIssues } from "@acs/rules";
import {
  reviewStatusFromRule,
  type Answers,
  type Issue,
  type PolicyTopic,
  type Rule,
  type ScanResult,
} from "@acs/shared";
import type { PolicyMentions } from "./compare-policy.js";
import { detectedPractices } from "./practices.js";

const TOPIC_LABEL: Record<PolicyTopic, string> = {
  analytics: "analytics",
  third_party: "third-party tools",
  ai: "AI features",
  children: "use by children",
  retention: "data retention",
  deletion: "deletion rights",
};

export function policyMismatchIssues(
  mentions: PolicyMentions,
  scanResult: ScanResult,
  answers: Answers,
  rules: Rule[],
): Issue[] {
  const practices = detectedPractices(scanResult, answers);
  const issues: Issue[] = [];

  for (const rule of rules) {
    if (rule.detect.type !== "policy") continue;
    if (!ruleApplies(rule, answers)) continue;
    const topic = rule.detect.policy_topic;
    if (!practices[topic]) continue;
    if (mentions[topic].mentioned !== false) continue;

    issues.push({
      rule,
      confidence: "medium",
      reviewStatus: reviewStatusFromRule(rule),
      evidence: {
        notes: `Detected ${TOPIC_LABEL[topic]} in the scan or questionnaire, and the privacy policy does not mention it. This is a likely gap, not proof of a violation.`,
      },
    });
  }

  return sortIssues(issues);
}
