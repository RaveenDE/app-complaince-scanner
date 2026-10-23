import type { Answers } from "@acs/shared";

export const FLAG_TO_ANSWER = {
  takes_payments: "takesPayments",
  has_subscriptions: "hasSubscriptions",
  minors_can_use_app: "minorsCanUseApp",
  sends_marketing_email: "sendsMarketingEmail",
  sends_sms: "sendsSms",
  collects_personal_data: "collectsPersonalData",
  has_ai_features_or_chat: "hasAiFeaturesOrChat",
  accepts_user_uploads_or_reviews: "acceptsUserUploadsOrReviews",
} as const satisfies Record<string, keyof Answers>;

export type KnownFlag = keyof typeof FLAG_TO_ANSWER;

export const KNOWN_FLAGS = new Set<string>(Object.keys(FLAG_TO_ANSWER));

export function answerForFlag(answers: Answers, flag: string): boolean {
  const key = FLAG_TO_ANSWER[flag as KnownFlag];
  if (!key) return false;
  return answers[key] === true;
}
