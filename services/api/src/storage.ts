import type { Scan } from "@acs/shared";

export type ScanStore = {
  putScan(scan: Scan): Promise<void>;
  getScan(id: string): Promise<Scan | null>;
  updateScan(id: string, patch: Partial<Scan>): Promise<Scan>;
  putObject(
    key: string,
    body: Buffer | string,
    contentType: string,
  ): Promise<string>;
  getObject(
    key: string,
  ): Promise<{ body: Buffer; contentType: string } | null>;
  tryAcquireIpLock(ip: string): Promise<boolean>;
  releaseIpLock(ip: string): Promise<void>;
  rateLimit(ip: string): Promise<boolean>;
};

export const RATE_WINDOW_MS = 10 * 60 * 1000;
export const RATE_MAX = 5;

export function contentTypeForKey(key: string): string {
  if (key.endsWith(".png")) return "image/png";
  if (key.endsWith(".txt")) return "text/plain; charset=utf-8";
  if (key.endsWith(".pdf")) return "application/pdf";
  return "application/octet-stream";
}
