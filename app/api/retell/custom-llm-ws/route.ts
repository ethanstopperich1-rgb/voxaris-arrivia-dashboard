import { NextResponse } from "next/server";

/**
 * Vercel Functions cannot host long-lived WebSockets. This route exists only
 * to give an intentional 426 to anyone pointing Retell here. The production
 * WS handler runs as a separate Node server (see /ws-server/index.ts) and
 * Retell's `llm_websocket_url` should target that subdomain.
 */
export const runtime = "nodejs";

export async function GET() {
  return new NextResponse(
    "WebSocket upgrade not supported on this host. Point Retell to RETELL_LLM_WEBSOCKET_URL (ws-server).",
    { status: 426 },
  );
}
