import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { PLAYWRIGHT_BROWSERS_DIR } from "./browsers-path.js";

const require = createRequire(import.meta.url);
const playwrightCli = require.resolve("playwright/cli.js");

const result = spawnSync(
  process.execPath,
  [playwrightCli, "install", "chromium"],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      PLAYWRIGHT_BROWSERS_PATH: PLAYWRIGHT_BROWSERS_DIR,
    },
  },
);

process.exit(result.status ?? 1);
