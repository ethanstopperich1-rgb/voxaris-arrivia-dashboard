// Placements admin — list of QR placements + create/edit dialogs.

import { supabaseAdmin } from "@/lib/clients/supabase-admin";
import { PlacementsTable } from "./PlacementsTable";
import { RealtimeRefresh } from "../components/RealtimeRefresh";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export type PlacementRow = {
  slug: string;
  name: string;
  property_name: string | null;
  premium_offer: string | null;
  brand: string | null;
  qr_target_url: string | null;
  scan_count: number;
  active: boolean;
  created_at: string;
};

async function loadPlacements(): Promise<PlacementRow[]> {
  const { data } = await supabaseAdmin()
    .from("placements")
    .select("*")
    .order("created_at", { ascending: false });
  return (data ?? []) as PlacementRow[];
}

export default async function PlacementsPage() {
  const placements = await loadPlacements();
  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-12">
      <RealtimeRefresh />
      <header>
        <p className="text-xs uppercase tracking-widest text-cyan-400">
          VOXARIS · PLACEMENTS
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-neutral-100">QR Placements</h1>
        <p className="text-sm text-neutral-400">
          Each placement gets a unique QR encoding{" "}
          <code className="rounded bg-neutral-900 px-1 py-0.5 text-xs text-cyan-300">
            /api/scan/[slug]
          </code>{" "}
          so every scan is logged before redirecting to the landing URL.
        </p>
      </header>

      <PlacementsTable placements={placements} />
    </main>
  );
}
