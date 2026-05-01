import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiKey } from "@/lib/auth/api-key";
import { logger } from "@/lib/observability/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/outbound/start-batch
 *
 * Trigger N outbound calls in sequence (paced) from a batch of members.
 * Useful for: CSV upload, daily dialer, demo runs.
 *
 * Auth: x-api-key (server-to-server).
 *
 * Body:
 *   {
 *     pace_ms?: 2000,     // delay between calls (default 2s — be polite to Twilio rate limits)
 *     stop_on_error?: false,
 *     members: [
 *       { to: "+1...", name: "Stacey", incentive_amount: "$250", ... },
 *       ...
 *     ]
 *   }
 */

const Member = z.object({
  to: z.string().regex(/^\+\d{10,15}$/),
  name: z.string().default("there"),
  member_id: z.string().default("demo"),
  incentive_amount: z.string().default("$250"),
  transfer_bonus_amount: z.string().default("$250"),
  total_after_bonus: z.string().default("$500"),
  last_activity_date: z.string().default("never"),
});

const Body = z.object({
  pace_ms: z.number().int().min(0).max(60_000).default(2000),
  stop_on_error: z.boolean().default(false),
  members: z.array(Member).min(1).max(500),
});

export async function POST(req: Request) {
  const auth = requireApiKey(req);
  if (!auth.ok) return auth.res;

  const RETELL_API_KEY = process.env.RETELL_API_KEY;
  const OUTBOUND_AGENT_ID = process.env.RETELL_OUTBOUND_AGENT_ID;
  const FROM = process.env.RETELL_PHONE_NUMBER;
  if (!RETELL_API_KEY || !OUTBOUND_AGENT_ID || !FROM) {
    return NextResponse.json({ ok: false, error: "missing-env" }, { status: 500 });
  }

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "bad-body", issues: parsed.error.issues }, { status: 422 });
  }

  const results: Array<{ to: string; ok: boolean; call_id?: string; error?: string }> = [];

  for (const m of parsed.data.members) {
    try {
      const res = await fetch("https://api.retellai.com/create-phone-call", {
        method: "POST",
        headers: { Authorization: `Bearer ${RETELL_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from_number: FROM,
          to_number: m.to,
          override_agent_id: OUTBOUND_AGENT_ID,
          retell_llm_dynamic_variables: {
            member_name: m.name,
            member_id: m.member_id,
            incentive_amount: m.incentive_amount,
            transfer_bonus_amount: m.transfer_bonus_amount,
            total_after_bonus: m.total_after_bonus,
            last_activity_date: m.last_activity_date,
          },
        }),
      });
      if (!res.ok) {
        const err = `${res.status}: ${(await res.text()).slice(0, 200)}`;
        results.push({ to: m.to, ok: false, error: err });
        if (parsed.data.stop_on_error) break;
      } else {
        const data = (await res.json()) as { call_id?: string };
        results.push({ to: m.to, ok: true, call_id: data.call_id });
      }
    } catch (e) {
      results.push({ to: m.to, ok: false, error: String(e).slice(0, 200) });
      if (parsed.data.stop_on_error) break;
    }
    if (parsed.data.pace_ms > 0) {
      await new Promise((r) => setTimeout(r, parsed.data.pace_ms));
    }
  }

  const okCount = results.filter((r) => r.ok).length;
  logger.info({ total: results.length, ok: okCount }, "outbound batch complete");
  return NextResponse.json({
    ok: true,
    total: results.length,
    succeeded: okCount,
    failed: results.length - okCount,
    results,
  });
}
