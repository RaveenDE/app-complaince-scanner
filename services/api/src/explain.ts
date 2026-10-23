import type { Issue } from "@acs/shared";

/** Stage 5 will add LLM explanations. Until then, pass issues through unchanged. */
export function explainIssues(issues: Issue[]): Issue[] {
  return issues;
}
