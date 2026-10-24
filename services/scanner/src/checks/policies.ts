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
    pattern: /cookie|cookies/,
    label: "cookie policy",
  },
  refund: {
    ruleId: "no-refund-link",
    pattern:
      /refund|widerruf|return policy|r[eé]tractation|cancellation|fulfillment|money[-\s]?back|\breturns\b/,
    label: "refund policy",
  },
};

export type PolicyCheckResult = {
  findings: Finding[];
  privacyPolicyUrl?: string;
};

export function policyLinkMatches(
  kind: PolicyKind,
  text: string,
  href: string,
): boolean {
  const haystack = `${text} ${href}`.toLowerCase();
  return POLICY_RULES[kind].pattern.test(haystack);
}

function normalizePath(path: string): string {
  if (path === "/") return "/";
  return path.replace(/\/+$/, "") || "/";
}

export function scorePolicyLink(
  kind: PolicyKind,
  text: string,
  href: string,
  pageUrl: string,
): number {
  if (!policyLinkMatches(kind, text, href)) return -1;
  const trimmed = href.trim();
  if (!trimmed || trimmed === "#" || /^javascript:/i.test(trimmed)) return -1;
  try {
    const absolute = new URL(trimmed, pageUrl);
    const page = new URL(pageUrl);
    const path = absolute.pathname.toLowerCase();
    let score = 1;
    if (kind === "privacy") {
      if (/privacy|datenschutz|privacidad|confidentialit/.test(path)) score += 20;
      if (/\/legal\b|\/policies\b|\/policy\b/.test(path)) score += 8;
    }
    const samePage =
      absolute.origin === page.origin &&
      normalizePath(absolute.pathname) === normalizePath(page.pathname);
    if (samePage && !absolute.hash) score -= 20;
    return score;
  } catch {
    return -1;
  }
}

export function pickPolicyUrl(
  kind: PolicyKind,
  links: Array<{ text: string; href: string }>,
  pageUrl: string,
): string | undefined {
  let best: { url: string; score: number } | undefined;
  for (const link of links) {
    const score = scorePolicyLink(kind, link.text, link.href, pageUrl);
    if (score <= 0) continue;
    try {
      const url = new URL(link.href, pageUrl).href;
      if (!best || score > best.score) best = { url, score };
    } catch {
      continue;
    }
  }
  return best?.url;
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
  for (const kind of Object.keys(POLICY_RULES) as PolicyKind[]) {
    const url = pickPolicyUrl(kind, links, ctx.finalUrl);
    if (url) found[kind] = url;
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
