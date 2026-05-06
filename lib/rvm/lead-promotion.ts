import { supabaseAdmin } from "@/lib/clients/supabase-admin";
import { logger } from "@/lib/observability/logger";

/**
 * Promotes a cold RVM lead to hot after they call back.
 * Also links the callback to the original drop record.
 * Fire-and-forget safe — never awaited on the hot path.
 */
export async function promoteLeadToHot(opts: {
  leadId: string;
  dropId: string;
  callbackCallSid: string;
  callerPhone: string;
}): Promise<void> {
  const db = supabaseAdmin();
  const now = new Date().toISOString();

  try {
    await Promise.all([
      // Promote lead segment + flag as hand raiser
      db
        .from("leads")
        .update({
          segment: "hot",
          is_hand_raiser_from_rvm: true,
          product_assignment: "andy_outbound", // next scheduled attempt is high-priority
          updated_at: now,
        })
        .eq("id", opts.leadId),

      // Link callback SID to the original drop
      db
        .from("rvm_drops")
        .update({
          callback_received_at: now,
          callback_call_sid: opts.callbackCallSid,
          promoted_to_hot: true,
        })
        .eq("id", opts.dropId),

      // Update compliance audit record — callback received
      db
        .from("rvm_compliance_audit")
        .update({ callback_received: true })
        .eq("drop_id", opts.dropId),

      // Increment daily metrics
      db
        .from("rvm_daily_metrics")
        .upsert(
          { date: now.slice(0, 10), callbacks_received: 1 },
          { onConflict: "date" }
        ),
    ]);

    logger.info({ leadId: opts.leadId, dropId: opts.dropId }, "rvm: lead promoted to hot");
  } catch (err) {
    // Non-fatal — the call is already connected. Log and move on.
    logger.error({ err: String(err), leadId: opts.leadId }, "rvm: lead promotion failed");
  }
}

/**
 * Fuzzy phone match — for callers using a different number (spouse, work, etc.)
 * Matches on last 7 digits within same area code.
 */
export async function fuzzyLeadLookup(
  callerPhone: string
): Promise<{ leadId: string; confidence: number } | null> {
  if (callerPhone.length < 10) return null;

  const digits = callerPhone.replace(/\D/g, "");
  const last7 = digits.slice(-7);
  const areaCode = digits.length >= 10 ? digits.slice(-10, -7) : null;

  const { data } = await supabaseAdmin()
    .from("leads")
    .select("id, phone_e164")
    .like("phone_e164", `%${last7}`)
    .limit(5);

  if (!data || data.length === 0) return null;

  // Exact area code match = high confidence; no area code = medium
  for (const row of data) {
    const rowDigits = row.phone_e164.replace(/\D/g, "");
    const rowArea = rowDigits.slice(-10, -7);
    if (areaCode && rowArea === areaCode) {
      return { leadId: row.id, confidence: 0.9 };
    }
  }

  // Last-7 only match = lower confidence, only use if single result
  if (data.length === 1 && data[0]) {
    return { leadId: data[0].id, confidence: 0.6 };
  }

  return null;
}
