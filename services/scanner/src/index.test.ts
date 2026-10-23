import { describe, expect, it } from "vitest";
import { SCANNER_STAGE } from "./index.js";

describe("@acs/scanner", () => {
  it("exports the Stage 0 stub marker", () => {
    expect(SCANNER_STAGE).toBe("stage-0-stub");
  });
});
