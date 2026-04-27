import { NextResponse } from "next/server";
import { env } from "@/lib/config/env";
import { supabaseAdmin } from "@/lib/clients/supabase-admin";
import { redis } from "@/lib/clients/redis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, { ok: boolean; detail?: string }> = {
    env: { ok: false },
    supabase: { ok: false },
    redis: { ok: false },
  };
  try {
    env();
    checks.env = { ok: true };
  } catch (e) {
    checks.env = { ok: false, detail: String(e).slice(0, 200) };
  }
  try {
    const { error } = await supabaseAdmin().from("call_sessions").select("id").limit(1);
    checks.supabase = { ok: !error, detail: error?.message };
  } catch (e) {
    checks.supabase = { ok: false, detail: String(e).slice(0, 200) };
  }
  try {
    await redis().ping();
    checks.redis = { ok: true };
  } catch (e) {
    checks.redis = { ok: false, detail: String(e).slice(0, 200) };
  }
  const ok = Object.values(checks).every((c) => c.ok);
  return NextResponse.json({ ok, checks }, { status: ok ? 200 : 503 });
}
