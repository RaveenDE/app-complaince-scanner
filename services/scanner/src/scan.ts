import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import {
  assertSafeUrl,
  fetchFollowingRedirects,
  RegionSchema,
  ScanResultSchema,
  type Region,
  type ScanResult,
  type SsrfOptions,
} from "@acs/shared";
import { capturePage } from "./browser.js";
import { runChecks } from "./checks/index.js";

const PRIVACY_POLICY_MAX_BYTES = 100 * 1024;
export const SCAN_TIMEOUT_MS = 120_000;

export type ScanOptions = SsrfOptions & {
  region?: Region;
  screenshotPath?: string;
  timeoutMs?: number;
};

async function fetchPrivacyPolicyText(
  url: string,
  ssrf: SsrfOptions,
): Promise<string | undefined> {
  const response = await fetchFollowingRedirects(url, ssrf);
  const text = await response.text();
  return text.slice(0, PRIVACY_POLICY_MAX_BYTES);
}

async function scanOnce(
  url: string,
  options: ScanOptions,
): Promise<ScanResult> {
  const region = options.region
    ? RegionSchema.parse(options.region)
    : undefined;
  await assertSafeUrl(url, options);

  const captured = await capturePage(url, options);
  try {
    if (options.screenshotPath) {
      await mkdir(dirname(options.screenshotPath), { recursive: true });
      await captured.page.screenshot({
        path: options.screenshotPath,
        fullPage: true,
      });
    }

    const { findings, policy } = await runChecks({
      url,
      finalUrl: captured.finalUrl,
      title: captured.title,
      requests: captured.requests,
      cookies: captured.cookies,
      page: captured.page,
    });

    let privacyPolicyText: string | undefined;
    if (policy.privacyPolicyUrl) {
      try {
        privacyPolicyText = await fetchPrivacyPolicyText(
          policy.privacyPolicyUrl,
          options,
        );
      } catch {
        privacyPolicyText = undefined;
      }
    }

    return ScanResultSchema.parse({
      url,
      finalUrl: captured.finalUrl,
      title: captured.title,
      findings,
      screenshotPath: options.screenshotPath,
      privacyPolicyText,
      cookies: captured.cookies,
      requests: captured.requests,
      region,
    });
  } finally {
    await captured.browser.close();
  }
}

export async function scan(
  url: string,
  options: ScanOptions = {},
): Promise<ScanResult> {
  const timeoutMs = options.timeoutMs ?? SCAN_TIMEOUT_MS;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      scanOnce(url, options),
      new Promise<ScanResult>((_, reject) => {
        timer = setTimeout(() => {
          reject(
            new Error("The page did not finish loading in time. Try again."),
          );
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
