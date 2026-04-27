import factsJson from "@/content/facts/facts.json";

export type Fact = {
  id: string;
  scope: string;
  category: string;
  canonical: string;
  allowed_phrases: string[];
  forbidden_phrases: string[];
  numeric_values: Array<number | string>;
  transfer_only: boolean;
  risk_class: string;
  source: string;
  last_verified?: string;
  note?: string;
};

const FACTS: Fact[] = factsJson.facts as unknown as Fact[];
const FACT_BY_ID = new Map(FACTS.map((f) => [f.id, f]));

export function getFact(id: string): Fact | undefined {
  return FACT_BY_ID.get(id);
}

export function getFactsByIds(ids: string[]): Fact[] {
  return ids.map((i) => FACT_BY_ID.get(i)).filter((f): f is Fact => Boolean(f));
}

export function allFacts(): Fact[] {
  return FACTS;
}
