import { describe, it, expect } from "vitest";
import { selectAnswerCard, loadAnswerCards } from "@/lib/engine/answer-card-selector";

describe("answer-card-selector", () => {
  it("loads at least 25 answer cards", () => {
    expect(loadAnswerCards().length).toBeGreaterThanOrEqual(25);
  });
  it("returns router candidate when present", () => {
    const r = selectAnswerCard({
      router: {
        intent: "education",
        risk_level: "high_fact",
        answer_card_candidate: "travel_savings_dollars_core",
        allowed_response_mode: "answer_card",
        confidence: 0.95,
      },
      utterance: "what are travel savings dollars",
    });
    expect(r?.card.id).toBe("travel_savings_dollars_core");
    expect(r?.confidence).toBeGreaterThanOrEqual(0.9);
  });
  it("falls back to keyword overlap when router gives none", () => {
    const r = selectAnswerCard({
      router: {
        intent: "objection",
        risk_level: "low",
        answer_card_candidate: null,
        allowed_response_mode: "answer_card",
        confidence: 0.6,
      },
      utterance: "it's too expensive",
    });
    expect(r?.card.id).toBe("objection_too_expensive");
  });
});
