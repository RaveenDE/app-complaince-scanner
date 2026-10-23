import type { Finding } from "@acs/shared";
import type { ScanContext } from "../context.js";

const CMP_SELECTORS = [
  "#onetrust-banner-sdk",
  "#onetrust-consent-sdk",
  "#CybotCookiebotDialog",
  "#qc-cmp2-container",
  ".cc-window",
  ".cmplz-cookiebanner",
  "[id*='cookie'][id*='banner']",
  "[class*='cookie'][class*='banner']",
  "[class*='consent-banner']",
];

const BUTTON_TEXT =
  /accept|reject|ablehnen|akzeptieren|zustimmen|einwilligen|agree|decline/i;

export async function checkConsentBanner(
  ctx: ScanContext,
): Promise<Finding[]> {
  for (const selector of CMP_SELECTORS) {
    const locator = ctx.page.locator(selector).first();
    if ((await locator.count()) > 0) {
      return [];
    }
  }

  const buttons = ctx.page.locator("button, a, [role='button']");
  const count = await buttons.count();
  for (let index = 0; index < count; index += 1) {
    const text = (await buttons.nth(index).innerText().catch(() => "")).trim();
    if (text && BUTTON_TEXT.test(text)) {
      return [];
    }
  }

  return [
    {
      ruleId: "no-consent-banner-detected",
      confidence: "low",
      evidence: {
        notes:
          "No consent banner was detected. Banners vary widely, so this is a low-confidence heuristic, not proof that a banner is absent.",
      },
    },
  ];
}
