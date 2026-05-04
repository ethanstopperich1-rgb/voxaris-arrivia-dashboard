// Top placements by scan count over the last 7 days.

import Link from "next/link";

type TopPlacement = { slug: string; scans: number };

export function TopPlacementsCard({ placements }: { placements: TopPlacement[] }) {
  const max = Math.max(1, ...placements.map((p) => p.scans));

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-300">
          Top placements · 7d
        </h2>
        <Link
          href={"/dashboard/placements" as never}
          className="text-xs text-cyan-400 hover:text-cyan-300"
        >
          Manage →
        </Link>
      </div>

      {placements.length === 0 ? (
        <p className="mt-6 text-xs text-neutral-500">
          No QR scans recorded in the last 7 days.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {placements.map((p) => (
            <li key={p.slug}>
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono text-neutral-300">{p.slug}</span>
                <span className="text-neutral-400 tabular-nums">{p.scans}</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-neutral-900">
                <div
                  className="h-full rounded-full bg-cyan-500/60"
                  style={{ width: `${(p.scans / max) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
