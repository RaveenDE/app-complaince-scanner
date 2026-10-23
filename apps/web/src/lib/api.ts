import { ScanSchema, type Scan } from "@acs/shared";

export function apiBaseUrl(): string {
  return process.env.ACS_API_URL ?? "http://127.0.0.1:8787";
}

export async function fetchScan(id: string): Promise<Scan> {
  const response = await fetch(`/api/scans/${id}`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Could not load this scan.");
  }
  return ScanSchema.parse(await response.json());
}
