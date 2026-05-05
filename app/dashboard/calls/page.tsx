// Calls list — Linear-style table of recent voice-agent sessions for
// the active agent. Joins call_sessions with tool_invocations (counted)
// + has-recording flag. Agent is locked by the top-of-page switcher;
// outcome and date range stay filterable inline.

import Link from "next/link";
import { supabaseAdmin } from "@/lib/clients/supabase-admin";
import { CallsFilters } from "./CallsFilters";
import { PageHeader } from "../components/agent/PageHeader";
import { RealtimeRefresh } from "../components/RealtimeRefresh";
import {
  resolveAgent,
  dbAgentName,
  agentMeta,
  type AgentSlug,
} from "@/lib/dashboard/agent";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type CallRow = {
  id: string;
  livekit_room_name: string | null;
  agent_name: string | null;
  direction: string | null;
  sip_caller_number: string | null;
  caller_name: string | null;
  started_at: string;
  ended_at: string | null;
  summary_outcome: string | null;
  recording_url: string | null;
  recording_egress_id: string | null;
};

type ToolCountRow = {
  livekit_room_name: string | null;
};

type SearchParams = {
  agent?: string;
  outcome?: string;
  from?: string;
  to?: string;
};

function fmtDateTime(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function durationSec(started: string, ended: string | null): string {
  if (!ended) return "—";
  const s = (new Date(ended).getTime() - new Date(started).getTime()) / 1000;
  if (!Number.isFinite(s) || s < 0) return "—";
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${r.toString().padStart(2, "0")}`;
}

function maskPhone(phone: string | null): string {
  if (!phone) return "anonymous";
  if (phone.length < 4) return "•••";
  return `•••-•••-${phone.slice(-4)}`;
}

function outcomeColor(outcome: string | null): string {
  switch (outcome) {
    case "booked":
      return "bg-emerald-500/10 text-emerald-300 border-emerald-500/20";
    case "transferred":
      return "bg-cyan-500/10 text-cyan-300 border-cyan-500/20";
    case "scheduler-link":
      return "bg-violet-500/10 text-violet-300 border-violet-500/20";
    case "no-show-risk":
      return "bg-amber-500/10 text-amber-300 border-amber-500/20";
    case "not-interested":
      return "bg-neutral-700/30 text-neutral-300 border-neutral-700/40";
    case "voicemail":
      return "bg-neutral-700/30 text-neutral-300 border-neutral-700/40";
    case "completed":
      return "bg-emerald-500/10 text-emerald-300 border-emerald-500/20";
    default:
      return "bg-neutral-800/50 text-neutral-400 border-neutral-700/40";
  }
}

async function loadCalls(agent: AgentSlug, sp: SearchParams) {
  const sb = supabaseAdmin();
  const dbAgent = dbAgentName(agent);
  let q = sb
    .from("call_sessions")
    .select(
      "id, livekit_room_name, agent_name, direction, sip_caller_number, caller_name, started_at, ended_at, summary_outcome, recording_url, recording_egress_id",
    )
    .eq("agent_name", dbAgent)
    .not("livekit_room_name", "is", null)
    .order("started_at", { ascending: false })
    .limit(100);

  if (sp.outcome && sp.outcome !== "all") q = q.eq("summary_outcome", sp.outcome);
  if (sp.from) q = q.gte("started_at", sp.from);
  if (sp.to) q = q.lte("started_at", sp.to);

  const { data: calls, error } = await q;
  if (error) {
    return { calls: [] as CallRow[], toolCounts: new Map<string, number>() };
  }
  const callsTyped = (calls ?? []) as CallRow[];

  const rooms = callsTyped
    .map((c) => c.livekit_room_name)
    .filter((r): r is string => !!r);
  const toolCounts = new Map<string, number>();
  if (rooms.length > 0) {
    const { data: toolRows } = await sb
      .from("tool_invocations")
      .select("livekit_room_name")
      .in("livekit_room_name", rooms);
    for (const row of (toolRows ?? []) as ToolCountRow[]) {
      const k = row.livekit_room_name;
      if (!k) continue;
      toolCounts.set(k, (toolCounts.get(k) ?? 0) + 1);
    }
  }

  return { calls: callsTyped, toolCounts };
}

export default async function CallsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const agent = resolveAgent(sp);
  const meta = agentMeta(agent);
  const { calls, toolCounts } = await loadCalls(agent, sp);

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-12">
      <RealtimeRefresh />
      <PageHeader
        eyebrow={`VOXARIS · ${meta.label.toUpperCase()} · CALLS`}
        title={`${meta.label}'s Recent Calls`}
        subtitle={`Last 100 voice sessions handled by ${meta.label} (${meta.sublabel}).`}
        agent={agent}
      />

      <CallsFilters initial={sp} />

      <div className="overflow-x-auto rounded-xl border border-neutral-800 bg-neutral-950/60">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-neutral-900/80 text-xs uppercase tracking-wider text-neutral-500">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Started</th>
              <th className="px-4 py-3 text-left font-medium">Direction</th>
              <th className="px-4 py-3 text-left font-medium">Caller</th>
              <th className="px-4 py-3 text-left font-medium">Duration</th>
              <th className="px-4 py-3 text-left font-medium">Outcome</th>
              <th className="px-4 py-3 text-left font-medium">Tools</th>
              <th className="px-4 py-3 text-left font-medium">Recording</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800/70">
            {calls.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-neutral-500">
                  No {meta.label} calls match these filters.
                </td>
              </tr>
            )}
            {calls.map((c) => {
              const room = c.livekit_room_name ?? "";
              const tools = room ? toolCounts.get(room) ?? 0 : 0;
              const hasRec = !!(c.recording_url || c.recording_egress_id);
              return (
                <tr
                  key={c.id}
                  className="group transition hover:bg-neutral-900/60"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/calls/${encodeURIComponent(room)}` as never}
                      className="text-neutral-200 group-hover:text-cyan-300"
                    >
                      {fmtDateTime(c.started_at)}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-neutral-400">
                    {c.direction ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-neutral-300">
                    {c.caller_name ?? maskPhone(c.sip_caller_number)}
                  </td>
                  <td className="px-4 py-3 text-neutral-400 tabular-nums">
                    {durationSec(c.started_at, c.ended_at)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${outcomeColor(c.summary_outcome)}`}
                    >
                      {c.summary_outcome ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-neutral-400 tabular-nums">{tools}</td>
                  <td className="px-4 py-3">
                    {hasRec ? (
                      <span className="text-emerald-400">●</span>
                    ) : (
                      <span className="text-neutral-600">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}
