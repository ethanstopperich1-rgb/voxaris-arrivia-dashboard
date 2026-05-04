import {
  OPC_GLOBAL_FORBIDDEN,
  OPC_PCI_FORBIDDEN,
  allOpcFacts,
} from "./opc-facts-loader";

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

type ForbiddenEntry = {
  phrase: string;
  pattern: RegExp;
  source_fact_id: string;
  category: "global" | "pci" | "fact";
};

const FORBIDDEN_ENTRIES: ForbiddenEntry[] = [
  ...OPC_GLOBAL_FORBIDDEN.map((p) => ({
    phrase: p,
    pattern: new RegExp(`\\b${escapeRegex(p)}\\b`, "i"),
    source_fact_id: "OPC_GLOBAL",
    category: "global" as const,
  })),
  ...OPC_PCI_FORBIDDEN.map((p) => ({
    phrase: p,
    pattern: new RegExp(`\\b${escapeRegex(p)}\\b`, "i"),
    source_fact_id: "OPC_PCI",
    category: "pci" as const,
  })),
  ...allOpcFacts().flatMap((f) =>
    (f.forbidden_phrases ?? []).map((p) => ({
      phrase: p,
      pattern: new RegExp(`\\b${escapeRegex(p)}\\b`, "i"),
      source_fact_id: f.id,
      category: "fact" as const,
    })),
  ),
];

// Numeric heuristics — sequences that look like card / account / SSN numbers
const CARD_NUMBER_PATTERN = /\b(?:\d[ -]?){13,19}\b/;
const SSN_PATTERN = /\b\d{3}-\d{2}-\d{4}\b/;
const CVV_PATTERN = /\b(?:cvv|cvc|sec(?:urity)? code)\D{0,5}\d{3,4}\b/i;

export type ForbiddenHit = {
  phrase: string;
  source_fact_id: string;
  category: "global" | "pci" | "fact" | "numeric_pattern";
};

export function detectOpcForbidden(text: string): ForbiddenHit[] {
  const hits: ForbiddenHit[] = [];
  const seen = new Set<string>();
  for (const f of FORBIDDEN_ENTRIES) {
    if (f.pattern.test(text) && !seen.has(f.phrase.toLowerCase())) {
      seen.add(f.phrase.toLowerCase());
      hits.push({
        phrase: f.phrase,
        source_fact_id: f.source_fact_id,
        category: f.category,
      });
    }
  }
  if (CARD_NUMBER_PATTERN.test(text)) {
    hits.push({
      phrase: "<card-number-shaped sequence>",
      source_fact_id: "OPC_PCI",
      category: "numeric_pattern",
    });
  }
  if (SSN_PATTERN.test(text)) {
    hits.push({
      phrase: "<SSN-shaped sequence>",
      source_fact_id: "OPC_PCI",
      category: "numeric_pattern",
    });
  }
  if (CVV_PATTERN.test(text)) {
    hits.push({
      phrase: "<CVV-shaped sequence>",
      source_fact_id: "OPC_PCI",
      category: "numeric_pattern",
    });
  }
  return hits;
}

export function hasPciHit(hits: ForbiddenHit[]): boolean {
  return hits.some(
    (h) => h.category === "pci" || h.category === "numeric_pattern",
  );
}
