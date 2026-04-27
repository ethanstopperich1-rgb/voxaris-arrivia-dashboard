import { NextResponse } from "next/server";
import { z } from "zod";
import { createTransferContext } from "@/lib/transfer/create-transfer-context";
import { requireApiKey } from "@/lib/auth/api-key";

export const runtime = "nodejs";

const Body = z.object({
  retell_call_id: z.string(),
  caller_phone: z.string(),
  reason: z.string(),
  endpoint_kind: z.enum(["primary", "backup", "sip"]).optional(),
});

export async function POST(req: Request) {
  const auth = requireApiKey(req);
  if (!auth.ok) return auth.res;
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "bad-body" }, { status: 422 });
  try {
    const ctx = await createTransferContext(parsed.data);
    return NextResponse.json(ctx);
  } catch (e) {
    return NextResponse.json({ error: String(e).slice(0, 200) }, { status: 500 });
  }
}
