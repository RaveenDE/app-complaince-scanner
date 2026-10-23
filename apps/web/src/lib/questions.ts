import {
  AnswersSchema,
  RegionSchema,
  type Answers,
  type Region,
} from "@acs/shared";

export const REGION_OPTIONS: { id: Region; label: string }[] = [
  { id: "EU", label: "European Union" },
  { id: "UK", label: "United Kingdom" },
  { id: "US-CA", label: "California" },
  { id: "US-other", label: "United States (outside California)" },
  { id: "Brazil", label: "Brazil" },
  { id: "Other", label: "Somewhere else" },
];

export type YesNoKey = Exclude<keyof Answers, "regions">;

export const YES_NO_QUESTIONS: { key: YesNoKey; label: string; hint: string }[] =
  [
    {
      key: "collectsPersonalData",
      label: "Do you collect personal data?",
      hint: "Names, emails, accounts, or anything that identifies a person.",
    },
    {
      key: "collectsLocationPhotosContacts",
      label: "Do you collect location, photos, or contacts?",
      hint: "Including approximate location used to show nearby content.",
    },
    {
      key: "minorsCanUseApp",
      label: "Can children or teens use the app?",
      hint: "If someone under 16 (or 13 outside the EU/UK) can create an account.",
    },
    {
      key: "takesPayments",
      label: "Do you take payments?",
      hint: "One-off checkout, in-app purchases, or billed plans.",
    },
    {
      key: "hasSubscriptions",
      label: "Do you offer subscriptions?",
      hint: "Recurring billing that renews until someone cancels.",
    },
    {
      key: "sendsMarketingEmail",
      label: "Do you send marketing email?",
      hint: "Newsletters, offers, or product tips. Transactional mail does not count.",
    },
    {
      key: "sendsSms",
      label: "Do you send SMS or text messages?",
      hint: "Promotional texts or alerts to a phone number.",
    },
    {
      key: "usesAnalyticsAdsOrSessionReplay",
      label: "Do you use analytics, ads, or session replay?",
      hint: "Tools that watch how people use the site, even if you do not sell ads.",
    },
    {
      key: "hasAiFeaturesOrChat",
      label: "Do you offer AI features or AI chat?",
      hint: "Assistants, generated replies, or models that talk to users.",
    },
    {
      key: "acceptsUserUploadsOrReviews",
      label: "Can people upload content or leave reviews?",
      hint: "Photos, files, comments, or ratings posted by users.",
    },
    {
      key: "hasPrivacyPolicyToday",
      label: "Do you already have a privacy policy?",
      hint: "A page that explains what you collect and why.",
    },
    {
      key: "hasTermsToday",
      label: "Do you already have terms of use?",
      hint: "A page that sets the rules for using the product.",
    },
    {
      key: "hasCookieBannerToday",
      label: "Do you already show a cookie or consent banner?",
      hint: "A choice to accept or reject non-essential cookies.",
    },
  ];

export const QUESTION_STEPS = [
  { id: "site", title: "Site" },
  { id: "regions", title: "Who you serve" },
  { id: "data", title: "Data" },
  { id: "money", title: "Payments and messages" },
  { id: "features", title: "Features" },
  { id: "policies", title: "Policies today" },
] as const;

export type FormState = {
  url: string;
  ownerConfirmed: boolean;
  regions: Region[];
  answers: Record<YesNoKey, boolean | undefined>;
};

export function emptyForm(): FormState {
  return {
    url: "",
    ownerConfirmed: false,
    regions: [],
    answers: {
      collectsPersonalData: undefined,
      collectsLocationPhotosContacts: undefined,
      minorsCanUseApp: undefined,
      takesPayments: undefined,
      hasSubscriptions: undefined,
      sendsMarketingEmail: undefined,
      sendsSms: undefined,
      usesAnalyticsAdsOrSessionReplay: undefined,
      hasAiFeaturesOrChat: undefined,
      acceptsUserUploadsOrReviews: undefined,
      hasPrivacyPolicyToday: undefined,
      hasTermsToday: undefined,
      hasCookieBannerToday: undefined,
    },
  };
}

export function keysForStep(step: number): YesNoKey[] {
  if (step === 2) {
    return [
      "collectsPersonalData",
      "collectsLocationPhotosContacts",
      "minorsCanUseApp",
    ];
  }
  if (step === 3) {
    return ["takesPayments", "hasSubscriptions", "sendsMarketingEmail", "sendsSms"];
  }
  if (step === 4) {
    return [
      "usesAnalyticsAdsOrSessionReplay",
      "hasAiFeaturesOrChat",
      "acceptsUserUploadsOrReviews",
    ];
  }
  if (step === 5) {
    return ["hasPrivacyPolicyToday", "hasTermsToday", "hasCookieBannerToday"];
  }
  return [];
}

export function validateStep(step: number, form: FormState): string | null {
  if (step === 0) {
    if (!form.url.trim()) return "Enter the website URL to scan.";
    try {
      const parsed = new URL(form.url.trim());
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        return "Use an http or https URL.";
      }
    } catch {
      return "Enter a valid website URL.";
    }
    if (!form.ownerConfirmed) {
      return "Confirm you own or are authorized to scan this site.";
    }
    return null;
  }
  if (step === 1) {
    return form.regions.length > 0
      ? null
      : "Select at least one region you serve.";
  }
  for (const key of keysForStep(step)) {
    if (form.answers[key] === undefined) {
      return "Answer every question on this step to continue.";
    }
  }
  return null;
}

export function toCreateScanBody(form: FormState): unknown {
  const answers: Answers = AnswersSchema.parse({
    regions: form.regions,
    collectsPersonalData: form.answers.collectsPersonalData,
    collectsLocationPhotosContacts: form.answers.collectsLocationPhotosContacts,
    minorsCanUseApp: form.answers.minorsCanUseApp,
    takesPayments: form.answers.takesPayments,
    hasSubscriptions: form.answers.hasSubscriptions,
    sendsMarketingEmail: form.answers.sendsMarketingEmail,
    sendsSms: form.answers.sendsSms,
    usesAnalyticsAdsOrSessionReplay: form.answers.usesAnalyticsAdsOrSessionReplay,
    hasAiFeaturesOrChat: form.answers.hasAiFeaturesOrChat,
    acceptsUserUploadsOrReviews: form.answers.acceptsUserUploadsOrReviews,
    hasPrivacyPolicyToday: form.answers.hasPrivacyPolicyToday,
    hasTermsToday: form.answers.hasTermsToday,
    hasCookieBannerToday: form.answers.hasCookieBannerToday,
  });
  return {
    url: form.url.trim(),
    answers,
    ownerConfirmed: form.ownerConfirmed,
  };
}

export function isRegion(value: string): value is Region {
  return RegionSchema.safeParse(value).success;
}
