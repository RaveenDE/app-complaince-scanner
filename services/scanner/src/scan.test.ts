import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { ScanResultSchema } from "@acs/shared";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { serveFixture, type FixtureServer } from "./fixture-server.js";
import { scan } from "./scan.js";

const fixturesRoot = fileURLToPath(new URL("../fixtures", import.meta.url));

const BAD_EXPECTED = [
  "trackers-before-consent",
  "cookies-before-consent",
  "google-fonts-remote",
  "session-replay-detected",
  "no-consent-banner-detected",
  "no-privacy-link",
  "no-terms-link",
  "no-cookie-policy-link",
  "no-refund-link",
  "missing-alt-text",
  "insecure-http",
];

const GOOD_ABSENT = [
  "trackers-before-consent",
  "google-fonts-remote",
  "session-replay-detected",
  "no-consent-banner-detected",
  "no-privacy-link",
  "no-terms-link",
  "no-cookie-policy-link",
  "no-refund-link",
  "missing-alt-text",
];

describe("scanner fixtures", () => {
  let bad: FixtureServer;
  let good: FixtureServer;
  let tmp: string;

  beforeAll(async () => {
    tmp = await mkdtemp(join(tmpdir(), "acs-scan-"));
    bad = await serveFixture(join(fixturesRoot, "bad-site"));
    good = await serveFixture(join(fixturesRoot, "good-site"));
  });

  afterAll(async () => {
    await Promise.all([bad.close(), good.close()]);
    await rm(tmp, { recursive: true, force: true });
  });

  it("flags the bad-site fixture", async () => {
    const result = await scan(bad.url, {
      allowPrivateAddresses: true,
      region: "EU",
      screenshotPath: join(tmp, "bad.png"),
    });
    ScanResultSchema.parse(result);

    const ids = result.findings.map((finding) => finding.ruleId);
    for (const ruleId of BAD_EXPECTED) {
      expect(ids, `expected ${ruleId}`).toContain(ruleId);
    }

    const consent = result.findings.find(
      (finding) => finding.ruleId === "no-consent-banner-detected",
    );
    expect(consent?.confidence).toBe("low");
    expect(result.privacyPolicyText).toBeUndefined();
  });

  it("does not flag tracker, font, replay, alt, or policy issues on the good-site fixture", async () => {
    const result = await scan(good.url, {
      allowPrivateAddresses: true,
      region: "EU",
      screenshotPath: join(tmp, "good.png"),
    });
    ScanResultSchema.parse(result);

    const ids = result.findings.map((finding) => finding.ruleId);
    for (const ruleId of GOOD_ABSENT) {
      expect(ids, `did not expect ${ruleId}`).not.toContain(ruleId);
    }

    expect(result.privacyPolicyText?.toLowerCase()).toContain("privacy policy");
  });
});
