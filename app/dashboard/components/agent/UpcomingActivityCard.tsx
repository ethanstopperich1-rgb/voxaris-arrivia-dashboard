// "What's on the calendar in the next 7 days." For Deedy: tour bookings.
// For Andie: pending Microsoft Bookings (link-sent) + recent transfers.
// Generic row schema so the parent decides what flavor to feed in.

import { cn } from "@/lib/utils";

export type ActivityRow = {
  when: string; // pre-formatted ("Tue 10:30 AM")
  who: string;
  where: string; // property/program
  status: string; // "confirmed" | "link-sent" | "transferred" | "no-show-risk"
};

type Props = {
  rows: ActivityRow[];
  title: string;
  emptyMsg: string;
};

const STATUS_STYLE: Record<string, string> = {
  confirmed: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  booked: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  "link-sent": "border-violet-500/30 bg-violet-500/10 text-violet-200",
  transferred: "border-cyan-500/30 bg-cyan-500/10 text-cyan-200",
  "no-show-risk": "border-amber-500/30 bg-amber-500/10 text-amber-200",
  pending: "border-neutral-700 bg-neutral-800/40 text-neutral-300",
};

export function UpcomingActivityCard({ rows, title, emptyMsg }: Props) {
  return (
    <section className="rounded-2xl border border-neutral-800 bg-neutral-950/60">
      <header className="flex items-center justify-between border-b border-neutral-800 bg-neutral-900/40 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-neutral-100">{title}</h2>
          <p className="mt-0.5 text-[11px] text-neutral-500">
            Next 7 days · {rows.length} {rows.length === 1 ? "entry" : "entries"}
          </p>
        </div>
      </header>
      {rows.length === 0 ? (
        <div className="px-4 py-10 text-center text-sm text-neutral-500">
          {emptyMsg}
        </div>
      ) : (
        <ul className="divide-y divide-neutral-800/70">
          {rows.slice(0, 8).map((r, idx) => {
            const styleClass =
              STATUS_STYLE[r.status] ?? STATUS_STYLE.pending;
            return (
              <li
                key={`${r.when}-${idx}`}
                className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-medium tabular-nums text-neutral-200">
                    {r.when}
                  </p>
                  <p className="mt-0.5 truncate text-[11px] text-neutral-500">
                    {r.who} · {r.where}
                  </p>
                </div>
                <span
                  className={cn(
                    "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize",
                    styleClass,
                  )}
                >
                  {r.status}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
