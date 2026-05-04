// POST /api/outbound/livekit-call
//
// Creates an explicit AgentDispatch on LiveKit Cloud and asks the named
// agent to dial out to the given E.164 number. Both Deedy and Andie's
// Python workers honor `direction=outbound` + `phone_number` in the
// dispatch metadata: when present, they call
// `ctx.api.sip.create_sip_participant(...)` via the configured outbound
// SIP trunk and add the dialed party to the room.
//
// Auth: shared `x-api-key: $APP_API_KEY`. Used by the dashboard's
// outbound call page and by external orchestrators / CRMs.
//
// Body:
//   {
//     to: "+14078195809",
//     agent: "deedy-vba" | "andie-gvr",
//     name?: "Ethan",
//     metadata?: { ...arbitrary }   // merged into agent's dispatch context
//   }
//
// Response:
//   { ok: true, room_name, dispatch_id, agent_name, to }

import { NextResponse } from "next/server";
import { z } from "zod";
import { AgentDispatchClient } from "livekit-server-sdk";
import { requireApiKey } from "@/lib/auth/api-key";
import { logger } from "@/lib/observability/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  to: z
    .string()
    .regex(/^\+\d{10,15}$/, "to must be E.164 (+15551234567)"),
  agent: z.enum(["deedy-vba", "andie-gvr"]),
  name: z.string().min(1).max(80).optional(),
  metadata: z.record(z.unknown()).optional(),
});

function lkHttpUrl(): string {
  const url = process.env.LIVEKIT_URL ?? "";
  return url.replace(/^wss?:\/\//, "https://");
}

export async function POST(req: Request) {
  const guard = requireApiKey(req);
  if (!guard.ok) return guard.res;

  let parsed: z.infer<typeof Body>;
  try {
    const json = await req.json();
    parsed = Body.parse(json);
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: "invalid_body", detail: String(err) },
      { status: 400 },
    );
  }

  const { to, agent, name, metadata } = parsed;

  const apiKey = process.env.LIVEKIT_API_KEY ?? "";
  const apiSecret = process.env.LIVEKIT_API_SECRET ?? "";
  const httpUrl = lkHttpUrl();
  if (!apiKey || !apiSecret || !httpUrl) {
    return NextResponse.json(
      { ok: false, error: "livekit_env_missing" },
      { status: 500 },
    );
  }

  // Room name pattern matches what the worker would auto-create on
  // inbound, so dashboard call-detail links work uniformly.
  const prefix = agent === "andie-gvr" ? "andie-out" : "deedy-out";
  const room = `${prefix}-${to.replace(/\D/g, "")}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;

  // Merge caller context. Both worker entrypoints look for these keys.
  const dispatchMetadata: Record<string, unknown> = {
    direction: "outbound",
    phone_number: to,
    ...(name ? { caller_name: name, member_name: name } : {}),
    ...(metadata ?? {}),
  };

  const client = new AgentDispatchClient(httpUrl, apiKey, apiSecret);

  try {
    const dispatch = await client.createDispatch(room, agent, {
      metadata: JSON.stringify(dispatchMetadata),
    });
    logger.info(
      { room, agent, to, dispatch_id: dispatch.id },
      "outbound_dispatch_created",
    );
    return NextResponse.json({
      ok: true,
      room_name: room,
      dispatch_id: dispatch.id,
      agent_name: agent,
      to,
    });
  } catch (err) {
    logger.error(
      { room, agent, to, error: String(err) },
      "outbound_dispatch_failed",
    );
    return NextResponse.json(
      { ok: false, error: "dispatch_failed", detail: String(err) },
      { status: 502 },
    );
  }
}
