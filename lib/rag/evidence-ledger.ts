import type { RerankedChunk } from "./rerank";
import type { Fact } from "@/lib/guardrails/facts-loader";

export type EvidenceLedger = {
  user_question: string;
  route_intent: string;
  chunks: Array<{
    id: string;
    text: string;
    source: string;
    similarity?: number;
    rerank_score: number;
    allowed_claims: string[];
    forbidden_extrapolations: string[];
  }>;
  facts_used: Array<{ id: string; canonical: string; numeric_values: unknown[] }>;
  unsupported_claims: string[];
};

export function buildLedger(input: {
  user_question: string;
  route_intent: string;
  chunks: RerankedChunk[];
  facts: Fact[];
}): EvidenceLedger {
  return {
    user_question: input.user_question,
    route_intent: input.route_intent,
    chunks: input.chunks.map((c) => ({
      id: c.id,
      text: c.body,
      source: `${c.source_doc}#${c.section}`,
      similarity: c.similarity,
      rerank_score: c.rerank_score,
      allowed_claims: c.allowed_claims,
      forbidden_extrapolations: c.forbidden_extrapolations,
    })),
    facts_used: input.facts.map((f) => ({
      id: f.id,
      canonical: f.canonical,
      numeric_values: f.numeric_values,
    })),
    unsupported_claims: [],
  };
}
