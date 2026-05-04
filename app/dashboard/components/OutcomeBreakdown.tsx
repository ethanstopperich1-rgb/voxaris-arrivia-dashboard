// Outcome breakdown — the business-impact panel.
// Splits Deedy + Andie outcomes into stacked bar segments.
// Highlights the conversion KPI (booking rate / transfer rate) up front.
type OutcomeRow = { agent_name: string | null; outcome: string | null };

const DEEDY_BUCKETS = [
  { key: "booked", label: "Booked", className: "bg-emerald-500" },
  { key: "transferred", label: "Transferred", className: "bg-cyan-500" },
  { key: "scheduler-link", label: "Scheduler link", className: "bg-violet-500" },
  { key: "no-show-risk", label: "No-show risk", className: "bg-amber-500" },
  { key: "not-eligible", label: "Not eligible", className: "bg-neutral-600" },
  { key: "voicemail", label: "Voicemail", className: "bg-neutral-700" },
  { key: "completed", label: "Completed", className: "bg-neutral-500" },
] as const;

const ANDIE_BUCKETS = [
  { key: "transferred", label: "Transferred", className: "bg-cyan-500" },
  { key: "scheduler-link", label: "Scheduler link", className: "bg-violet-500" },
  { key: "completed", label: "Completed", className: "bg-emerald-500" },
  { key: "not-interested", label: "Not interested", className: "bg-neutral-600" },
  { key: "voicemail", label: "Voicemail", className: "bg-neutral-700" },
  { key: "wrong-person", label: "Wrong person", className: "bg-neutral-700" },
  { key: "dnc", label: "DNC", className: "bg-rose-700" },
] as const;

function tally(rows: OutcomeRow[], agent: string) {
  const tallies = new Map<string, number>();
  let total = 0;
  for (const r of rows) {
    if (r.agent_name !== agent) continue;
    if (!r.outcome) continue;
    tallies.set(r.outcome, (tallies.get(r.outcome) ?? 0) + 1);
    total += 1;
  }
  return { tallies, total };
}

function pct(n: number, d: number): string {
  if (d === 0) return "—";
  return `${Math.round((n / d) * 100)}%`;
}

function Card({
  label,
  agent,
  rows,
  buckets,
  primaryKey,
  primaryLabel,
}: {
  label: string;
  agent: string;
  rows: OutcomeRow[];
  buckets: readonly { key: string; label: string; className: string }[];
  primaryKey: string;
  primaryLabel: string;
}) {
  const { tallies, total } = tally(rows, agent);
  const primary = tallies.get(primaryKey) ?? 0;

  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950/60 p-5">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-neutral-100">{label}</h3>
        <span className="text-[10px] uppercase tracking-widest text-neutral-500">
          {total} {total === 1 ? "call" : "calls"}
        </span>
      </div>

      {/* Headline KPI */}
      <div className="mt-4">
        <p className="text-[10px] font-medium uppercase tracking-widest text-cyan-300/80">
          {primaryLabel}
        </p>
        <p className="mt-1 text-4xl font-semibold tabular-nums text-neutral-100">
          {pct(primary, total)}
          <span className="ml-2 text-sm font-normal text-neutral-500">
            ({primary}/{total})
          </span>
        </p>
      </div>

      {/* Stacked bar */}
      {total > 0 && (
        <div className="mt-5">
          <div className="flex h-2 w-full overflow-hidden rounded-full bg-neutral-900">
            {buckets.map((b) => {
              const v = tallies.get(b.key) ?? 0;
              if (v === 0) return null;
              const w = (v / total) * 100;
              return (
                <span
                  key={b.key}
                  className={b.className}
                  style={{ width: `${w}%` }}
                  title={`${b.label}: ${v} (${Math.round(w)}%)`}
                />
              );
            })}
          </div>

          {/* Legend */}
          <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
            {buckets.map((b) => {
              const v = tallies.get(b.key) ?? 0;
              if (v === 0) return null;
              return (
                <li key={b.key} className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-neutral-300">
                    <span className={`h-2 w-2 rounded-full ${b.className}`} />
                    {b.label}
                  </span>
                  <span className="tabular-nums text-neutral-500">{v}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {total === 0 && (
        <p className="mt-6 text-sm text-neutral-500">
          No completed calls yet — outcomes appear once calls hang up and the
          summary lands.
        </p>
      )}
    </div>
  );
}

export function OutcomeBreakdown({ rows }: { rows: OutcomeRow[] }) {
  return (
    <section className="grid gap-5 lg:grid-cols-2">
      <Card
        label="Deedy · Booking flow"
        agent="deedy-vba"
        rows={rows}
        buckets={DEEDY_BUCKETS}
        primaryKey="booked"
        primaryLabel="Booking rate"
      />
      <Card
        label="Andie · GVR re-engagement"
        agent="andie-gvr"
        rows={rows}
        buckets={ANDIE_BUCKETS}
        primaryKey="transferred"
        primaryLabel="Transfer rate"
      />
    </section>
  );
}
