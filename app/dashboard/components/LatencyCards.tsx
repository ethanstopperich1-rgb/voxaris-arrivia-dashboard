type Row = { event: string; duration_ms: number | null };

function pct(values: number[], p: number): number {
  if (!values.length) return 0;
  const s = [...values].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(p * s.length))] ?? 0;
}

function buckets(rows: Row[]): Record<string, number[]> {
  const out: Record<string, number[]> = {};
  for (const r of rows) {
    if (r.duration_ms == null) continue;
    (out[r.event] ??= []).push(r.duration_ms);
  }
  return out;
}

const HEADLINE_EVENTS = ["router_end", "rerank_end", "verifier_end", "specialist_end"] as const;

export function LatencyCards({ latencies }: { latencies: Row[] }) {
  const b = buckets(latencies);
  return (
    <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {HEADLINE_EVENTS.map((ev) => {
        const v = b[ev] ?? [];
        const p95 = pct(v, 0.95);
        const ok = p95 <= (ev === "verifier_end" ? 450 : 800);
        return (
          <div
            key={ev}
            className={`rounded-lg border p-4 ${ok ? "border-emerald-700 bg-emerald-950/30" : "border-amber-700 bg-amber-950/30"}`}
          >
            <p className="text-xs uppercase tracking-wider text-neutral-400">{ev.replace("_end", "")}</p>
            <p className="mt-2 text-2xl font-semibold">{p95}<span className="text-sm text-neutral-400">ms p95</span></p>
            <p className="text-xs text-neutral-500">n={v.length} · p50 {pct(v, 0.5)} · p99 {pct(v, 0.99)}</p>
          </div>
        );
      })}
    </section>
  );
}
