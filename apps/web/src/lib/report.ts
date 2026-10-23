import type { Issue, Scan } from "@acs/shared";

export function countBySeverity(issues: Issue[]): {
  high: number;
  medium: number;
  low: number;
} {
  return {
    high: issues.filter((issue) => issue.rule.severity === "high").length,
    medium: issues.filter((issue) => issue.rule.severity === "medium").length,
    low: issues.filter((issue) => issue.rule.severity === "low").length,
  };
}

export function splitIssues(issues: Issue[]): {
  automated: Issue[];
  manual: Issue[];
} {
  const automated: Issue[] = [];
  const manual: Issue[] = [];
  for (const issue of issues) {
    if (issue.rule.detect.type === "manual") manual.push(issue);
    else automated.push(issue);
  }
  return { automated, manual };
}

export function statusLabel(status: Scan["status"]): string {
  if (status === "queued") return "Waiting to start";
  if (status === "scanning") return "Scanning the page";
  if (status === "analyzing") return "Matching risk indicators";
  if (status === "done") return "Report ready";
  return "Scan failed";
}
