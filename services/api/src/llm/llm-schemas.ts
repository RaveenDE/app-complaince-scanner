import { PolicyTopicSchema } from "@acs/shared";
import { z } from "zod";

export const ExplainJsonSchema = z.object({
  explanation: z.string().min(1),
});
export type ExplainJson = z.infer<typeof ExplainJsonSchema>;

export const PolicyTopicAnswerSchema = z.object({
  mentioned: z.boolean(),
  quote: z.string().nullable(),
});

export const PolicyCompareJsonSchema = z.object({
  analytics: PolicyTopicAnswerSchema,
  third_party: PolicyTopicAnswerSchema,
  ai: PolicyTopicAnswerSchema,
  children: PolicyTopicAnswerSchema,
  retention: PolicyTopicAnswerSchema,
  deletion: PolicyTopicAnswerSchema,
});
export type PolicyCompareJson = z.infer<typeof PolicyCompareJsonSchema>;

export const POLICY_TOPICS = PolicyTopicSchema.options;
