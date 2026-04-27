import { describe, it, expect } from "vitest";
import { extractNumericClaims } from "@/lib/guardrails/numeric-claim-extractor";

describe("router fallback heuristics (smoke)", () => {
  it("dollar trigger triggers numeric extraction", () => {
    expect(extractNumericClaims("$3,499 for Select Access").length).toBeGreaterThan(0);
  });
  it("clean text returns no claims", () => {
    expect(extractNumericClaims("travel savings dollars apply to eligible travel").length).toBe(0);
  });
});
