import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/clients/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ callId: string }> }) {
  const { callId } = await ctx.params;
  const sb = supabaseAdmin();
  const { data: session } = await sb
    .from("call_sessions")
    .select("*")
    .eq("retell_call_id", callId)
    .maybeSingle();
  if (!session) return NextResponse.json({ error: "not-found" }, { status: 404 });
  const { data: turns } = await sb
    .from("evidence_ledgers")
    .select("*")
    .eq("call_session_id", session.id)
    .order("turn_index");
  const { data: latencies } = await sb
    .from("latency_events")
    .select("event, duration_ms, turn_index, created_at, meta")
    .eq("call_session_id", session.id)
    .order("created_at");
  return NextResponse.json({ session, turns: turns ?? [], latencies: latencies ?? [] });
}
