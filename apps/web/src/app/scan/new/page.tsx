import { Disclaimer } from "@/components/Disclaimer";
import { QuestionnaireForm } from "@/components/QuestionnaireForm";

export default function NewScanPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">New scan</h1>
      <p className="mt-3 text-zinc-700 dark:text-zinc-300">
        Answer in plain language. We match your answers and the page scan to
        versioned rules. This is not legal advice.
      </p>
      <Disclaimer className="mt-6" />
      <div className="mt-8">
        <QuestionnaireForm />
      </div>
    </main>
  );
}
