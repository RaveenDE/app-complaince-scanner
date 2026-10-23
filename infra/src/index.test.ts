import { describe, expect, it } from "vitest";
import { INFRA_STAGE } from "./index.js";

describe("@acs/infra", () => {
  it("exports the Stage 0 stub marker", () => {
    expect(INFRA_STAGE).toBe("stage-0-stub");
  });
});
