import { TIMEOUTS_MS } from "@/lib/config/constants";

export function fillerThresholdMs(): number {
  return Number(process.env.FULL_RAG_FILLER_THRESHOLD_MS ?? "700");
}

export function totalBudgetMs(source: "answer_card" | "rag"): number {
  return source === "answer_card"
    ? TIMEOUTS_MS.TOTAL_BUDGET_ANSWER_CARD
    : TIMEOUTS_MS.TOTAL_BUDGET_FULL_RAG;
}

export const FILLERS = [
  "Let me check the approved details…",
  "One moment…",
  "Let me confirm that for you…",
];
