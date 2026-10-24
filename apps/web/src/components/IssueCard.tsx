import { formatReviewStatus } from "@acs/shared";
import type { Issue } from "@acs/shared";

const SEVERITY_CLASS: Record<string, string> = {
  high: "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-100",
  medium: "bg-amber-100 text-amber-950 dark:bg-amber-950 dark:text-amber-100",
  low: "bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100",
};

export function IssueCard({ issue }: { issue: Issue }) {
  const evidenceBits: string[] = [];
  if (issue.evidence.notes) evidenceBits.push(issue.evidence.notes);
  if (issue.evidence.urls?.length) {
    evidenceBits.push(`Detected URLs: ${issue.evidence.urls.join(", ")}`);
  }
  if (issue.evidence.cookies?.length) {
    evidenceBits.push(
      `Detected cookies: ${issue.evidence.cookies.map((cookie) => cookie.name).join(", ")}`,
    );
  }

  return (
    <article className="rounded-lg border border-zinc-300 p-4 dark:border-zinc-700">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-lg font-semibold">{issue.rule.title}</h3>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${SEVERITY_CLASS[issue.rule.severity] ?? ""}`}
        >
          Severity {issue.rule.severity}
        </span>
        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100">
          Confidence {issue.confidence}
        </span>
      </div>
      {issue.explanation ? (
        <section className="mt-3">
          <h4 className="text-sm font-semibold">In plain language</h4>
          <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
            {issue.explanation}
          </p>
        </section>
      ) : null}
      <section className="mt-3">
        <h4 className="text-sm font-semibold">What we found</h4>
        <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
          {evidenceBits.join(" ") || "No extra evidence notes."}
        </p>
      </section>
      <section className="mt-3">
        <h4 className="text-sm font-semibold">Why it matters</h4>
        <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
          {issue.rule.requirement}
        </p>
      </section>
      <section className="mt-3">
        <h4 className="text-sm font-semibold">How to fix</h4>
        <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
          {issue.rule.fix}
        </p>
      </section>
      <p className="mt-3 text-xs text-zinc-600 dark:text-zinc-400">
        {issue.rule.source_url ? (
          <>
            Source:{" "}
            <a className="underline" href={issue.rule.source_url}>
              {issue.rule.source_url}
            </a>
          </>
        ) : (
          "No source URL on this rule yet."
        )}
        {" · "}
        {formatReviewStatus(issue.rule.last_verified)}
      </p>
    </article>
  );
}
