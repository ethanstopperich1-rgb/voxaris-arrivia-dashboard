"use client";

// Collapsible JSON view for relevant agent_events on a call.

import { useState } from "react";

type EventRow = {
  id: number;
  event_type: string;
  payload: Record<string, unknown> | null;
  created_at: string;
};

export function RawEvents({ events }: { events: EventRow[] }) {
  const [open, setOpen] = useState(false);
  if (events.length === 0) return null;

  return (
    <section className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-6">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-left"
      >
        <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-300">
          Raw events ({events.length})
        </h2>
        <span className="text-xs text-cyan-400">{open ? "Hide" : "Show"}</span>
      </button>
      {open && (
        <ul className="mt-4 space-y-2">
          {events.map((e) => (
            <li
              key={e.id}
              className="rounded-md border border-neutral-800 bg-neutral-900/60 p-3"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-neutral-200">{e.event_type}</span>
                <span className="text-neutral-500">
                  {new Date(e.created_at).toLocaleString()}
                </span>
              </div>
              <pre className="mt-2 overflow-x-auto whitespace-pre-wrap font-mono text-[11px] text-neutral-400">
                {JSON.stringify(e.payload ?? {}, null, 2)}
              </pre>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
