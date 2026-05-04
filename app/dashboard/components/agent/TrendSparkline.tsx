// 30-day sparkline of the agent's primary outcome. Single SVG, no
// chart library. Bars + value-on-hover + cumulative total.

import { cn } from "@/lib/utils";

type Props = {
  series: number[]; // length 30, oldest first
  label: string;
  total: number;
  accent: "cyan" | "violet";
};

export function TrendSparkline({ series, label, total, accent }: Props) {
  const max = Math.max(1, ...series);
  const w = 320;
  const h = 80;
  const barW = w / series.length;
  const fill = accent === "cyan" ? "fill-cyan-400/80" : "fill-violet-400/80";
  const accentText = accent === "cyan" ? "text-cyan-300" : "text-violet-300";

  return (
    <section className="rounded-2xl border border-neutral-800 bg-neutral-950/60 p-5">
      <header className="mb-4 flex items-baseline justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-widest text-neutral-500">
            30-Day Trend
          </p>
          <h2 className={cn("mt-1 text-base font-semibold", accentText)}>
            {label}
          </h2>
        </div>
        <p className="text-2xl font-semibold tabular-nums text-neutral-100">
          {total.toLocaleString()}
          <span className="ml-1 text-[10px] font-normal text-neutral-500">total</span>
        </p>
      </header>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="h-20 w-full"
        aria-label="30 day trend"
      >
        {series.map((v, i) => {
          const barH = max > 0 ? (v / max) * (h - 4) : 0;
          return (
            <rect
              key={i}
              x={i * barW + 1}
              y={h - barH}
              width={barW - 2}
              height={Math.max(1, barH)}
              rx={1}
              className={fill}
            />
          );
        })}
      </svg>
      <div className="mt-2 flex justify-between text-[10px] text-neutral-500">
        <span>30d ago</span>
        <span>today</span>
      </div>
    </section>
  );
}
