import { existsSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

function repoRoot(): string {
  let dir = process.cwd();
  for (let i = 0; i < 8; i += 1) {
    if (existsSync(resolve(dir, "pnpm-workspace.yaml"))) return dir;
    dir = dirname(dir);
  }
  return resolve(process.cwd(), "../..");
}

function findFile(dir: string, names: string[], depth = 0): string | undefined {
  if (depth > 4 || !existsSync(dir)) return undefined;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isFile() && names.includes(entry.name)) return full;
    if (entry.isDirectory()) {
      const nested = findFile(full, names, depth + 1);
      if (nested) return nested;
    }
  }
  return undefined;
}

/** Always the repo `.playwright` cache — ignore inherited sandbox paths. */
export const PLAYWRIGHT_BROWSERS_DIR = resolve(repoRoot(), ".playwright");
mkdirSync(PLAYWRIGHT_BROWSERS_DIR, { recursive: true });
process.env.PLAYWRIGHT_BROWSERS_PATH = PLAYWRIGHT_BROWSERS_DIR;

export function chromiumExecutablePath(): string | undefined {
  return findFile(PLAYWRIGHT_BROWSERS_DIR, [
    "chrome-headless-shell.exe",
    "chrome-headless-shell",
    "chrome.exe",
    "chrome",
    "Chromium",
  ]);
}
