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
  const { data } = await sb
    .from("appointments")
    .select(
      "id, livekit_room_name, caller_name, property_name, tour_slot, tour_at, status, on_property, agent_name",
    )
    .gte("tour_at", now.toISOString())
    .lte("tour_at", horizon.toISOString())
    .order("tour_at", { ascending: true });
  return (data ?? []) as AppointmentRow[];
}

export default async function CalendarPage() {
  const appointments = await loadAppointments();

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
          Next 30 days · {appointments.length} scheduled.
        </p>
      </header>

      <CalendarGrid appointments={appointments} />
    </main>
  );
}
