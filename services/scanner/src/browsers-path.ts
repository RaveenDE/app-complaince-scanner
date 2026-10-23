import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** Project-local browser cache so the CLI works outside the Cursor sandbox. */
export const PLAYWRIGHT_BROWSERS_DIR = resolve(
  fileURLToPath(new URL("../../../.playwright", import.meta.url)),
);

mkdirSync(PLAYWRIGHT_BROWSERS_DIR, { recursive: true });
process.env.PLAYWRIGHT_BROWSERS_PATH = PLAYWRIGHT_BROWSERS_DIR;
