import { LEGAL_DRAFT_BANNER } from "@/lib/legal";
import { Disclaimer } from "@/components/Disclaimer";

export function LegalPage({
  title,
  paragraphs,
}: {
  title: string;
  paragraphs: readonly string[];
}) {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
        {LEGAL_DRAFT_BANNER}
      </p>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">{title}</h1>
      <Disclaimer className="mt-8" />
      {paragraphs.map((paragraph) => (
        <p key={paragraph} className="mt-4 text-zinc-700 dark:text-zinc-300">
          {paragraph}
        </p>
      ))}
    </main>
  );
}
