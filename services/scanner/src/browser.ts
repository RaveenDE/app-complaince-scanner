import "./browsers-path.js";
import type { CapturedCookie, CapturedRequest } from "@acs/shared";
import {
  assertSafeUrl,
  cachedLookup,
  type SsrfOptions,
} from "@acs/shared/ssrf";
import {
  chromium,
  type Browser,
  type BrowserContext,
  type Page,
} from "playwright";

export type CapturedPage = {
  browser: Browser;
  context: BrowserContext;
  page: Page;
  requests: CapturedRequest[];
  cookies: CapturedCookie[];
  finalUrl: string;
  title: string;
};

async function gotoAndWait(page: Page, url: string): Promise<void> {
  // Require DOMContentLoaded only. Some sites never fire `load` (long-lived
  // scripts, bot walls), which used to fail the whole scan at 60s.
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 });
  try {
    await page.waitForLoadState("load", { timeout: 20_000 });
  } catch {
    // Continue with the document we have.
  }
  try {
    await page.waitForLoadState("networkidle", { timeout: 15_000 });
  } catch {
    // Many sites keep polling or analytics running and never reach network idle.
  }
  await new Promise((resolve) => setTimeout(resolve, 3_000));
}

export async function capturePage(
  url: string,
  ssrf: SsrfOptions = {},
): Promise<CapturedPage> {
  const checks: SsrfOptions = {
    ...ssrf,
    lookup: cachedLookup(ssrf.lookup),
  };
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({
      locale: "de-DE",
      timezoneId: "Europe/Berlin",
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    });
    const page = await context.newPage();
    const requests: CapturedRequest[] = [];

    await page.route("**/*", async (route) => {
      try {
        await assertSafeUrl(route.request().url(), checks);
        await route.continue();
      } catch {
        await route.abort("blockedbyclient");
      }
    });

    page.on("request", (request) => {
      requests.push({
        url: request.url(),
        method: request.method(),
        resourceType: request.resourceType(),
      });
    });

    await gotoAndWait(page, url);

    const cookies = (await context.cookies()).map((cookie) => ({
      name: cookie.name,
      domain: cookie.domain,
      path: cookie.path,
      httpOnly: cookie.httpOnly,
      secure: cookie.secure,
    }));

    return {
      browser,
      context,
      page,
      requests,
      cookies,
      finalUrl: page.url(),
      title: await page.title(),
    };
  } catch (error) {
    await browser.close();
    throw error;
  }
}
