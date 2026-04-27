import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/clients/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function pct(values: number[], p: number): number {
  if (!values.length) return 0;
  const s = [...values].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(p * s.length))] ?? 0;
}

export async function GET() {
  const sb = supabaseAdmin();
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();

  const { data: latencies } = await sb
    .from("latency_events")
    .select("event, duration_ms, created_at")
    .gte("created_at", since)
    .not("duration_ms", "is", null)
    .limit(5000);

  const buckets: Record<string, number[]> = {};
  for (const r of latencies ?? []) {
    if (r.duration_ms == null) continue;
    (buckets[r.event] ??= []).push(r.duration_ms);
  }

  const stages = Object.fromEntries(
    Object.entries(buckets).map(([k, v]) => [
      k,
      { count: v.length, p50: pct(v, 0.5), p95: pct(v, 0.95), p99: pct(v, 0.99) },
    ]),
  );

  const { count: totalCalls } = await sb
    .from("call_sessions")
    .select("id", { count: "exact", head: true })
    .gte("started_at", since);
  const { count: transferred } = await sb
    .from("transfer_contexts")
    .select("id", { count: "exact", head: true })
    .gte("created_at", since);
  const { count: bridged } = await sb
    .from("transfer_contexts")
    .select("id", { count: "exact", head: true })
    .gte("created_at", since)
    .eq("outcome", "bridged");

  return NextResponse.json({
    window_hours: 24,
    total_calls: totalCalls ?? 0,
    transfers: transferred ?? 0,
    bridged: bridged ?? 0,
    transfer_success_rate: transferred ? (bridged ?? 0) / transferred : 0,
    stages,
  });
}
