// Today's appointments — count + next 3 upcoming.

import Link from "next/link";

type Appt = {
  id: string;
  livekit_room_name: string | null;
  caller_name: string | null;
  property_name: string | null;
  tour_slot: string | null;
  tour_at: string | null;
  status: string | null;
};

function fmtTime(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function TodayAppointmentsCard({ appointments }: { appointments: Appt[] }) {
  const now = Date.now();
  const upcoming = appointments
    .filter((a) => (a.tour_at ? new Date(a.tour_at).getTime() >= now : true))
    .slice(0, 3);

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-300">
          Today&apos;s appointments
        </h2>
        <Link
          href={"/dashboard/calendar" as never}
          className="text-xs text-cyan-400 hover:text-cyan-300"
        >
          View calendar →
        </Link>
      </div>
      <p className="mt-2 text-3xl font-semibold text-neutral-100 tabular-nums">
        {appointments.length}
      </p>
      <p className="text-xs text-neutral-500">scheduled today</p>

      {upcoming.length === 0 ? (
        <p className="mt-4 text-xs text-neutral-500">
          No upcoming tours remaining today.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {upcoming.map((a) => (
            <li
              key={a.id}
              className="flex items-center justify-between rounded-md border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-xs"
            >
              <div>
                <p className="text-neutral-200">{a.caller_name ?? "—"}</p>
                <p className="text-neutral-500">
                  {a.tour_slot ?? fmtTime(a.tour_at)} ·{" "}
                  {a.property_name ?? "—"}
                </p>
              </div>
              {a.livekit_room_name && (
                <Link
                  href={`/dashboard/calls/${encodeURIComponent(a.livekit_room_name)}` as never}
                  className="text-cyan-400 hover:text-cyan-300"
                >
                  Call →
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
