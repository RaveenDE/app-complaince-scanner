import { DISCLAIMER } from "@/lib/disclaimer";

export function Disclaimer({ className = "" }: { className?: string }) {
  return (
    <aside
      className={`rounded-md border border-zinc-300 bg-zinc-50 p-4 text-sm text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 ${className}`}
      role="note"
    >
      {DISCLAIMER}
    </aside>
  );
}
