/**
 * Model lockfile (Blueprint 3 + 05-model-string-lockfile).
 * Verify each ID against provider console before Day 4 / Day 8.
 */
export const MODELS = {
  ROUTER: "claude-haiku-4-5-latest",
  VERIFIER: "claude-haiku-4-5-latest",
  ANSWER_CARD_SELECTOR: "claude-haiku-4-5-latest",
  EDUCATION: "gpt-4o",
  DISCOVERY: "claude-haiku-4-5-latest",
  OBJECTION: "gpt-4o",
  PRICING: "gpt-4o",
  POST_CALL_SUMMARY: "claude-haiku-4-5-latest",
  EMBEDDING: "text-embedding-3-small",
  RERANK: "rerank-v3.5",
} as const;

export const RISK = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
} as const;

export const ROUTES = {
  GREETING: "greeting",
  SMALL_TALK: "small_talk",
  EDUCATION: "education",
  DISCOVERY: "discovery",
  OBJECTION: "objection",
  PRICING: "pricing",
  HIGH_FACT: "high_fact",
  HIGH_POLICY: "high_policy",
  PII: "pii",
  LEGAL_FINANCIAL: "legal_financial",
  JAILBREAK: "jailbreak",
  ESCALATION: "escalation",
  TRANSFER_REQUEST: "transfer_request",
  END_CALL: "end_call",
} as const;

export type RouteId = (typeof ROUTES)[keyof typeof ROUTES];

/** Routes for which the verification pass MUST run (Hard Rule 8). */
export const VERIFY_REQUIRED_ROUTES = new Set<RouteId>([
  ROUTES.HIGH_FACT,
  ROUTES.HIGH_POLICY,
  ROUTES.PII,
  ROUTES.LEGAL_FINANCIAL,
  ROUTES.JAILBREAK,
  ROUTES.PRICING,
]);

/** Verifier outcomes. */
export const VERDICT = {
  APPROVE: "APPROVE",
  REWRITE: "REWRITE",
  DEFLECT: "DEFLECT",
  TRANSFER: "TRANSFER",
} as const;

export type Verdict = (typeof VERDICT)[keyof typeof VERDICT];

/** Per-stage timeouts (ms) — Blueprint 3. */
export const TIMEOUTS_MS = {
  ROUTER: 650,
  ANSWER_CARD: 300,
  RAG_VECTOR: 250,
  RAG_BM25: 250,
  COHERE_RERANK: 450,
  SPECIALIST: 1200,
  VALIDATOR: 350,
  VERIFIER: 450,
  TOTAL_BUDGET_ANSWER_CARD: 800,
  TOTAL_BUDGET_FULL_RAG: 2000,
} as const;

/** Aggregate budgets used by the dashboard. */
export const BUDGETS = {
  ANSWER_CARD_P95_MS: 800,
  FULL_RAG_P95_MS: 1800,
  ROUTER_MAX_MS: 250,
  RERANK_P95_MS: 350,
  TRANSFER_TIMEOUT_S: 10,
} as const;

export const TWO_PARTY_CONSENT_STATES = ["CA", "WA", "HI", "FL"] as const;
