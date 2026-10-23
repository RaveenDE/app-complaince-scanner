import { SsrfError } from "@acs/shared/ssrf";
import { ZodError } from "zod";

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export function userSafeError(error: unknown): string {
  if (error instanceof HttpError) return error.message;
  if (error instanceof SsrfError) return error.message;
  if (error instanceof ZodError) return "The request is not valid.";
  if (error instanceof Error && error.name === "TimeoutError") {
    return "The page did not finish loading in time. Try again.";
  }
  const message = error instanceof Error ? error.message : "";
  if (message.includes("did not finish loading in time")) return message;
  if (/executable does(?:n't| not) exist/i.test(message)) {
    return "Chromium is not installed. Run: pnpm browsers";
  }
  return "The scan failed. Check the URL and try again.";
}
