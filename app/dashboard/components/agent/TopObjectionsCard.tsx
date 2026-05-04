// Most common objection categories the agent hit in the last 30 days.
// Pulled from tool_invocations where tool_name='lookup_objection' and
// args_preview.objection_text was passed. We bucket by lookup category
// (provided by the matched objection's `category` field if present in
// args_preview, otherwise by a coarse keyword classifier on the raw
// objection text).

import { cn } from "@/lib/utils";

type Bucket = {
  label: string;
  count: number;
};

type Props = {
  buckets: Bucket[];
  accent: "cyan" | "violet";
};

export function TopObjectionsCard({ buckets, accent }: Props) {
  const total = buckets.reduce((a, b) => a + b.count, 0);
  const accentText = accent === "cyan" ? "text-cyan-300" : "text-violet-300";
  const bar =
    accent === "cyan"
      ? "from-cyan-400/70 to-cyan-500/30"
      : "from-violet-400/70 to-fuchsia-500/30";

  return (
    <section className="rounded-2xl border border-neutral-800 bg-neutral-950/60 p-5">
      <header className="mb-4 flex items-baseline justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-widest text-neutral-500">
            Top Objections
          </p>
          <h2 className={cn("mt-1 text-base font-semibold", accentText)}>
            What callers push back on
          </h2>
        </div>
        <p className="text-[11px] text-neutral-500">
          {total > 0 ? `${total} caught · last 30d` : "no objections yet"}
        </p>
      </header>
      {buckets.length === 0 ? (
        <p className="rounded-lg border border-dashed border-neutral-800 px-4 py-8 text-center text-sm text-neutral-500">
          No objection lookups recorded yet. Once Deedy/Andie field calls,
          the playbook hits will show up here.
        </p>
      ) : (
        <ol className="flex flex-col gap-2.5">
          {buckets.slice(0, 6).map((b) => {
            const pct = total > 0 ? (b.count / total) * 100 : 0;
            return (
              <li key={b.label} className="space-y-1">
                <div className="flex items-baseline justify-between text-xs">
                  <span className="text-neutral-300">{b.label}</span>
                  <span className="font-semibold tabular-nums text-neutral-100">
                    {b.count}
                    <span className="ml-1 text-[10px] font-normal text-neutral-500">
                      · {pct.toFixed(0)}%
                    </span>
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded bg-neutral-900/60">
                  <div
                    className={cn("h-full bg-gradient-to-r", bar)}
                    style={{ width: `${Math.max(2, pct)}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
