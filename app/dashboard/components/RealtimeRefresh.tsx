"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/clients/supabase-browser";

/**
 * Subscribes to inserts on `call_sessions` and `agent_events` and triggers a
 * Next.js soft refresh whenever a new row lands. The dashboard page is
 * `dynamic = "force-dynamic"` so `router.refresh()` re-runs the server query
 * without flashing the page.
 */
export function RealtimeRefresh(): null {
  const router = useRouter();
  useEffect(() => {
    const sb = supabaseBrowser();
    let scheduled = false;
    const schedule = (): void => {
      if (scheduled) return;
      scheduled = true;
      // Coalesce bursts from many events arriving in the same second.
      setTimeout(() => {
        scheduled = false;
        router.refresh();
      }, 750);
    };
    // Listen to every table the dashboard surfaces so any page that
    // mounts this component auto-refreshes when relevant data lands:
    //   call_sessions (insert + update) → live calls, calls list
    //   agent_events                    → ops view + transcripts
    //   appointments                    → calendar + executive funnel
    //   queue_items                     → dial queue table
    //   tool_invocations                → top objections card
    //   placements / placement_scans    → placements admin
    const channel = sb
      .channel("dashboard")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "call_sessions" },
        schedule,
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "call_sessions" },
        schedule,
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "agent_events" },
        schedule,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "appointments" },
        schedule,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "queue_items" },
        schedule,
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "tool_invocations" },
        schedule,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "placements" },
        schedule,
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "placement_scans" },
        schedule,
      )
      .subscribe();
    return () => {
      void sb.removeChannel(channel);
    };
  }, [router]);
  return null;
}
