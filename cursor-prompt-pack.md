# Cursor prompt pack: App Compliance Scanner (Phase 1)

How to use this file: put Part 1 in your project rules, paste Part 2 into Cursor's Agent mode to start, then send the Part 3 step prompts one at a time. Commit to git after each step.

---

## Part 1: Project rules

Save as `.cursor/rules/project.mdc` (or `.cursorrules`, depending on your Cursor version) so it applies to every request.

```text
# Project: App Compliance Scanner (risk screening, not legal advice)

## What this is
A SaaS that takes a website URL plus a short questionnaire, scans the site with a headless browser, matches findings to a versioned rules database, and produces a ranked report with evidence and fixes.

## Stack
- TypeScript, Node 20, pnpm monorepo
- /web: Next.js (App Router) + Tailwind
- /api: AWS Lambda handlers behind API Gateway
- /scanner: Playwright + axe-core, runnable as a CLI and as a Lambda container image
- /rules: YAML rule files + JSON schema + validator script
- /infra: AWS CDK (TypeScript)
- Data: DynamoDB, S3, SQS

## Hard rules
- Never write copy that says a site "is compliant" or gives legal advice. Use "risk indicators" and confidence levels.
- Never hardcode legal penalty amounts or legal claims in code. They live only in /rules with source_url and last_verified. If last_verified is null, the UI shows "not yet reviewed".
- The LLM only explains findings. It never decides which rules apply. Rule matching is deterministic code.
- Block SSRF: allow only http(s); reject private, loopback, link-local and cloud-metadata addresses; re-check after DNS resolution and after every redirect.
- No secrets in code. Use env vars or Secrets Manager.
- Validate all input with zod. Keep modules small, typed and tested.
- Every finding has the shape { ruleId, confidence, severity, evidence[] }.
- Ask before adding a new dependency.
```

---

## Part 2: Kickoff prompt

Paste into Agent mode at the start.

```text
Read .cursor/rules/project.mdc first.

Build Phase 1 of the App Compliance Scanner, one step at a time. Before writing code, propose the folder structure and a step plan, then wait for my approval.

GOAL
User enters a website URL and answers about 12 questions (regions served, collects personal data, children may use it, subscriptions, marketing email/SMS, analytics/ads, AI features, user uploads/reviews, existing policies). The app scans the site, matches findings and answers against rules, and returns a ranked report.

IN SCOPE (Phase 1)
- Website scan only: Playwright + axe-core
- Checks: (1) known trackers firing before any consent click, (2) Google Fonts loaded from Google's servers, (3) missing links to privacy policy, terms and cookie policy, (4) accessibility violations via axe-core, (5) cookies set before consent
- Rules engine, API, simple web UI, report page with PDF export
- LLM layer that explains findings and compares privacy policy text with scan findings, returning JSON with quoted snippets that my code verifies exist in the policy text

OUT OF SCOPE
- Mobile or code scanning, payments, team accounts, regulation-change monitoring

RULE FORMAT (YAML, validated by JSON schema)
- id: google-fonts-remote
  title: Fonts loaded from Google's servers
  regimes: [GDPR]
  applies_when: { audience_includes: [EU] }
  detect: { type: scanner, scanner_rule: google-fonts-remote }
  severity: medium
  requirement: ...
  fix: Self-host the font files.
  source_url: null
  last_verified: null
  reviewed_by: null

DATA MODEL
scans (id, url, answers, status, createdAt), findings (scanId, ruleId, confidence, severity, evidence), reports (scanId, summary, pdfKey)

SCANNER REQUIREMENTS
- Use a German locale and Europe/Berlin timezone so EU consent banners appear
- Load the page, wait without clicking anything, and record requests and cookies
- Return findings as JSON plus a screenshot
- Include a local fixture page (scanner/fixtures/violations.html) with known violations, and tests that assert the scanner finds exactly those

PROCESS
After each step: run lint and tests, summarize what changed, and list anything you did not do or are unsure about. Do not start the next step until I say so.
```

---

## Part 3: Step prompts

Send these one at a time after the plan is approved.

1. `Step 1: scaffold the pnpm monorepo, TypeScript config, lint, the /rules JSON schema, a validator script, and 5 sample rules. No scanner or UI yet.`
2. `Step 2: build the scanner as a standalone CLI (url in, JSON findings out) and the fixture page with tests. Include a tracker domain list in trackers.json with 30 common entries.`
3. `Step 3: build the rules engine as a pure function (answers + findings + rules in, ranked issues out) with unit tests for each applies_when and detect type.`
4. `Step 4: write the CDK stack for API Gateway, Lambda, DynamoDB, SQS, S3 and the scanner Lambda as a container image with Chromium. Keep it deployable with one command.`
5. `Step 5: implement the API (create scan, get scan) and the SQS worker that runs scanner, rules engine and saves results. Include the SSRF protection with tests for private IPs, redirects to private IPs, and DNS rebinding.`
6. `Step 6: build the web UI: questionnaire, scan status polling, and report page with evidence, fix, source and "last verified" status. Add PDF export.`
7. `Step 7: add the LLM explanation and privacy-policy comparison with strict JSON output, and code that verifies each quoted snippet exists in the policy text.`
8. `Step 8: review everything against the hard rules in project.mdc and list violations. Then add rate limiting, timeouts and a clear failed-scan status.`

---

## Tips for working in Cursor

- Keep the plan-first rule. If it starts writing code before you approve a plan, stop it and repeat the instruction.
- Review diffs for the SSRF and rules-engine code yourself, since those are the highest-risk parts.
- Use `@` to attach the rules file and the relevant folder to each step so it stays on track.
- Don't let it invent rule content or penalty numbers. Write the first 15 to 20 rules yourself from verified sources.
- Test the scanner against your fixture page and a few real sites before building the UI on top of it.
- Phase 1 here uses an SQS-triggered worker instead of Step Functions, to keep the first build simpler. You can add Step Functions later.
