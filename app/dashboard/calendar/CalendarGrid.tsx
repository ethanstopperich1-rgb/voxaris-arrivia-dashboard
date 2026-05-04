"use client";

// Month-grid calendar with per-day appointment counts. Click a day to
// open a drawer listing the day's appointments with a link to each call.

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";

type AppointmentRow = {
  id: string;
  livekit_room_name: string | null;
  caller_name: string | null;
  property_name: string | null;
  tour_slot: string | null;
  tour_at: string | null;
  status: string | null;
  on_property: boolean | null;
  agent_name: string | null;
};

const DAY_HEADERS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function bucketByDay(appointments: AppointmentRow[]): Map<string, AppointmentRow[]> {
  const map = new Map<string, AppointmentRow[]>();
  for (const a of appointments) {
    if (!a.tour_at) continue;
    const key = format(new Date(a.tour_at), "yyyy-MM-dd");
    const arr = map.get(key) ?? [];
    arr.push(a);
    map.set(key, arr);
  }
  return map;
}

export function CalendarGrid({ appointments }: { appointments: AppointmentRow[] }) {
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const buckets = useMemo(() => bucketByDay(appointments), [appointments]);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 0 });
    const out: Date[] = [];
    const cur = new Date(start);
    while (cur <= end) {
      out.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }
    return out;
  }, [cursor]);

  const today = new Date();
  const selected = selectedKey ? buckets.get(selectedKey) ?? [] : [];

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-neutral-100">
          {format(cursor, "MMMM yyyy")}
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCursor((c) => subMonths(c, 1))}
            className="rounded-md border border-neutral-800 bg-neutral-900 px-3 py-1 text-sm text-neutral-300 hover:bg-neutral-800"
          >
            ←
          </button>
          <button
            onClick={() => setCursor(startOfMonth(new Date()))}
            className="rounded-md border border-neutral-800 bg-neutral-900 px-3 py-1 text-sm text-neutral-300 hover:bg-neutral-800"
          >
            Today
          </button>
          <button
            onClick={() => setCursor((c) => addMonths(c, 1))}
            className="rounded-md border border-neutral-800 bg-neutral-900 px-3 py-1 text-sm text-neutral-300 hover:bg-neutral-800"
          >
            →
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-md border border-neutral-800 bg-neutral-800">
        {DAY_HEADERS.map((d) => (
          <div
            key={d}
            className="bg-neutral-900 px-2 py-1.5 text-center text-[11px] font-medium uppercase tracking-wider text-neutral-500"
          >
            {d}
          </div>
        ))}
        {days.map((d) => {
          const key = format(d, "yyyy-MM-dd");
          const list = buckets.get(key) ?? [];
          const inMonth = isSameMonth(d, cursor);
          const isToday = isSameDay(d, today);
          const hasItems = list.length > 0;

          return (
            <button
              key={key}
              onClick={() => hasItems && setSelectedKey(key)}
              disabled={!hasItems}
              className={`min-h-[88px] bg-neutral-950 p-2 text-left transition ${
                hasItems ? "cursor-pointer hover:bg-neutral-900" : "cursor-default"
              } ${inMonth ? "" : "opacity-40"}`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs ${
                    isToday
                      ? "rounded-full bg-cyan-500/20 px-1.5 py-0.5 font-semibold text-cyan-300"
                      : "text-neutral-400"
                  }`}
                >
                  {format(d, "d")}
                </span>
                {hasItems && (
                  <span className="rounded-full bg-cyan-500/10 px-1.5 py-0.5 text-[10px] font-medium text-cyan-300">
                    {list.length}
                  </span>
                )}
              </div>
              <ul className="mt-1.5 space-y-0.5">
                {list.slice(0, 2).map((a) => (
                  <li
                    key={a.id}
                    className="truncate text-[10px] text-neutral-400"
                    title={`${a.caller_name ?? ""} · ${a.tour_slot ?? ""}`}
                  >
                    {a.caller_name ?? "—"}
                  </li>
                ))}
                {list.length > 2 && (
                  <li className="text-[10px] text-neutral-500">
                    +{list.length - 2} more
                  </li>
                )}
              </ul>
            </button>
          );
        })}
      </div>

      {/* Drawer */}
      {selectedKey && (
        <div
          className="fixed inset-0 z-40 flex items-end justify-end bg-black/60 backdrop-blur-sm"
          onClick={() => setSelectedKey(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="h-full w-full max-w-md overflow-y-auto border-l border-neutral-800 bg-neutral-950 p-6 shadow-2xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-neutral-100">
                {format(new Date(selectedKey), "EEEE, MMM d")}
              </h3>
              <button
                onClick={() => setSelectedKey(null)}
                className="text-neutral-400 hover:text-neutral-100"
              >
                ✕
              </button>
            </div>
            <ul className="space-y-3">
              {selected.map((a) => (
                <li
                  key={a.id}
                  className="rounded-md border border-neutral-800 bg-neutral-900/60 p-3"
                >
                  <p className="text-sm text-neutral-100">
                    {a.caller_name ?? "—"}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {a.tour_slot ?? (a.tour_at ? format(new Date(a.tour_at), "p") : "—")}{" "}
                    · {a.property_name ?? "—"}
                  </p>
                  <p className="mt-1 text-[11px] text-neutral-500">
                    {a.on_property ? "on-property" : "off-property"} ·{" "}
                    status: {a.status ?? "booked"} · agent: {a.agent_name ?? "—"}
                  </p>
                  {a.livekit_room_name && (
                    <Link
                      href={`/dashboard/calls/${encodeURIComponent(a.livekit_room_name)}` as never}
                      className="mt-2 inline-block text-xs text-cyan-400 hover:text-cyan-300"
                    >
                      View call →
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
