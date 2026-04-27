import { NextResponse } from "next/server";
import { z } from "zod";
import { responseEngine } from "@/lib/engine/response-engine";
import { requireApiKey } from "@/lib/auth/api-key";

export const runtime = "nodejs";

const Body = z.object({
  call_id: z.string().default("test-call"),
  utterance: z.string(),
});

export async function POST(req: Request) {
  const auth = requireApiKey(req);
  if (!auth.ok) return auth.res;
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "bad-body" }, { status: 422 });
  const result = await responseEngine({
    callId: parsed.data.call_id,
    utterance: parsed.data.utterance,
  });
  return NextResponse.json(result);
}
