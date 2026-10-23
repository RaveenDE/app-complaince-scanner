import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export type SsrfOptions = {
  allowPrivateAddresses?: boolean;
};

export class SsrfError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SsrfError";
  }
}

export function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split(".").map((part) => Number(part));
  const a = parts[0];
  const b = parts[1];
  if (a === undefined || b === undefined || parts.some((n) => Number.isNaN(n))) {
    return true;
  }
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  return false;
}

export function isPrivateIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  if (normalized === "::1" || normalized === "::") return true;
  if (normalized.startsWith("fe80:")) return true;
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true;
  if (normalized.startsWith("::ffff:")) {
    return isPrivateIPv4(normalized.slice("::ffff:".length));
  }
  return false;
}

export function isPrivateIp(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) return isPrivateIPv4(ip);
  if (version === 6) return isPrivateIPv6(ip);
  return true;
}

function defaultPort(protocol: string): number {
  return protocol === "https:" ? 443 : 80;
}

export async function assertSafeUrl(
  rawUrl: string,
  options: SsrfOptions = {},
): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new SsrfError("Detected an invalid URL.");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new SsrfError("Only http and https URLs can be scanned.");
  }

  const port = parsed.port ? Number(parsed.port) : defaultPort(parsed.protocol);
  if (!options.allowPrivateAddresses && port !== 80 && port !== 443) {
    throw new SsrfError("Only ports 80 and 443 are allowed.");
  }

  const hostname = parsed.hostname.replace(/^\[|\]$/g, "");
  if (
    !options.allowPrivateAddresses &&
    (hostname === "localhost" || hostname.endsWith(".localhost"))
  ) {
    throw new SsrfError("Loopback and private addresses are not allowed.");
  }

  if (isIP(hostname)) {
    if (!options.allowPrivateAddresses && isPrivateIp(hostname)) {
      throw new SsrfError("Loopback and private addresses are not allowed.");
    }
    return parsed;
  }

  const records = await lookup(hostname, { all: true, verbatim: true });
  if (records.length === 0) {
    throw new SsrfError("The hostname did not resolve.");
  }
  if (
    !options.allowPrivateAddresses &&
    records.some((record) => isPrivateIp(record.address))
  ) {
    throw new SsrfError("Loopback and private addresses are not allowed.");
  }

  return parsed;
}
