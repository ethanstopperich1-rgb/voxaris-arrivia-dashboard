import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/clients/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ callId: string }> }) {
  const { callId } = await ctx.params;
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("transfer_contexts")
    .select("*")
    .eq("retell_call_id", callId)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ transfers: data ?? [] });
}
