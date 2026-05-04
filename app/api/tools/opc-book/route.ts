import { NextResponse } from "next/server";
import { z } from "zod";
import { twilioClient } from "@/lib/clients/twilio";
import { supabaseAdmin } from "@/lib/clients/supabase-admin";
import { env } from "@/lib/config/env";
import { requireApiKey } from "@/lib/auth/api-key";
import { logger } from "@/lib/observability/logger";
import { verifyOpcBookPayload } from "@/lib/opc/opc-verifier";
import { notifyWelcomeTeam } from "@/lib/opc/welcome-team-notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Tool: opc_book — v3, compliance-by-design + welcome-team handoff
 *
 * Pipeline:
 *   1. Auth + Zod parse
 *   2. Verifier gate (PCI scan, E.164, consent integrity) — hard fail blocks
 *      every downstream side effect
 *   3. Booking row written
 *   4. Consent log row written (only if consent captured)
 *   5. Guest SMS (only if consent captured)
 *   6. Welcome-team notification (SMS to resort + dashboard row)
 *   7. Single response back to Andie
 */

const Body = z.object({
  retell_call_id: z.string(),
  caller_phone: z.string().regex(/^\+?\d{10,15}$/),
  caller_name: z.string().optional(),
  placement_name: z.string().default("resort placement"),
  incentive: z.string().default("a complimentary incentive"),
  property_name: z.string().default("Westgate Lakes Resort & Spa"),
  tour_slot: z.string().default("tomorrow at 10:00 AM"),
  sms_consent_captured: z.boolean().default(false),
  sms_consent_phrase: z.string().optional(),
});

export async function POST(req: Request) {
  const auth = requireApiKey(req);
  if (!auth.ok) return auth.res;
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "bad-body", issues: parsed.error.issues },
      { status: 422 },
    );
  }
  const {
    retell_call_id, caller_phone, caller_name, placement_name,
    incentive, property_name, tour_slot,
    sms_consent_captured, sms_consent_phrase,
  } = parsed.data;

  const to = caller_phone.startsWith("+") ? caller_phone : `+1${caller_phone}`;
  const greeting = caller_name ? `Hi ${caller_name},` : "Hi,";
  const confirmation_id = `OPC-${Date.now().toString(36).toUpperCase()}`;

  // ─── 2. Verifier gate ─────────────────────────────────────────────
  const verification = verifyOpcBookPayload({
    retell_call_id,
    caller_phone: to,
    caller_name: caller_name ?? null,
    placement_name,
    incentive,
    property_name,
    tour_slot,
    sms_consent_captured,
    sms_consent_phrase: sms_consent_phrase ?? null,
  });
  if (!verification.ok) {
    logger.warn(
      { retell_call_id, errors: verification.errors, hits: verification.forbidden_hits },
      "opc_book: verifier blocked booking",
    );
    return NextResponse.json(
      {
        ok: false,
        error: "verifier_blocked",
        errors: verification.errors,
        blocked_for_pci: verification.blocked_for_pci,
        message_to_speak:
          "Something doesn't look right with that confirmation — let me have someone from the welcome team reach out to you directly. You won't be charged anything.",
      },
      { status: 422 },
    );
  }
  if (verification.warnings.length > 0) {
    logger.info(
      { retell_call_id, warnings: verification.warnings },
      "opc_book: verifier warnings (non-blocking)",
    );
  }

  // ─── 3. Booking row ───────────────────────────────────────────────
  let booking_id: string | null = null;
  try {
    const { data, error } = await supabaseAdmin()
      .from("opc_bookings")
      .insert({
        retell_call_id,
        confirmation_id,
        caller_phone: to,
        caller_name: caller_name ?? null,
        placement_name,
        incentive,
        property_name,
        tour_slot,
        sms_consent_captured,
        sms_consent_phrase: sms_consent_phrase ?? null,
        booking_source: "opc_voice_agent_v3",
      })
      .select("id")
      .single();
    if (!error && data) booking_id = data.id;
    if (error) logger.warn({ err: error.message, retell_call_id }, "opc_book: booking insert error");
  } catch (e) {
    logger.warn({ err: String(e) }, "opc_book: booking insert threw (non-fatal for demo)");
  }

  // ─── 4. Consent audit log (immutable) ─────────────────────────────
  if (sms_consent_captured) {
    try {
      await supabaseAdmin().from("opc_consent_log").insert({
        retell_call_id,
        phone: to,
        consent_type: "sms_confirmation_and_reminders",
        consent_phrase: sms_consent_phrase ?? "(not captured verbatim)",
        captured_via: "voice_call_recorded",
        booking_id,
      });
    } catch (e) {
      logger.warn({ err: String(e) }, "opc_book: consent log insert failed (non-fatal for demo)");
    }
  }

  // ─── 5. Guest SMS (only if consent captured) ──────────────────────
  let sms_ok = false;
  let sms_sid = "";
  let sms_error: string | undefined;
  if (!sms_consent_captured) {
    logger.info({ retell_call_id, phone: to }, "opc_book: guest SMS suppressed — no consent");
    sms_error = "no_consent";
  } else {
    const smsBody =
      `${greeting} you're confirmed for a ${property_name} preview tour ${tour_slot}. ` +
      `Your incentive: ${incentive}. ` +
      `Confirmation: ${confirmation_id}. ` +
      `Reply STOP to opt out.`;
    try {
      const sms = await twilioClient().messages.create({
        to,
        from: env().TWILIO_FROM_NUMBER,
        body: smsBody,
      });
      sms_ok = true;
      sms_sid = sms.sid;
    } catch (e) {
      sms_error = String(e).slice(0, 120);
      logger.warn({ err: sms_error, to }, "opc_book: guest SMS send failed (non-fatal)");
    }
  }

  // ─── 6. Welcome-team handoff ──────────────────────────────────────
  // Fire-and-await so we have ack data in the response, but failure is
  // non-fatal — the guest still gets confirmed.
  const welcomeTeam = await notifyWelcomeTeam({
    confirmation_id,
    booking_id,
    caller_name: caller_name ?? null,
    caller_phone: to,
    property_name,
    placement_name,
    tour_slot,
    incentive,
    sms_consent_captured,
  });

  const message_to_speak = sms_consent_captured
    ? `Perfect. You're confirmed for ${tour_slot} at ${property_name}. I just sent the details to your phone — confirmation number ${confirmation_id}. The welcome team has you on their list.`
    : `You're confirmed for ${tour_slot} at ${property_name}. Confirmation number ${confirmation_id}. I won't send a text since you didn't want one — please jot that confirmation number down. The welcome team has you on their list.`;

  return NextResponse.json({
    ok: true,
    confirmation_id,
    booking_id,
    tour_slot,
    property_name,
    incentive,
    placement_name,
    verifier: {
      passed: true,
      warnings: verification.warnings,
    },
    sms: {
      sent: sms_ok,
      sid: sms_sid,
      consent_captured: sms_consent_captured,
      error: sms_error,
    },
    welcome_team: {
      sms_ok: welcomeTeam.sms.ok,
      sms_sid: welcomeTeam.sms.sid,
      sms_error: welcomeTeam.sms.error,
      notification_row_id: welcomeTeam.notification_row_id,
    },
    message_to_speak,
  });
}
