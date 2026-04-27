import { env } from "@/lib/config/env";
import { redactPII } from "@/lib/guardrails/pii-redactor";
import { routeUtterance, type RouterResultT } from "./router";
import { selectAnswerCard, type AnswerCard } from "./answer-card-selector";
import { validatePricingFacts } from "@/lib/guardrails/pricing-fact-validator";
import { verifyDraft } from "@/lib/guardrails/verifier";
import { verificationRequired } from "@/lib/guardrails/safety-policy";
import { hybridSearch } from "@/lib/rag/hybrid-search";
import { rerankChunks } from "@/lib/rag/rerank";
import { buildLedger, type EvidenceLedger } from "@/lib/rag/evidence-ledger";
import { getFactsByIds } from "@/lib/guardrails/facts-loader";
import { runSpecialist, type SpecialistKind } from "./specialist-runner";
import { gracefulDeflection } from "./fallback";
import { recordEvidenceLedger } from "@/lib/memory/postgres-memory";
import { recordLatency, EVENTS, Timer } from "@/lib/observability/latency";
import { appendTurn, getCallMemory } from "@/lib/memory/redis-memory";
import { logger } from "@/lib/observability/logger";

export type EngineResult = {
  text: string;
  end_call: boolean;
  transfer: { required: boolean; reason?: string };
  meta: {
    route: RouterResultT;
    response_source: "answer_card" | "rag" | "specialist" | "deflect" | "transfer" | "greeting";
    answer_card_id?: string;
    validator_status: "passed" | "blocked" | "skipped";
    verifier_verdict?: "APPROVE" | "REWRITE" | "DEFLECT" | "TRANSFER" | "skipped";
    verifier_reason?: string;
    rewrite_count: number;
    evidence_ledger?: EvidenceLedger;
  };
};

const ROUTE_TO_SPECIALIST: Record<string, SpecialistKind> = {
  education: "education",
  discovery: "discovery",
  objection: "objection",
  pricing: "pricing",
  transfer_request: "escalation",
};

export async function responseEngine(input: {
  callId: string;
  utterance: string;
}): Promise<EngineResult> {
  const e = env();
  const t0 = new Timer();
  const safeUtterance = redactPII(input.utterance);
  const memory = await getCallMemory(input.callId);
  const turnIndex = (memory?.turn_count ?? 0) + 1;

  // 1. Router
  const routerStart = new Timer();
  await recordLatency({
    retell_call_id: input.callId,
    turn_index: turnIndex,
    event: EVENTS.ROUTER_START,
  });
  const route = await routeUtterance({ callId: input.callId, utterance: safeUtterance });
  await recordLatency({
    retell_call_id: input.callId,
    turn_index: turnIndex,
    event: EVENTS.ROUTER_END,
    duration_ms: routerStart.ms(),
    meta: { intent: route.intent, risk: route.risk_level, confidence: route.confidence },
  });

  // 2. Hard transfer routes
  if (route.allowed_response_mode === "transfer" || route.intent === "account_specific") {
    const text = gracefulDeflection(route.intent);
    await persist(input, turnIndex, route, text, "transfer", null, "skipped", "skipped");
    return {
      text,
      end_call: false,
      transfer: { required: true, reason: route.intent },
      meta: {
        route,
        response_source: "transfer",
        validator_status: "skipped",
        verifier_verdict: "skipped",
        rewrite_count: 0,
      },
    };
  }

  // 3. Answer card lane
  await recordLatency({
    retell_call_id: input.callId,
    turn_index: turnIndex,
    event: EVENTS.ANSWER_CARD_START,
  });
  const card = selectAnswerCard({ router: route, utterance: safeUtterance });
  await recordLatency({
    retell_call_id: input.callId,
    turn_index: turnIndex,
    event: EVENTS.ANSWER_CARD_END,
    meta: card ? { id: card.card.id, confidence: card.confidence } : { hit: false },
  });

  if (card && card.confidence >= 0.88) {
    return await runAnswerCard(input, turnIndex, route, card.card);
  }

  // 4. Full RAG lane (if enabled)
  if (!e.ALLOW_FULL_RAG || route.allowed_response_mode === "deflect") {
    const text = gracefulDeflection(route.intent);
    await persist(input, turnIndex, route, text, "deflect", null, "skipped", "DEFLECT");
    return {
      text,
      end_call: false,
      transfer: { required: false },
      meta: {
        route,
        response_source: "deflect",
        validator_status: "skipped",
        verifier_verdict: "DEFLECT",
        rewrite_count: 0,
      },
    };
  }

  return await runFullRag(input, turnIndex, route);
}

async function runAnswerCard(
  input: { callId: string; utterance: string },
  turnIndex: number,
  route: RouterResultT,
  card: AnswerCard,
): Promise<EngineResult> {
  const facts = getFactsByIds(card.fact_ids);
  const ledger: EvidenceLedger = {
    user_question: input.utterance,
    route_intent: route.intent,
    chunks: [],
    facts_used: facts.map((f) => ({
      id: f.id,
      canonical: f.canonical,
      numeric_values: f.numeric_values,
    })),
    unsupported_claims: [],
  };

  const validatorStart = new Timer();
  await recordLatency({
    retell_call_id: input.callId,
    turn_index: turnIndex,
    event: EVENTS.VALIDATOR_START,
  });
  const validator = validatePricingFacts({ draft: card.response_text });
  await recordLatency({
    retell_call_id: input.callId,
    turn_index: turnIndex,
    event: EVENTS.VALIDATOR_END,
    duration_ms: validatorStart.ms(),
    meta: { status: validator.status },
  });

  if (validator.status === "blocked") {
    const text = gracefulDeflection(route.intent);
    await persist(
      input,
      turnIndex,
      route,
      text,
      "deflect",
      card.id,
      "blocked",
      "skipped",
      "validator-blocked",
      ledger,
    );
    return {
      text,
      end_call: false,
      transfer: { required: validator.transfer_required },
      meta: {
        route,
        response_source: "deflect",
        answer_card_id: card.id,
        validator_status: "blocked",
        verifier_verdict: "DEFLECT",
        verifier_reason: "validator-blocked",
        rewrite_count: 0,
        evidence_ledger: ledger,
      },
    };
  }

  if (verificationRequired(route, "answer_card") && card.requires_verifier) {
    const verifierStart = new Timer();
    await recordLatency({
      retell_call_id: input.callId,
      turn_index: turnIndex,
      event: EVENTS.VERIFIER_START,
    });
    const v = await verifyDraft({
      callId: input.callId,
      intent: route.intent,
      draft: card.response_text,
      evidence: ledger.chunks,
      facts_used: ledger.facts_used,
    });
    await recordLatency({
      retell_call_id: input.callId,
      turn_index: turnIndex,
      event: EVENTS.VERIFIER_END,
      duration_ms: verifierStart.ms(),
      meta: { verdict: v.verdict },
    });

    if (v.verdict === "APPROVE") {
      await persist(
        input,
        turnIndex,
        route,
        card.response_text,
        "answer_card",
        card.id,
        "passed",
        "APPROVE",
        v.reason,
        ledger,
      );
      return {
        text: card.response_text,
        end_call: card.next_action === "end_call",
        transfer: { required: card.next_action === "transfer" },
        meta: {
          route,
          response_source: "answer_card",
          answer_card_id: card.id,
          validator_status: "passed",
          verifier_verdict: "APPROVE",
          verifier_reason: v.reason,
          rewrite_count: 0,
          evidence_ledger: ledger,
        },
      };
    }
    if (v.verdict === "REWRITE" && v.rewrite) {
      const v2 = validatePricingFacts({ draft: v.rewrite });
      if (v2.status === "passed") {
        await persist(
          input,
          turnIndex,
          route,
          v.rewrite,
          "answer_card",
          card.id,
          "passed",
          "APPROVE",
          v.reason,
          ledger,
          1,
        );
        return {
          text: v.rewrite,
          end_call: card.next_action === "end_call",
          transfer: { required: card.next_action === "transfer" },
          meta: {
            route,
            response_source: "answer_card",
            answer_card_id: card.id,
            validator_status: "passed",
            verifier_verdict: "APPROVE",
            verifier_reason: v.reason,
            rewrite_count: 1,
            evidence_ledger: ledger,
          },
        };
      }
    }

    const text = gracefulDeflection(route.intent);
    const transferRequired = v.verdict === "TRANSFER";
    await persist(
      input,
      turnIndex,
      route,
      text,
      transferRequired ? "transfer" : "deflect",
      card.id,
      "passed",
      v.verdict,
      v.reason,
      ledger,
    );
    return {
      text,
      end_call: false,
      transfer: { required: transferRequired },
      meta: {
        route,
        response_source: transferRequired ? "transfer" : "deflect",
        answer_card_id: card.id,
        validator_status: "passed",
        verifier_verdict: v.verdict,
        verifier_reason: v.reason,
        rewrite_count: 0,
        evidence_ledger: ledger,
      },
    };
  }

  await persist(
    input,
    turnIndex,
    route,
    card.response_text,
    "answer_card",
    card.id,
    "passed",
    "skipped",
    "answer-card-low-risk",
    ledger,
  );
  return {
    text: card.response_text,
    end_call: card.next_action === "end_call",
    transfer: { required: card.next_action === "transfer" },
    meta: {
      route,
      response_source: "answer_card",
      answer_card_id: card.id,
      validator_status: "passed",
      verifier_verdict: "skipped",
      rewrite_count: 0,
      evidence_ledger: ledger,
    },
  };
}

async function runFullRag(
  input: { callId: string; utterance: string },
  turnIndex: number,
  route: RouterResultT,
): Promise<EngineResult> {
  const vecStart = new Timer();
  await recordLatency({
    retell_call_id: input.callId,
    turn_index: turnIndex,
    event: EVENTS.RAG_VECTOR_START,
  });
  const candidates = await hybridSearch({ query: input.utterance, topK: 20 });
  await recordLatency({
    retell_call_id: input.callId,
    turn_index: turnIndex,
    event: EVENTS.RAG_VECTOR_END,
    duration_ms: vecStart.ms(),
    meta: { candidates: candidates.length },
  });

  const rerankStart = new Timer();
  await recordLatency({
    retell_call_id: input.callId,
    turn_index: turnIndex,
    event: EVENTS.RERANK_START,
  });
  const reranked = await rerankChunks({ query: input.utterance, chunks: candidates, topN: 6 });
  await recordLatency({
    retell_call_id: input.callId,
    turn_index: turnIndex,
    event: EVENTS.RERANK_END,
    duration_ms: rerankStart.ms(),
    meta: { kept: reranked.length },
  });

  const ledger = buildLedger({
    user_question: input.utterance,
    route_intent: route.intent,
    chunks: reranked,
    facts: [],
  });

  const kind: SpecialistKind = ROUTE_TO_SPECIALIST[route.intent] ?? "education";
  const specStart = new Timer();
  await recordLatency({
    retell_call_id: input.callId,
    turn_index: turnIndex,
    event: EVENTS.SPECIALIST_START,
    meta: { kind },
  });
  let draft = "";
  try {
    draft = await runSpecialist({
      kind,
      callId: input.callId,
      utterance: input.utterance,
      ledger,
    });
  } catch (e) {
    logger.warn({ err: String(e) }, "specialist failed");
    draft = "";
  }
  await recordLatency({
    retell_call_id: input.callId,
    turn_index: turnIndex,
    event: EVENTS.SPECIALIST_END,
    duration_ms: specStart.ms(),
    meta: { length: draft.length },
  });

  if (!draft) {
    const text = gracefulDeflection(route.intent);
    await persist(input, turnIndex, route, text, "deflect", null, "skipped", "DEFLECT", "specialist-empty", ledger);
    return {
      text,
      end_call: false,
      transfer: { required: false },
      meta: {
        route,
        response_source: "deflect",
        validator_status: "skipped",
        verifier_verdict: "DEFLECT",
        verifier_reason: "specialist-empty",
        rewrite_count: 0,
        evidence_ledger: ledger,
      },
    };
  }

  // Validator
  const valStart = new Timer();
  let validator = validatePricingFacts({ draft });
  await recordLatency({
    retell_call_id: input.callId,
    turn_index: turnIndex,
    event: EVENTS.VALIDATOR_END,
    duration_ms: valStart.ms(),
    meta: { status: validator.status },
  });
  let workingDraft = draft;
  let rewriteCount = 0;
  if (validator.status === "blocked") {
    workingDraft = validator.suggested_rewrite;
    rewriteCount++;
    validator = validatePricingFacts({ draft: workingDraft });
  }

  // Verifier (mandatory for RAG)
  const verStart = new Timer();
  await recordLatency({
    retell_call_id: input.callId,
    turn_index: turnIndex,
    event: EVENTS.VERIFIER_START,
  });
  const v = await verifyDraft({
    callId: input.callId,
    intent: route.intent,
    draft: workingDraft,
    evidence: ledger.chunks,
    facts_used: ledger.facts_used,
  });
  await recordLatency({
    retell_call_id: input.callId,
    turn_index: turnIndex,
    event: EVENTS.VERIFIER_END,
    duration_ms: verStart.ms(),
    meta: { verdict: v.verdict },
  });

  if (v.verdict === "APPROVE") {
    await persist(
      input,
      turnIndex,
      route,
      workingDraft,
      "rag",
      null,
      "passed",
      "APPROVE",
      v.reason,
      ledger,
      rewriteCount,
    );
    return {
      text: workingDraft,
      end_call: false,
      transfer: { required: false },
      meta: {
        route,
        response_source: "rag",
        validator_status: "passed",
        verifier_verdict: "APPROVE",
        verifier_reason: v.reason,
        rewrite_count: rewriteCount,
        evidence_ledger: ledger,
      },
    };
  }
  if (v.verdict === "REWRITE" && v.rewrite) {
    const v2 = validatePricingFacts({ draft: v.rewrite });
    if (v2.status === "passed") {
      await persist(
        input,
        turnIndex,
        route,
        v.rewrite,
        "rag",
        null,
        "passed",
        "APPROVE",
        v.reason,
        ledger,
        rewriteCount + 1,
      );
      return {
        text: v.rewrite,
        end_call: false,
        transfer: { required: false },
        meta: {
          route,
          response_source: "rag",
          validator_status: "passed",
          verifier_verdict: "APPROVE",
          verifier_reason: v.reason,
          rewrite_count: rewriteCount + 1,
          evidence_ledger: ledger,
        },
      };
    }
  }

  const text = gracefulDeflection(route.intent);
  const transferRequired = v.verdict === "TRANSFER";
  await persist(
    input,
    turnIndex,
    route,
    text,
    transferRequired ? "transfer" : "deflect",
    null,
    "blocked",
    v.verdict,
    v.reason,
    ledger,
    rewriteCount,
  );
  return {
    text,
    end_call: false,
    transfer: { required: transferRequired },
    meta: {
      route,
      response_source: transferRequired ? "transfer" : "deflect",
      validator_status: "blocked",
      verifier_verdict: v.verdict,
      verifier_reason: v.reason,
      rewrite_count: rewriteCount,
      evidence_ledger: ledger,
    },
  };
}

async function persist(
  input: { callId: string; utterance: string },
  turnIndex: number,
  route: RouterResultT,
  text: string,
  source: string,
  cardId: string | null,
  validatorStatus: string,
  verifierVerdict: string,
  verifierReason?: string,
  ledger?: EvidenceLedger,
  rewriteCount: number = 0,
): Promise<void> {
  await Promise.allSettled([
    recordEvidenceLedger({
      retell_call_id: input.callId,
      turn_index: turnIndex,
      user_question: input.utterance,
      route_intent: route.intent,
      risk_level: route.risk_level,
      response_source: source,
      answer_card_id: cardId,
      chunks: ledger?.chunks ?? [],
      facts_used: (ledger?.facts_used ?? []).map((f) => f.id),
      agent_final: text,
      validator_status: validatorStatus,
      verifier_verdict: verifierVerdict,
      verifier_reason: verifierReason,
      rewrite_count: rewriteCount,
    }),
    appendTurn(input.callId, {
      turn_index: turnIndex,
      role: "agent",
      content: text,
      route: route.intent,
      risk_class: route.risk_level,
      response_source: source,
      answer_card_id: cardId ?? undefined,
      validator_status: validatorStatus,
      verifier_verdict: verifierVerdict,
      ts: Date.now(),
    }),
  ]);
}
