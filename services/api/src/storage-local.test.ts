import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LocalScanStore } from "./storage-local.js";
import { sampleAnswers } from "./test-answers.js";

describe("LocalScanStore", () => {
  let tmp: string;
  let store: LocalScanStore;

  beforeEach(async () => {
    tmp = await mkdtemp(join(tmpdir(), "acs-store-"));
    store = new LocalScanStore(tmp);
  });

  afterEach(async () => {
    await rm(tmp, { recursive: true, force: true });
  });

  it("round-trips a scan and stores objects as keys", async () => {
    await store.putScan({
      id: "scan-1",
      url: "https://example.com",
      answers: sampleAnswers(),
      status: "queued",
      createdAt: "2026-01-01T00:00:00.000Z",
      ownerConfirmed: true,
    });
    const key = await store.putObject(
      "scans/scan-1/screenshot.png",
      Buffer.from("png"),
      "image/png",
    );
    const updated = await store.updateScan("scan-1", {
      status: "done",
      screenshotKey: key,
    });
    expect(updated.screenshotKey).toBe("scans/scan-1/screenshot.png");
    expect(updated.report).toBeUndefined();
    const object = await store.getObject(key);
    expect(object?.contentType).toBe("image/png");
    expect(object?.body.toString()).toBe("png");
  });

  it("locks one active scan per IP", async () => {
    expect(await store.tryAcquireIpLock("1.1.1.1")).toBe(true);
    expect(await store.tryAcquireIpLock("1.1.1.1")).toBe(false);
    await store.releaseIpLock("1.1.1.1");
    expect(await store.tryAcquireIpLock("1.1.1.1")).toBe(true);
  });
});
