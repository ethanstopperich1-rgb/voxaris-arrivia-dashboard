import factsJson from "@/content/facts/facts.json";

type Fact = {
  id: string;
  forbidden_phrases: string[];
  transfer_only: boolean;
};

const FACTS = factsJson.facts as unknown as Fact[];
const GLOBAL_FORBIDDEN: string[] = factsJson.global_forbidden_phrases as string[];

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const ALL_FORBIDDEN: { phrase: string; pattern: RegExp; source_fact_id: string }[] = [
  ...GLOBAL_FORBIDDEN.map((p) => ({
    phrase: p,
    pattern: new RegExp(`\\b${escapeRegex(p)}\\b`, "i"),
    source_fact_id: "GLOBAL",
  })),
  ...FACTS.flatMap((f) =>
    f.forbidden_phrases.map((p) => ({
      phrase: p,
      pattern: new RegExp(escapeRegex(p), "i"),
      source_fact_id: f.id,
    })),
  ),
];

export type ForbiddenHit = { phrase: string; source_fact_id: string };

export function detectForbiddenPhrases(text: string): ForbiddenHit[] {
  const hits: ForbiddenHit[] = [];
  const seen = new Set<string>();
  for (const f of ALL_FORBIDDEN) {
    if (f.pattern.test(text) && !seen.has(f.phrase.toLowerCase())) {
      seen.add(f.phrase.toLowerCase());
      hits.push({ phrase: f.phrase, source_fact_id: f.source_fact_id });
    }
  }
  return hits;
}
