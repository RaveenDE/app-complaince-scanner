import { describe, expect, it } from "vitest";
import {
  LEGAL_DISCLAIMER,
  LEGAL_DRAFT_BANNER,
  PRIVACY_PARAGRAPHS,
  TERMS_PARAGRAPHS,
} from "./legal";

describe("draft legal copy", () => {
  it("marks the pages as a draft and not legal advice", () => {
    expect(LEGAL_DRAFT_BANNER.toLowerCase()).toContain("draft");
    expect(LEGAL_DRAFT_BANNER.toLowerCase()).toContain("lawyer-reviewed");
    expect(LEGAL_DISCLAIMER.toLowerCase()).toContain("not legal advice");
  });

  it("describes scan data without claiming compliance", () => {
    const privacy = PRIVACY_PARAGRAPHS.join(" ").toLowerCase();
    expect(privacy).toContain("url");
    expect(privacy).toContain("questionnaire");
    expect(privacy).toContain("does not claim");
    expect(privacy).not.toContain("you are compliant");
    expect(TERMS_PARAGRAPHS.join(" ").toLowerCase()).toContain(
      "authorized to scan",
    );
  });
});
