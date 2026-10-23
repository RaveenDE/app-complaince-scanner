import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, normalize, resolve } from "node:path";
import { ScanSchema, type Scan } from "@acs/shared";
import {
  contentTypeForKey,
  RATE_MAX,
  RATE_WINDOW_MS,
  type ScanStore,
} from "./storage.js";

export class LocalScanStore implements ScanStore {
  private readonly locks = new Set<string>();
  private readonly hits = new Map<string, number[]>();

  constructor(private readonly root: string) {}

  private scanPath(id: string): string {
    return join(this.root, "scans", `${id}.json`);
  }

  private objectPath(key: string): string {
    const objectsRoot = resolve(this.root, "objects");
    const target = resolve(objectsRoot, key);
    if (target !== objectsRoot && !target.startsWith(`${objectsRoot}\\`) && !target.startsWith(`${objectsRoot}/`)) {
      throw new Error("Invalid object key.");
    }
    return target;
  }

  async putScan(scan: Scan): Promise<void> {
    const path = this.scanPath(scan.id);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, `${JSON.stringify(scan, null, 2)}\n`, "utf8");
  }

  async getScan(id: string): Promise<Scan | null> {
    try {
      const raw = await readFile(this.scanPath(id), "utf8");
      return ScanSchema.parse(JSON.parse(raw));
    } catch {
      return null;
    }
  }

  async updateScan(id: string, patch: Partial<Scan>): Promise<Scan> {
    const current = await this.getScan(id);
    if (!current) throw new Error("Scan not found.");
    const next = ScanSchema.parse({
      ...current,
      ...patch,
      id: current.id,
      updatedAt: new Date().toISOString(),
    });
    await this.putScan(next);
    return next;
  }

  async putObject(
    key: string,
    body: Buffer | string,
    _contentType: string,
  ): Promise<string> {
    const path = this.objectPath(normalize(key));
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, body);
    return key;
  }

  async getObject(
    key: string,
  ): Promise<{ body: Buffer; contentType: string } | null> {
    try {
      const body = await readFile(this.objectPath(normalize(key)));
      return { body, contentType: contentTypeForKey(key) };
    } catch {
      return null;
    }
  }

  async tryAcquireIpLock(ip: string): Promise<boolean> {
    if (this.locks.has(ip)) return false;
    this.locks.add(ip);
    return true;
  }

  async releaseIpLock(ip: string): Promise<void> {
    this.locks.delete(ip);
  }

  async rateLimit(ip: string): Promise<boolean> {
    const now = Date.now();
    const recent = (this.hits.get(ip) ?? []).filter(
      (at) => now - at < RATE_WINDOW_MS,
    );
    if (recent.length >= RATE_MAX) {
      this.hits.set(ip, recent);
      return false;
    }
    recent.push(now);
    this.hits.set(ip, recent);
    return true;
  }
}
