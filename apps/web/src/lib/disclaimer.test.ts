import { describe, expect, it } from "vitest";
import { DISCLAIMER } from "./disclaimer";

describe("DISCLAIMER", () => {
  it("states that this is risk screening, not legal advice", () => {
    expect(DISCLAIMER.toLowerCase()).toContain("risk screening");
    expect(DISCLAIMER.toLowerCase()).toContain("not legal advice");
    expect(DISCLAIMER.toLowerCase()).toContain("not a compliance certificate");
  });
});
