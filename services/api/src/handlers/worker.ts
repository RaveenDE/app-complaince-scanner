import { evaluate, loadRules } from "@acs/rules";
import { ScanResultSchema, type Issue } from "@acs/shared";
import { assertSafeUrl } from "@acs/shared/ssrf";
import { runExplainStage } from "../explain.js";
import { userSafeError } from "../errors.js";
import {
  AwsScanStore,
  createAwsClientsFromEnv,
} from "../storage-aws.js";
import type { ScanStore } from "../storage.js";

export type WorkerEvent = {
  action: "safety" | "evaluate" | "explain" | "finalize";
  scanId: string;
  findingsJson?: string;
  screenshotKey?: string;
  policyTextKey?: string;
  issues?: Issue[];
};

let store: ScanStore | undefined;

function getStore(): ScanStore {
  store ??= new AwsScanStore(createAwsClientsFromEnv());
  return store;
}

export function setWorkerStore(next: ScanStore): void {
  store = next;
}

export async function handler(event: WorkerEvent): Promise<WorkerEvent> {
  const db = getStore();
  const record = await db.getScan(event.scanId);
  if (!record) throw new Error("Scan not found.");

  try {
    if (event.action === "safety") {
      await db.updateScan(event.scanId, { status: "scanning" });
      await assertSafeUrl(record.url);
      return event;
    }
    if (event.action === "evaluate") {
      await db.updateScan(event.scanId, { status: "analyzing" });
      if (!event.findingsJson) throw new Error("Missing scan findings.");
      const scanResult = ScanResultSchema.parse(JSON.parse(event.findingsJson));
      const issues = evaluate(record.answers, scanResult, await loadRules());
      return { ...event, issues };
    }
    if (event.action === "explain") {
      if (!event.findingsJson) {
        return { ...event, issues: event.issues ?? [] };
      }
      const scanResult = ScanResultSchema.parse(JSON.parse(event.findingsJson));
      let policyText = "";
      if (event.policyTextKey) {
        const object = await db.getObject(event.policyTextKey);
        policyText = object?.body.toString("utf8") ?? "";
      }
      const issues = await runExplainStage({
        issues: event.issues ?? [],
        policyText,
        scanResult,
        answers: record.answers,
        rules: await loadRules(),
      });
      return { ...event, issues };
    }
    await db.updateScan(event.scanId, {
      status: "done",
      report: {
        issues: event.issues ?? [],
        screenshotKey: event.screenshotKey,
        policyTextKey: event.policyTextKey,
      },
      screenshotKey: event.screenshotKey,
      policyTextKey: event.policyTextKey,
    });
    if (record.clientIp) await db.releaseIpLock(record.clientIp);
    return event;
  } catch (error) {
    await db.updateScan(event.scanId, {
      status: "failed",
      errorMessage: userSafeError(error),
    });
    if (record.clientIp) await db.releaseIpLock(record.clientIp);
    throw error;
  }
}
