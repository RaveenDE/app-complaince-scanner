import "./browsers-path.js";
import type { CapturedCookie, CapturedRequest } from "@acs/shared";
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
  await page.goto(url, { waitUntil: "load", timeout: 60_000 });
  try {
    await page.waitForLoadState("networkidle", { timeout: 20_000 });
  } catch {
    // Many sites keep polling or analytics running and never reach network idle.
  }
  await new Promise((resolve) => setTimeout(resolve, 3_000));
}

export async function capturePage(url: string): Promise<CapturedPage> {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({
      locale: "de-DE",
      timezoneId: "Europe/Berlin",
    });
    const page = await context.newPage();
    const requests: CapturedRequest[] = [];

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
