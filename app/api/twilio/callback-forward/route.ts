/**
 * POST /api/twilio/callback-forward
 *
 * TwiML endpoint for inbound callbacks to Andie's outbound caller-ID
 * number. When a member sees a missed call from us and dials back, we
 * route them straight to the inbound sales team — no Andie, no LLM,
 * no per-minute agent cost.
 *
 * Architecture (zero-cost forwarding):
 *
 *   Member dials our outbound caller-ID number
 *           ↓
 *   Twilio receives the call, hits this webhook
 *           ↓
 *   We log the callback (Supabase) and return TwiML <Dial>
 *           ↓
 *   Twilio bridges the caller to INBOUND_SALES_NUMBER at the
 *   carrier level. No agent involvement.
 *
 * Why pure-forward instead of routing to Andie:
 *   - Russell flagged that ~50% of inbound traces back to outbound
 *     footprint. Those callers ARE the high-intent leads — they
 *     deserve a live human, not an AI gatekeeper.
 *   - Andie picking up adds $0.05+/min and 1-2s of latency for zero
 *     value vs a clean carrier-level transfer.
 *   - Inbound sales team is staffed during business hours; that's
 *     when callbacks happen anyway.
 *
 * Twilio config Russell needs to set on the outbound caller-ID number:
 *   Voice Configuration:
 *     A CALL COMES IN: Webhook
 *     URL: https://arrivia.voxaris.io/api/twilio/callback-forward
 *     HTTP: POST
 *
 * Required env vars (set on Vercel):
 *   - INBOUND_SALES_NUMBER (E.164, e.g., "+18005551234")
 *   - TWILIO_AUTH_TOKEN (for signature validation in production)
 *
 * After-hours behavior: if INBOUND_SALES_AFTER_HOURS_NUMBER is set,
 * we route there outside business hours. Otherwise we fall back to
 * the same INBOUND_SALES_NUMBER (their hunt group can handle the
 * voicemail).
 */

import { NextResponse } from "next/server";
import twilio from "twilio";
import { supabaseAdmin } from "@/lib/clients/supabase-admin";
import { logger } from "@/lib/observability/logger";
import { env } from "@/lib/config/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function twiml(xml: string): Response {
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><Response>${xml}</Response>`,
    { status: 200, headers: { "Content-Type": "text/xml" } }
  );
}

/**
 * Validate the Twilio webhook signature in production. Skipped in
 * dev/test so the sandbox dialer works locally.
 */
function validateTwilioSignature(req: Request, rawBody: string): boolean {
  const e = env();
  if (e.NODE_ENV !== "production") return true;

  const authToken = e.TWILIO_AUTH_TOKEN;
  const signature = req.headers.get("x-twilio-signature") ?? "";
  const url = e.NEXT_PUBLIC_APP_URL + "/api/twilio/callback-forward";

  return twilio.validateRequest(
    authToken,
    signature,
    url,
    Object.fromEntries(new URLSearchParams(rawBody))
  );
}

export async function POST(req: Request): Promise<Response> {
  const rawBody = await req.text();

  if (!validateTwilioSignature(req, rawBody)) {
    logger.warn("twilio/callback-forward: invalid signature");
    return new Response("Forbidden", { status: 403 });
  }

  const params = Object.fromEntries(new URLSearchParams(rawBody));
  const callerPhone = params["From"] ?? "";
  const calledNumber = params["To"] ?? "";
  const callSid = params["CallSid"] ?? "";

  // Where to forward. Required; if missing, we play a graceful fallback
  // so the caller doesn't hit dead air.
  const forwardTo = process.env.INBOUND_SALES_NUMBER ?? "";
  if (!forwardTo) {
    logger.error("twilio/callback-forward: INBOUND_SALES_NUMBER not set");
    return twiml(
      "<Say>Thanks for calling Government Vacation Rewards. Our team is unavailable. Please try again during business hours.</Say>"
    );
  }

  // Log the callback to Supabase — this is how we'll prove the
  // 50% inbound-lift stat and tune Andie's voicemail strategy
  // (more VMs left → more callbacks logged here).
  void logCallback({
    callerPhone,
    calledNumber,
    callSid,
    forwardedTo: forwardTo,
  });

  logger.info(
    { callerPhone, calledNumber, callSid, forwardTo },
    "twilio/callback-forward: bridging inbound callback to sales team"
  );

  // Return TwiML — Twilio bridges the caller to the sales team
  // at the carrier level. No agent involvement, no per-min agent
  // cost. The callerId attribute keeps the original caller's
  // number visible to the inbound team (so they see who's calling).
  const xml = `<Dial callerId="${callerPhone}" timeout="25" answerOnBridge="true"><Number>${forwardTo}</Number></Dial>`;
  return twiml(xml);
}

/**
 * Fire-and-forget logging. Tracks every inbound callback so the
 * dashboard can show the inbound-lift metric and we can correlate
 * voicemail volume to callback volume.
 */
async function logCallback(opts: {
  callerPhone: string;
  calledNumber: string;
  callSid: string;
  forwardedTo: string;
}): Promise<void> {
  try {
    const db = supabaseAdmin();
    await db.from("inbound_callbacks").insert({
      caller_phone: opts.callerPhone,
      called_number: opts.calledNumber,
      twilio_call_sid: opts.callSid,
      forwarded_to: opts.forwardedTo,
      received_at: new Date().toISOString(),
    });
  } catch (err) {
    // Logging failure should never block the call forward.
    logger.warn(
      { err: String(err) },
      "twilio/callback-forward: failed to log callback (non-fatal)"
    );
  }
}
