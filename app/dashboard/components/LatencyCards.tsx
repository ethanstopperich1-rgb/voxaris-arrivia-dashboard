type TurnRow = { turn_total_ms: number | null };

function pct(values: number[], p: number): number {
  if (!values.length) return 0;
  const s = [...values].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(p * s.length))] ?? 0;
}

/**
 * Per-turn latency: the workers emit a `turn_metrics` event with
 * `payload.turn_total_ms` (and per-stage breakdowns) at the end of every
 * agent turn. We render p50/p95/p99 across the window. Anything above 800ms
 * p95 is amber per the project's response-budget target.
 */
export function LatencyCards({ turns }: { turns: TurnRow[] }) {
  const values = turns
    .map((t) => t.turn_total_ms)
    .filter((v): v is number => typeof v === "number" && Number.isFinite(v));

  const p50 = pct(values, 0.5);
  const p95 = pct(values, 0.95);
  const p99 = pct(values, 0.99);
  const ok = p95 > 0 && p95 <= 800;

  const cards: { label: string; value: number; budget: number | null }[] = [
    { label: "Turn p50", value: p50, budget: 600 },
    { label: "Turn p95", value: p95, budget: 800 },
    { label: "Turn p99", value: p99, budget: 1500 },
    { label: "Samples", value: values.length, budget: null },
  ];

  return (
    <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {cards.map((c) => {
        const cardOk =
          c.budget == null ? true : c.value > 0 && c.value <= c.budget;
        const tone = cardOk
          ? "border-emerald-700 bg-emerald-950/30"
          : "border-amber-700 bg-amber-950/30";
        return (
          <div key={c.label} className={`rounded-lg border p-4 ${tone}`}>
            <p className="text-xs uppercase tracking-wider text-neutral-400">{c.label}</p>
            <p className="mt-2 text-2xl font-semibold">
              {c.value}
              {c.budget != null ? <span className="text-sm text-neutral-400">ms</span> : null}
            </p>
            <p className="text-xs text-neutral-500">
              {c.budget != null ? `budget ${c.budget}ms` : `n=${values.length}`}
              {c.label === "Turn p95" ? ` · ${ok ? "on-target" : "over"}` : ""}
            </p>
          </div>
        );
      })}
    </section>
  );
}
