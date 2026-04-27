import { supabaseAdmin } from "@/lib/clients/supabase-admin";
import { createTransferContext } from "./create-transfer-context";
import { dispatchTransfer } from "./transfer-client";

/** Retry to backup endpoint when transfer_failed event arrives. Caller decides next step. */
export async function fallbackTransfer(input: {
  retell_call_id: string;
  caller_phone: string;
  reason: string;
}): Promise<{ ok: true; tool_call: unknown } | { ok: false; reason: string }> {
  try {
    const sb = supabaseAdmin();
    const { count } = await sb
      .from("transfer_contexts")
      .select("id", { count: "exact", head: true })
      .eq("retell_call_id", input.retell_call_id);
    if ((count ?? 0) >= 2) {
      return { ok: false, reason: "max-retries-exceeded" };
    }
    const ctx = await createTransferContext({
      retell_call_id: input.retell_call_id,
      caller_phone: input.caller_phone,
      reason: input.reason,
      endpoint_kind: "backup",
    });
    const { tool_call } = await dispatchTransfer({
      context: ctx,
      retell_call_id: input.retell_call_id,
    });
    return { ok: true, tool_call };
  } catch (e) {
    return { ok: false, reason: String(e).slice(0, 120) };
  }
}
