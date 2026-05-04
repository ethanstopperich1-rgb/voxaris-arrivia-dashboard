// Per-call detail page. Param: livekit_room_name.
//
// Loads call_sessions row + tool_invocations + relevant agent_events +
// linked appointments + transfer_contexts. Renders header, summary,
// recording player, transcript, tool invocations, appointments, and
// raw events as collapsible JSON.

import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/clients/supabase-admin";
import { TranscriptPanel } from "./TranscriptPanel";
import { RawEvents } from "./RawEvents";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type CallRow = {
  id: string;
  livekit_room_name: string | null;
  livekit_session_id: string | null;
  agent_name: string | null;
  direction: string | null;
  sip_caller_number: string | null;
  sip_callee_number: string | null;
  caller_name: string | null;
  started_at: string;
  ended_at: string | null;
  summary: string | null;
  summary_outcome: string | null;
  transcript: string | null;
  recording_url: string | null;
  recording_egress_id: string | null;
  llm_prompt_tokens: number | null;
  llm_completion_tokens: number | null;
  tts_characters: number | null;
  stt_audio_seconds: number | null;
  fallback_engaged: Record<string, number> | null;
  shutdown_reason: string | null;
  placement_slug: string | null;
};

type ToolRow = {
  id: number;
  tool_name: string;
  args: Record<string, unknown> | null;
  result: Record<string, unknown> | null;
  success: boolean | null;
  duration_ms: number | null;
  created_at: string;
};

type EventRow = {
  id: number;
  event_type: string;
  payload: Record<string, unknown> | null;
  created_at: string;
};

type AppointmentRow = {
  id: string;
  caller_name: string | null;
  caller_phone: string | null;
  property_name: string | null;
  tour_slot: string | null;
  tour_at: string | null;
  status: string | null;
  confirmation_id: string | null;
  deposit_path: string | null;
  on_property: boolean | null;
};

type TransferRow = {
  id: string;
  reason: string | null;
  whisper_text: string | null;
  endpoint_kind: string | null;
  outcome: string | null;
  sms_sent_at: string | null;
  created_at: string;
};

function fmt(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function durationSec(started: string, ended: string | null): string {
  if (!ended) return "in flight";
  const s = (new Date(ended).getTime() - new Date(started).getTime()) / 1000;
  if (!Number.isFinite(s) || s < 0) return "—";
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}m ${r}s`;
}

function maskPhone(p: string | null): string {
  if (!p) return "anonymous";
  if (p.length < 4) return "•••";
  return `•••-•••-${p.slice(-4)}`;
}

function agentLabel(a: string | null): string {
  if (a === "deedy-vba") return "Deedy (Arrivia)";
  if (a === "andie-gvr") return "Andie (GVR)";
  return a ?? "—";
}

function outcomeColor(o: string | null): string {
  switch (o) {
    case "booked":
    case "completed":
      return "bg-emerald-500/10 text-emerald-300 border-emerald-500/20";
    case "transferred":
      return "bg-cyan-500/10 text-cyan-300 border-cyan-500/20";
    case "scheduler-link":
      return "bg-violet-500/10 text-violet-300 border-violet-500/20";
    case "no-show-risk":
      return "bg-amber-500/10 text-amber-300 border-amber-500/20";
    default:
      return "bg-neutral-800/50 text-neutral-400 border-neutral-700/40";
  }
}

async function load(room: string) {
  const sb = supabaseAdmin();
  const { data: call } = await sb
    .from("call_sessions")
    .select(
      "id, livekit_room_name, livekit_session_id, agent_name, direction, sip_caller_number, sip_callee_number, caller_name, started_at, ended_at, summary, summary_outcome, transcript, recording_url, recording_egress_id, llm_prompt_tokens, llm_completion_tokens, tts_characters, stt_audio_seconds, fallback_engaged, shutdown_reason, placement_slug",
    )
    .eq("livekit_room_name", room)
    .maybeSingle();

  if (!call) return null;
  const callTyped = call as CallRow;

  const [toolsRes, eventsRes, apptsRes, transfersRes] = await Promise.all([
    sb
      .from("tool_invocations")
      .select("id, tool_name, args, result, success, duration_ms, created_at")
      .eq("livekit_room_name", room)
      .order("created_at", { ascending: true }),
    sb
      .from("agent_events")
      .select("id, event_type, payload, created_at")
      .eq("livekit_room_name", room)
      .in("event_type", ["escalation", "error", "summary", "recording_started"])
      .order("created_at", { ascending: true }),
    sb
      .from("appointments")
      .select(
        "id, caller_name, caller_phone, property_name, tour_slot, tour_at, status, confirmation_id, deposit_path, on_property",
      )
      .eq("livekit_room_name", room)
      .order("tour_at", { ascending: true, nullsFirst: false }),
    sb
      .from("transfer_contexts")
      .select("id, reason, whisper_text, endpoint_kind, outcome, sms_sent_at, created_at")
      .eq("livekit_room_name", room)
      .order("created_at", { ascending: true }),
  ]);

  return {
    call: callTyped,
    tools: (toolsRes.data ?? []) as ToolRow[],
    events: (eventsRes.data ?? []) as EventRow[],
    appointments: (apptsRes.data ?? []) as AppointmentRow[],
    transfers: (transfersRes.data ?? []) as TransferRow[],
  };
}

export default async function CallDetailPage({
  params,
}: {
  params: Promise<{ room: string }>;
}) {
  const { room } = await params;
  const decoded = decodeURIComponent(room);
  const data = await load(decoded);
  if (!data) notFound();

  const { call, tools, events, appointments, transfers } = data;

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-8 py-12">
      {/* Back link */}
      <div>
        <Link
          href={"/dashboard/calls" as never}
          className="text-xs uppercase tracking-widest text-cyan-400 hover:text-cyan-300"
        >
          ← All calls
        </Link>
      </div>

      {/* Header card */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-neutral-500">Room</p>
            <h1 className="mt-1 text-2xl font-semibold text-neutral-100">
              {call.livekit_room_name}
            </h1>
            <p className="mt-1 text-sm text-neutral-400">
              {agentLabel(call.agent_name)} ·{" "}
              {call.direction ?? "—"} ·{" "}
              {call.caller_name ?? maskPhone(call.sip_caller_number)} ·{" "}
              {fmt(call.started_at)}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${outcomeColor(call.summary_outcome)}`}
            >
              {call.summary_outcome ?? "no outcome"}
            </span>
            <span className="text-xs text-neutral-500">
              Duration: {durationSec(call.started_at, call.ended_at)}
            </span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 border-t border-neutral-800 pt-4 text-xs sm:grid-cols-4">
          <Stat label="LLM prompt" value={call.llm_prompt_tokens ?? 0} />
          <Stat label="LLM completion" value={call.llm_completion_tokens ?? 0} />
          <Stat label="TTS chars" value={call.tts_characters ?? 0} />
          <Stat
            label="STT seconds"
            value={Math.round(Number(call.stt_audio_seconds ?? 0))}
          />
        </div>
      </div>

      {/* Summary card */}
      {call.summary && (
        <Card title="Summary">
          <p className="whitespace-pre-wrap text-sm text-neutral-200">{call.summary}</p>
        </Card>
      )}

      {/* Recording */}
      {call.recording_url && (
        <Card title="Recording">
          <audio
            controls
            src={call.recording_url}
            className="w-full"
            preload="metadata"
          />
          <p className="mt-2 text-xs text-neutral-500">
            Egress ID: {call.recording_egress_id ?? "—"}
          </p>
        </Card>
      )}

      {/* Transcript */}
      {call.transcript && (
        <Card title="Transcript">
          <TranscriptPanel
            transcript={call.transcript}
            agentLabel={agentLabel(call.agent_name)}
          />
        </Card>
      )}

      {/* Tool invocations */}
      {tools.length > 0 && (
        <Card title={`Tool invocations (${tools.length})`}>
          <div className="overflow-hidden rounded-md border border-neutral-800">
            <table className="w-full text-xs">
              <thead className="bg-neutral-900/80 text-neutral-500">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Tool</th>
                  <th className="px-3 py-2 text-left font-medium">Status</th>
                  <th className="px-3 py-2 text-left font-medium">Duration</th>
                  <th className="px-3 py-2 text-left font-medium">Args</th>
                  <th className="px-3 py-2 text-left font-medium">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/70">
                {tools.map((t) => (
                  <tr key={t.id}>
                    <td className="px-3 py-2 text-neutral-200">{t.tool_name}</td>
                    <td className="px-3 py-2">
                      {t.success === true ? (
                        <span className="text-emerald-400">ok</span>
                      ) : t.success === false ? (
                        <span className="text-rose-400">fail</span>
                      ) : (
                        <span className="text-neutral-500">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-neutral-400 tabular-nums">
                      {t.duration_ms ? `${t.duration_ms}ms` : "—"}
                    </td>
                    <td className="px-3 py-2 max-w-[260px] truncate text-neutral-400 font-mono">
                      {JSON.stringify(t.args ?? {})}
                    </td>
                    <td className="px-3 py-2 max-w-[260px] truncate text-neutral-400 font-mono">
                      {JSON.stringify(t.result ?? {})}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Appointments */}
      {appointments.length > 0 && (
        <Card title={`Appointments (${appointments.length})`}>
          <ul className="space-y-2 text-sm">
            {appointments.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between rounded-md border border-neutral-800 bg-neutral-900/40 px-3 py-2"
              >
                <div>
                  <p className="text-neutral-200">
                    {a.caller_name ?? "—"} · {a.property_name ?? "—"}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {a.tour_slot ?? fmt(a.tour_at)} ·{" "}
                    {a.on_property ? "on-property" : "off-property"} ·{" "}
                    deposit: {a.deposit_path ?? "—"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-300">
                    {a.status ?? "booked"}
                  </span>
                  {a.confirmation_id && (
                    <span className="font-mono text-xs text-neutral-400">
                      {a.confirmation_id}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Transfers */}
      {transfers.length > 0 && (
        <Card title="Transfers">
          <ul className="space-y-2 text-sm">
            {transfers.map((t) => (
              <li
                key={t.id}
                className="rounded-md border border-neutral-800 bg-neutral-900/40 px-3 py-2"
              >
                <p className="text-neutral-200">
                  {t.reason ?? "—"} → {t.endpoint_kind ?? "—"}
                </p>
                <p className="text-xs text-neutral-500">
                  outcome: {t.outcome ?? "—"} · sms:{" "}
                  {t.sms_sent_at ? fmt(t.sms_sent_at) : "—"}
                </p>
                {t.whisper_text && (
                  <p className="mt-1 text-xs text-neutral-400">
                    “{t.whisper_text}”
                  </p>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Raw events */}
      <RawEvents events={events} />
    </main>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-6">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-neutral-300">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-neutral-500">{label}</p>
      <p className="mt-0.5 text-lg font-semibold text-neutral-100 tabular-nums">
        {value}
      </p>
    </div>
  );
}
