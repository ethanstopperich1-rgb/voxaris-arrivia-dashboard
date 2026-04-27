import { supabaseAdmin } from "@/lib/clients/supabase-admin";
import { env } from "@/lib/config/env";
import { getCallMemory } from "@/lib/memory/redis-memory";
import { buildWhisper } from "./specialist-whisper";

export type CreatedTransferContext = {
  id: string;
  screen_pop_url: string;
  whisper_text: string;
  three_way_message: string;
  specialist_endpoint: string;
  endpoint_kind: "primary" | "backup" | "sip";
};

export async function createTransferContext(input: {
  retell_call_id: string;
  caller_phone: string;
  reason: string;
  endpoint_kind?: "primary" | "backup" | "sip";
}): Promise<CreatedTransferContext> {
  const e = env();
  const sb = supabaseAdmin();
  const memory = await getCallMemory(input.retell_call_id);
  const recent = (memory?.recent_turns ?? []).map((t) => `${t.role}: ${t.content}`).join("\n");
  const { whisper_text, three_way_message } = await buildWhisper({
    retell_call_id: input.retell_call_id,
    reason: input.reason,
  });

  const endpoint_kind = input.endpoint_kind ?? "primary";
  const specialist_endpoint =
    endpoint_kind === "backup"
      ? e.BACKUP_SPECIALIST_NUMBER
      : endpoint_kind === "sip" && e.PRIMARY_SPECIALIST_SIP_URI
        ? e.PRIMARY_SPECIALIST_SIP_URI
        : e.PRIMARY_SPECIALIST_NUMBER;

  const { data: session } = await sb
    .from("call_sessions")
    .select("id")
    .eq("retell_call_id", input.retell_call_id)
    .maybeSingle();
  if (!session) throw new Error("call_session not found for transfer context");

  const { data: row, error } = await sb
    .from("transfer_contexts")
    .insert({
      call_session_id: session.id,
      retell_call_id: input.retell_call_id,
      caller_phone: input.caller_phone,
      caller_state_code: memory?.caller_state_code ?? null,
      reason: input.reason,
      conversation_summary: recent.slice(0, 4000),
      qualifying_data: memory?.slots ?? {},
      evidence_ledger_ids: [],
      whisper_text,
      three_way_message,
      specialist_endpoint,
      endpoint_kind,
      screen_pop_url: `${e.SPECIALIST_SCREEN_POP_BASE_URL ?? `${e.NEXT_PUBLIC_APP_URL}/transfer`}/PLACEHOLDER`,
    })
    .select("id")
    .single();
  if (error || !row) throw new Error(`transfer_contexts insert: ${error?.message}`);

  const screen_pop_url = `${e.NEXT_PUBLIC_APP_URL}/transfer/${row.id}`;
  await sb.from("transfer_contexts").update({ screen_pop_url }).eq("id", row.id);
  await sb
    .from("call_sessions")
    .update({ transfer_context_id: row.id })
    .eq("retell_call_id", input.retell_call_id);

  return {
    id: row.id,
    screen_pop_url,
    whisper_text,
    three_way_message,
    specialist_endpoint,
    endpoint_kind,
  };
}
