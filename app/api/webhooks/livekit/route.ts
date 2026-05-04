// LiveKit Cloud webhook receiver.
//
// Install dependency before deploying:
//   pnpm add livekit-server-sdk
//
// Configure in LiveKit Cloud:
//   Project Settings → Webhooks → add
//     https://arrivia-gvr.vercel.app/api/webhooks/livekit
//   The signing secret is `LIVEKIT_API_SECRET` (already used by the project).
//
// The receiver writes a row into `call_sessions` on `room_started`, fills in
// SIP / agent metadata as participants join, closes the row on
// `room_finished`, and copies every event into `agent_events` for the audit
// trail.

import { NextResponse } from "next/server";
import { WebhookReceiver } from "livekit-server-sdk";
import { supabaseAdmin } from "@/lib/clients/supabase-admin";
import { logger } from "@/lib/observability/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type LivekitParticipant = {
  identity?: string;
  kind?: number | string;
  attributes?: Record<string, string | undefined> | null;
  disconnect_reason?: string;
  disconnectReason?: string;
};

type LivekitRoom = {
  name?: string;
  sid?: string;
  num_participants?: number;
  numParticipants?: number;
  creation_time?: number | string;
  creationTime?: number | string;
};

type LivekitWebhookEvent = {
  event: string;
  id?: string;
  createdAt?: number | string;
  created_at?: number | string;
  room?: LivekitRoom;
  participant?: LivekitParticipant;
};

let _receiver: WebhookReceiver | null = null;

function receiver(): WebhookReceiver {
  if (_receiver) return _receiver;
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  if (!apiKey || !apiSecret) {
    throw new Error("LIVEKIT_API_KEY and LIVEKIT_API_SECRET must be set");
  }
  _receiver = new WebhookReceiver(apiKey, apiSecret);
  return _receiver;
}

function brandFromRoomName(name: string | undefined): string {
  if (!name) return "GVR";
  if (name.startsWith("andie-")) return "GVR";
  if (name.startsWith("inbound-") || name.startsWith("deedy-")) return "ARRIVIA";
  return "GVR";
}

function isAgentParticipant(p: LivekitParticipant): boolean {
  // LiveKit ParticipantInfo.Kind: 0 STANDARD, 1 INGRESS, 2 EGRESS, 3 SIP, 4 AGENT
  if (p.kind === 4 || p.kind === "AGENT" || p.kind === "agent") return true;
  if (typeof p.identity === "string" && /^(deedy-vba|andie-gvr)/.test(p.identity)) return true;
  return false;
}

function isSipParticipant(p: LivekitParticipant): boolean {
  if (p.kind === 3 || p.kind === "SIP" || p.kind === "sip") return true;
  const attrs = p.attributes ?? {};
  return typeof attrs["sip.phoneNumber"] === "string" || typeof attrs["sip.callDirection"] === "string";
}

function toIso(value: number | string | undefined): string {
  if (value == null) return new Date().toISOString();
  if (typeof value === "number") {
    // LiveKit sends seconds-since-epoch; if it looks like ms, treat as ms.
    const ms = value > 1e12 ? value : value * 1000;
    return new Date(ms).toISOString();
  }
  const n = Number(value);
  if (!Number.isNaN(n)) return toIso(n);
  return new Date(value).toISOString();
}

async function logRawEvent(event: LivekitWebhookEvent): Promise<void> {
  try {
    await supabaseAdmin().from("agent_events").insert({
      livekit_room_name: event.room?.name ?? null,
      agent_name: isAgentParticipant(event.participant ?? {}) ? event.participant?.identity ?? null : null,
      event_type: event.event,
      payload: event as unknown as Record<string, unknown>,
    });
  } catch (err) {
    logger.warn({ err: String(err), event: event.event }, "livekit-webhook: agent_events insert failed");
  }
}

async function handleRoomStarted(event: LivekitWebhookEvent): Promise<void> {
  const room = event.room ?? {};
  const name = room.name;
  if (!name) return;
  const startedAt = toIso(room.creation_time ?? room.creationTime ?? event.createdAt ?? event.created_at);
  const sb = supabaseAdmin();
  // Upsert: a webhook redelivery (same room name) must not duplicate the row.
  const { error } = await sb
    .from("call_sessions")
    .upsert(
      {
        livekit_room_name: name,
        livekit_session_id: room.sid ?? null,
        started_at: startedAt,
        brand: brandFromRoomName(name),
      },
      { onConflict: "livekit_room_name", ignoreDuplicates: false },
    );
  if (error) throw new Error(`call_sessions upsert (room_started): ${error.message}`);
}

async function handleRoomFinished(event: LivekitWebhookEvent): Promise<void> {
  const room = event.room ?? {};
  const name = room.name;
  if (!name) return;
  const numParticipants = room.num_participants ?? room.numParticipants ?? 0;
  const sb = supabaseAdmin();
  const { error } = await sb
    .from("call_sessions")
    .update({
      ended_at: toIso(event.createdAt ?? event.created_at),
      outcome: numParticipants === 0 ? "completed" : "abandoned",
    })
    .eq("livekit_room_name", name);
  if (error) throw new Error(`call_sessions update (room_finished): ${error.message}`);
}

async function handleParticipantJoined(event: LivekitWebhookEvent): Promise<void> {
  const room = event.room ?? {};
  const participant = event.participant ?? {};
  const name = room.name;
  if (!name) return;
  const update: Record<string, unknown> = {};
  if (isSipParticipant(participant)) {
    const attrs = participant.attributes ?? {};
    if (typeof attrs["sip.phoneNumber"] === "string") update.sip_caller_number = attrs["sip.phoneNumber"];
    if (typeof attrs["sip.h.To"] === "string") update.sip_callee_number = attrs["sip.h.To"];
    if (typeof attrs["sip.callDirection"] === "string") {
      update.direction = attrs["sip.callDirection"];
    }
  }
  if (isAgentParticipant(participant)) {
    const id = participant.identity ?? "";
    if (id === "deedy-vba" || id === "andie-gvr") {
      update.agent_name = id;
    } else if (id.startsWith("deedy-")) {
      update.agent_name = "deedy-vba";
    } else if (id.startsWith("andie-")) {
      update.agent_name = "andie-gvr";
    }
  }
  if (Object.keys(update).length === 0) return;
  const sb = supabaseAdmin();
  const { error } = await sb.from("call_sessions").update(update).eq("livekit_room_name", name);
  if (error) throw new Error(`call_sessions update (participant_joined): ${error.message}`);
}

async function handleParticipantLeft(event: LivekitWebhookEvent): Promise<void> {
  const participant = event.participant ?? {};
  if (!isSipParticipant(participant)) return;
  // The audit row in agent_events already captures this, but we add a typed
  // marker so dashboards can chart hangup reasons without a JSON dive.
  const sb = supabaseAdmin();
  await sb.from("agent_events").insert({
    livekit_room_name: event.room?.name ?? null,
    agent_name: null,
    event_type: "participant_left",
    payload: {
      identity: participant.identity ?? null,
      disconnect_reason: participant.disconnect_reason ?? participant.disconnectReason ?? null,
      attributes: participant.attributes ?? {},
    },
  });
}

export async function POST(req: Request): Promise<Response> {
  let event: LivekitWebhookEvent;
  try {
    const body = await req.text();
    const auth = req.headers.get("Authorization") ?? req.headers.get("authorization") ?? "";
    event = (await receiver().receive(body, auth)) as unknown as LivekitWebhookEvent;
  } catch (err) {
    logger.warn({ err: String(err) }, "livekit-webhook: signature verification failed");
    return new Response("unauthorized", { status: 401 });
  }

  console.log("livekit-webhook event:", event.event, event.room?.name ?? "<no room>");

  try {
    // Audit-log every event first so a handler bug never loses the trail.
    await logRawEvent(event);

    switch (event.event) {
      case "room_started":
        await handleRoomStarted(event);
        break;
      case "room_finished":
        await handleRoomFinished(event);
        break;
      case "participant_joined":
        await handleParticipantJoined(event);
        break;
      case "participant_left":
        await handleParticipantLeft(event);
        break;
      default:
        // Other events (track_published, egress_*, etc.) are recorded in
        // agent_events and ignored otherwise.
        break;
    }
  } catch (err) {
    logger.error({ err: String(err), event: event.event }, "livekit-webhook: handler error");
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
