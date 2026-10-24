import { describe, expect, it } from "vitest";
import { quoteAppearsInText, verifiedMention } from "./quotes.js";

const policy = `We use Google Analytics to understand traffic.
We keep account data for 24 months.`;

describe("quoteAppearsInText", () => {
  it("accepts a verbatim quote after whitespace normalization", () => {
    expect(
      quoteAppearsInText(
        "We use   Google Analytics\nto understand traffic.",
        policy,
      ),
    ).toBe(true);
  });

  it("rejects an altered quote", () => {
    expect(
      quoteAppearsInText("We use Fake Analytics to understand traffic.", policy),
    ).toBe(false);
  });

  it("rejects a missing quote", () => {
    expect(quoteAppearsInText("", policy)).toBe(false);
    expect(quoteAppearsInText("children under 13", policy)).toBe(false);
  });
});

describe("verifiedMention", () => {
  it("keeps a mentioned-true answer only when the quote is in the policy", () => {
    expect(
      verifiedMention(true, "We use Google Analytics to understand traffic.", policy),
    ).toEqual({
      mentioned: true,
      quote: "We use Google Analytics to understand traffic.",
    });
  });

  it("marks mentioned-true as unknown when the quote was altered", () => {
    expect(
      verifiedMention(true, "We sell your data to brokers.", policy),
    ).toEqual({ mentioned: "unknown", quote: null });
  });

  it("marks mentioned-true as unknown when the quote is missing", () => {
    expect(verifiedMention(true, null, policy)).toEqual({
      mentioned: "unknown",
      quote: null,
    });
  });
});
