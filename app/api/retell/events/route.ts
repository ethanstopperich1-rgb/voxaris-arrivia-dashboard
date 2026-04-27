import { NextResponse } from "next/server";
import { verifyRetellSignature } from "@/lib/retell/verify-retell-signature";
import { RetellWebhookEvent } from "@/lib/retell/parse-retell-request";
import { handleRetellEvent } from "@/lib/retell/event-handler";
import { logger } from "@/lib/observability/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const raw = await req.text();
  const sig = req.headers.get("x-retell-signature");
  const v = verifyRetellSignature({ header: sig, rawBody: raw });
  if (!v.valid) {
    logger.warn({ reason: v.reason }, "retell webhook bad signature");
    return new NextResponse("invalid signature", { status: 401 });
  }
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return new NextResponse("invalid json", { status: 400 });
  }
  const parsed = RetellWebhookEvent.safeParse(body);
  if (!parsed.success) {
    logger.warn({ issues: parsed.error.issues }, "retell webhook schema fail");
    return new NextResponse("schema mismatch", { status: 422 });
  }
  // Fast-ack: process inline but bounded; webhook should always 200.
  try {
    await handleRetellEvent(parsed.data);
  } catch (e) {
    logger.error({ err: String(e) }, "retell event handler error");
  }
  return NextResponse.json({ ok: true });
}
