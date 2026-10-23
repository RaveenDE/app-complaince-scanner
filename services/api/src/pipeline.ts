import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { evaluate, loadRules } from "@acs/rules";
import { scan, SCAN_TIMEOUT_MS } from "@acs/scanner";
import { assertSafeUrl } from "@acs/shared/ssrf";
import { explainIssues } from "./explain.js";
import { userSafeError } from "./errors.js";
import type { ScanStore } from "./storage.js";

export type PipelineOptions = {
  allowPrivateAddresses?: boolean;
};

export async function runPipeline(
  scanId: string,
  store: ScanStore,
  options: PipelineOptions = {},
): Promise<void> {
  const record = await store.getScan(scanId);
  if (!record) return;
  const ssrf = { allowPrivateAddresses: options.allowPrivateAddresses === true };
  const tmp = await mkdtemp(join(tmpdir(), "acs-pipe-"));
  try {
    await store.updateScan(scanId, { status: "scanning" });
    await assertSafeUrl(record.url, ssrf);

    const screenshotPath = join(tmp, "screenshot.png");
    const result = await scan(record.url, {
      ...ssrf,
      region: record.answers.regions[0],
      screenshotPath,
      timeoutMs: SCAN_TIMEOUT_MS,
    });

    await store.updateScan(scanId, { status: "analyzing" });

    let screenshotKey: string | undefined;
    try {
      const bytes = await readFile(screenshotPath);
      screenshotKey = await store.putObject(
        `scans/${scanId}/screenshot.png`,
        bytes,
        "image/png",
      );
    } catch {
      screenshotKey = undefined;
    }

    let policyTextKey: string | undefined;
    if (result.privacyPolicyText) {
      policyTextKey = await store.putObject(
        `scans/${scanId}/privacy.txt`,
        result.privacyPolicyText,
        "text/plain; charset=utf-8",
      );
    }

    const issues = explainIssues(
      evaluate(record.answers, result, await loadRules()),
    );
    const report = {
      issues,
      screenshotKey,
      policyTextKey,
      finalUrl: result.finalUrl,
      title: result.title,
    };

    await store.updateScan(scanId, {
      status: "done",
      report,
      screenshotKey,
      policyTextKey,
    });
  } catch (error) {
    await store.updateScan(scanId, {
      status: "failed",
      errorMessage: userSafeError(error),
    });
  } finally {
    if (record.clientIp) await store.releaseIpLock(record.clientIp);
    await rm(tmp, { recursive: true, force: true });
  }
}
