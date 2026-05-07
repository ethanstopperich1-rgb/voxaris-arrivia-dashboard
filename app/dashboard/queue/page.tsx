// /dashboard/queue — outbound batch dial queue management, scoped to
// the active agent. CSV upload + queue table + concurrency snapshot.

import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/clients/supabase-admin";
import { QueueUploader } from "./QueueUploader";
import { TriggerNowButton } from "./TriggerNowButton";
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

type QueueRow = {
  id: string;
  agent_name: string;
  phone_number: string;
  member_name: string | null;
  status: string;
  attempts: number;
  max_attempts: number;
  last_attempted_at: string | null;
  last_error: string | null;
  livekit_room_name: string | null;
  ai_score: number | null;
  ai_score_reason: string | null;
  created_at: string;
};

function maskPhone(p: string | null): string {
  if (!p) return "—";
  if (p.length < 4) return "•••";
  return `•••-•••-${p.slice(-4)}`;
}

function statusBadge(status: string): string {
  switch (status) {
    case "pending":
      return "bg-amber-500/10 text-amber-300 border-amber-500/20";
    case "dialing":
      return "bg-cyan-500/10 text-cyan-300 border-cyan-500/20";
    case "completed":
      return "bg-emerald-500/10 text-emerald-300 border-emerald-500/20";
    case "failed":
      return "bg-red-500/10 text-red-300 border-red-500/20";
    case "dnc":
      return "bg-rose-700/30 text-rose-200 border-rose-700/40";
    case "skipped":
      return "bg-neutral-700/30 text-neutral-300 border-neutral-700/40";
    default:
      return "bg-neutral-800/50 text-neutral-400 border-neutral-700/40";
  }
}

async function loadQueue(agent: AgentSlug) {
  const sb = supabaseAdmin();
  const dbAgent = dbAgentName(agent);

  const [rowsRes, statsRes, inFlightRes] = await Promise.all([
    sb
      .from("dial_queue")
      .select(
        "id, agent_name, phone_number, member_name, status, attempts, max_attempts, last_attempted_at, last_error, livekit_room_name, ai_score, ai_score_reason, created_at",
      )
      .eq("agent_name", dbAgent)
      .order("created_at", { ascending: false })
      .limit(200),
    sb
      .from("dial_queue")
      .select("status")
      .eq("agent_name", dbAgent),
    sb
      .from("call_sessions")
      .select("agent_name", { count: "exact" })
      .eq("agent_name", dbAgent)
      .is("ended_at", null),
  ]);

  const rows: QueueRow[] = (rowsRes.data ?? []) as QueueRow[];

  const stats = new Map<string, number>();
  for (const r of (statsRes.data ?? []) as { status: string }[]) {
    stats.set(r.status, (stats.get(r.status) ?? 0) + 1);
  }

  const inFlight = (inFlightRes.data ?? []).length;
  return { rows, stats, inFlight };
}

function StatTile({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string | number;
  hint?: string;
  accent?: "cyan" | "violet";
}) {
  const accentClass =
    accent === "violet"
      ? "border-violet-500/30 bg-violet-500/[0.04]"
      : accent === "cyan"
        ? "border-cyan-500/30 bg-cyan-500/[0.04]"
        : "border-neutral-800 bg-neutral-950/50";
  return (
    <div className={`rounded-2xl border p-4 ${accentClass}`}>
      <p className="text-[10px] font-medium uppercase tracking-widest text-neutral-500">
        {label}
      </p>
      <p className="mt-1 text-3xl font-semibold tabular-nums text-neutral-100">
        {value}
      </p>
      {hint && <p className="mt-1 text-[11px] text-neutral-500">{hint}</p>}
    </div>
  );
}

export default async function QueuePage({
  searchParams,
}: {
  searchParams: Promise<{ agent?: string }>;
}) {
  const sp = await searchParams;
  const agent = resolveAgent(sp);

  // Dial queue is Andie-only by design (Deedy is inbound-only — QR-scan
  // guests dial in, she never cold-calls). Any link to /queue without
  // ?agent=andie quietly redirects.
  if (agent !== "andie") {
    redirect("/dashboard/queue?agent=andie");
  }

  const meta = agentMeta("andie");
  const data = await loadQueue("andie");

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-12">
      <RealtimeRefresh />
      <PageHeader
        eyebrow="VOXARIS · ANDIE · DIAL QUEUE"
        title={`${meta.label}'s outbound queue`}
        subtitle={`Upload a list, the cron auto-dials ${meta.label} every minute, M–F 9am–6pm ET. Concurrency-capped at 100 live calls.`}
        agent="andie"
        agentsOnly={["andie"]}
      />

      <TriggerNowButton />


      <section className="grid gap-4 md:grid-cols-4">
        <StatTile
          label="Pending"
          value={data.stats.get("pending") ?? 0}
          hint={`${data.inFlight} in flight now`}
          accent={meta.accent}
        />
        <StatTile
          label="Dialing"
          value={data.stats.get("dialing") ?? 0}
        />
        <StatTile
          label="Completed"
          value={data.stats.get("completed") ?? 0}
        />
        <StatTile
          label="Failed / DNC"
          value={
            (data.stats.get("failed") ?? 0) + (data.stats.get("dnc") ?? 0)
          }
        />
      </section>

      <QueueUploader />

      <section className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950/60">
        <header className="flex items-center justify-between border-b border-neutral-800 bg-neutral-900/40 px-4 py-3">
          <h2 className="text-sm font-semibold text-neutral-100">
            {meta.label}'s queue rows
          </h2>
          <span className="text-[10px] uppercase tracking-widest text-neutral-500">
            {data.rows.length} of last 200
          </span>
        </header>
        <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-neutral-900/30 text-left text-[10px] uppercase tracking-widest text-neutral-500">
            <tr>
              <th className="px-4 py-2 font-medium">Created</th>
              <th className="px-4 py-2 font-medium">Recipient</th>
              <th className="px-4 py-2 font-medium">Phone</th>
              <th className="px-4 py-2 font-medium">AI Score</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Attempts</th>
              <th className="px-4 py-2 font-medium">Last attempt</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-900">
            {data.rows.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-12 text-center text-neutral-500"
                >
                  No {meta.label} queue rows yet. Upload a list above to get
                  started.
                </td>
              </tr>
            )}
            {data.rows.map((r) => (
              <tr key={r.id} className="transition hover:bg-neutral-900/40">
                <td className="px-4 py-3 text-xs text-neutral-400">
                  {new Date(r.created_at).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </td>
                <td className="px-4 py-3 text-neutral-300">
                  {r.member_name ?? "—"}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-neutral-400">
                  {maskPhone(r.phone_number)}
                </td>
                <td className="px-4 py-3 text-xs">
                  {r.ai_score == null ? (
                    <span className="text-neutral-600">unscored</span>
                  ) : (
                    <span
                      title={r.ai_score_reason ?? ""}
                      className={
                        r.ai_score >= 70
                          ? "font-semibold text-emerald-400"
                          : r.ai_score >= 40
                            ? "text-amber-300"
                            : "text-neutral-500"
                      }
                    >
                      {r.ai_score}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${statusBadge(
                      r.status,
                    )}`}
                  >
                    {r.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-neutral-400 tabular-nums">
                  {r.attempts}/{r.max_attempts}
                </td>
                <td className="px-4 py-3 text-xs text-neutral-500">
                  {r.last_attempted_at
                    ? new Date(r.last_attempted_at).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </section>
    </main>
  );
}
