"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  QUESTION_STEPS,
  REGION_OPTIONS,
  YES_NO_QUESTIONS,
  emptyForm,
  keysForStep,
  toCreateScanBody,
  validateStep,
  type FormState,
  type YesNoKey,
} from "@/lib/questions";

export function QuestionnaireForm() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const stepKeys = keysForStep(step);
  const questions = useMemo(
    () => YES_NO_QUESTIONS.filter((question) => stepKeys.includes(question.key)),
    [stepKeys],
  );

  function setAnswer(key: YesNoKey, value: boolean): void {
    setForm((current) => ({
      ...current,
      answers: { ...current.answers, [key]: value },
    }));
  }

  function toggleRegion(id: FormState["regions"][number], checked: boolean): void {
    setForm((current) => ({
      ...current,
      regions: checked
        ? [...new Set([...current.regions, id])]
        : current.regions.filter((region) => region !== id),
    }));
  }

  async function next(): Promise<void> {
    const message = validateStep(step, form);
    if (message) {
      setError(message);
      return;
    }
    setError(null);
    if (step < QUESTION_STEPS.length - 1) {
      setStep(step + 1);
      return;
    }
    setPending(true);
    try {
      const response = await fetch("/api/scans", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(toCreateScanBody(form)),
      });
      const payload = (await response.json()) as { id?: string; error?: string };
      if (!response.ok || !payload.id) {
        setError(payload.error ?? "Could not start the scan.");
        return;
      }
      router.push(`/scan/${payload.id}`);
    } catch {
      setError("Could not start the scan.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        void next();
      }}
      noValidate
    >
      <ol className="flex flex-wrap gap-2 text-sm" aria-label="Form steps">
        {QUESTION_STEPS.map((item, index) => (
          <li
            key={item.id}
            aria-current={index === step ? "step" : undefined}
            className={
              index === step
                ? "font-semibold text-zinc-900 dark:text-zinc-50"
                : "text-zinc-600 dark:text-zinc-400"
            }
          >
            {index + 1}. {item.title}
          </li>
        ))}
      </ol>

      {step === 0 ? (
        <fieldset className="space-y-4">
          <legend className="text-xl font-semibold">Website to scan</legend>
          <div>
            <label className="block text-sm font-medium" htmlFor="url">
              Website URL
            </label>
            <input
              id="url"
              name="url"
              type="url"
              autoComplete="url"
              className="mt-1 w-full rounded-md border border-zinc-400 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-900"
              value={form.url}
              onChange={(event) =>
                setForm((current) => ({ ...current, url: event.target.value }))
              }
              required
            />
          </div>
          <div className="flex items-start gap-2">
            <input
              id="owner"
              name="ownerConfirmed"
              type="checkbox"
              className="mt-1 h-4 w-4"
              checked={form.ownerConfirmed}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  ownerConfirmed: event.target.checked,
                }))
              }
              required
            />
            <label htmlFor="owner" className="text-sm">
              I own this site or I am authorized to scan it.
            </label>
          </div>
        </fieldset>
      ) : null}

      {step === 1 ? (
        <fieldset className="space-y-3">
          <legend className="text-xl font-semibold">Where do people use this?</legend>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Select every region you serve. This chooses which risk indicators to
            show. It is not a legal assessment of those regions.
          </p>
          {REGION_OPTIONS.map((option) => (
            <div key={option.id} className="flex items-start gap-2">
              <input
                id={`region-${option.id}`}
                type="checkbox"
                className="mt-1 h-4 w-4"
                checked={form.regions.includes(option.id)}
                onChange={(event) => toggleRegion(option.id, event.target.checked)}
              />
              <label htmlFor={`region-${option.id}`}>{option.label}</label>
            </div>
          ))}
        </fieldset>
      ) : null}

      {questions.length > 0 ? (
        <fieldset className="space-y-6">
          <legend className="text-xl font-semibold">
            {QUESTION_STEPS[step]?.title}
          </legend>
          {questions.map((question) => (
            <fieldset key={question.key} className="space-y-2">
              <legend className="font-medium">{question.label}</legend>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {question.hint}
              </p>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={question.key}
                    checked={form.answers[question.key] === true}
                    onChange={() => setAnswer(question.key, true)}
                  />
                  Yes
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={question.key}
                    checked={form.answers[question.key] === false}
                    onChange={() => setAnswer(question.key, false)}
                  />
                  No
                </label>
              </div>
            </fieldset>
          ))}
        </fieldset>
      ) : null}

      {error ? (
        <p className="text-sm text-red-800 dark:text-red-300" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex gap-3">
        {step > 0 ? (
          <button
            type="button"
            className="rounded-md border border-zinc-400 px-4 py-2 dark:border-zinc-600"
            onClick={() => {
              setError(null);
              setStep(step - 1);
            }}
          >
            Back
          </button>
        ) : null}
        <button
          type="submit"
          className="rounded-md bg-zinc-900 px-4 py-2 text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
          disabled={pending}
        >
          {step === QUESTION_STEPS.length - 1
            ? pending
              ? "Starting scan…"
              : "Start scan"
            : "Continue"}
        </button>
      </div>
    </form>
  );
}
