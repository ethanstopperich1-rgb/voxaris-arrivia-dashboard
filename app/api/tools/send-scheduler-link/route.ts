import { NextResponse } from "next/server";
import { z } from "zod";
import { twilioClient } from "@/lib/clients/twilio";
import { supabaseAdmin } from "@/lib/clients/supabase-admin";
import { env } from "@/lib/config/env";
import { requireApiKey } from "@/lib/auth/api-key";
import { logger } from "@/lib/observability/logger";

export const runtime = "nodejs";

/**
 * Tool: send_scheduler_link
 * Sends the Microsoft Bookings link for "Vacation Rewards Exclusive Resort Team"
 * via SMS or email when a caller declines an immediate transfer.
 *
 * For SMS: dispatched via Twilio (TWILIO_FROM_NUMBER → caller phone).
 * For email: requires a transactional email provider env (RESEND_API_KEY).
 *            If unavailable, returns ok:false with reason "email_provider_missing"
 *            so the agent can fall back to SMS.
 */

const Body = z.object({
  retell_call_id: z.string(),
  channel: z.enum(["sms", "email"]),
  destination: z.string().min(1),
  caller_name: z.string().optional(),
  scheduler_url: z
    .string()
    .url()
    .default(
      "https://bookings.cloud.microsoft/book/VacationRewardsExclusiveResortTeam@arrivia.com/",
    ),
});

export async function POST(req: Request) {
  const auth = requireApiKey(req);
  if (!auth.ok) return auth.res;
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "bad-body" }, { status: 422 });
  }
  const { retell_call_id, channel, destination, caller_name, scheduler_url } = parsed.data;

  const greeting = caller_name ? `Hi ${caller_name},` : "Hi,";
  const smsBody = `${greeting} thanks for talking with Andie at Government Vacation Rewards. Here's the link to book a time that works better for you: ${scheduler_url}`;
  const emailSubject = "Your Government Vacation Rewards scheduling link";
  const emailHtml = `<p>${greeting}</p><p>Thanks for talking with Andie at Government Vacation Rewards. Pick a time that works better for you here:</p><p><a href="${scheduler_url}">${scheduler_url}</a></p><p>— GVR Member Services</p>`;

  let result: { ok: boolean; provider?: string; ref?: string; reason?: string };

  try {
    if (channel === "sms") {
      const sms = await twilioClient().messages.create({
        to: destination,
        from: env().TWILIO_FROM_NUMBER,
        body: smsBody,
      });
      result = { ok: true, provider: "twilio", ref: sms.sid };
    } else {
      const resendKey = process.env.RESEND_API_KEY;
      if (!resendKey) {
        return NextResponse.json({
          ok: false,
          reason: "email_provider_missing",
          message:
            "Email channel not configured. Tell the caller you'll text instead, then call this tool again with channel='sms'.",
        });
      }
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM ?? "Andie at GVR <noreply@voxaris.ai>",
          to: [destination],
          subject: emailSubject,
          html: emailHtml,
        }),
      });
      if (!r.ok) {
        const text = await r.text();
        return NextResponse.json(
          { ok: false, reason: "email_send_failed", detail: text.slice(0, 200) },
          { status: 502 },
        );
      }
      const data = (await r.json()) as { id?: string };
      result = { ok: true, provider: "resend", ref: data.id ?? "" };
    }
  } catch (e) {
    logger.error({ err: String(e), retell_call_id, channel }, "send-scheduler-link failed");
    return NextResponse.json(
      { ok: false, reason: "dispatch_error", detail: String(e).slice(0, 200) },
      { status: 502 },
    );
  }

  // Log the dispatch to latency_events for the dashboard
  try {
    await supabaseAdmin().from("latency_events").insert({
      retell_call_id,
      event: `scheduler_link_sent:${channel}`,
      meta: {
        channel,
        destination,
        provider: result.provider,
        ref: result.ref,
        scheduler_url,
      },
    });
  } catch (e) {
    logger.warn({ err: String(e) }, "scheduler link log failed (non-fatal)");
  }

  return NextResponse.json({
    ok: true,
    channel,
    sent_to: destination,
    provider: result.provider,
    ref: result.ref,
  });
}
