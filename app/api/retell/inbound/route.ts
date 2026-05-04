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
 * Per-DID agent routing. The webhook is shared across multiple Retell
 * phone numbers, but each DID belongs to a different agent (GVR member
 * services vs Deedy OPC). Map the to_number to the correct override.
 *
 * If a DID isn't in this map, we fall through to the GVR default — this
 * preserves the original behavior for the legacy +14072890294 line.
 */
const AGENT_BY_DID: Record<string, { agent_id: string; brand: string }> = {
  // Deedy — Arrivia VBA, Westgate Lakes pilot
  "+14078538108": {
    agent_id: "agent_0e698d33fb60b7da9eff5d5654",
    brand: "Voxaris-VBA-Westgate",
  },
};

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
  const to = parsed.data.call_inbound.to_number ?? "";
  const e = env();

  // ─── DEEDY (Arrivia VBA) — short-circuit, no GVR memory lookup ────
  // Deedy is stateless per scan (no cross-call memory). The flow uses
  // {{premium_offer}} / {{caller_phone}} / {{slot_1}} / {{slot_2}} which
  // we can't populate yet without a placement registry — Retell will fall
  // back gracefully when a var is unset.
  const opcRoute = AGENT_BY_DID[to];
  if (opcRoute) {
    // ── Real date/time awareness — Deedy needs to know what "tomorrow" means ──
    // Westgate Lakes is in Orlando (America/New_York). Compute everything in
    // local resort time so Deedy speaks in terms guests understand.
    const TZ = "America/New_York";
    const now = new Date();
    const fmt = (d: Date, opts: Intl.DateTimeFormatOptions) =>
      new Intl.DateTimeFormat("en-US", { timeZone: TZ, ...opts }).format(d);
    const addDays = (d: Date, n: number) => {
      const r = new Date(d);
      r.setUTCDate(r.getUTCDate() + n);
      return r;
    };

    const dateLong = (d: Date) =>
      fmt(d, { weekday: "long", month: "long", day: "numeric" }); // "Saturday, May 2"
    const dayOfWeek = (d: Date) => fmt(d, { weekday: "long" });
    const dateShort = (d: Date) =>
      fmt(d, { month: "long", day: "numeric" }); // "May 4"

    const today = now;
    const tomorrow = addDays(now, 1);
    const dayAfter = addDays(now, 2);
    const inThreeDays = addDays(now, 3);

    const localTimeStr = fmt(now, { hour: "numeric", minute: "2-digit", hour12: true });
    const hour24 = parseInt(fmt(now, { hour: "2-digit", hour12: false }), 10);
    const businessHoursOpen = hour24 >= 9 && hour24 < 21; // 9am–9pm ET (per deedy-facts)
    const afterHours = !businessHoursOpen;

    return NextResponse.json({
      call_inbound: {
        override_agent_id: opcRoute.agent_id,
        dynamic_variables: {
          brand: opcRoute.brand,
          env: e.NODE_ENV,
          caller_phone: from,

          // Westgate pilot defaults
          premium_offer: "two complimentary 2-day Disney park hopper tickets",
          property_name: "Westgate Lakes Resort & Spa",
          placement_opener_hook: "Hi — thanks for scanning.",

          // ── Date/time awareness (Orlando time) ──
          today_date: dateLong(today),                  // "Saturday, May 2"
          today_short: dateShort(today),                // "May 2"
          today_day_of_week: dayOfWeek(today),          // "Saturday"
          current_time_local: localTimeStr,             // "1:30 PM"
          tomorrow_date: dateLong(tomorrow),            // "Sunday, May 3"
          tomorrow_short: dateShort(tomorrow),          // "May 3"
          tomorrow_day_of_week: dayOfWeek(tomorrow),    // "Sunday"
          day_after_tomorrow_date: dateLong(dayAfter),  // "Monday, May 4"
          day_after_short: dateShort(dayAfter),         // "May 4"
          day_after_day_of_week: dayOfWeek(dayAfter),   // "Monday"
          three_days_out_date: dateLong(inThreeDays),
          business_hours_state: businessHoursOpen ? "open" : "after_hours",
          deedy_role: afterHours
            ? "after-hours AI assistant"
            : "AI assistant (live team is also available)",

          // ── Concrete bookable slots (date-aware, not just "tomorrow") ──
          slot_1: `${dayOfWeek(tomorrow)} ${dateShort(tomorrow)} at 10:30 AM`,
          slot_2: `${dayOfWeek(tomorrow)} ${dateShort(tomorrow)} at 2:15 PM`,
          slot_3: `${dayOfWeek(dayAfter)} ${dateShort(dayAfter)} at 10:30 AM`,
          slot_4: `${dayOfWeek(dayAfter)} ${dateShort(dayAfter)} at 2:15 PM`,
        },
      },
    });
  }
  // ──────────────────────────────────────────────────────────────────


  // Cross-call memory lookup
  let memory = {
    is_returning_caller: "false",
    last_call_date: "never",
    last_call_outcome: "none",
    member_name: "there",
  };

  if (from !== "unknown") {
    // Hard 1.5s budget for the entire memory lookup. Retell drops the call if
    // the inbound webhook is slower than ~5s — and Supabase / Redis can stall
    // forever when prod env has placeholder creds. Fail-fast and use defaults.
    const lookup = (async () => {
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
      // Fire-and-forget — don't block the webhook on these writes
      sb.from("call_sessions").insert({ caller_number_hash: hash }).then(() => {}, () => {});
      initCallMemory({
        retell_call_id: `pending-${Date.now()}`,
        caller_phone: from,
      }).catch(() => {});
    })();

    try {
      await Promise.race([
        lookup,
        new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 1500)),
      ]);
    } catch (err) {
      logger.warn({ err: String(err) }, "inbound caller lookup skipped (timeout / non-fatal)");
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
