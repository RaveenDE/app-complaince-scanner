import { describe, expect, it } from "vitest";
import { pickPolicyUrl, policyLinkMatches } from "./policies.js";

describe("policyLinkMatches", () => {
  it("matches a cookie policy from common labels", () => {
    expect(policyLinkMatches("cookie", "Cookie Policy", "/legal/cookies")).toBe(
      true,
    );
    expect(policyLinkMatches("cookie", "Cookies", "/cookies")).toBe(true);
  });

  it("matches refund-like fulfillment and returns links", () => {
    expect(
      policyLinkMatches("refund", "Fulfillment Policy", "/fulfillment"),
    ).toBe(true);
    expect(policyLinkMatches("refund", "Returns", "/returns")).toBe(true);
    expect(policyLinkMatches("refund", "Money-back guarantee", "/")).toBe(true);
  });

  it("does not treat a privacy link as a cookie or refund link", () => {
    expect(
      policyLinkMatches("cookie", "Privacy Policy", "/privacy"),
    ).toBe(false);
    expect(policyLinkMatches("refund", "Privacy Policy", "/privacy")).toBe(
      false,
    );
  });
});

describe("pickPolicyUrl", () => {
  it("prefers a /privacy href over a same-page privacy label", () => {
    const url = pickPolicyUrl(
      "privacy",
      [
        { text: "Privacy", href: "/" },
        { text: "Privacy Policy", href: "/privacy" },
      ],
      "https://example.com/de",
    );
    expect(url).toBe("https://example.com/privacy");
  });

  it("skips hash-only and javascript links", () => {
    const url = pickPolicyUrl(
      "privacy",
      [
        { text: "Privacy", href: "#" },
        { text: "Privacy", href: "javascript:void(0)" },
        { text: "Datenschutz", href: "/datenschutz" },
      ],
      "https://example.com/",
    );
    expect(url).toBe("https://example.com/datenschutz");
  });
});
