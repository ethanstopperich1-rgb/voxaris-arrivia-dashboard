// Calendar — month grid of upcoming appointments (next 30 days from today).
// Self-contained: month grid built with Tailwind + a small client-side
// drawer for per-day appointment lists.

import { supabaseAdmin } from "@/lib/clients/supabase-admin";
import { CalendarGrid } from "./CalendarGrid";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

async function loadAppointments(): Promise<AppointmentRow[]> {
  const sb = supabaseAdmin();
  const now = new Date();
  const horizon = new Date(now.getTime() + 30 * 86400 * 1000);
  // Two passes: (a) confirmed bookings within the next 30 days, and
  // (b) "link-sent" pending entries (tour_at is null — Andie sent the
  // Microsoft Bookings link, member hasn't picked a slot yet).
  const [bookedRes, pendingRes] = await Promise.all([
    sb
      .from("appointments")
      .select(
        "id, livekit_room_name, caller_name, property_name, tour_slot, tour_at, status, on_property, agent_name",
      )
      .gte("tour_at", now.toISOString())
      .lte("tour_at", horizon.toISOString())
      .order("tour_at", { ascending: true }),
    sb
      .from("appointments")
      .select(
        "id, livekit_room_name, caller_name, property_name, tour_slot, tour_at, status, on_property, agent_name",
      )
      .is("tour_at", null)
      .eq("status", "link-sent")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);
  const booked = (bookedRes.data ?? []) as AppointmentRow[];
  const pending = (pendingRes.data ?? []) as AppointmentRow[];
  return [...booked, ...pending];
}

export default async function CalendarPage() {
  const appointments = await loadAppointments();
  const booked = appointments.filter((a) => a.tour_at);
  const pending = appointments.filter((a) => !a.tour_at);

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-8 py-12">
      <header>
        <p className="text-xs uppercase tracking-widest text-cyan-400">
          VOXARIS · CALENDAR
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-neutral-100">
          Upcoming Tours
        </h1>
        <p className="text-sm text-neutral-400">
          Next 30 days · {booked.length} scheduled · {pending.length} pending member booking.
        </p>
      </header>

      <CalendarGrid appointments={booked} />

      {pending.length > 0 && (
        <section className="rounded-2xl border border-neutral-800 bg-neutral-950/60">
          <header className="flex items-center justify-between border-b border-neutral-800 bg-neutral-900/40 px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold text-neutral-100">Pending member bookings</h2>
              <p className="mt-0.5 text-[11px] text-neutral-500">
                Andie sent the scheduler link · waiting on the member to pick a time.
              </p>
            </div>
            <span className="text-[10px] uppercase tracking-widest text-neutral-500">
              {pending.length} sent
            </span>
          </header>
          <ul className="divide-y divide-neutral-800/70">
            {pending.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <div>
                  <p className="text-neutral-200">{a.caller_name ?? "Member"}</p>
                  <p className="mt-0.5 text-[11px] text-neutral-500">
                    {a.property_name ?? "GVR"} · agent: {a.agent_name === "andie-gvr" ? "Andie" : a.agent_name ?? "—"}
                  </p>
                </div>
                <span className="inline-flex items-center rounded-full border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 text-[11px] font-medium text-violet-200">
                  link-sent
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
