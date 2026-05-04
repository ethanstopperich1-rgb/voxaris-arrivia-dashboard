// Conversion funnel. Each agent has different stages:
//
//   Deedy:  Calls → 18+ confirmed → Qualified → Slot picked → Booked
//   Andie:  Calls → Engaged → Temp ≥8 → Transferred OR Link sent
//
// Bars sized to the top stage, color-coded by accent. Drop-off
// percentages between stages shown inline.

import { cn } from "@/lib/utils";

export type FunnelStage = {
  label: string;
  value: number;
  hint?: string;
};

type Props = {
  stages: FunnelStage[];
  accent: "cyan" | "violet";
  title: string;
};

export function ConversionFunnel({ stages, accent, title }: Props) {
  const top = stages[0]?.value || 1;
  const bar =
    accent === "cyan"
      ? "from-cyan-400/80 to-cyan-500/40"
      : "from-violet-400/80 to-fuchsia-500/40";
  const accentText = accent === "cyan" ? "text-cyan-300" : "text-violet-300";

  return (
    <section className="rounded-2xl border border-neutral-800 bg-neutral-950/60 p-5">
      <header className="mb-4 flex items-baseline justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-widest text-neutral-500">
            Conversion Funnel
          </p>
          <h2 className={cn("mt-1 text-base font-semibold", accentText)}>
            {title}
          </h2>
        </div>
        <p className="text-[11px] text-neutral-500">last 30 days</p>
      </header>
      <ol className="flex flex-col gap-2">
        {stages.map((s, i) => {
          const widthPct = top > 0 ? Math.max(8, (s.value / top) * 100) : 0;
          const prev = i === 0 ? null : stages[i - 1];
          const conversionFromPrev =
            prev == null
              ? null
              : prev.value > 0
                ? Math.round((s.value / prev.value) * 100)
                : 0;
          return (
            <li key={s.label} className="space-y-1">
              <div className="flex items-baseline justify-between gap-3 text-xs">
                <span className="font-medium text-neutral-300">
                  {s.label}
                </span>
                <span className="flex items-baseline gap-2">
                  <span className="font-semibold tabular-nums text-neutral-100">
                    {s.value.toLocaleString()}
                  </span>
                  {conversionFromPrev !== null && (
                    <span
                      className={cn(
                        "text-[10px] font-medium",
                        conversionFromPrev >= 50
                          ? "text-emerald-400"
                          : conversionFromPrev >= 25
                            ? "text-amber-400"
                            : "text-rose-400",
                      )}
                    >
                      ↳ {conversionFromPrev}% pass-through
                    </span>
                  )}
                </span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded bg-neutral-900/60">
                <div
                  className={cn("h-full rounded bg-gradient-to-r", bar)}
                  style={{ width: `${widthPct}%` }}
                />
              </div>
              {s.hint && (
                <p className="text-[10px] text-neutral-500">{s.hint}</p>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
