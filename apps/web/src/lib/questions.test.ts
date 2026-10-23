import { describe, expect, it } from "vitest";
import {
  emptyForm,
  toCreateScanBody,
  validateStep,
  type FormState,
} from "./questions";

function answered(): FormState {
  const next = emptyForm();
  next.url = "https://example.com";
  next.ownerConfirmed = true;
  next.regions = ["EU"];
  for (const key of Object.keys(next.answers) as (keyof FormState["answers"])[]) {
    next.answers[key] = false;
  }
  return next;
}

describe("validateStep", () => {
  it("requires a URL and ownership on the first step", () => {
    expect(validateStep(0, emptyForm())).toContain("URL");
    const withUrl = emptyForm();
    withUrl.url = "https://example.com";
    expect(validateStep(0, withUrl)).toContain("authorized");
  });

  it("requires at least one region", () => {
    expect(validateStep(1, emptyForm())).toContain("region");
  });
});

describe("toCreateScanBody", () => {
  it("builds a create-scan payload from completed answers", () => {
    const body = toCreateScanBody(answered()) as {
      ownerConfirmed: boolean;
      answers: { regions: string[] };
    };
    expect(body.ownerConfirmed).toBe(true);
    expect(body.answers.regions).toEqual(["EU"]);
  });
});
