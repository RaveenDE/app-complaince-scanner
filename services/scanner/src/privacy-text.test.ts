import { describe, expect, it } from "vitest";
import {
  looksLikePrivacyPolicy,
  visibleTextFromHtml,
} from "./privacy-text.js";

describe("visibleTextFromHtml", () => {
  it("drops scripts, styles, and tags", () => {
    const text = visibleTextFromHtml(`
      <html><head><style>body{color:red}</style>
      <script>var token = "secret"</script></head>
      <body><h1>Privacy Policy</h1><p>We retain account data for 24 months.</p></body></html>
    `);
    expect(text).toContain("Privacy Policy");
    expect(text).toContain("We retain account data for 24 months.");
    expect(text).not.toContain("secret");
    expect(text).not.toContain("color:red");
  });
});

describe("looksLikePrivacyPolicy", () => {
  it("rejects a marketing homepage that only links to privacy", () => {
    expect(
      looksLikePrivacyPolicy(`
        Ship 3D models in minutes. Privacy Policy Terms of Use
      `),
    ).toBe(false);
  });

  it("accepts a policy that names itself and discusses personal data", () => {
    expect(
      looksLikePrivacyPolicy(`
        This privacy policy describes how we handle personal data.
        We collect personal information when you create an account.
      `),
    ).toBe(true);
  });
});
