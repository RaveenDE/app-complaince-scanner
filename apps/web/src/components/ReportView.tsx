import type { Scan } from "@acs/shared";
import { Disclaimer } from "@/components/Disclaimer";
import { IssueCard } from "@/components/IssueCard";
import { countBySeverity, splitIssues } from "@/lib/report";
import { REGION_OPTIONS } from "@/lib/questions";

export function ReportView({ scan }: { scan: Scan }) {
  const issues = scan.report?.issues ?? [];
  const counts = countBySeverity(issues);
  const { automated, manual } = splitIssues(issues);
  const regionLabels = scan.answers.regions.map(
    (region) => REGION_OPTIONS.find((option) => option.id === region)?.label ?? region,
  );

  return (
    <div data-report-ready="true">
      <Disclaimer />
      <header className="mt-8">
        <h1 className="text-3xl font-semibold tracking-tight">Risk report</h1>
        <p className="mt-2 text-zinc-700 dark:text-zinc-300">
          Ranked risk indicators for{" "}
          <a className="underline" href={scan.url}>
            {scan.report?.title || scan.url}
          </a>
          . These are likely issues detected from the page and your answers, not
          a finding that the site violates the law.
        </p>
      </header>

      <section className="mt-8" aria-labelledby="summary-heading">
        <h2 id="summary-heading" className="text-xl font-semibold">
          Summary
        </h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-3">
          <li className="rounded-md border border-zinc-300 p-3 dark:border-zinc-700">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">High</p>
            <p className="text-2xl font-semibold">{counts.high}</p>
          </li>
          <li className="rounded-md border border-zinc-300 p-3 dark:border-zinc-700">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Medium</p>
            <p className="text-2xl font-semibold">{counts.medium}</p>
          </li>
          <li className="rounded-md border border-zinc-300 p-3 dark:border-zinc-700">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Low</p>
            <p className="text-2xl font-semibold">{counts.low}</p>
          </li>
        </ul>
        <p className="mt-3 text-sm text-zinc-700 dark:text-zinc-300">
          Regions covered: {regionLabels.join(", ")}
        </p>
      </section>

      {scan.screenshotKey ? (
        <section className="mt-8" aria-labelledby="screenshot-heading">
          <h2 id="screenshot-heading" className="text-xl font-semibold">
            Screenshot
          </h2>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="mt-3 w-full rounded-md border border-zinc-300 dark:border-zinc-700"
            src={`/api/scans/${scan.id}/screenshot`}
            alt="Screenshot of the scanned page"
          />
        </section>
      ) : null}

      <section className="mt-8 space-y-4" aria-labelledby="issues-heading">
        <h2 id="issues-heading" className="text-xl font-semibold">
          Detected indicators
        </h2>
        {automated.length === 0 ? (
          <p>No automated risk indicators matched for this scan.</p>
        ) : (
          automated.map((issue) => (
            <IssueCard key={issue.rule.id} issue={issue} />
          ))
        )}
      </section>

      <section className="mt-8 space-y-4" aria-labelledby="manual-heading">
        <h2 id="manual-heading" className="text-xl font-semibold">
          Manual checks
        </h2>
        <p className="text-sm text-zinc-700 dark:text-zinc-300">
          These items were not scanned automatically. Review them by hand.
        </p>
        {manual.length === 0 ? (
          <p>No manual checks apply for these answers.</p>
        ) : (
          manual.map((issue) => <IssueCard key={issue.rule.id} issue={issue} />)
        )}
      </section>

      <Disclaimer className="mt-10" />
    </div>
  );
}
