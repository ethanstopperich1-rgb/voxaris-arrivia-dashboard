import { describe, it, expect } from "vitest";
import { detectForbiddenPhrases } from "@/lib/guardrails/forbidden-claim-detector";

describe("forbidden-claim-detector", () => {
  it("flags 'endorsed by'", () => {
    expect(detectForbiddenPhrases("we are endorsed by the military").length).toBeGreaterThan(0);
  });
  it("flags '$3,499'", () => {
    expect(detectForbiddenPhrases("Select Access is $3,499.").length).toBeGreaterThan(0);
  });
  it("flags 'same as cash'", () => {
    expect(detectForbiddenPhrases("travel savings dollars are same as cash").length).toBeGreaterThan(0);
  });
  it("does not flag clean canonical text", () => {
    expect(detectForbiddenPhrases("travel savings dollars apply to eligible travel through GVR").length).toBe(0);
  });
});
