import { NextResponse } from "next/server";
import { z } from "zod";
import { createTransferContext } from "@/lib/transfer/create-transfer-context";
import { dispatchTransfer } from "@/lib/transfer/transfer-client";
import { requireApiKey } from "@/lib/auth/api-key";

export const runtime = "nodejs";

const Body = z.object({
  retell_call_id: z.string(),
  caller_phone: z.string(),
  reason: z.string().default("test-force-transfer"),
});

export async function POST(req: Request) {
  const auth = requireApiKey(req);
  if (!auth.ok) return auth.res;
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "bad-body" }, { status: 422 });
  const ctx = await createTransferContext(parsed.data);
  const out = await dispatchTransfer({ context: ctx, retell_call_id: parsed.data.retell_call_id });
  return NextResponse.json({ context: ctx, dispatched: out });
}
