import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import {
  RegionSchema,
  ScanResultSchema,
  type Region,
  type ScanResult,
} from "@acs/shared";
import { capturePage } from "./browser.js";
import { runChecks } from "./checks/index.js";
import { assertSafeUrl, type SsrfOptions } from "./ssrf.js";

const PRIVACY_POLICY_MAX_BYTES = 100 * 1024;

export type ScanOptions = SsrfOptions & {
  region?: Region;
  screenshotPath?: string;
};

async function fetchPrivacyPolicyText(
  url: string,
  ssrf: SsrfOptions,
): Promise<string | undefined> {
  await assertSafeUrl(url, ssrf);
  const response = await fetch(url, { redirect: "follow" });
  const text = await response.text();
  return text.slice(0, PRIVACY_POLICY_MAX_BYTES);
}

export async function scan(
  url: string,
  options: ScanOptions = {},
): Promise<ScanResult> {
  const region = options.region
    ? RegionSchema.parse(options.region)
    : undefined;
  await assertSafeUrl(url, options);

  const captured = await capturePage(url);
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
