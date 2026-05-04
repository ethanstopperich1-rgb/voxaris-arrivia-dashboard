// 4-card KPI hero. Agent-agnostic — the parent decides the metric
// labels (Deedy → "Bookings"; Andie → "Transfers + Links"). Built for
// the executive at a glance. No engineering noise.

import { cn } from "@/lib/utils";

type Card = {
  label: string;
  value: number;
  delta: number;
  hint: string;
};

type Props = {
  cards: Card[];
  liveLabel: string;
  liveCount: number;
  accent: "cyan" | "violet";
};

function Delta({ value }: { value: number }) {
  if (value === 0) {
    return <span className="text-[11px] font-medium text-neutral-500">flat</span>;
  }
  const positive = value > 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[11px] font-medium",
        positive ? "text-emerald-400" : "text-rose-400",
      )}
    >
      {positive ? "▲" : "▼"} {Math.abs(value)}
    </span>
  );
}

export function KpiHero({ cards, liveLabel, liveCount, accent }: Props) {
  const accentRing =
    accent === "cyan"
      ? "border-cyan-500/30 bg-cyan-500/[0.04]"
      : "border-violet-500/30 bg-violet-500/[0.04]";
  const accentText = accent === "cyan" ? "text-cyan-300/80" : "text-violet-300/80";

  return (
    <section className="grid gap-4 lg:grid-cols-4">
      {cards.map((c) => (
        <div
          key={c.label}
          className="relative overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950/80 p-5"
        >
          <p className="text-[11px] font-medium uppercase tracking-widest text-neutral-500">
            {c.label}
          </p>
          <p className="mt-2 text-4xl font-semibold tabular-nums text-neutral-100">
            {c.value.toLocaleString()}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <Delta value={c.delta} />
            <span className="text-[11px] text-neutral-500">{c.hint}</span>
          </div>
        </div>
      ))}
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl border p-5",
          accentRing,
        )}
      >
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "inline-block h-2 w-2 rounded-full",
              liveCount > 0
                ? "animate-pulse bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.7)]"
                : "bg-neutral-600",
            )}
          />
          <p
            className={cn(
              "text-[11px] font-medium uppercase tracking-widest",
              accentText,
            )}
          >
            {liveLabel}
          </p>
        </div>
        <p className="mt-2 text-4xl font-semibold tabular-nums text-neutral-100">
          {liveCount}
        </p>
        <p className="mt-2 text-[11px] text-neutral-500">
          {liveCount === 1 ? "call in progress" : "calls in progress"}
        </p>
      </div>
    </section>
  );
}
