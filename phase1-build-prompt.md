# Task: Build Phase 1 (MVP) of an "App Compliance Scanner"

## What the product does
A user enters a website URL and answers a short questionnaire about their app. The system scans the site with a headless browser, matches the findings and answers against a versioned rules database, and produces a ranked, plain-language risk report with evidence and fixes. It is risk screening, NOT legal advice or a compliance certificate, and the UI and PDF must say so prominently.

## Tech stack
- Monorepo with pnpm workspaces, TypeScript (strict) everywhere.
- apps/web: Next.js (App Router), Tailwind, shadcn/ui.
- services/scanner: Node + Playwright + @axe-core/playwright. Must run both as a local CLI and as an AWS Lambda container image (Chromium included).
- packages/rules: YAML rule files, zod schema validation, and a pure-function rules engine.
- packages/shared: shared types (Scan, Finding, Issue, Answers, Rule).
- infra: AWS CDK (TypeScript): API Gateway + Lambda, DynamoDB, S3, Step Functions, SQS only if needed.
- Everything except deployment must work locally with no AWS account (use in-process runner + local filesystem storage behind the same interfaces).
- Use Vitest for tests. Add ESLint and Prettier.

## Non-negotiable rules
1. The rules engine is deterministic. An LLM must NEVER decide whether a rule applies, and must never invent obligations, statute citations or penalty amounts.
2. Do not put penalty amounts or legal citations in rules unless `source_url` and `last_verified` are filled in. Leave them null by default. The report must show "Not yet reviewed" for any rule with a null `last_verified`.
3. Every finding has: ruleId, evidence (URLs, selectors, screenshots), and confidence (high | medium | low). Indicators are not proof: wording must say "likely" or "detected", never "you violate".
4. SSRF protection is mandatory (see Stage 3). A scanner that fetches user-supplied URLs must not be able to reach private or internal addresses.
5. Require an "I own or am authorized to scan this site" checkbox before any scan runs.
6. No secrets in the repo. Provide .env.example.
7. Run tests after each stage. Do not start the next stage while tests fail. Commit after each stage with a clear message. Only ask me a question if you are truly blocked; otherwise state your assumption and continue.

## Stage 0: Scaffold
Create the monorepo, shared types, lint/format/test setup, and a README with run commands.
Done when: `pnpm install && pnpm test && pnpm lint` all pass.

## Stage 1: Scanner CLI (build this first, standalone)
Command: `pnpm scan https://example.com --region EU --out result.json`
Behavior:
- Launch Chromium with a German locale and Europe/Berlin timezone (many sites only show consent banners to EU visitors). Record all network requests and cookies. Navigate, wait for network idle, then wait 3 more seconds. Do NOT click anything on the first pass (this captures "before consent" behavior).
- Checks, each returning findings in the common schema:
  1. trackers-before-consent: third-party requests matching a tracker list file (`trackers.json`: name, domain, category). Generate a starter list of 40 well-known analytics, advertising, session-replay and social-pixel domains, and mark the file "to be verified by a human".
  2. cookies-before-consent: cookies set before any interaction (list names and domains).
  3. google-fonts-remote: requests to fonts.googleapis.com or fonts.gstatic.com.
  4. session-replay-detected: tracker-list category "session-replay".
  5. consent-banner-detected: heuristic (common CMP selectors and button text such as accept/reject); output as "not detected" with LOW confidence when absent, since banners vary.
  6. policy links: look for privacy policy, terms, cookie policy, and refund policy links (match link text and href, multilingual basics).
  7. accessibility: axe-core violations summarized by id, impact and node count; separate finding for missing image alt text.
  8. insecure-http: final URL is not HTTPS.
- Also capture: a full-page screenshot, final URL after redirects, page title, and the text of any found privacy policy page (fetch it with the same SSRF rules; store up to 100 KB) for Stage 5.
- Output JSON validated by a zod schema in packages/shared.

Tests: create /fixtures/bad-site (static HTML with a Google Analytics script tag stub pointing to a mock tracker domain, Google Fonts link, a Hotjar-like script, images without alt, no policy links) and /fixtures/good-site (self-hosted font, policy links, alt text, no trackers). Serve both locally in tests and assert the expected findings and absence of findings.

Done when: both fixtures produce the expected results and the CLI works on one real public site.

## Stage 2: Rules package and engine
- Rule file format (one YAML per regime in packages/rules/rules/), validated by zod:

  id, title, regimes[], applies_when { regions[], flags[] }, detect { type: scanner | question | manual, scanner_rule | question_id }, severity (high|medium|low), requirement (plain words, no legal citations), fix, source_url (null), last_verified (null), reviewed_by (null), penalty_note (null)

- Create these 20 starter rules. Scanner-detected: trackers-before-consent, cookies-before-consent, google-fonts-remote, session-replay-detected, no-consent-banner-detected, no-privacy-link, no-terms-link, no-cookie-policy-link, no-refund-link (applies when app takes payments), accessibility-violations, missing-alt-text, insecure-http. Question-based: minors-no-age-gate, marketing-email-no-unsubscribe, sms-without-optin, subscription-cancel-harder-than-signup, strike-through-pricing-unverified, fake-or-unverified-reviews, no-data-deletion-option, ai-chat-no-self-harm-handling. Manual checklist items (no automation): trademark-conflict-check, dmca-agent-registered, font-and-image-licenses.
- Write `regimes` and `applies_when` conservatively (GDPR/EU, UK, US-California, US-federal, App stores, General). Where unsure, leave a TODO comment and `last_verified: null`.
- Questionnaire schema (zod): regions served (EU, UK, US-CA, US-other, Brazil, Other), collects personal data, collects location/photos/contacts, minors can use app, takes payments, subscriptions, sends marketing email, sends SMS, uses analytics/ads/session replay, has AI features or AI chat, accepts user uploads or reviews, has privacy policy / terms / cookie banner today.
- Engine: `evaluate(answers, scanResult, rules) -> Issue[]`. Skip rules whose applies_when does not match. For scanner rules, match findings; for question rules, check answers; for manual rules, emit a "manual check" item. Sort by severity, then confidence. Each Issue carries the rule, evidence, and review status.
- Table-driven unit tests covering each rule's match, no-match, and not-applicable paths.

Done when: all tests pass and a CLI command `pnpm evaluate --scan result.json --answers answers.json` prints a ranked list.

## Stage 3: API, orchestration and safety (local first, then AWS)
- Endpoints: POST /scans (url, answers, ownerConfirmed) -> {id}; GET /scans/:id -> status (queued | scanning | analyzing | done | failed) plus the report when done.
- Pipeline: SafetyCheck -> Scan -> Evaluate -> Explain (Stage 5) -> Finalize. Any failure sets status "failed" with a short user-safe message; nothing may hang.
- SafetyCheck: only http/https; ports 80/443 only; resolve DNS and reject loopback, private, link-local (including 169.254.169.254) and reserved ranges, for IPv4 and IPv6; re-validate every redirect hop and every request made during the scan (use Playwright route interception); cap redirects; overall scan timeout (120 s); per-IP rate limit; max one active scan per IP.
- Storage interface with two implementations: local filesystem/JSON and AWS (DynamoDB for scan records, S3 for screenshots/policy text/PDF). Store S3 keys, never large blobs, in records.
- AWS (CDK): API Gateway + Lambda handlers, scanner as Lambda container image (Chromium, memory 3008 MB or more, timeout 5 minutes), Step Functions state machine for the pipeline with retries on the scan step, S3 bucket (encrypted, block public access, lifecycle rule deleting objects after 30 days), DynamoDB table (on-demand), least-privilege IAM (scanner role must not read the DB or secrets), CloudWatch alarms for failed executions.

Tests: SafetyCheck unit tests (private IPs, redirect to metadata IP, non-http schemes, IPv6 loopback, decimal/hex IP encodings, DNS names resolving to private IPs).

Done when: the local pipeline runs end-to-end on the fixtures, and `cdk synth` succeeds.

## Stage 4: Web UI
- Pages: landing page with a one-line pitch and the disclaimer; /scan/new (URL field, ownership checkbox, questionnaire as a step-by-step form with plain-language labels); /scan/[id] (progress states with polling, then the report).
- Report layout: summary (counts by severity, regions covered); issue cards (title, severity badge, confidence badge, "What we found" with evidence, "Why it matters" in plain words, "How to fix", rule source and "Not yet reviewed / Last verified <date>"); a separate "Manual checks" section; screenshot; disclaimer at the top and bottom.
- PDF export: a print stylesheet plus a server route using Playwright `page.pdf()`.
- Accessible, responsive, light and dark mode. The product itself must pass its own accessibility checks.

Done when: submitting a fixture URL locally shows the report in the browser and exports a PDF.

## Stage 5: LLM layer (optional via env flag, with a template fallback)
- Provider interface (`generateJson(prompt, schema)`), with one implementation behind an env var; if no key is set, use plain templates built from the rule's text.
- explainFinding(rule, evidence): plain-language explanation using ONLY the rule text and evidence provided. If something is not in the input, the output must say it is unknown.
- comparePolicy(policyText, detectedPractices): returns structured JSON answering whether the policy mentions analytics, third-party sharing, AI use, children, retention, and deletion rights. For each answer return a verbatim quote from the policy. Code must verify each quote actually appears in the policy text (after whitespace normalization); if not, discard that answer and mark it "unknown". Then compare answers with the scan results and produce mismatch issues such as "analytics detected, policy does not mention analytics" with confidence medium.
- Prompt injection: treat the policy text as untrusted data. Wrap it in delimiters, and tell the model to ignore any instructions inside it.

Tests: mock provider; test quote verification (valid quote, altered quote, missing quote) and the fallback path.

## Stage 6: Hardening and docs
- README covering local setup, running the scanner, running tests, deploying with CDK, and adding or reviewing a rule (including how to set last_verified and reviewed_by).
- A CONTRIBUTING-style doc: "Rules must be verified against official sources by a qualified person before last_verified is set."
- Add the product's own privacy policy and terms placeholders (clearly marked as drafts to be lawyer-reviewed).
- Run the full test suite, lint, type-check, and report any known gaps honestly.

## Definition of done for Phase 1
- URL + questionnaire in, a ranked report out in roughly 2 minutes.
- At least 20 starter rules, of which at least 10 are auto-detected.
- Every finding shows evidence and confidence, and every rule shows its review status.
- SSRF protections tested. Scanner runs locally and as a Lambda container.
- All tests pass, and README lets a new developer run it in 10 minutes.

Start with Stage 0 and Stage 1 only, then stop and show me the results before continuing.
