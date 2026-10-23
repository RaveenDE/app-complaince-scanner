import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { serveFixture } from "@acs/scanner";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { handleRequest } from "./app.js";
import { runPipeline } from "./pipeline.js";
import { LocalScanStore } from "./storage-local.js";
import { sampleAnswers } from "./test-answers.js";

const fixturesRoot = fileURLToPath(
  new URL("../../scanner/fixtures", import.meta.url),
);

describe("pipeline e2e", () => {
  let tmp: string;
  let store: LocalScanStore;
  let fixtureUrl: string;
  let close: () => Promise<void>;

  beforeAll(async () => {
    tmp = await mkdtemp(join(tmpdir(), "acs-pipe-e2e-"));
    store = new LocalScanStore(tmp);
    const fixture = await serveFixture(join(fixturesRoot, "bad-site"));
    fixtureUrl = fixture.url;
    close = fixture.close;
  });

  afterAll(async () => {
    await close();
    await rm(tmp, { recursive: true, force: true });
  });

  it("runs the local pipeline on the bad-site fixture", async () => {
    const created = await handleRequest(
      {
        method: "POST",
        path: "/scans",
        body: JSON.stringify({
          url: fixtureUrl,
          answers: sampleAnswers(),
          ownerConfirmed: true,
        }),
        headers: {},
        clientIp: "203.0.113.50",
      },
      store,
      {
        start(id) {
          void runPipeline(id, store, { allowPrivateAddresses: true });
        },
      },
      { allowPrivateAddresses: true },
    );
    expect(created.status).toBe(201);
    const id = JSON.parse(created.body) as { id: string };
    expect(id.id).toBeTruthy();

    const deadline = Date.now() + 90_000;
    let body: {
      status: string;
      report?: { issues: Array<{ rule: { id: string } }>; screenshotKey?: string };
      screenshotKey?: string;
    } = { status: "queued" };
    while (Date.now() < deadline) {
      const got = await handleRequest(
        {
          method: "GET",
          path: `/scans/${id.id}`,
          headers: {},
          clientIp: "203.0.113.50",
        },
        store,
        { start() {} },
      );
      body = JSON.parse(got.body) as typeof body;
      if (body.status === "done" || body.status === "failed") break;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    expect(body.status).toBe("done");
    expect(body.report?.issues.length).toBeGreaterThan(0);
    expect(body.report?.screenshotKey ?? body.screenshotKey).toMatch(
      /^scans\/.+\/screenshot\.png$/,
    );
    expect(JSON.stringify(body)).not.toContain("privacyPolicyText");
    const ruleIds = (body.report?.issues ?? []).map((issue) => issue.rule.id);
    expect(ruleIds).toContain("insecure-http");
    expect(ruleIds).toContain("missing-alt-text");
  });
});
