import { randomUUID } from "node:crypto";
import {
  CreateScanRequestSchema,
  PRODUCT_DISCLAIMER,
  type Scan,
} from "@acs/shared";
import { assertSafeUrl } from "@acs/shared/ssrf";
import { HttpError, userSafeError } from "./errors.js";
import type { ScanStore } from "./storage.js";

export type PipelineRunner = {
  start(scanId: string): void;
};

export type AppOptions = {
  allowPrivateAddresses?: boolean;
};

export type HttpRequest = {
  method: string;
  path: string;
  body?: string;
  headers: Record<string, string | undefined>;
  clientIp: string;
};

export type HttpResponse = {
  status: number;
  headers: Record<string, string>;
  body: string | Buffer;
};

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
};

function json(status: number, payload: unknown): HttpResponse {
  return {
    status,
    headers: JSON_HEADERS,
    body: `${JSON.stringify(payload)}\n`,
  };
}

function publicScan(scan: Scan): Scan {
  if (scan.status === "done") return scan;
  const { report: _report, ...rest } = scan;
  return rest;
}

export function allowPrivateFromEnv(): boolean {
  return process.env.ACS_ALLOW_PRIVATE_ADDRESSES === "true";
}

export async function handleRequest(
  request: HttpRequest,
  store: ScanStore,
  runner: PipelineRunner,
  options: AppOptions = {},
): Promise<HttpResponse> {
  try {
    if (request.method === "POST" && request.path === "/scans") {
      return await createScan(request, store, runner, options);
    }
    const shotMatch = /^\/scans\/([^/]+)\/screenshot$/.exec(request.path);
    if (request.method === "GET" && shotMatch?.[1]) {
      return await getScreenshot(shotMatch[1], store);
    }
    const getMatch = /^\/scans\/([^/]+)$/.exec(request.path);
    if (request.method === "GET" && getMatch?.[1]) {
      return await getScan(getMatch[1], store);
    }
    return json(404, { error: "Not found." });
  } catch (error) {
    if (error instanceof HttpError) {
      return json(error.status, { error: error.message });
    }
    return json(400, { error: userSafeError(error) });
  }
}

async function createScan(
  request: HttpRequest,
  store: ScanStore,
  runner: PipelineRunner,
  options: AppOptions,
): Promise<HttpResponse> {
  const parsed = CreateScanRequestSchema.parse(
    JSON.parse(request.body && request.body.length > 0 ? request.body : "{}"),
  );
  if (parsed.ownerConfirmed !== true) {
    throw new HttpError(
      400,
      "Confirm you own or are authorized to scan this site.",
    );
  }

  const allowPrivate = options.allowPrivateAddresses === true;
  await assertSafeUrl(parsed.url, { allowPrivateAddresses: allowPrivate });

  const allowed = await store.rateLimit(request.clientIp);
  if (!allowed) {
    throw new HttpError(429, "Too many scans from this address.");
  }
  const locked = await store.tryAcquireIpLock(request.clientIp);
  if (!locked) {
    throw new HttpError(409, "A scan is already running from this address.");
  }

  const now = new Date().toISOString();
  const scan: Scan = {
    id: randomUUID(),
    url: parsed.url,
    answers: parsed.answers,
    status: "queued",
    createdAt: now,
    updatedAt: now,
    ownerConfirmed: true,
    clientIp: request.clientIp,
  };

  try {
    await store.putScan(scan);
  } catch (error) {
    await store.releaseIpLock(request.clientIp);
    throw error;
  }

  runner.start(scan.id);
  return json(201, { id: scan.id, disclaimer: PRODUCT_DISCLAIMER });
}

async function getScan(id: string, store: ScanStore): Promise<HttpResponse> {
  const scan = await store.getScan(id);
  if (!scan) throw new HttpError(404, "Scan not found.");
  return json(200, publicScan(scan));
}

async function getScreenshot(
  id: string,
  store: ScanStore,
): Promise<HttpResponse> {
  const scan = await store.getScan(id);
  if (!scan) throw new HttpError(404, "Scan not found.");
  if (!scan.screenshotKey) throw new HttpError(404, "No screenshot yet.");
  const object = await store.getObject(scan.screenshotKey);
  if (!object) throw new HttpError(404, "No screenshot yet.");
  return {
    status: 200,
    headers: {
      "content-type": object.contentType,
      "cache-control": "private, max-age=3600",
    },
    body: object.body,
  };
}
