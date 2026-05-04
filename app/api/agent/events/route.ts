// Agent telemetry intake.
//
// The Python LiveKit workers (deedy-vba, andie-gvr) POST here every time they
// emit a usage update, turn-metrics report, tool invocation, escalation,
// shutdown, or error. Each payload is recorded raw in `agent_events`, and
// known event types also fan out to typed tables (call_sessions counters,
// tool_invocations) so the dashboard can render aggregates without scanning
// JSON.
//
// Auth: shared `x-api-key: $APP_API_KEY` header (same as /api/tools/*).

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiKey } from "@/lib/auth/api-key";
import { supabaseAdmin } from "@/lib/clients/supabase-admin";
import { logger } from "@/lib/observability/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EventType = z.enum([
  "usage_update",
  "turn_metrics",
  "tool_invocation",
  "escalation",
  "shutdown",
  "error",
  "summary",
  "appointment",
  "recording_started",
]);

const Body = z.object({
  livekit_room_name: z.string().min(1),
  agent_name: z.enum(["deedy-vba", "andie-gvr"]),
  event_type: EventType,
  payload: z.record(z.unknown()),
});

type Body = z.infer<typeof Body>;

const UsageUpdatePayload = z.object({
  llm_prompt_tokens: z.number().nonnegative().optional(),
  llm_completion_tokens: z.number().nonnegative().optional(),
  tts_characters: z.number().nonnegative().optional(),
  stt_audio_seconds: z.number().nonnegative().optional(),
});

const ToolInvocationPayload = z.object({
  tool_name: z.string().min(1),
  args: z.record(z.unknown()).optional().default({}),
  result: z.record(z.unknown()).optional().default({}),
  success: z.boolean().optional(),
  duration_ms: z.number().int().nonnegative().optional(),
});

const ShutdownPayload = z.object({
  reason: z.string().optional(),
});

const FallbackPayload = z.object({
  stage: z.enum(["stt", "llm", "tts"]).optional(),
});

const SummaryPayload = z.object({
  summary: z.string().min(1),
  outcome: z.string().min(1),
  transcript: z.string().optional(),
  caller_name: z.string().optional(),
  placement_slug: z.string().optional(),
});

const AppointmentPayload = z.object({
  caller_name: z.string().optional(),
  caller_phone: z.string().optional(),
  property_name: z.string().optional(),
  placement_slug: z.string().optional(),
  tour_slot: z.string().optional(),
  tour_at: z.string().datetime().optional(),
  on_property: z.boolean().optional(),
  deposit_path: z.string().optional(),
  confirmation_id: z.string().optional(),
  status: z.string().optional(),
  notes: z.string().optional(),
});

const RecordingStartedPayload = z.object({
  recording_url: z.string().url().optional(),
  egress_id: z.string().min(1),
});

// Best-effort parse of a human-readable tour slot ("Wed Aug 14 10:30 AM")
// into an ISO timestamp. Returns null if Date can't make sense of it.
function parseTourAt(slot: string | undefined): string | null {
  if (!slot) return null;
  const t = Date.parse(slot);
  if (!Number.isFinite(t)) return null;
  return new Date(t).toISOString();
}

async function applySummary(body: Body): Promise<void> {
  const parsed = SummaryPayload.safeParse(body.payload);
  if (!parsed.success) {
    throw new Error(`summary payload invalid: ${parsed.error.message}`);
  }
  const p = parsed.data;
  const update: Record<string, unknown> = {
    livekit_room_name: body.livekit_room_name,
    agent_name: body.agent_name,
    summary: p.summary,
    summary_outcome: p.outcome,
  };
  if (p.transcript !== undefined) update.transcript = p.transcript;
  if (p.caller_name !== undefined) update.caller_name = p.caller_name;
  if (p.placement_slug !== undefined) update.placement_slug = p.placement_slug;
  const { error } = await supabaseAdmin()
    .from("call_sessions")
    .upsert(update, { onConflict: "livekit_room_name", ignoreDuplicates: false });
  if (error) throw new Error(`call_sessions summary upsert: ${error.message}`);
}

async function applyAppointment(body: Body): Promise<void> {
  const parsed = AppointmentPayload.safeParse(body.payload);
  if (!parsed.success) {
    throw new Error(`appointment payload invalid: ${parsed.error.message}`);
  }
  const p = parsed.data;
  const callSessionId = await findCallSessionId(body.livekit_room_name);
  const tour_at = p.tour_at ?? parseTourAt(p.tour_slot);
  const { error } = await supabaseAdmin().from("appointments").insert({
    call_session_id: callSessionId,
    livekit_room_name: body.livekit_room_name,
    agent_name: body.agent_name,
    caller_name: p.caller_name ?? null,
    caller_phone: p.caller_phone ?? null,
    property_name: p.property_name ?? null,
    placement_slug: p.placement_slug ?? null,
    tour_slot: p.tour_slot ?? null,
    tour_at,
    on_property: p.on_property ?? null,
    deposit_path: p.deposit_path ?? null,
    confirmation_id: p.confirmation_id ?? null,
    status: p.status ?? "booked",
    notes: p.notes ?? null,
  });
  if (error) throw new Error(`appointments insert: ${error.message}`);
}

async function applyRecordingStarted(body: Body): Promise<void> {
  const parsed = RecordingStartedPayload.safeParse(body.payload);
  if (!parsed.success) {
    throw new Error(`recording_started payload invalid: ${parsed.error.message}`);
  }
  const p = parsed.data;
  const update: Record<string, unknown> = {
    livekit_room_name: body.livekit_room_name,
    agent_name: body.agent_name,
    recording_egress_id: p.egress_id,
  };
  if (p.recording_url !== undefined) update.recording_url = p.recording_url;
  const { error } = await supabaseAdmin()
    .from("call_sessions")
    .upsert(update, { onConflict: "livekit_room_name", ignoreDuplicates: false });
  if (error) throw new Error(`call_sessions recording upsert: ${error.message}`);
}

async function findCallSessionId(roomName: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin()
    .from("call_sessions")
    .select("id")
    .eq("livekit_room_name", roomName)
    .limit(1)
    .maybeSingle();
  if (error) {
    logger.warn({ err: error.message, roomName }, "agent-events: call_sessions lookup failed");
    return null;
  }
  return data?.id ?? null;
}

async function applyUsageUpdate(body: Body): Promise<void> {
  const usage = UsageUpdatePayload.safeParse(body.payload);
  if (!usage.success) return;
  const sb = supabaseAdmin();
  // Read-modify-write so the values stay cumulative across the call.
  const { data: row } = await sb
    .from("call_sessions")
    .select(
      "id, llm_prompt_tokens, llm_completion_tokens, tts_characters, stt_audio_seconds, agent_name",
    )
    .eq("livekit_room_name", body.livekit_room_name)
    .maybeSingle();
  const next = {
    livekit_room_name: body.livekit_room_name,
    agent_name: row?.agent_name ?? body.agent_name,
    llm_prompt_tokens: Number(row?.llm_prompt_tokens ?? 0) + (usage.data.llm_prompt_tokens ?? 0),
    llm_completion_tokens:
      Number(row?.llm_completion_tokens ?? 0) + (usage.data.llm_completion_tokens ?? 0),
    tts_characters: Number(row?.tts_characters ?? 0) + (usage.data.tts_characters ?? 0),
    stt_audio_seconds:
      Number(row?.stt_audio_seconds ?? 0) + (usage.data.stt_audio_seconds ?? 0),
  };
  const { error } = await sb
    .from("call_sessions")
    .upsert(next, { onConflict: "livekit_room_name", ignoreDuplicates: false });
  if (error) throw new Error(`call_sessions usage upsert: ${error.message}`);
}

async function applyToolInvocation(body: Body): Promise<void> {
  const tool = ToolInvocationPayload.safeParse(body.payload);
  if (!tool.success) {
    throw new Error(`tool_invocation payload invalid: ${tool.error.message}`);
  }
  const callSessionId = await findCallSessionId(body.livekit_room_name);
  const { error } = await supabaseAdmin().from("tool_invocations").insert({
    call_session_id: callSessionId,
    livekit_room_name: body.livekit_room_name,
    agent_name: body.agent_name,
    tool_name: tool.data.tool_name,
    args: tool.data.args,
    result: tool.data.result,
    success: tool.data.success ?? null,
    duration_ms: tool.data.duration_ms ?? null,
  });
  if (error) throw new Error(`tool_invocations insert: ${error.message}`);
}

async function applyShutdown(body: Body): Promise<void> {
  const parsed = ShutdownPayload.safeParse(body.payload);
  const reason = parsed.success ? parsed.data.reason ?? null : null;
  const { error } = await supabaseAdmin()
    .from("call_sessions")
    .update({ shutdown_reason: reason, ended_at: new Date().toISOString() })
    .eq("livekit_room_name", body.livekit_room_name);
  if (error) throw new Error(`call_sessions shutdown update: ${error.message}`);
}

async function applyEscalationOrError(body: Body): Promise<void> {
  // Track fallback engagements as a JSONB counter on the call_sessions row
  // so the dashboard can render the "fallback engagement" card directly.
  const fb = FallbackPayload.safeParse(body.payload);
  if (!fb.success || !fb.data.stage) return;
  const sb = supabaseAdmin();
  const { data: row } = await sb
    .from("call_sessions")
    .select("fallback_engaged")
    .eq("livekit_room_name", body.livekit_room_name)
    .maybeSingle();
  const current = (row?.fallback_engaged ?? {}) as Record<string, number>;
  const stage = fb.data.stage;
  const next = { ...current, [stage]: (current[stage] ?? 0) + 1 };
  const { error } = await sb
    .from("call_sessions")
    .update({ fallback_engaged: next })
    .eq("livekit_room_name", body.livekit_room_name);
  if (error) throw new Error(`call_sessions fallback update: ${error.message}`);
}

export async function POST(req: Request): Promise<Response> {
  const auth = requireApiKey(req);
  if (!auth.ok) return auth.res;

  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "bad-body", issues: parsed.error.issues },
      { status: 422 },
    );
  }
  const body = parsed.data;

  // 1. Always record raw event for the audit trail.
  let eventId: number | null = null;
  try {
    const { data, error } = await supabaseAdmin()
      .from("agent_events")
      .insert({
        livekit_room_name: body.livekit_room_name,
        agent_name: body.agent_name,
        event_type: body.event_type,
        payload: body.payload,
      })
      .select("id")
      .single();
    if (error) throw error;
    eventId = data?.id ?? null;
  } catch (err) {
    logger.error({ err: String(err) }, "agent-events: agent_events insert failed");
    return NextResponse.json({ ok: false, error: "agent_events_insert_failed" }, { status: 500 });
  }

  // 2. Fan out to typed tables based on event_type.
  try {
    switch (body.event_type) {
      case "usage_update":
        await applyUsageUpdate(body);
        break;
      case "tool_invocation":
        await applyToolInvocation(body);
        break;
      case "shutdown":
        await applyShutdown(body);
        break;
      case "escalation":
      case "error":
        await applyEscalationOrError(body);
        break;
      case "turn_metrics":
        // Turn-level metrics are audited via agent_events only; the dashboard
        // reads them with payload->>turn_total_ms.
        break;
      case "summary":
        await applySummary(body);
        break;
      case "appointment":
        await applyAppointment(body);
        break;
      case "recording_started":
        await applyRecordingStarted(body);
        break;
    }
  } catch (err) {
    logger.error(
      { err: String(err), event_type: body.event_type, room: body.livekit_room_name },
      "agent-events: fan-out failed",
    );
    return NextResponse.json(
      { ok: false, error: "fanout_failed", event_id: eventId },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, event_id: eventId });
}
