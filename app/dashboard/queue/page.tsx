// /dashboard/queue — outbound batch dial queue management.
// CSV upload + live queue table + concurrency snapshot.
import { supabaseAdmin } from "@/lib/clients/supabase-admin";
import { QueueUploader } from "./QueueUploader";

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

async function loadQueue() {
  const sb = supabaseAdmin();

  const [rowsRes, statsRes, inFlightRes] = await Promise.all([
    sb
      .from("dial_queue")
      .select(
        "id, agent_name, phone_number, member_name, status, attempts, max_attempts, last_attempted_at, last_error, livekit_room_name, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(200),
    sb.from("dial_queue").select("agent_name, status"),
    sb
      .from("call_sessions")
      .select("agent_name", { count: "exact" })
      .is("ended_at", null),
  ]);

  const rows: QueueRow[] = (rowsRes.data ?? []) as QueueRow[];

  // Compute stats
  const stats = new Map<string, Map<string, number>>();
  for (const r of (statsRes.data ?? []) as { agent_name: string; status: string }[]) {
    const a = stats.get(r.agent_name) ?? new Map();
    a.set(r.status, (a.get(r.status) ?? 0) + 1);
    stats.set(r.agent_name, a);
  }

  const inFlight = new Map<string, number>();
  for (const r of (inFlightRes.data ?? []) as { agent_name: string }[]) {
    inFlight.set(r.agent_name, (inFlight.get(r.agent_name) ?? 0) + 1);
  }

  return { rows, stats, inFlight };
}

function StatTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-950/50 p-4">
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

export default async function QueuePage() {
  const data = await loadQueue();
  const andie = data.stats.get("andie-gvr") ?? new Map();
  const deedy = data.stats.get("deedy-vba") ?? new Map();

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-8 py-12">
      <header>
        <p className="text-xs uppercase tracking-widest text-cyan-400">VOXARIS · DIAL QUEUE</p>
        <h1 className="mt-2 text-3xl font-semibold text-neutral-100">Outbound queue</h1>
        <p className="text-sm text-neutral-400">
          Upload a list, the cron auto-dials in batches of 20 every 30 min,
          M–F 9am–9pm ET. Concurrency-capped at 20 live calls per agent.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-4">
        <StatTile
          label="Andie · pending"
          value={andie.get("pending") ?? 0}
          hint={`${data.inFlight.get("andie-gvr") ?? 0} in flight now`}
        />
        <StatTile
          label="Andie · completed"
          value={andie.get("completed") ?? 0}
        />
        <StatTile
          label="Deedy · pending"
          value={deedy.get("pending") ?? 0}
          hint={`${data.inFlight.get("deedy-vba") ?? 0} in flight now`}
        />
        <StatTile
          label="Deedy · completed"
          value={deedy.get("completed") ?? 0}
        />
      </section>

      <QueueUploader />

      <section className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950/60">
        <header className="flex items-center justify-between border-b border-neutral-800 bg-neutral-900/40 px-4 py-3">
          <h2 className="text-sm font-semibold text-neutral-100">Recent queue rows</h2>
          <span className="text-[10px] uppercase tracking-widest text-neutral-500">
            {data.rows.length} of last 200
          </span>
        </header>
        <table className="w-full text-sm">
          <thead className="bg-neutral-900/30 text-left text-[10px] uppercase tracking-widest text-neutral-500">
            <tr>
              <th className="px-4 py-2 font-medium">Created</th>
              <th className="px-4 py-2 font-medium">Agent</th>
              <th className="px-4 py-2 font-medium">Recipient</th>
              <th className="px-4 py-2 font-medium">Phone</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Attempts</th>
              <th className="px-4 py-2 font-medium">Last attempt</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-900">
            {data.rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-neutral-500">
                  Queue is empty. Add rows above to get started.
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
                <td className="px-4 py-3 text-neutral-200">
                  {r.agent_name === "andie-gvr" ? "Andie" : "Deedy"}
                </td>
                <td className="px-4 py-3 text-neutral-300">{r.member_name ?? "—"}</td>
                <td className="px-4 py-3 font-mono text-xs text-neutral-400">
                  {maskPhone(r.phone_number)}
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
      </section>
    </main>
  );
}
