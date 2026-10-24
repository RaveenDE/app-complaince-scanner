import type { Page } from "playwright";
import { fetchFollowingRedirects, type SsrfOptions } from "@acs/shared/ssrf";

export const PRIVACY_POLICY_MAX_BYTES = 100 * 1024;

export function visibleTextFromHtml(html: string): string {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const POLICY_NAME =
  /privacy policy|privacy notice|datenschutzerkl|\bdatenschutz\b|politique de confidentialit|pol[ií]tica de privacidad/i;
const POLICY_SUBSTANCE =
  /personal data|personal information|personenbezogen|information we collect|data subject/i;

export function looksLikePrivacyPolicy(text: string): boolean {
  const visible = visibleTextFromHtml(text);
  return (
    visible.length >= 80 &&
    POLICY_NAME.test(visible) &&
    POLICY_SUBSTANCE.test(visible)
  );
}

function usablePolicyText(text: string): string | undefined {
  const visible = visibleTextFromHtml(text);
  if (!looksLikePrivacyPolicy(visible)) return undefined;
  return visible.slice(0, PRIVACY_POLICY_MAX_BYTES);
}

export async function readPrivacyPolicyText(
  page: Page,
  url: string,
  ssrf: SsrfOptions,
): Promise<string | undefined> {
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
    try {
      await page.waitForLoadState("networkidle", { timeout: 8_000 });
    } catch {
      // Client-rendered policies often keep a socket open.
    }
    try {
      await page.waitForFunction(
        "document.body && document.body.innerText.length >= 80 && /privacy policy|datenschutz|personal data|personal information/i.test(document.body.innerText)",
        { timeout: 12_000 },
      );
    } catch {
      // The document title may be enough; still try innerText / fetch.
    }
    const fromPage = usablePolicyText(await page.locator("body").innerText());
    if (fromPage) return fromPage;
  } catch {
    // Fall through to a plain fetch of the same URL.
  }

  const response = await fetchFollowingRedirects(url, ssrf);
  return usablePolicyText(visibleTextFromHtml(await response.text()));
}
