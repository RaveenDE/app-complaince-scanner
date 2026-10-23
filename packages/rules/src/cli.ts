import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import {
  AnswersSchema,
  PRODUCT_DISCLAIMER,
  ScanResultSchema,
  formatReviewStatus,
} from "@acs/shared";
import { evaluate } from "./evaluate.js";
import { loadRules } from "./load-rules.js";

async function main(): Promise<void> {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      scan: { type: "string" },
      answers: { type: "string" },
    },
  });

  if (!values.scan || !values.answers) {
    console.error(
      "Usage: pnpm evaluate -- --scan result.json --answers answers.json",
    );
    process.exitCode = 1;
    return;
  }

  const cwd = process.env.INIT_CWD ?? process.cwd();
  const scanResult = ScanResultSchema.parse(
    JSON.parse(await readFile(resolve(cwd, values.scan), "utf8")),
  );
  const answers = AnswersSchema.parse(
    JSON.parse(await readFile(resolve(cwd, values.answers), "utf8")),
  );
  const issues = evaluate(answers, scanResult, await loadRules());

  console.log(PRODUCT_DISCLAIMER);
  console.log("");
  if (issues.length === 0) {
    console.log("No matching risk indicators for these answers and scan findings.");
    return;
  }

  for (const [index, issue] of issues.entries()) {
    const review = formatReviewStatus(issue.rule.last_verified);
    console.log(
      `${String(index + 1)}. [${issue.rule.severity}/${issue.confidence}] ${issue.rule.title}`,
    );
    console.log(`   ${issue.rule.requirement}`);
    console.log(`   Review: ${review}`);
    console.log("");
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Evaluate failed.";
  console.error(message);
  process.exitCode = 1;
});
