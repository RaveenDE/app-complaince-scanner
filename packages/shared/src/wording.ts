/**
 * Report and finding copy must stay in this register:
 * use "likely" or "detected", never "you violate".
 * A null last_verified on a rule always displays as "Not yet reviewed".
 */
export const NOT_YET_REVIEWED_LABEL = "Not yet reviewed";

export const PRODUCT_DISCLAIMER =
  "This product is risk screening, not legal advice and not a compliance certificate.";

export function formatReviewStatus(lastVerified: string | null): string {
  return lastVerified
    ? `Last verified ${lastVerified}`
    : NOT_YET_REVIEWED_LABEL;
}
