import { describe, it, expect } from "vitest";
import { extractNumericClaims } from "@/lib/guardrails/numeric-claim-extractor";

describe("numeric-claim-extractor", () => {
  it("finds dollar amounts", () => {
    expect(extractNumericClaims("$3,499 to enroll").some((c) => c.kind === "dollar")).toBe(true);
  });
  it("finds percent claims", () => {
    expect(extractNumericClaims("save up to 70%").some((c) => c.kind === "percent")).toBe(true);
  });
  it("finds points claims", () => {
    expect(extractNumericClaims("5,000 points").some((c) => c.kind === "points")).toBe(true);
  });
  it("converts word numbers", () => {
    expect(extractNumericClaims("three thousand four hundred ninety-nine dollars").length).toBeGreaterThan(0);
  });
});
