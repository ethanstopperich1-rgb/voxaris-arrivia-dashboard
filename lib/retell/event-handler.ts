import { supabaseAdmin } from "@/lib/clients/supabase-admin";
import type { RetellWebhookEventT } from "./parse-retell-request";
import { sha256 } from "@/lib/utils/hash";
import { initCallMemory, finalizeCallMemory } from "@/lib/memory/redis-memory";

export async function handleRetellEvent(evt: RetellWebhookEventT): Promise<void> {
  const sb = supabaseAdmin();
  const c = evt.call;

  switch (evt.event) {
    case "call_started": {
      await sb.from("call_sessions").upsert(
        {
          retell_call_id: c.call_id,
          twilio_call_sid: (c as { twilio_call_sid?: string }).twilio_call_sid,
          caller_number_hash: c.from_number ? sha256(c.from_number) : null,
          started_at: new Date(c.start_timestamp ?? Date.now()).toISOString(),
        },
        { onConflict: "retell_call_id" },
      );
      await initCallMemory({
        retell_call_id: c.call_id,
        caller_phone: c.from_number,
      });
      break;
    }
    case "call_ended": {
      await sb
        .from("call_sessions")
        .update({
          ended_at: c.end_timestamp
            ? new Date(c.end_timestamp).toISOString()
            : new Date().toISOString(),
          outcome: c.disconnection_reason ?? "ended",
        })
        .eq("retell_call_id", c.call_id);
      await finalizeCallMemory(c.call_id);
      break;
    }
    case "call_analyzed": {
      await sb
        .from("call_sessions")
        .update({ outcome: c.disconnection_reason ?? "analyzed" })
        .eq("retell_call_id", c.call_id);
      break;
    }
    case "transfer_started":
    case "transfer_bridged": {
      await sb
        .from("transfer_contexts")
        .update({ bridged_at: new Date().toISOString(), outcome: "bridged" })
        .eq("retell_call_id", c.call_id);
      await sb
        .from("call_sessions")
        .update({ transfer_success: evt.event === "transfer_bridged" })
        .eq("retell_call_id", c.call_id);
      break;
    }
    case "transfer_cancelled":
    case "transfer_ended":
    case "transfer_failed": {
      await sb
        .from("transfer_contexts")
        .update({ abandoned_at: new Date().toISOString(), outcome: "failed_no_answer" })
        .eq("retell_call_id", c.call_id);
      await sb
        .from("call_sessions")
        .update({ transfer_success: false })
        .eq("retell_call_id", c.call_id);
      break;
    }
  }
}
