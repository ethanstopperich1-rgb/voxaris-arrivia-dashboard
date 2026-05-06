/**
 * POST /api/rvm/callback
 *
 * Twilio webhook — fires when a member calls back the RVM callback number.
 *
 * Flow:
 *   1. Parse Twilio form body (From, To, CallSid)
 *   2. Validate Twilio signature
 *   3. Redis lookup: is this caller a known RVM drop? (fast path, <50ms)
 *   4. Store RVM context so Andy's inbound hook can load it
 *   5. Promote lead cold → hot in background (fire-and-forget)
 *   6. Return TwiML that forwards the call to Andy's Retell number
 *
 * If the caller isn't in the drop cache (unknown, spouse, wrong number):
 *   - Try fuzzy match (last 7 digits)
 *   - Fall through to Andy's regular inbound flow with cold context
 *
 * Latency target: < 1.5s to TwiML response (Twilio will time out at 15s,
 * but Retell's inbound hook expects fast hand-off)
 */

import { NextResponse } from "next/server";
import twilio from "twilio";
import { env } from "@/lib/config/env";
import { logger } from "@/lib/observability/logger";
import { getDropByPhone, setCallbackContext } from "@/lib/rvm/drop-cache";
import { promoteLeadToHot, fuzzyLeadLookup } from "@/lib/rvm/lead-promotion";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Twilio validates its webhooks with an HMAC-SHA1 signature on the request URL + body.
// Skip validation in dev/test so the sandbox dialer works locally.
function validateTwilioSignature(req: Request, rawBody: string): boolean {
  const e = env();
  if (e.NODE_ENV !== "production") return true;

  const authToken = e.TWILIO_AUTH_TOKEN;
  const signature = req.headers.get("x-twilio-signature") ?? "";
  const url = e.NEXT_PUBLIC_APP_URL + "/api/rvm/callback";

  return twilio.validateRequest(authToken, signature, url, Object.fromEntries(
    new URLSearchParams(rawBody)
  ));
}

function twiml(xml: string): Response {
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><Response>${xml}</Response>`,
    { status: 200, headers: { "Content-Type": "text/xml" } }
  );
}

export async function POST(req: Request): Promise<Response> {
  const rawBody = await req.text();

  if (!validateTwilioSignature(req, rawBody)) {
    logger.warn("rvm/callback: invalid Twilio signature");
    return new Response("Forbidden", { status: 403 });
  }

  const params = Object.fromEntries(new URLSearchParams(rawBody));
  const callerPhone: string = params["From"] ?? "";
  const calledNumber: string = params["To"] ?? "";
  const callSid: string = params["CallSid"] ?? "";

  if (!callerPhone || !callSid) {
    return twiml("<Say>Sorry, we encountered an error. Please try again later.</Say>");
  }

  logger.info({ callerPhone, calledNumber, callSid }, "rvm: inbound callback received");

  const e = env();
  const retellNumber = e.RETELL_PHONE_NUMBER;

  // ── Fast path: exact phone match in Redis ──────────────────────────────
  let drop = await getDropByPhone(callerPhone).catch(() => null);
  let isKnownCallback = !!drop;
  let leadId = drop?.leadId;

  // ── Fallback: fuzzy match (spouse / work line / different device) ───────
  if (!drop) {
    const fuzzy = await fuzzyLeadLookup(callerPhone).catch(() => null);
    if (fuzzy && fuzzy.confidence >= 0.7) {
      leadId = fuzzy.leadId;
      isKnownCallback = true;
      logger.info({ callerPhone, leadId, confidence: fuzzy.confidence }, "rvm: fuzzy match");
    }
  }

  // ── Write callback context for Andy's inbound hook ─────────────────────
  // Even if we don't have a drop record, we flag it as an RVM callback so
  // Andy knows to skip the standard opener and go straight to qualification.
  const ctxPayload = isKnownCallback && drop
    ? {
        isRvmCallback: true as const,
        leadId: drop.leadId,
        dropId: drop.dropId,
        firstName: drop.firstName,
        enrollmentDate: drop.enrollmentDate,
        offerDisplay: drop.offerDisplay,
        campaignName: drop.campaignName,
        promotedToHot: true,
      }
    : {
        isRvmCallback: true as const,
        leadId: leadId ?? "",
        dropId: "",
        firstName: "there",
        enrollmentDate: "",
        offerDisplay: null,
        campaignName: "unknown",
        promotedToHot: false,
      };

  // Fire context write + lead promotion in background — don't block TwiML response
  void setCallbackContext(callerPhone, ctxPayload).catch((err) =>
    logger.error({ err: String(err) }, "rvm: callback context write failed")
  );

  if (isKnownCallback && drop && leadId) {
    void promoteLeadToHot({
      leadId,
      dropId: drop.dropId,
      callbackCallSid: callSid,
      callerPhone,
    });
  }

  // ── Forward to Andy via Retell ─────────────────────────────────────────
  // <Dial> the Retell number. Retell fires /api/retell/inbound, which reads
  // the callback context from Redis and injects it as Andy's dynamic vars.
  const xml = `<Dial callerId="${calledNumber}" timeout="20"><Number>${retellNumber}</Number></Dial>`;

  logger.info(
    { callerPhone, isKnownCallback, leadId, retellNumber },
    "rvm: forwarding callback to Andy"
  );

  return twiml(xml);
}
