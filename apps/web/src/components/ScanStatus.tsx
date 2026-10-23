"use client";

import { useEffect, useState } from "react";
import type { Scan } from "@acs/shared";
import { Disclaimer } from "@/components/Disclaimer";
import { ReportView } from "@/components/ReportView";
import { fetchScan } from "@/lib/api";
import { statusLabel } from "@/lib/report";

export function ScanStatus({ id }: { id: string }) {
  const [scan, setScan] = useState<Scan | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function tick(): Promise<void> {
      try {
        const next = await fetchScan(id);
        if (cancelled) return;
        setScan(next);
        setError(null);
        if (next.status !== "done" && next.status !== "failed") {
          timer = setTimeout(() => void tick(), 2000);
        }
      } catch (caught) {
        if (cancelled) return;
        setError(caught instanceof Error ? caught.message : "Could not load this scan.");
        timer = setTimeout(() => void tick(), 4000);
      }
    }

    void tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [id]);

  if (error && !scan) {
    return (
      <p role="alert" className="text-red-800 dark:text-red-300">
        {error}
      </p>
    );
  }

  if (!scan) {
    return <p aria-live="polite">Loading scan status…</p>;
  }

  if (scan.status === "failed") {
    return (
      <div data-scan-failed="true">
        <Disclaimer />
        <h1 className="mt-8 text-3xl font-semibold">Scan failed</h1>
        <p className="mt-3" role="alert">
          {scan.errorMessage ?? "The scan failed. Check the URL and try again."}
        </p>
      </div>
    );
  }

  if (scan.status !== "done") {
    return (
      <div>
        <Disclaimer />
        <h1 className="mt-8 text-3xl font-semibold">Scanning</h1>
        <p className="mt-3" aria-live="polite">
          {statusLabel(scan.status)} for {scan.url}. This usually takes about a
          minute. Keep this page open.
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="no-print mb-6">
        <a
          className="rounded-md bg-zinc-900 px-4 py-2 text-white dark:bg-zinc-100 dark:text-zinc-900"
          href={`/scan/${id}/pdf`}
        >
          Download PDF
        </a>
      </p>
      <ReportView scan={scan} />
    </div>
  );
}
