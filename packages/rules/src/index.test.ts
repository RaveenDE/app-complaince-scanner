import { describe, expect, it } from "vitest";
import { RULES_STAGE } from "./index.js";

describe("@acs/rules", () => {
  it("exports the Stage 0 stub marker", () => {
    expect(RULES_STAGE).toBe("stage-0-stub");
  });
});
