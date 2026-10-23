import Link from "next/link";
import { Disclaimer } from "@/components/Disclaimer";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">
        App Compliance Scanner
      </h1>
      <p className="mt-4 text-lg text-zinc-700 dark:text-zinc-300">
        Risk screening for a website you own: scan the page, answer a short
        questionnaire, and get ranked indicators with evidence and fixes.
      </p>
      <Disclaimer className="mt-8" />
      <p className="mt-8">
        <Link
          className="inline-flex rounded-md bg-zinc-900 px-4 py-2 text-white dark:bg-zinc-100 dark:text-zinc-900"
          href="/scan/new"
        >
          Start a scan
        </Link>
      </p>
    </main>
  );
}
