import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { RouterResultT } from "./router";

export type AnswerCard = {
  id: string;
  intent: string;
  triggers: string[];
  response_text: string;
  fact_ids: string[];
  risk_class: string;
  requires_verifier: boolean;
  next_action: "continue" | "offer_transfer" | "transfer" | "end_call";
};

let _cards: AnswerCard[] | null = null;

export function loadAnswerCards(): AnswerCard[] {
  if (_cards) return _cards;
  const dir = join(process.cwd(), "content/answer-cards");
  const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
  _cards = files.map((f) => JSON.parse(readFileSync(join(dir, f), "utf8")) as AnswerCard);
  return _cards;
}

export function getCardById(id: string): AnswerCard | undefined {
  return loadAnswerCards().find((c) => c.id === id);
}

export type SelectionResult = {
  card: AnswerCard;
  confidence: number;
  reason: "router_candidate" | "exact_trigger" | "keyword" | "default_for_intent";
} | null;

const STOP = new Set(["the", "a", "an", "is", "are", "do", "does", "to", "of", "for", "with"]);

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t && !STOP.has(t));
}

function keywordOverlap(utterance: string, triggers: string[]): number {
  const ut = new Set(tokenize(utterance));
  let best = 0;
  for (const trig of triggers) {
    const tt = tokenize(trig);
    if (tt.length === 0) continue;
    const hits = tt.filter((t) => ut.has(t)).length;
    best = Math.max(best, hits / tt.length);
  }
  return best;
}

export function selectAnswerCard(input: {
  router: RouterResultT;
  utterance: string;
}): SelectionResult {
  const cards = loadAnswerCards();

  if (input.router.answer_card_candidate) {
    const c = cards.find((x) => x.id === input.router.answer_card_candidate);
    if (c) {
      return {
        card: c,
        confidence: Math.max(0.9, Math.min(1, input.router.confidence)),
        reason: "router_candidate",
      };
    }
  }

  let best: { card: AnswerCard; score: number } | null = null;
  for (const c of cards) {
    if (c.intent !== input.router.intent) continue;
    const score = keywordOverlap(input.utterance, c.triggers);
    if (!best || score > best.score) best = { card: c, score };
  }
  if (best && best.score >= 0.6) {
    return { card: best.card, confidence: 0.88 + best.score * 0.07, reason: "exact_trigger" };
  }
  if (best && best.score >= 0.34) {
    return { card: best.card, confidence: 0.82, reason: "keyword" };
  }

  const intentDefault = cards.find((c) => c.intent === input.router.intent);
  if (intentDefault) {
    return { card: intentDefault, confidence: 0.7, reason: "default_for_intent" };
  }
  return null;
}
