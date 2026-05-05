import { supabaseAdmin } from "@/lib/clients/supabase-admin";
import { LatencyCards } from "../components/LatencyCards";
import { TransferPanel } from "../components/TransferPanel";
import { AtAGlanceCounters } from "../components/AtAGlanceCounters";
import { AgentSplit } from "../components/AgentSplit";
import { ToolSuccessTable } from "../components/ToolSuccessTable";
import { RecentCallsTable } from "../components/RecentCallsTable";
import { FallbackPanel } from "../components/FallbackPanel";
import { RealtimeRefresh } from "../components/RealtimeRefresh";
import { TodayAppointmentsCard } from "../components/TodayAppointmentsCard";
import { TopPlacementsCard } from "../components/TopPlacementsCard";
import { InFlightCalls } from "../components/InFlightCalls";
import { OutcomeBreakdown } from "../components/OutcomeBreakdown";
import { CostPerCallTile } from "../components/CostPerCallTile";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type CallSessionRow = {
  id: string;
  livekit_room_name: string | null;
  agent_name: string | null;
  direction: string | null;
  sip_caller_number: string | null;
  caller_name: string | null;
  started_at: string;
  ended_at: string | null;
  outcome: string | null;
  summary_outcome: string | null;
  transfer_success: boolean | null;
  llm_prompt_tokens: number | null;
  llm_completion_tokens: number | null;
  tts_characters: number | null;
  stt_audio_seconds: number | null;
  fallback_engaged: Record<string, number> | null;
};

type ToolRow = {
  tool_name: string;
  success: boolean | null;
  duration_ms: number | null;
};

type AgentEventRow = {
  event_type: string;
  payload: Record<string, unknown> | null;
};

type TransferRow = {
  id: string;
  retell_call_id: string;
  reason: string;
  whisper_text: string;
  endpoint_kind: string;
  outcome: string | null;
  sms_sent_at: string | null;
  created_at: string;
};

async function loadDashboard() {
  const sb = supabaseAdmin();
  const since = new Date(Date.now() - 6 * 3600 * 1000).toISOString();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart.getTime() + 86400 * 1000);
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400 * 1000).toISOString();

  const [callsRes, toolsRes, eventsRes, transfersRes, apptsRes, scansRes] = await Promise.all([
    sb
      .from("call_sessions")
      .select(
        "id, livekit_room_name, agent_name, direction, sip_caller_number, caller_name, started_at, ended_at, outcome, summary_outcome, transfer_success, llm_prompt_tokens, llm_completion_tokens, tts_characters, stt_audio_seconds, fallback_engaged",
      )
      .gte("started_at", since)
      .not("livekit_room_name", "is", null)
      .order("started_at", { ascending: false })
      .limit(50),
    sb
      .from("tool_invocations")
      .select("tool_name, success, duration_ms")
      .gte("created_at", since)
      .limit(5000),
    sb
      .from("agent_events")
      .select("event_type, payload")
      .gte("created_at", since)
      .eq("event_type", "turn_metrics")
      .limit(5000),
    sb
      .from("transfer_contexts")
      .select("*")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(10),
    sb
      .from("appointments")
      .select("id, livekit_room_name, caller_name, property_name, tour_slot, tour_at, status")
      .gte("tour_at", todayStart.toISOString())
      .lte("tour_at", todayEnd.toISOString())
      .order("tour_at", { ascending: true }),
    sb
      .from("placement_scans")
      .select("placement_slug")
      .gte("scanned_at", sevenDaysAgo),
  ]);

  const calls: CallSessionRow[] = (callsRes.data ?? []) as CallSessionRow[];
  const tools: ToolRow[] = (toolsRes.data ?? []) as ToolRow[];
  const events: AgentEventRow[] = (eventsRes.data ?? []) as AgentEventRow[];
  const transfers: TransferRow[] = (transfersRes.data ?? []) as TransferRow[];

  // ── At-a-glance counters
  const callsLast6h = calls.length;
  // Stale guard: if ended_at never landed but started >15 min ago,
  // count it as ended for the in-flight KPI (room_ended webhook drops).
  const liveCutoff = Date.now() - 15 * 60 * 1000;
  const callsInFlight = calls.filter(
    (c) => c.ended_at == null && new Date(c.started_at).getTime() >= liveCutoff,
  ).length;
  const completedDurations = calls
    .filter((c) => c.ended_at != null)
    .map((c) => (new Date(c.ended_at as string).getTime() - new Date(c.started_at).getTime()) / 1000)
    .filter((s) => s > 0);
  const avgDurationSeconds =
    completedDurations.length > 0
      ? completedDurations.reduce((a, b) => a + b, 0) / completedDurations.length
      : 0;
  const totalLlmTokens = calls.reduce(
    (acc, c) => acc + Number(c.llm_prompt_tokens ?? 0) + Number(c.llm_completion_tokens ?? 0),
    0,
  );

  // ── Per-agent split
  const agentMap = new Map<
    string,
    { agent_name: string; calls: number; llm_tokens: number; tts_characters: number; stt_audio_seconds: number }
  >();
  for (const c of calls) {
    const id = c.agent_name ?? "unknown";
    const cur = agentMap.get(id) ?? {
      agent_name: id,
      calls: 0,
      llm_tokens: 0,
      tts_characters: 0,
      stt_audio_seconds: 0,
    };
    cur.calls += 1;
    cur.llm_tokens += Number(c.llm_prompt_tokens ?? 0) + Number(c.llm_completion_tokens ?? 0);
    cur.tts_characters += Number(c.tts_characters ?? 0);
    cur.stt_audio_seconds += Number(c.stt_audio_seconds ?? 0);
    agentMap.set(id, cur);
  }
  const agentTotals = Array.from(agentMap.values());

  // ── Tool stats
  const toolMap = new Map<
    string,
    { tool_name: string; calls: number; successes: number; failures: number; total_ms: number; timed: number }
  >();
  for (const t of tools) {
    const cur = toolMap.get(t.tool_name) ?? {
      tool_name: t.tool_name,
      calls: 0,
      successes: 0,
      failures: 0,
      total_ms: 0,
      timed: 0,
    };
    cur.calls += 1;
    if (t.success === true) cur.successes += 1;
    else if (t.success === false) cur.failures += 1;
    if (typeof t.duration_ms === "number") {
      cur.total_ms += t.duration_ms;
      cur.timed += 1;
    }
    toolMap.set(t.tool_name, cur);
  }
  const toolStats = Array.from(toolMap.values()).map((s) => ({
    tool_name: s.tool_name,
    calls: s.calls,
    successes: s.successes,
    failures: s.failures,
    avg_duration_ms: s.timed > 0 ? s.total_ms / s.timed : 0,
  }));

  // ── Turn-level latency from agent_events.payload.turn_total_ms
  const turnSamples = events
    .map((e) => {
      const v = e.payload?.["turn_total_ms"];
      if (typeof v === "number") return { turn_total_ms: v };
      const n = typeof v === "string" ? Number(v) : NaN;
      return { turn_total_ms: Number.isFinite(n) ? n : null };
    })
    .filter((x): x is { turn_total_ms: number } => x.turn_total_ms != null);

  // ── Fallback totals
  const fallbackTotals = { stt: 0, llm: 0, tts: 0 };
  for (const c of calls) {
    const fb = c.fallback_engaged ?? {};
    fallbackTotals.stt += Number(fb["stt"] ?? 0);
    fallbackTotals.llm += Number(fb["llm"] ?? 0);
    fallbackTotals.tts += Number(fb["tts"] ?? 0);
  }

  // ── Today's appointments
  type Appt = {
    id: string;
    livekit_room_name: string | null;
    caller_name: string | null;
    property_name: string | null;
    tour_slot: string | null;
    tour_at: string | null;
    status: string | null;
  };
  const todaysAppointments = ((apptsRes.data ?? []) as Appt[]).filter(
    (a) => (a.status ?? "booked") !== "cancelled",
  );

  // ── Top placements (by scans last 7d)
  const scanRows = (scansRes.data ?? []) as Array<{ placement_slug: string | null }>;
  const scanCounts = new Map<string, number>();
  for (const r of scanRows) {
    if (!r.placement_slug) continue;
    scanCounts.set(r.placement_slug, (scanCounts.get(r.placement_slug) ?? 0) + 1);
  }
  const topPlacements = Array.from(scanCounts.entries())
    .map(([slug, scans]) => ({ slug, scans }))
    .sort((a, b) => b.scans - a.scans)
    .slice(0, 5);

  return {
    counters: { callsLast6h, callsInFlight, avgDurationSeconds, totalLlmTokens },
    agentTotals,
    toolStats,
    calls,
    turns: turnSamples,
    fallbackTotals,
    transfers,
    todaysAppointments,
    topPlacements,
  };
}

export default async function DashboardPage() {
  const data = await loadDashboard();
  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-12">
      <RealtimeRefresh />
      <header>
        <p className="text-xs uppercase tracking-widest text-cyan-400">VOXARIS · ENGINEERING OPS</p>
        <h1 className="mt-2 text-3xl font-semibold">Engineering Operations</h1>
        <p className="text-sm text-neutral-400">
          Internal view · last 6 hours · Deedy (Arrivia) + Andie (GVR) · auto-refreshing.
        </p>
        <p className="mt-2 text-xs text-neutral-500">
          Looking for the executive view? <a href="/dashboard" className="text-cyan-400 underline-offset-2 hover:underline">Go to /dashboard</a>.
        </p>
      </header>

      <InFlightCalls calls={data.calls} />

      <AtAGlanceCounters counters={data.counters} />

      <OutcomeBreakdown
        rows={data.calls.map((c) => ({
          agent_name: c.agent_name,
          outcome: c.summary_outcome ?? c.outcome,
        }))}
      />

      <section className="grid gap-8 lg:grid-cols-3">
        <CostPerCallTile
          totals={{
            callsCompleted: data.calls.filter((c) => c.ended_at !== null).length,
            llmIn: data.calls.reduce((a, c) => a + Number(c.llm_prompt_tokens ?? 0), 0),
            llmOut: data.calls.reduce((a, c) => a + Number(c.llm_completion_tokens ?? 0), 0),
            ttsChars: data.calls.reduce((a, c) => a + Number(c.tts_characters ?? 0), 0),
            sttSeconds: data.calls.reduce((a, c) => a + Number(c.stt_audio_seconds ?? 0), 0),
            totalDurationSeconds: data.calls
              .filter((c) => c.ended_at !== null)
              .reduce(
                (a, c) =>
                  a +
                  Math.max(
                    0,
                    (new Date(c.ended_at as string).getTime() -
                      new Date(c.started_at).getTime()) /
                      1000,
                  ),
                0,
              ),
          }}
        />
        <div className="lg:col-span-2">
          <LatencyCards turns={data.turns} />
        </div>
      </section>

      <section className="grid gap-8 lg:grid-cols-2">
        <AgentSplit totals={data.agentTotals} />
        <FallbackPanel totals={data.fallbackTotals} />
      </section>

      <section className="grid gap-8 lg:grid-cols-2">
        <TodayAppointmentsCard appointments={data.todaysAppointments} />
        <TopPlacementsCard placements={data.topPlacements} />
      </section>

      <section className="grid gap-8 lg:grid-cols-2">
        <ToolSuccessTable stats={data.toolStats} />
        <TransferPanel transfers={data.transfers} />
      </section>

      <RecentCallsTable calls={data.calls} />
    </main>
  );
}
