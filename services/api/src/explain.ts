import { sortIssues } from "@acs/rules";
import type { Answers, Issue, Rule, ScanResult } from "@acs/shared";
import { comparePolicy } from "./llm/compare-policy.js";
import { explainFinding } from "./llm/explain-finding.js";
import { policyMismatchIssues } from "./llm/mismatch.js";
import { createJsonProvider, type JsonProvider } from "./llm/provider.js";

export async function explainIssues(
  issues: Issue[],
  provider: JsonProvider = createJsonProvider(),
): Promise<Issue[]> {
  return Promise.all(
    issues.map(async (issue) => ({
      ...issue,
      explanation: await explainFinding(issue.rule, issue.evidence, provider),
    })),
  );
}

export async function runExplainStage(input: {
  issues: Issue[];
  policyText: string;
  scanResult: ScanResult;
  answers: Answers;
  rules: Rule[];
  provider?: JsonProvider;
}): Promise<Issue[]> {
  const provider = input.provider ?? createJsonProvider();
  const explained = await explainIssues(input.issues, provider);
  const mentions = await comparePolicy(input.policyText, provider);
  const extra = policyMismatchIssues(
    mentions,
    input.scanResult,
    input.answers,
    input.rules,
  );
  const extraExplained = await explainIssues(extra, provider);
  return sortIssues([...explained, ...extraExplained]);
}
