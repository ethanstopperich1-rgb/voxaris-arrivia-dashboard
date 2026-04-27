import { twilioClient } from "@/lib/clients/twilio";
import { supabaseAdmin } from "@/lib/clients/supabase-admin";
import { env } from "@/lib/config/env";
import type { CreatedTransferContext } from "./create-transfer-context";

/** Send SMS screen-pop, then return the Retell `transfer_call` tool args. */
export async function dispatchTransfer(input: {
  context: CreatedTransferContext;
  retell_call_id: string;
}): Promise<{
  tool_call: {
    name: "transfer_call";
    arguments: Record<string, unknown>;
  };
}> {
  const e = env();
  const sb = supabaseAdmin();

  // 1. Fire SMS screen-pop BEFORE bridging
  try {
    const sms = await twilioClient().messages.create({
      to: e.SPECIALIST_SMS_NUMBER,
      from: e.TWILIO_FROM_NUMBER,
      body: `GVR transfer incoming. Open: ${input.context.screen_pop_url} (reason: ${input.context.id})`,
    });
    await sb
      .from("transfer_contexts")
      .update({ sms_sent_at: new Date().toISOString(), sms_sid: sms.sid })
      .eq("id", input.context.id);
  } catch (err) {
    await sb
      .from("transfer_contexts")
      .update({ sms_sent_at: null, sms_sid: `error:${String(err).slice(0, 60)}` })
      .eq("id", input.context.id);
  }

  return {
    tool_call: {
      name: "transfer_call",
      arguments: {
        transfer_destination: {
          type: input.context.endpoint_kind === "sip" ? "sip" : "predefined",
          number:
            input.context.endpoint_kind === "sip" ? undefined : input.context.specialist_endpoint,
          sip_uri:
            input.context.endpoint_kind === "sip" ? input.context.specialist_endpoint : undefined,
        },
        transfer_type: "warm",
        agent_detection: true,
        agent_detection_timeout_ms: e.TRANSFER_TIMEOUT_SECONDS * 1000,
        whisper_message: input.context.whisper_text,
        three_way_message: input.context.three_way_message,
        show_transferee_as_caller: true,
      },
    },
  };
}
