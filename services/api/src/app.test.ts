import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { handleRequest, type PipelineRunner } from "./app.js";
import { LocalScanStore } from "./storage-local.js";
import { sampleAnswers } from "./test-answers.js";

describe("API request handling", () => {
  let tmp: string;
  let store: LocalScanStore;
  const started: string[] = [];
  const runner: PipelineRunner = {
    start(id) {
      started.push(id);
    },
  };

  beforeEach(async () => {
    started.length = 0;
    tmp = await mkdtemp(join(tmpdir(), "acs-api-"));
    store = new LocalScanStore(tmp);
  });

  afterEach(async () => {
    await rm(tmp, { recursive: true, force: true });
  });

  it("rejects when ownerConfirmed is false", async () => {
    const response = await handleRequest(
      {
        method: "POST",
        path: "/scans",
        body: JSON.stringify({
          url: "https://example.com",
          answers: sampleAnswers(),
          ownerConfirmed: false,
        }),
        headers: {},
        clientIp: "203.0.113.10",
      },
      store,
      runner,
    );
    expect(response.status).toBe(400);
    expect(response.body).toContain("authorized");
    expect(started).toHaveLength(0);
  });

  it("rejects file URLs", async () => {
    const response = await handleRequest(
      {
        method: "POST",
        path: "/scans",
        body: JSON.stringify({
          url: "file:///etc/passwd",
          answers: sampleAnswers(),
          ownerConfirmed: true,
        }),
        headers: {},
        clientIp: "203.0.113.11",
      },
      store,
      runner,
    );
    expect(response.status).toBe(400);
    expect(started).toHaveLength(0);
  });

  it("rejects loopback when private addresses are not allowed", async () => {
    const response = await handleRequest(
      {
        method: "POST",
        path: "/scans",
        body: JSON.stringify({
          url: "http://127.0.0.1/",
          answers: sampleAnswers(),
          ownerConfirmed: true,
        }),
        headers: {},
        clientIp: "203.0.113.12",
      },
      store,
      runner,
      { allowPrivateAddresses: false },
    );
    expect(response.status).toBe(400);
    expect(response.body).toContain("private");
    expect(started).toHaveLength(0);
  });
});
