# App Compliance Scanner

Risk screening for websites. **Not legal advice and not a compliance certificate.**

A user enters a website URL and answers a short questionnaire. The system scans the site, matches findings and answers against a versioned rules database, and produces a ranked report with evidence and suggested fixes.

Findings describe **likely** issues and **detected** indicators. They do not mean a site "violates" the law. Rules with a null `last_verified` date show as **Not yet reviewed**.

## Status

Stage 6 / Phase 1: scanner CLI, rules engine, local API, web report UI, optional LLM explain layer with a template fallback, draft product legal pages, and docs for local setup, rules review, and CDK deploy.

## Requirements

- Node.js 20 or later
- [pnpm](https://pnpm.io/) 9 or later

## Setup

```bash
pnpm install
pnpm browsers
```

Copy `.env.example` to `.env` if you need local environment variables. Do not commit secrets.

## Commands

| Command | What it does |
| --- | --- |
| `pnpm install` | Install workspace dependencies |
| `pnpm test` | Run Vitest in every package |
| `pnpm lint` | Run ESLint in every package |
| `pnpm typecheck` | Run `tsc --noEmit` in every package |
| `pnpm format` | Format files with Prettier |
| `pnpm web` | Start the Next.js app (questionnaire and report) |
| `pnpm browsers` | Install Chromium for the scanner (project-local `.playwright`) |
| `pnpm scan -- <url> --region EU --out result.json --confirm-ownership` | Scan a site you own or are authorized to scan |
| `pnpm evaluate -- --scan result.json --answers packages/rules/examples/answers.json` | Rank scan findings and questionnaire answers |
| `pnpm api` | Start the local scan API (`POST /scans`, `GET /scans/:id`) |
| `pnpm fixture -- bad-site` | Serve the scanner fixture used by local UI tests |
| `pnpm synth` | Synthesize the CDK stack (does not deploy) |

`--confirm-ownership` is required. The CLI launches Chromium with a German locale and Europe/Berlin timezone, records requests and cookies without clicking, and writes a JSON result validated against the shared schema.

`pnpm evaluate` matches that result and a questionnaire JSON to versioned YAML rules. Matching is deterministic code. An LLM never decides whether a rule applies. Rules with a null `last_verified` date show as **Not yet reviewed**. This is risk screening, not legal advice.

`pnpm api` stores scan records under `.data/` (gitignored). `POST /scans` requires `ownerConfirmed: true`. The pipeline is SafetyCheck → Scan → Evaluate → Explain → Finalize. Explain uses `OPENAI_API_KEY` when set; otherwise it fills plain-language text from the rule and evidence only. The model never decides whether a rule applies. Policy quotes are checked against the policy text before any mismatch issue is added. `ACS_ALLOW_PRIVATE_ADDRESSES=true` is for local fixture tests only; never set it in production.

```bash
curl -s -X POST http://127.0.0.1:8787/scans \
  -H "content-type: application/json" \
  -d "{\"url\":\"https://example.com\",\"ownerConfirmed\":true,\"answers\":$(cat packages/rules/examples/answers.json)}"
curl -s http://127.0.0.1:8787/scans/<id>
```

The web UI is at `http://127.0.0.1:3000`. Start `pnpm api` in another terminal first. For a local fixture scan set `ACS_ALLOW_PRIVATE_ADDRESSES=true` on the API, run `pnpm fixture -- bad-site`, and paste that URL into `/scan/new`. Download PDF from the report page.

Draft product **Privacy policy** and **Terms of use** live at `/privacy` and `/terms`. Both are marked for lawyer review.

## Add or review a rule

See [CONTRIBUTING.md](CONTRIBUTING.md). The first rule there is: rules must be verified against official sources by a qualified person before `last_verified` is set.

- Add YAML under `packages/rules/rules/`. `evaluate()` plus the YAML decide whether a rule applies. An LLM never does.
- Keep `last_verified`, `reviewed_by`, `source_url`, and `penalty_note` **null** until that review. The report then shows **Not yet reviewed**.
- After review, set `last_verified` to `YYYY-MM-DD`, `reviewed_by` to a name and role, and `source_url` to the official page. The report shows **Last verified YYYY-MM-DD**. Never invent penalty amounts.

## Deploy with CDK

`pnpm synth` (or `pnpm --filter @acs/infra synth`) writes a CloudFormation template to `infra/cdk.out`. It does not deploy.

The stack is API Gateway, API/worker Lambdas, the scanner container image, Step Functions, DynamoDB, and S3. It does **not** deploy the Next.js UI and does **not** wire `OPENAI_API_KEY` or other secrets.

Prerequisites: AWS credentials for the target account, Docker (the scanner image builds Chromium), and a one-time `cdk bootstrap` in that account/region.

```bash
pnpm synth
cd infra
npx cdk deploy
```

A live AWS deploy and Lambda scan have not been verified in this repo. Treat `cdk synth` as the checked path.

## Known gaps

Quality gate for this Stage 6 pass: `pnpm test`, `pnpm lint`, and `pnpm typecheck` all passed.

- Every bundled rule still has `last_verified: null`.
- Several high-severity items are questionnaire-only (including `subscription-cancel-harder-than-signup`) and do not inspect signup or cancel UI.
- Policy-mismatch rules run only when captured text looks like a privacy policy. Homepage or SPA shell HTML is treated as unknown, not as a silent policy.
- The CDK stack does not host `apps/web` and does not store an OpenAI secret.
- Scan IDs are unauthenticated: anyone with the id can fetch the report.
- `ACS_ALLOW_PRIVATE_ADDRESSES=true` is for local fixtures only.

## Workspace

| Path | Package | Role |
| --- | --- | --- |
| `apps/web` | `@acs/web` | Next.js questionnaire, report, and PDF export |
| `services/scanner` | `@acs/scanner` | Headless-browser scanner CLI and Lambda container |
| `services/api` | `@acs/api` | Local HTTP API, pipeline, and Lambda wrappers |
| `packages/rules` | `@acs/rules` | Versioned YAML rules and evaluate engine |
| `packages/shared` | `@acs/shared` | Shared types, zod schemas, and SSRF checks |
| `infra` | `@acs/infra` | AWS CDK (API Gateway, Lambda, Step Functions, DynamoDB, S3) |
