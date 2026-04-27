import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/clients/supabase-admin";

export const runtime = "nodejs";

/** Vercel Cron: drop latency events older than 30 days to keep dashboard tidy. */
export async function GET() {
  const cutoff = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
  const { error } = await supabaseAdmin()
    .from("latency_events")
    .delete()
    .lt("created_at", cutoff);
  return NextResponse.json({ ok: !error, cutoff, error: error?.message });
}
