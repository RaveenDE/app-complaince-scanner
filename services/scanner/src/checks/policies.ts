import type { Finding } from "@acs/shared";
import type { ScanContext } from "../context.js";

type PolicyKind = "privacy" | "terms" | "cookie" | "refund";

const POLICY_RULES: Record<
  PolicyKind,
  { ruleId: string; pattern: RegExp; label: string }
> = {
  privacy: {
    ruleId: "no-privacy-link",
    pattern: /privacy|datenschutz|confidentialit[eé]|privacidad/,
    label: "privacy policy",
  },
  terms: {
    ruleId: "no-terms-link",
    pattern: /terms|agb|bedingungen|condiciones|\btos\b|nutzungs/,
    label: "terms",
  },
  cookie: {
    ruleId: "no-cookie-policy-link",
    pattern: /cookie/,
    label: "cookie policy",
  },
  refund: {
    ruleId: "no-refund-link",
    pattern: /refund|widerruf|return policy|r[eé]tractation|cancellation/,
    label: "refund policy",
  },
};

export type PolicyCheckResult = {
  findings: Finding[];
  privacyPolicyUrl?: string;
};

function matchesPolicy(kind: PolicyKind, text: string, href: string): boolean {
  const pattern = POLICY_RULES[kind].pattern;
  return pattern.test(text) || pattern.test(href);
}

export async function checkPolicyLinks(
  ctx: ScanContext,
): Promise<PolicyCheckResult> {
  const links = await ctx.page.$$eval("a[href]", (anchors) =>
    anchors.map((anchor) => ({
      href: anchor.getAttribute("href") ?? "",
      text: (anchor.textContent ?? "").trim(),
    })),
  );

  const found: Partial<Record<PolicyKind, string>> = {};
  for (const link of links) {
    let absolute: string;
    try {
      absolute = new URL(link.href, ctx.finalUrl).href;
    } catch {
      continue;
    }
    const haystack = `${link.text} ${link.href}`.toLowerCase();
    for (const kind of Object.keys(POLICY_RULES) as PolicyKind[]) {
      if (!found[kind] && matchesPolicy(kind, haystack, haystack)) {
        found[kind] = absolute;
      }
    }
  }

  const findings: Finding[] = [];
  for (const kind of Object.keys(POLICY_RULES) as PolicyKind[]) {
    if (!found[kind]) {
      const rule = POLICY_RULES[kind];
      findings.push({
        ruleId: rule.ruleId,
        confidence: "medium",
        evidence: {
          notes: `No ${rule.label} link was detected from link text or href.`,
        },
      });
    }
  }

  return { findings, privacyPolicyUrl: found.privacy };
}
