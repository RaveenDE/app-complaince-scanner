# App Compliance Scanner

Risk screening for websites. **Not legal advice and not a compliance certificate.**

A user enters a website URL and answers a short questionnaire. The system scans the site, matches findings and answers against a versioned rules database, and produces a ranked report with evidence and suggested fixes.

Findings describe **likely** issues and **detected** indicators. They do not mean a site "violates" the law. Rules with a null `last_verified` date show as **Not yet reviewed**.

## Status

Stage 1: standalone scanner CLI. The rules engine, API, and report UI are not implemented yet.

## Requirements

- Node.js 20 or later
- [pnpm](https://pnpm.io/) 9 or later

## Setup

```bash
pnpm install
pnpm --filter @acs/scanner exec playwright install chromium
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
| `pnpm --filter @acs/web dev` | Start the Next.js placeholder app |
| `pnpm scan -- <url> --region EU --out result.json --confirm-ownership` | Scan a site you own or are authorized to scan |

`--confirm-ownership` is required. The CLI launches Chromium with a German locale and Europe/Berlin timezone, records requests and cookies without clicking, and writes a JSON result validated against the shared schema.

## Workspace

| Path | Package | Role |
| --- | --- | --- |
| `apps/web` | `@acs/web` | Next.js UI (placeholder page in Stage 0) |
| `services/scanner` | `@acs/scanner` | Headless-browser scanner CLI |
| `packages/rules` | `@acs/rules` | Versioned rules and engine (stub) |
| `packages/shared` | `@acs/shared` | Shared types and zod schemas |
| `infra` | `@acs/infra` | AWS CDK (stub) |
