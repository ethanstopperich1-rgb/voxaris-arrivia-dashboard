import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/clients/supabase-admin";
import { dispatchTransfer } from "@/lib/transfer/transfer-client";
import { requireApiKey } from "@/lib/auth/api-key";

export const runtime = "nodejs";

const Body = z.object({
  retell_call_id: z.string(),
  transfer_context_id: z.string().uuid(),
});

export async function POST(req: Request) {
  const auth = requireApiKey(req);
  if (!auth.ok) return auth.res;
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "bad-body" }, { status: 422 });

  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("transfer_contexts")
    .select(
      "id, screen_pop_url, whisper_text, three_way_message, specialist_endpoint, endpoint_kind",
    )
    .eq("id", parsed.data.transfer_context_id)
    .maybeSingle();
  if (error || !data)
    return NextResponse.json({ error: "context-not-found" }, { status: 404 });

  try {
    const out = await dispatchTransfer({
      context: {
        id: data.id,
        screen_pop_url: data.screen_pop_url,
        whisper_text: data.whisper_text,
        three_way_message: data.three_way_message,
        specialist_endpoint: data.specialist_endpoint,
        endpoint_kind: data.endpoint_kind as "primary" | "backup" | "sip",
      },
      retell_call_id: parsed.data.retell_call_id,
    });
    return NextResponse.json(out);
  } catch (e) {
    return NextResponse.json({ error: String(e).slice(0, 200) }, { status: 500 });
  }
}
