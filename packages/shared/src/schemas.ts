import { z } from "zod";

export const ConfidenceSchema = z.enum(["high", "medium", "low"]);
export type Confidence = z.infer<typeof ConfidenceSchema>;

export const SeveritySchema = z.enum(["high", "medium", "low"]);
export type Severity = z.infer<typeof SeveritySchema>;

export const CookieEvidenceSchema = z.object({
  name: z.string(),
  domain: z.string(),
});
export type CookieEvidence = z.infer<typeof CookieEvidenceSchema>;

export const EvidenceSchema = z.object({
  urls: z.array(z.string()).optional(),
  selectors: z.array(z.string()).optional(),
  screenshots: z.array(z.string()).optional(),
  cookies: z.array(CookieEvidenceSchema).optional(),
  notes: z.string().optional(),
});
export type Evidence = z.infer<typeof EvidenceSchema>;

export const FindingSchema = z.object({
  ruleId: z.string().min(1),
  evidence: EvidenceSchema,
  confidence: ConfidenceSchema,
});
export type Finding = z.infer<typeof FindingSchema>;

export const CapturedCookieSchema = z.object({
  name: z.string(),
  domain: z.string(),
  path: z.string().optional(),
  httpOnly: z.boolean().optional(),
  secure: z.boolean().optional(),
});
export type CapturedCookie = z.infer<typeof CapturedCookieSchema>;

export const CapturedRequestSchema = z.object({
  url: z.string(),
  method: z.string().optional(),
  resourceType: z.string().optional(),
});
export type CapturedRequest = z.infer<typeof CapturedRequestSchema>;

export const RegionSchema = z.enum([
  "EU",
  "UK",
  "US-CA",
  "US-other",
  "Brazil",
  "Other",
]);
export type Region = z.infer<typeof RegionSchema>;

export const ScanResultSchema = z.object({
  url: z.string().min(1),
  finalUrl: z.string().min(1),
  title: z.string(),
  findings: z.array(FindingSchema),
  screenshotPath: z.string().optional(),
  privacyPolicyText: z.string().optional(),
  cookies: z.array(CapturedCookieSchema).optional(),
  requests: z.array(CapturedRequestSchema).optional(),
  region: RegionSchema.optional(),
});
export type ScanResult = z.infer<typeof ScanResultSchema>;

export const AnswersSchema = z.object({
  regions: z.array(RegionSchema).min(1),
  collectsPersonalData: z.boolean(),
  collectsLocationPhotosContacts: z.boolean(),
  minorsCanUseApp: z.boolean(),
  takesPayments: z.boolean(),
  hasSubscriptions: z.boolean(),
  sendsMarketingEmail: z.boolean(),
  sendsSms: z.boolean(),
  usesAnalyticsAdsOrSessionReplay: z.boolean(),
  hasAiFeaturesOrChat: z.boolean(),
  acceptsUserUploadsOrReviews: z.boolean(),
  hasPrivacyPolicyToday: z.boolean(),
  hasTermsToday: z.boolean(),
  hasCookieBannerToday: z.boolean(),
});
export type Answers = z.infer<typeof AnswersSchema>;

export const PolicyTopicSchema = z.enum([
  "analytics",
  "third_party",
  "ai",
  "children",
  "retention",
  "deletion",
]);
export type PolicyTopic = z.infer<typeof PolicyTopicSchema>;

export const RuleDetectSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("scanner"),
    scanner_rule: z.string().min(1),
  }),
  z.object({
    type: z.literal("question"),
    question_id: z.string().min(1),
  }),
  z.object({
    type: z.literal("manual"),
  }),
  z.object({
    type: z.literal("policy"),
    policy_topic: PolicyTopicSchema,
  }),
]);
export type RuleDetect = z.infer<typeof RuleDetectSchema>;

export const RuleSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  regimes: z.array(z.string()),
  applies_when: z.object({
    regions: z.array(z.string()),
    flags: z.array(z.string()),
  }),
  detect: RuleDetectSchema,
  severity: SeveritySchema,
  requirement: z.string(),
  fix: z.string(),
  source_url: z.string().nullable(),
  last_verified: z.string().nullable(),
  reviewed_by: z.string().nullable(),
  penalty_note: z.string().nullable(),
});
export type Rule = z.infer<typeof RuleSchema>;

export const ReviewStatusSchema = z.enum(["not_yet_reviewed", "reviewed"]);
export type ReviewStatus = z.infer<typeof ReviewStatusSchema>;

export function reviewStatusFromRule(
  rule: Pick<Rule, "last_verified">,
): ReviewStatus {
  return rule.last_verified ? "reviewed" : "not_yet_reviewed";
}

export const IssueSchema = z.object({
  rule: RuleSchema,
  evidence: EvidenceSchema,
  confidence: ConfidenceSchema,
  reviewStatus: ReviewStatusSchema,
  explanation: z.string().optional(),
});
export type Issue = z.infer<typeof IssueSchema>;

export const ScanStatusSchema = z.enum([
  "queued",
  "scanning",
  "analyzing",
  "done",
  "failed",
]);
export type ScanStatus = z.infer<typeof ScanStatusSchema>;

export const CreateScanRequestSchema = z.object({
  url: z.string().min(1),
  answers: AnswersSchema,
  ownerConfirmed: z.boolean(),
});
export type CreateScanRequest = z.infer<typeof CreateScanRequestSchema>;

export const ReportSchema = z.object({
  issues: z.array(IssueSchema),
  screenshotKey: z.string().optional(),
  policyTextKey: z.string().optional(),
  finalUrl: z.string().optional(),
  title: z.string().optional(),
});
export type Report = z.infer<typeof ReportSchema>;

export const ScanSchema = z.object({
  id: z.string().min(1),
  url: z.string().min(1),
  answers: AnswersSchema,
  status: ScanStatusSchema,
  createdAt: z.string().min(1),
  updatedAt: z.string().optional(),
  errorMessage: z.string().optional(),
  ownerConfirmed: z.boolean(),
  clientIp: z.string().optional(),
  screenshotKey: z.string().optional(),
  policyTextKey: z.string().optional(),
  report: ReportSchema.optional(),
});
export type Scan = z.infer<typeof ScanSchema>;
