import { PRODUCT_DISCLAIMER } from "@acs/shared";

export const LEGAL_DRAFT_BANNER =
  "Draft — to be lawyer-reviewed. This is not legal advice and not a document you should rely on.";

export const LEGAL_DISCLAIMER = PRODUCT_DISCLAIMER;

export const PRIVACY_TITLE = "Privacy policy";
export const TERMS_TITLE = "Terms of use";

export const PRIVACY_PARAGRAPHS = [
  "This draft describes what the Phase 1 app stores when you run a scan. It is a placeholder for lawyer review, not a finished privacy notice.",
  "When you start a scan we store the URL you submit, your questionnaire answers, the ownership confirmation, and your client IP address. The IP is used only for a per-IP rate limit and to allow one active scan at a time.",
  "The scanner may store a full-page screenshot and, if a privacy-policy link is found, up to 100 KB of captured policy text. The ranked report (issues, evidence, and explanations) is stored with the scan record.",
  "If OPENAI_API_KEY is set on the API, the explain step sends rule text, evidence, and captured policy text to the model to draft plain-language explanations and policy quotes. The model does not decide which rules apply. Quotes are checked against the captured text before a mismatch issue is added. If the key is unset, explanations use local templates only.",
  "Local development writes JSON and files under a gitignored .data directory. An AWS deploy uses DynamoDB for scan records and S3 for screenshots and policy text, with a 30-day object lifecycle. Scan IDs are not access-controlled in Phase 1: anyone who has the id can fetch the report.",
  "This product does not claim that your site, or this service, is compliant with any law.",
] as const;

export const TERMS_PARAGRAPHS = [
  "This draft is a placeholder for lawyer review. It is not a binding contract and not legal advice.",
  "You may only submit a URL that you own or are authorized to scan. The ownership checkbox is required before a scan starts.",
  "Reports list likely issues and detected indicators. They are not a finding that a site violates the law, and they are not a compliance certificate.",
  "The service is provided as-is for Phase 1 screening. There is no warranty that a scan is complete, current, or free of false positives or missed issues.",
  "Scan identifiers are unauthenticated in this version. Treat a report URL as sensitive.",
] as const;
