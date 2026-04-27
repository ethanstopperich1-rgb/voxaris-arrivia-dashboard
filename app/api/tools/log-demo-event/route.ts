import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/clients/supabase-admin";
import { requireApiKey } from "@/lib/auth/api-key";

export const runtime = "nodejs";

const Body = z.object({
  retell_call_id: z.string(),
  turn_index: z.number().int().optional(),
  event: z.string(),
  meta: z.record(z.unknown()).optional(),
});

export async function POST(req: Request) {
  const auth = requireApiKey(req);
  if (!auth.ok) return auth.res;
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "bad-body" }, { status: 422 });
  await supabaseAdmin().from("latency_events").insert({
    retell_call_id: parsed.data.retell_call_id,
    turn_index: parsed.data.turn_index ?? null,
    event: parsed.data.event,
    meta: parsed.data.meta ?? {},
  });
  return NextResponse.json({ ok: true });
}
