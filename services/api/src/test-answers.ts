import type { Answers } from "@acs/shared";

export function sampleAnswers(): Answers {
  return {
    regions: ["EU"],
    collectsPersonalData: true,
    collectsLocationPhotosContacts: false,
    minorsCanUseApp: false,
    takesPayments: true,
    hasSubscriptions: false,
    sendsMarketingEmail: false,
    sendsSms: false,
    usesAnalyticsAdsOrSessionReplay: true,
    hasAiFeaturesOrChat: false,
    acceptsUserUploadsOrReviews: false,
    hasPrivacyPolicyToday: false,
    hasTermsToday: false,
    hasCookieBannerToday: false,
  };
}
