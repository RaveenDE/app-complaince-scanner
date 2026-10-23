# App Compliance Scanner

Risk screening for websites. **Not legal advice and not a compliance certificate.**

A user enters a website URL and answers a short questionnaire. The system scans the site, matches findings and answers against a versioned rules database, and produces a ranked report with evidence and suggested fixes.

Findings describe **likely** issues and **detected** indicators. They do not mean a site "violates" the law. Rules with a null `last_verified` date show as **Not yet reviewed**.

## Status

Stage 4: scanner CLI, rules engine, local API, and a web report UI. PDF export uses a print stylesheet plus Playwright.

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

`pnpm api` stores scan records under `.data/` (gitignored). `POST /scans` requires `ownerConfirmed: true`. The pipeline is SafetyCheck → Scan → Evaluate → Explain (passthrough) → Finalize. `ACS_ALLOW_PRIVATE_ADDRESSES=true` is for local fixture tests only; never set it in production.

```bash
curl -s -X POST http://127.0.0.1:8787/scans \
  -H "content-type: application/json" \
  -d "{\"url\":\"https://example.com\",\"ownerConfirmed\":true,\"answers\":$(cat packages/rules/examples/answers.json)}"
curl -s http://127.0.0.1:8787/scans/<id>
```

The web UI is at `http://127.0.0.1:3000`. Start `pnpm api` in another terminal first. For a local fixture scan set `ACS_ALLOW_PRIVATE_ADDRESSES=true` on the API, run `pnpm fixture -- bad-site`, and paste that URL into `/scan/new`. Download PDF from the report page.

`pnpm --filter @acs/infra synth` writes a CloudFormation template to `cdk.out`. It does not deploy.

## Workspace

| Path | Package | Role |
| --- | --- | --- |
| `apps/web` | `@acs/web` | Next.js questionnaire, report, and PDF export |
| `services/scanner` | `@acs/scanner` | Headless-browser scanner CLI and Lambda container |
| `services/api` | `@acs/api` | Local HTTP API, pipeline, and Lambda wrappers |
| `packages/rules` | `@acs/rules` | Versioned YAML rules and evaluate engine |
| `packages/shared` | `@acs/shared` | Shared types, zod schemas, and SSRF checks |
| `infra` | `@acs/infra` | AWS CDK (API Gateway, Lambda, Step Functions, DynamoDB, S3) |
