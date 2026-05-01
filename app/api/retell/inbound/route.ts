import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/clients/supabase-admin";
import { sha256 } from "@/lib/utils/hash";
import { initCallMemory } from "@/lib/memory/redis-memory";
import { logger } from "@/lib/observability/logger";
import { env } from "@/lib/config/env";

export const runtime = "nodejs";

const Body = z.object({
  call_inbound: z
    .object({
      from_number: z.string().optional(),
      to_number: z.string().optional(),
      agent_id: z.string().optional(),
      llm_id: z.string().optional(),
    })
    .partial(),
});

/**
 * Retell inbound dial-out hook.
 *
 * Called by Retell BEFORE Andie picks up. We look up the caller's phone number
 * against past calls in Supabase to enable cross-call memory ("welcome back").
 *
 * Returns dynamic variables that Andie's prompt can use:
 *   - is_returning_caller: "true" | "false"
 *   - last_call_date: human-readable ("yesterday", "3 days ago") or "never"
 *   - last_call_outcome: previous call's outcome string
 *   - member_name: best-known name (from prior calls or "there")
 */
export async function POST(req: Request) {
  const raw = await req.text();
  const parsed = Body.safeParse(JSON.parse(raw));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid body" }, { status: 422 });
  }
  const from = parsed.data.call_inbound.from_number ?? "unknown";
  const e = env();

  // Cross-call memory lookup
  let memory = {
    is_returning_caller: "false",
    last_call_date: "never",
    last_call_outcome: "none",
    member_name: "there",
  };

  if (from !== "unknown") {
    try {
      const sb = supabaseAdmin();
      const hash = sha256(from);
      const { data } = await sb
        .from("call_sessions")
        .select("started_at, outcome, retell_call_id")
        .eq("caller_number_hash", hash)
        .order("started_at", { ascending: false })
        .limit(1);
      if (data && data.length > 0 && data[0]) {
        const last = data[0];
        memory.is_returning_caller = "true";
        memory.last_call_date = humanizeDate(last.started_at);
        memory.last_call_outcome = last.outcome ?? "completed";
      }

      // Pre-create a session row for this incoming call
      await sb.from("call_sessions").insert({
        caller_number_hash: hash,
      });
      await initCallMemory({
        retell_call_id: `pending-${Date.now()}`,
        caller_phone: from,
      });
    } catch (err) {
      logger.warn({ err: String(err) }, "inbound caller lookup failed (non-fatal)");
    }
  }

  return NextResponse.json({
    call_inbound: {
      override_agent_id: e.RETELL_AGENT_ID,
      dynamic_variables: {
        brand: "GVR",
        env: e.NODE_ENV,
        ...memory,
      },
    },
  });
}

/** Returns "yesterday", "3 days ago", "today", etc. */
function humanizeDate(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffMs = now - then;
  const day = 24 * 60 * 60 * 1000;
  const days = Math.floor(diffMs / day);
  if (days < 1) return "earlier today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 14) return "last week";
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return `on ${new Date(iso).toLocaleDateString()}`;
}
