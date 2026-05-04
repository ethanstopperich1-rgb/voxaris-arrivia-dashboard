"use client";

// Filter bar for /dashboard/calls. Agent is no longer a filter on this
// bar — the top-of-page AgentSwitcher owns that. Outcome + date-range
// remain filterable here.

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

const OUTCOMES = [
  { value: "all", label: "All outcomes" },
  { value: "booked", label: "Booked" },
  { value: "transferred", label: "Transferred" },
  { value: "scheduler-link", label: "Scheduler link" },
  { value: "no-show-risk", label: "No-show risk" },
  { value: "not-interested", label: "Not interested" },
  { value: "voicemail", label: "Voicemail" },
  { value: "completed", label: "Completed" },
];

export function CallsFilters({
  initial,
}: {
  initial: { outcome?: string; from?: string; to?: string };
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(sp?.toString() ?? "");
    if (!value || value === "all") next.delete(key);
    else next.set(key, value);
    startTransition(() => {
      router.push(`/dashboard/calls?${next.toString()}`);
    });
  };

  const baseSelect =
    "rounded-md border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-sm text-neutral-200 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/50";
  const baseInput = baseSelect;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <select
        defaultValue={initial.outcome ?? "all"}
        onChange={(e) => update("outcome", e.target.value)}
        className={baseSelect}
        aria-label="Outcome"
      >
        {OUTCOMES.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      <label className="flex items-center gap-2 text-xs text-neutral-500">
        From
        <input
          type="date"
          defaultValue={initial.from?.slice(0, 10) ?? ""}
          onChange={(e) =>
            update("from", e.target.value ? new Date(e.target.value).toISOString() : "")
          }
          className={baseInput}
        />
      </label>

      <label className="flex items-center gap-2 text-xs text-neutral-500">
        To
        <input
          type="date"
          defaultValue={initial.to?.slice(0, 10) ?? ""}
          onChange={(e) =>
            update("to", e.target.value ? new Date(e.target.value).toISOString() : "")
          }
          className={baseInput}
        />
      </label>

      {isPending && (
        <span className="text-xs text-cyan-400">Filtering…</span>
      )}
    </div>
  );
}
