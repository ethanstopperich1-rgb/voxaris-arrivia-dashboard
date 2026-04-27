import { describe, it, expect } from "vitest";
import { validatePricingFacts } from "@/lib/guardrails/pricing-fact-validator";

describe("pricing-fact-validator", () => {
  it("blocks Select Access dollar amount", () => {
    const r = validatePricingFacts({
      draft: "Select Access is three thousand four hundred ninety-nine dollars.",
    });
    expect(r.status).toBe("blocked");
  });

  it("blocks 5,000 points claim", () => {
    const r = validatePricingFacts({ draft: "You start with 5,000 points." });
    expect(r.status).toBe("blocked");
  });

  it("blocks 70% savings claim", () => {
    const r = validatePricingFacts({ draft: "Members save up to 70 percent on resorts." });
    expect(r.status).toBe("blocked");
  });

  it("blocks military endorsement", () => {
    const r = validatePricingFacts({ draft: "GVR is endorsed by the military." });
    expect(r.status).toBe("blocked");
  });

  it("blocks an arbitrary numeric value", () => {
    const r = validatePricingFacts({ draft: "Your travel savings dollars are valued at $750." });
    expect(r.status).toBe("blocked");
  });

  it("passes safe canonical phrasing", () => {
    const r = validatePricingFacts({
      draft:
        "Travel savings dollars are promotional savings you apply toward eligible travel through GVR.",
    });
    expect(r.status).toBe("passed");
  });
});
