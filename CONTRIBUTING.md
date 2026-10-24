# Contributing

Rules must be verified against official sources by a qualified person before `last_verified` is set.

This product is risk screening, not legal advice and not a compliance certificate. Report copy uses **likely** or **detected**. Never write that a site is compliant or that someone “violates” the law.

## Rules engine

Matching is deterministic code. YAML rules plus `evaluate()` in `packages/rules` decide whether a rule applies. An LLM may only explain an existing finding or extract policy quotes. It must never decide applicability, invent obligations, statute citations, or penalty amounts.

## Add a rule

1. Edit or add a YAML file under [`packages/rules/rules/`](packages/rules/rules/). One file per regime is the usual layout (`gdpr-eu.yaml`, `uk.yaml`, `us-california.yaml`, `us-federal.yaml`, `app-stores.yaml`, `general.yaml`, `policy-mismatch.yaml`).
2. Give the rule a unique `id`. `loadRules()` rejects duplicate ids.
3. Fill the fields from `RuleSchema` in `packages/shared`:

   - `title`, `regimes[]`
   - `applies_when.regions[]` and `applies_when.flags[]` (empty means all; flags must be keys from `packages/rules/src/flags.ts`)
   - `detect.type`: `scanner` (set `scanner_rule`), `question` (set `question_id`), `manual`, or `policy` (set `policy_topic`)
   - `severity`: `high` | `medium` | `low`
   - `requirement` and `fix`: plain words, no legal citations
   - `source_url`, `last_verified`, `reviewed_by`, `penalty_note`: keep these **null** until a qualified review (see below)

4. Add or extend table-driven tests in `packages/rules/src/evaluate.test.ts` for match, no-match, and not-applicable paths.
5. Run `pnpm --filter @acs/rules test`. Run `pnpm test`, `pnpm lint`, and `pnpm typecheck` before opening a pull request.

`policy` rules are skipped by `evaluate()` and emitted later, after quote-checked policy comparison in the API explain stage.

## Review a rule (`last_verified` and `reviewed_by`)

Keep `last_verified`, `reviewed_by`, `source_url`, and `penalty_note` **null** until a qualified person checks an official source.

When that review happens:

- Set `last_verified` to an ISO date (`YYYY-MM-DD`).
- Set `reviewed_by` to a name and role.
- Set `source_url` to the official page that was checked.
- Set `penalty_note` only if that source states it. Never invent penalty amounts.

The UI calls `formatReviewStatus()`. A null `last_verified` always shows **Not yet reviewed**. A date shows **Last verified YYYY-MM-DD**.

Do not treat a pull request, an LLM suggestion, or an unverified blog post as enough to set `last_verified`.
