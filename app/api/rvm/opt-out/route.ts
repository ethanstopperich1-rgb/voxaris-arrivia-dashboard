/**
 * POST /api/rvm/opt-out
 *
 * Handles opt-out requests from any channel:
 *   - Twilio SMS STOP (Twilio messaging webhook)
 *   - Web opt-out form (member portal)
 *   - Manual ops suppression
 *
 * TCPA requirement: opt-out must be honored within 10 business days.
 * We honor it immediately — 10 days is the outer bound, not the target.
 *
 * Body (JSON or form-encoded):
 *   { phone: "+15551234567", source: "sms" | "web" | "manual", reason?: string }
 *
 * Twilio SMS STOP webhook sends form-encoded with: From, Body, MessageSid
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { suppressPhone } from "@/lib/rvm/compliance-gate";
import { logger } from "@/lib/observability/logger";
import twilio from "twilio";
import { env } from "@/lib/config/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const JsonBody = z.object({
  phone: z.string().regex(/^\+\d{10,15}$/),
  source: z.enum(["sms", "web", "manual"]).default("manual"),
  reason: z.string().optional(),
});

// Twilio SMS webhook (STOP keyword)
const TwilioSmsBody = z.object({
  From: z.string(),
  Body: z.string(),
  MessageSid: z.string().optional(),
});

export async function POST(req: Request): Promise<Response> {
  const contentType = req.headers.get("content-type") ?? "";
  const e = env();

  // ── Twilio SMS STOP flow ───────────────────────────────────────────────
  if (contentType.includes("application/x-www-form-urlencoded")) {
    const rawBody = await req.text();

    // Validate Twilio signature in production
    if (e.NODE_ENV === "production") {
      const signature = req.headers.get("x-twilio-signature") ?? "";
      const url = e.NEXT_PUBLIC_APP_URL + "/api/rvm/opt-out";
      const valid = twilio.validateRequest(
        e.TWILIO_AUTH_TOKEN,
        signature,
        url,
        Object.fromEntries(new URLSearchParams(rawBody))
      );
      if (!valid) {
        return new Response("Forbidden", { status: 403 });
      }
    }

    const parsed = TwilioSmsBody.safeParse(Object.fromEntries(new URLSearchParams(rawBody)));
    if (!parsed.success) {
      return new Response("Bad request", { status: 400 });
    }

    const { From: phone, Body: body } = parsed.data;
    const isStopKeyword = /^(stop|stopall|unsubscribe|cancel|end|quit)\b/i.test(body.trim());

    if (isStopKeyword) {
      await suppressPhone(phone, "opt_out", "sms_stop", { keyword: body.trim() });
      logger.info({ phone }, "rvm: opt-out via SMS STOP");

      // Twilio expects a TwiML response for SMS webhooks
      return new Response(
        `<?xml version="1.0" encoding="UTF-8"?><Response><Message>You have been removed from our call list. Reply START to re-subscribe.</Message></Response>`,
        { status: 200, headers: { "Content-Type": "text/xml" } }
      );
    }

    // Non-STOP SMS — acknowledge but don't suppress
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`,
      { status: 200, headers: { "Content-Type": "text/xml" } }
    );
  }

  // ── JSON opt-out (web form, manual ops) ───────────────────────────────
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const parsed = JsonBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "bad body", issues: parsed.error.issues }, { status: 422 });
  }

  const { phone, source, reason } = parsed.data;

  await suppressPhone(phone, "opt_out", source, reason ? { reason } : undefined);
  logger.info({ phone, source }, "rvm: opt-out");

  return NextResponse.json({ ok: true, phone, suppressed_at: new Date().toISOString() });
}
