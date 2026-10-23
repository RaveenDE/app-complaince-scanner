import AxeBuilder from "@axe-core/playwright";
import type { Finding } from "@acs/shared";
import type { ScanContext } from "../context.js";

export async function checkAccessibility(
  ctx: ScanContext,
): Promise<Finding[]> {
  const findings: Finding[] = [];
  const results = await new AxeBuilder({ page: ctx.page }).analyze();

  if (results.violations.length > 0) {
    const summary = results.violations
      .map(
        (violation) =>
          `${violation.id} (${violation.impact ?? "unknown"}, ${String(violation.nodes.length)} nodes)`,
      )
      .join("; ");
    findings.push({
      ruleId: "accessibility-violations",
      confidence: "high",
      evidence: {
        notes: `Detected accessibility issues via axe-core: ${summary}.`,
      },
    });
  }

  const missingAltCount = await ctx.page.$$eval(
    "img",
    (images) => images.filter((image) => !image.hasAttribute("alt")).length,
  );
  const axeImageAlt = results.violations.some(
    (violation) => violation.id === "image-alt",
  );

  if (missingAltCount > 0 || axeImageAlt) {
    findings.push({
      ruleId: "missing-alt-text",
      confidence: "high",
      evidence: {
        notes: `Detected ${String(missingAltCount)} image(s) without an alt attribute.`,
      },
    });
  }

  return findings;
}
