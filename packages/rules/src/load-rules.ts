import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { RuleSchema, type Rule } from "@acs/shared";
import { parse } from "yaml";
import { z } from "zod";
import { KNOWN_FLAGS } from "./flags.js";

const RuleFileSchema = z.object({
  rules: z.array(RuleSchema),
});

export const bundledRulesDir =
  process.env.RULES_DIR ??
  fileURLToPath(new URL("../rules", import.meta.url));

export class RuleLoadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RuleLoadError";
  }
}

function assertKnownFlags(rule: Rule, file: string): void {
  for (const flag of rule.applies_when.flags) {
    if (!KNOWN_FLAGS.has(flag)) {
      throw new RuleLoadError(
        `Unknown applies_when flag "${flag}" in ${rule.id} (${file}).`,
      );
    }
  }
  if (rule.detect.type === "question" && !KNOWN_FLAGS.has(rule.detect.question_id)) {
    throw new RuleLoadError(
      `Unknown question_id "${rule.detect.question_id}" in ${rule.id} (${file}).`,
    );
  }
}

export function parseRuleFile(raw: string, file = "inline.yaml"): Rule[] {
  const parsed = RuleFileSchema.parse(parse(raw));
  for (const rule of parsed.rules) {
    assertKnownFlags(rule, file);
  }
  return parsed.rules;
}

export async function loadRules(dir = bundledRulesDir): Promise<Rule[]> {
  const names = (await readdir(dir))
    .filter((name) => name.endsWith(".yaml") || name.endsWith(".yml"))
    .sort();
  const rules: Rule[] = [];
  const seen = new Set<string>();

  for (const name of names) {
    const file = join(dir, name);
    const loaded = parseRuleFile(await readFile(file, "utf8"), name);
    for (const rule of loaded) {
      if (seen.has(rule.id)) {
        throw new RuleLoadError(`Duplicate rule id "${rule.id}" in ${name}.`);
      }
      seen.add(rule.id);
      rules.push(rule);
    }
  }

  return rules;
}
