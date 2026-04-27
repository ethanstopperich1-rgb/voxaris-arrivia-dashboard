import { supabaseAdmin } from "@/lib/clients/supabase-admin";
import { logger } from "./logger";

export const EVENTS = {
  CALL_STARTED: "call_started",
  CUSTOM_LLM_REQUEST_RECEIVED: "custom_llm_request_received",
  ROUTER_START: "router_start",
  ROUTER_END: "router_end",
  ANSWER_CARD_START: "answer_card_start",
  ANSWER_CARD_END: "answer_card_end",
  RAG_VECTOR_START: "rag_vector_start",
  RAG_VECTOR_END: "rag_vector_end",
  RAG_BM25_START: "rag_bm25_start",
  RAG_BM25_END: "rag_bm25_end",
  RERANK_START: "rerank_start",
  RERANK_END: "rerank_end",
  SPECIALIST_START: "specialist_start",
  SPECIALIST_END: "specialist_end",
  VALIDATOR_START: "validator_start",
  VALIDATOR_END: "validator_end",
  VERIFIER_START: "verifier_start",
  VERIFIER_END: "verifier_end",
  CUSTOM_LLM_RESPONSE_READY: "custom_llm_response_ready",
  TRANSFER_INITIATED: "transfer_initiated",
  TRANSFER_BRIDGED: "transfer_bridged",
  TRANSFER_ENDED: "transfer_ended",
  CALL_ENDED: "call_ended",
} as const;

export type LatencyEvent = (typeof EVENTS)[keyof typeof EVENTS];

export async function recordLatency(input: {
  retell_call_id: string;
  turn_index?: number;
  event: LatencyEvent;
  duration_ms?: number;
  meta?: Record<string, unknown>;
}): Promise<void> {
  try {
    const sb = supabaseAdmin();
    const { data } = await sb
      .from("call_sessions")
      .select("id")
      .eq("retell_call_id", input.retell_call_id)
      .maybeSingle();
    await sb.from("latency_events").insert({
      call_session_id: data?.id ?? null,
      retell_call_id: input.retell_call_id,
      turn_index: input.turn_index ?? null,
      event: input.event,
      duration_ms: input.duration_ms ?? null,
      meta: input.meta ?? {},
    });
  } catch (e) {
    logger.warn({ err: String(e), event: input.event }, "latency record failed");
  }
}

export class Timer {
  private start: number;
  constructor() {
    this.start = Date.now();
  }
  ms(): number {
    return Date.now() - this.start;
  }
}
