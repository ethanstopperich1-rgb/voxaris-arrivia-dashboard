import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiKey } from "@/lib/auth/api-key";
import { logger } from "@/lib/observability/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/outbound/start
 * Triggers a single outbound call via Retell with dynamic variables.
 *
 * Auth: x-api-key (server-to-server). Use this from your CRM, your dialer,
 * or the demo admin UI.
 *
 * Body:
 *   {
 *     to: "+14155551234",
 *     member: {
 *       name: "Stacey",
 *       member_id?: "GVR-12345",
 *       incentive_amount?: "$250",
 *       transfer_bonus_amount?: "$250",
 *       total_after_bonus?: "$500",
 *       last_activity_date?: "never"
 *     },
 *     from?: "+14072890294"   // defaults to RETELL_PHONE_NUMBER env
 *   }
 *
 * Response:
 *   { ok: true, call_id: "call_xxx", to, from, agent_id, dynamic_variables }
 */

const Body = z.object({
  to: z.string().regex(/^\+\d{10,15}$/, "to must be E.164 (+15551234567)"),
  from: z.string().regex(/^\+\d{10,15}$/).optional(),
  member: z.object({
    name: z.string().min(1).default("there"),
    member_id: z.string().default("demo"),
    incentive_amount: z.string().default("$250"),
    transfer_bonus_amount: z.string().default("$250"),
    total_after_bonus: z.string().default("$500"),
    last_activity_date: z.string().default("never"),
  }).default({} as never),
});

export async function POST(req: Request) {
  const auth = requireApiKey(req);
  if (!auth.ok) return auth.res;

  const RETELL_API_KEY = process.env.RETELL_API_KEY;
  const OUTBOUND_AGENT_ID = process.env.RETELL_OUTBOUND_AGENT_ID;
  const DEFAULT_FROM = process.env.RETELL_PHONE_NUMBER;

  if (!RETELL_API_KEY || !OUTBOUND_AGENT_ID || !DEFAULT_FROM) {
    return NextResponse.json(
      { ok: false, error: "missing-env",
        detail: "Server is missing RETELL_API_KEY, RETELL_OUTBOUND_AGENT_ID, or RETELL_PHONE_NUMBER." },
      { status: 500 },
    );
  }

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "bad-body", issues: parsed.error.issues }, { status: 422 });
  }

  const { to, from = DEFAULT_FROM, member } = parsed.data;

  const dynamic_variables: Record<string, string> = {
    member_name: member.name,
    member_id: member.member_id,
    incentive_amount: member.incentive_amount,
    transfer_bonus_amount: member.transfer_bonus_amount,
    total_after_bonus: member.total_after_bonus,
    last_activity_date: member.last_activity_date,
  };

  try {
    const res = await fetch("https://api.retellai.com/create-phone-call", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RETELL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from_number: from,
        to_number: to,
        override_agent_id: OUTBOUND_AGENT_ID,
        retell_llm_dynamic_variables: dynamic_variables,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      logger.error({ status: res.status, body: text.slice(0, 300) }, "retell create-phone-call failed");
      return NextResponse.json(
        { ok: false, error: "retell-error", status: res.status, detail: text.slice(0, 300) },
        { status: 502 },
      );
    }
    const data = (await res.json()) as { call_id?: string };
    return NextResponse.json({
      ok: true,
      call_id: data.call_id,
      to,
      from,
      agent_id: OUTBOUND_AGENT_ID,
      dynamic_variables,
    });
  } catch (e) {
    logger.error({ err: String(e) }, "outbound start failed");
    return NextResponse.json({ ok: false, error: "dispatch-error", detail: String(e).slice(0, 200) }, { status: 502 });
  }
}
