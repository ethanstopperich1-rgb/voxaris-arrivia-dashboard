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

/** Retell inbound dial-out hook: tell Retell which agent to use + dynamic vars. */
export async function POST(req: Request) {
  const raw = await req.text();
  const parsed = Body.safeParse(JSON.parse(raw));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid body" }, { status: 422 });
  }
  const from = parsed.data.call_inbound.from_number ?? "unknown";
  try {
    await supabaseAdmin().from("call_sessions").insert({
      caller_number_hash: sha256(from),
    });
    await initCallMemory({ retell_call_id: `pending-${Date.now()}`, caller_phone: from });
  } catch (e) {
    logger.warn({ err: String(e) }, "inbound prep failed");
  }
  const e = env();
  return NextResponse.json({
    call_inbound: {
      override_agent_id: e.RETELL_AGENT_ID,
      dynamic_variables: { brand: "GVR", env: e.NODE_ENV },
    },
  });
}
