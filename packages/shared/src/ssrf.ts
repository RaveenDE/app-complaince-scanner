import { lookup as dnsLookup } from "node:dns/promises";
import { isIP } from "node:net";

export const MAX_REDIRECTS = 5;

export type DnsLookup = (
  hostname: string,
) => Promise<Array<{ address: string; family: number }>>;

export type SsrfOptions = {
  allowPrivateAddresses?: boolean;
  lookup?: DnsLookup;
  maxRedirects?: number;
};

export class SsrfError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SsrfError";
  }
}

const PRIVATE_MESSAGE = "Loopback and private addresses are not allowed.";

export function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return true;
  const a = parts[0]!;
  const b = parts[1]!;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a === 192 && b === 0 && (parts[2] === 0 || parts[2] === 2)) return true;
  if (a === 198 && b === 51 && parts[2] === 100) return true;
  if (a === 203 && b === 0 && parts[2] === 113) return true;
  if (a >= 224) return true;
  return false;
}

export function isPrivateIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase().split("%")[0] ?? ip.toLowerCase();
  if (normalized === "::1" || normalized === "::") return true;
  if (normalized.startsWith("fe80:")) return true;
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true;
  if (normalized.startsWith("ff")) return true;
  if (normalized.startsWith("2001:db8:")) return true;
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

function parseIpv4Part(part: string): number | null {
  const p = part.toLowerCase();
  if (p.startsWith("0x")) {
    if (!/^0x[0-9a-f]+$/.test(p)) return null;
    const n = Number.parseInt(p.slice(2), 16);
    return Number.isFinite(n) ? n : null;
  }
  if (!/^[0-9]+$/.test(p)) return null;
  if (p.length > 1 && p.startsWith("0")) {
    if (!/^[0-7]+$/.test(p)) return null;
    return Number.parseInt(p, 8);
  }
  return Number.parseInt(p, 10);
}

function toDotted(n: number): string | null {
  if (!Number.isFinite(n) || n < 0 || n > 0xffffffff) return null;
  return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join(
    ".",
  );
}

/** Decode decimal/hex/octal/short IPv4 hostnames used to bypass dotted-quad checks. */
export function decodeEncodedIPv4(hostname: string): string | null {
  const host = hostname.replace(/\.$/, "");
  if (isIP(host) === 4) return host;

  if (/^0x[0-9a-f]+$/i.test(host) || /^[0-9]+$/.test(host)) {
    const n = host.toLowerCase().startsWith("0x")
      ? Number.parseInt(host.slice(2), 16)
      : host.length > 1 && host.startsWith("0") && /^[0-7]+$/.test(host)
        ? Number.parseInt(host, 8)
        : Number.parseInt(host, 10);
    return toDotted(n);
  }

  const parts = host.split(".");
  if (parts.length < 2 || parts.length > 4) return null;
  if (!parts.every((part) => /^(0x[0-9a-f]+|[0-9]+)$/i.test(part))) return null;

  const nums = parts.map(parseIpv4Part);
  if (nums.some((n) => n === null)) return null;
  const values = nums as number[];

  if (values.length === 2) {
    const last = values[1]!;
    if (values[0]! > 255 || last > 0xffffff) return null;
    return `${values[0]}.${(last >>> 16) & 255}.${(last >>> 8) & 255}.${last & 255}`;
  }
  if (values.length === 3) {
    const last = values[2]!;
    if (values[0]! > 255 || values[1]! > 255 || last > 0xffff) return null;
    return `${values[0]}.${values[1]}.${(last >>> 8) & 255}.${last & 255}`;
  }
  if (values.some((n) => n > 255)) return null;
  return values.join(".");
}

function defaultPort(protocol: string): number {
  return protocol === "https:" ? 443 : 80;
}

function parseHttpUrl(rawUrl: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new SsrfError("Detected an invalid URL.");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new SsrfError("Only http and https URLs can be scanned.");
  }
  return parsed;
}

export async function assertSafeUrl(
  rawUrl: string,
  options: SsrfOptions = {},
): Promise<URL> {
  const parsed = parseHttpUrl(rawUrl);
  const port = parsed.port ? Number(parsed.port) : defaultPort(parsed.protocol);
  if (!options.allowPrivateAddresses && port !== 80 && port !== 443) {
    throw new SsrfError("Only ports 80 and 443 are allowed.");
  }

  const hostname = parsed.hostname.replace(/^\[|\]$/g, "");
  if (
    !options.allowPrivateAddresses &&
    (hostname === "localhost" || hostname.endsWith(".localhost"))
  ) {
    throw new SsrfError(PRIVATE_MESSAGE);
  }

  const encoded = decodeEncodedIPv4(hostname);
  if (encoded) {
    if (!options.allowPrivateAddresses && isPrivateIPv4(encoded)) {
      throw new SsrfError(PRIVATE_MESSAGE);
    }
    return parsed;
  }

  if (isIP(hostname) === 6) {
    if (!options.allowPrivateAddresses && isPrivateIPv6(hostname)) {
      throw new SsrfError(PRIVATE_MESSAGE);
    }
    return parsed;
  }

  if (isIP(hostname) === 4) {
    if (!options.allowPrivateAddresses && isPrivateIp(hostname)) {
      throw new SsrfError(PRIVATE_MESSAGE);
    }
    return parsed;
  }

  const lookupFn = options.lookup ?? defaultLookup;
  const records = await lookupFn(hostname);
  if (records.length === 0) {
    throw new SsrfError("The hostname did not resolve.");
  }
  if (
    !options.allowPrivateAddresses &&
    records.some((record) => isPrivateIp(record.address))
  ) {
    throw new SsrfError(PRIVATE_MESSAGE);
  }

  return parsed;
}

async function defaultLookup(
  hostname: string,
): Promise<Array<{ address: string; family: number }>> {
  return dnsLookup(hostname, { all: true, verbatim: true });
}

/** Cache DNS lookups for one scan so Playwright route checks stay fast. */
export function cachedLookup(lookup: DnsLookup = defaultLookup): DnsLookup {
  const cache = new Map<
    string,
    Promise<Array<{ address: string; family: number }>>
  >();
  return (hostname) => {
    const hit = cache.get(hostname);
    if (hit) return hit;
    const pending = lookup(hostname);
    cache.set(hostname, pending);
    return pending;
  };
}

export async function assertSafeRedirectChain(
  urls: string[],
  options: SsrfOptions = {},
): Promise<void> {
  const max = options.maxRedirects ?? MAX_REDIRECTS;
  if (urls.length === 0) {
    throw new SsrfError("Detected an invalid URL.");
  }
  if (urls.length - 1 > max) {
    throw new SsrfError("Too many redirects.");
  }
  for (const hop of urls) {
    await assertSafeUrl(hop, options);
  }
}

export async function fetchFollowingRedirects(
  url: string,
  options: SsrfOptions = {},
  fetchFn: typeof fetch = fetch,
): Promise<Response> {
  const max = options.maxRedirects ?? MAX_REDIRECTS;
  let current = url;
  for (let hop = 0; hop <= max; hop += 1) {
    await assertSafeUrl(current, options);
    const response = await fetchFn(current, { redirect: "manual" });
    if (response.status < 300 || response.status >= 400) {
      return response;
    }
    const location = response.headers.get("location");
    if (!location) return response;
    current = new URL(location, current).toString();
  }
  throw new SsrfError("Too many redirects.");
}
