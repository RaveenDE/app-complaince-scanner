import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { RegionSchema, ScanResultSchema } from "@acs/shared";
import { scan } from "./scan.js";
import { SsrfError } from "./ssrf.js";

function screenshotPathFor(outPath: string): string {
  return outPath.toLowerCase().endsWith(".json")
    ? `${outPath.slice(0, -5)}.png`
    : `${outPath}.png`;
}

async function main(): Promise<void> {
  const { values, positionals } = parseArgs({
    args: process.argv.slice(2),
    allowPositionals: true,
    options: {
      region: { type: "string", default: "EU" },
      out: { type: "string" },
      "confirm-ownership": { type: "boolean", default: false },
    },
  });

  const url = positionals[0];
  if (!url) {
    console.error(
      "Usage: pnpm scan -- <url> --region EU --out result.json --confirm-ownership",
    );
    process.exitCode = 1;
    return;
  }

  if (!values["confirm-ownership"]) {
    console.error(
      "Refusing to scan: pass --confirm-ownership to confirm you own or are authorized to scan this site.",
    );
    process.exitCode = 1;
    return;
  }

  const regionResult = RegionSchema.safeParse(values.region);
  if (!regionResult.success) {
    console.error(
      `Invalid --region. Expected one of: ${RegionSchema.options.join(", ")}.`,
    );
    process.exitCode = 1;
    return;
  }

  const cwd = process.env.INIT_CWD ?? process.cwd();
  const outPath = values.out ? resolve(cwd, values.out) : undefined;
  const result = await scan(url, {
    region: regionResult.data,
    screenshotPath: outPath
      ? screenshotPathFor(outPath)
      : resolve(cwd, "scan.png"),
  });
  const json = `${JSON.stringify(ScanResultSchema.parse(result), null, 2)}\n`;

  if (outPath) {
    await writeFile(outPath, json, "utf8");
    console.error(`Wrote ${outPath}`);
    if (result.screenshotPath) {
      console.error(`Screenshot ${result.screenshotPath}`);
    }
  } else {
    process.stdout.write(json);
  }
}

main().catch((error: unknown) => {
  const message =
    error instanceof SsrfError
      ? error.message
      : "The scan failed. Check the URL and try again.";
  console.error(message);
  process.exitCode = 1;
});
