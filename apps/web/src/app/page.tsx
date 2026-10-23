import { DISCLAIMER } from "@/lib/disclaimer";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">
        App Compliance Scanner
      </h1>
      <p className="mt-4 text-lg text-slate-700">
        Enter a website URL and answer a short questionnaire. We scan the page
        and match what we find against a versioned rules database.
      </p>
      <aside
        className="mt-8 rounded-md border border-slate-300 bg-slate-50 p-4 text-sm text-slate-800"
        role="note"
      >
        {DISCLAIMER}
      </aside>
    </main>
  );
}
