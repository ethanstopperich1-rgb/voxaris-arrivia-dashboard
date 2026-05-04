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
      .subscribe();
    return () => {
      void sb.removeChannel(channel);
    };
  }, [router]);
  return null;
}
