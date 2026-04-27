import { supabaseAdmin } from "@/lib/clients/supabase-admin";

export async function recordEvidenceLedger(input: {
  retell_call_id: string;
  turn_index: number;
  user_question: string;
  route_intent: string;
  risk_level: string;
  response_source: string;
  answer_card_id?: string | null;
  chunks?: unknown[];
  facts_used?: string[];
  agent_draft?: string;
  agent_final: string;
  unsupported_claims?: unknown[];
  validator_status?: string;
  verifier_verdict?: string;
  verifier_reason?: string;
  rewrite_count?: number;
}): Promise<void> {
  const sb = supabaseAdmin();
  const { data: session } = await sb
    .from("call_sessions")
    .select("id")
    .eq("retell_call_id", input.retell_call_id)
    .maybeSingle();
  if (!session) return;
  await sb.from("evidence_ledgers").upsert(
    {
      call_session_id: session.id,
      turn_index: input.turn_index,
      user_question: input.user_question,
      route_intent: input.route_intent,
      risk_level: input.risk_level,
      response_source: input.response_source,
      answer_card_id: input.answer_card_id ?? null,
      chunks: input.chunks ?? [],
      facts_used: input.facts_used ?? [],
      agent_draft: input.agent_draft,
      agent_final: input.agent_final,
      unsupported_claims: input.unsupported_claims ?? [],
      validator_status: input.validator_status,
      verifier_verdict: input.verifier_verdict,
      verifier_reason: input.verifier_reason,
      rewrite_count: input.rewrite_count ?? 0,
    },
    { onConflict: "call_session_id,turn_index" },
  );
}
