import opcFactsJson from "@/content/facts/opc-facts.json";

export type OpcFact = {
  id: string;
  topic: string;
  canonical: string;
  risk_class: "low" | "high_fact" | "legal_financial";
  source: string;
  last_verified?: string;
  // optional shape — varies by topic
  value?: string | number;
  min_age?: number;
  max_age?: number;
  min_combined_income_usd?: number;
  currency?: string;
  allowed_countries?: string[];
  lookback_months?: number;
  value_minutes?: number;
  attendance_rule?: string;
  is_credit_check?: boolean;
  captures_card_data?: boolean;
  answer_format?: string;
  rule?: string;
  single_adults_allowed?: boolean;
  required_at?: string[];
  required_phrase?: string;
  two_party_consent?: boolean;
  consent_format?: string;
  captured_via?: string;
  audit_table?: string;
  trigger_phrases?: string[];
  interrupt_phrase?: string;
  behavior?: string;
  transfer_topics?: string[];
  forbidden_phrases?: string[];
  allowed_phrases?: string[];
  qualifier?: string;
  city?: string;
  state?: string;
};

const OPC_FACTS = opcFactsJson.facts as unknown as OpcFact[];
const FACT_BY_ID = new Map(OPC_FACTS.map((f) => [f.id, f]));
const FACT_BY_TOPIC = new Map(OPC_FACTS.map((f) => [f.topic, f]));

export const OPC_GLOBAL_FORBIDDEN: string[] =
  opcFactsJson.global_forbidden_phrases as string[];
export const OPC_PCI_FORBIDDEN: string[] =
  opcFactsJson.pci_forbidden_capture as string[];
export const OPC_TWO_PARTY_STATES: string[] =
  opcFactsJson.two_party_consent_states as string[];

export function getOpcFact(id: string): OpcFact | undefined {
  return FACT_BY_ID.get(id);
}

export function getOpcFactByTopic(topic: string): OpcFact | undefined {
  return FACT_BY_TOPIC.get(topic);
}

export function allOpcFacts(): OpcFact[] {
  return OPC_FACTS;
}
