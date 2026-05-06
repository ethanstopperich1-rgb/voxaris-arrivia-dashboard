import { supabaseAdmin } from "@/lib/clients/supabase-admin";

export interface RvmDailyRow {
  date: string;
  drops_attempted: number;
  drops_delivered: number;
  drops_failed: number;
  callbacks_received: number;
  callbacks_qualified: number;
  callbacks_transferred: number;
  suppression_events: number;
  qc_fail_count: number;
  cache_hits: number;
  cost_total_usd: number;
}

export interface RvmHealthStatus {
  deliveryRate: number;     // drops_delivered / drops_attempted
  callbackRate: number;     // callbacks_received / drops_delivered
  qcFailRate: number;       // qc_fail_count / drops_attempted
  costPerCallback: number;  // cost_total_usd / callbacks_received
  alerts: RvmAlert[];
}

export interface RvmAlert {
  severity: "P0" | "P1" | "P2" | "P3";
  code: string;
  message: string;
}

export interface RvmSummary {
  today: RvmDailyRow | null;
  last7Days: RvmDailyRow[];
  health: RvmHealthStatus;
  complianceFailures: number;  // audit log entries with no consent_provenance (shouldn't be > 0)
  pendingOptOuts: number;      // suppression records added today
}

// ─────────────────────────────────────────────
// Fetch today's + last 7 days of daily metrics
// ─────────────────────────────────────────────
export async function fetchRvmMetrics(days = 7): Promise<RvmSummary> {
  const db = supabaseAdmin();
  const since = new Date(Date.now() - days * 24 * 3600 * 1000).toISOString().slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);

  const [metricsResult, complianceResult, optOutResult] = await Promise.all([
    db
      .from("rvm_daily_metrics")
      .select("*")
      .gte("date", since)
      .order("date", { ascending: false }),

    // Any audit row with missing consent_provenance = compliance gap
    db
      .from("rvm_compliance_audit")
      .select("id", { count: "exact", head: true })
      .gte("drop_timestamp", `${today}T00:00:00Z`)
      .is("consent_provenance", null),

    // Opt-outs added today
    db
      .from("suppression_list")
      .select("phone_e164", { count: "exact", head: true })
      .eq("reason", "opt_out")
      .gte("suppressed_at", `${today}T00:00:00Z`),
  ]);

  const rows = (metricsResult.data ?? []) as RvmDailyRow[];
  const todayRow = rows.find((r) => r.date === today) ?? null;
  const last7 = rows.slice(0, 7);

  const health = computeHealth(todayRow);

  return {
    today: todayRow,
    last7Days: last7,
    health,
    complianceFailures: complianceResult.count ?? 0,
    pendingOptOuts: optOutResult.count ?? 0,
  };
}

// ─────────────────────────────────────────────
// Recompute today's metrics directly from source tables
// Called by the nightly rollup cron — more accurate than incremental updates
// ─────────────────────────────────────────────
export async function rollupDailyMetrics(date: string): Promise<RvmDailyRow> {
  const db = supabaseAdmin();
  const start = `${date}T00:00:00Z`;
  const end = `${date}T23:59:59Z`;

  const [drops, callbacks, suppression, genFails] = await Promise.all([
    db
      .from("rvm_drops")
      .select("delivery_status, cost_usd, promoted_to_hot, callback_received_at")
      .gte("created_at", start)
      .lte("created_at", end),

    db
      .from("rvm_drops")
      .select("id", { count: "exact", head: true })
      .gte("callback_received_at", start)
      .lte("callback_received_at", end),

    db
      .from("suppression_list")
      .select("id", { count: "exact", head: true })
      .gte("suppressed_at", start)
      .lte("suppressed_at", end),

    // QC failures are drops that failed but were generated (no drop_cowboy_id)
    db
      .from("rvm_drops")
      .select("id", { count: "exact", head: true })
      .gte("created_at", start)
      .lte("created_at", end)
      .eq("delivery_status", "failed")
      .is("drop_cowboy_id", null),
  ]);

  const allDrops = drops.data ?? [];
  const attempted = allDrops.length;
  const delivered = allDrops.filter((d) => d.delivery_status === "delivered").length;
  const failed = allDrops.filter((d) => d.delivery_status === "failed").length;
  const callbacksReceived = callbacks.count ?? 0;
  const totalCost = allDrops.reduce((sum, d) => sum + (d.cost_usd ?? 0), 0);

  const row: RvmDailyRow = {
    date,
    drops_attempted: attempted,
    drops_delivered: delivered,
    drops_failed: failed,
    callbacks_received: callbacksReceived,
    callbacks_qualified: 0,    // enriched by Andy's transfer events
    callbacks_transferred: 0,  // enriched by Andy's transfer events
    suppression_events: suppression.count ?? 0,
    qc_fail_count: genFails.count ?? 0,
    cache_hits: 0,             // tracked in pipeline at write time
    cost_total_usd: Math.round(totalCost * 100) / 100,
  };

  await db
    .from("rvm_daily_metrics")
    .upsert(row, { onConflict: "date" });

  return row;
}

// ─────────────────────────────────────────────
// Threshold evaluation — returns active alerts
// ─────────────────────────────────────────────
function computeHealth(today: RvmDailyRow | null): RvmHealthStatus {
  const alerts: RvmAlert[] = [];

  if (!today || today.drops_attempted === 0) {
    return { deliveryRate: 0, callbackRate: 0, qcFailRate: 0, costPerCallback: 0, alerts };
  }

  const deliveryRate = today.drops_delivered / today.drops_attempted;
  const callbackRate = today.drops_delivered > 0
    ? today.callbacks_received / today.drops_delivered
    : 0;
  const qcFailRate = today.qc_fail_count / today.drops_attempted;
  const costPerCallback = today.callbacks_received > 0
    ? today.cost_total_usd / today.callbacks_received
    : 0;

  // P1 — delivery rate below 85% for a day
  if (today.drops_attempted >= 500 && deliveryRate < 0.85) {
    alerts.push({
      severity: "P1",
      code: "delivery_rate_low",
      message: `Delivery rate ${(deliveryRate * 100).toFixed(1)}% — below 85% threshold`,
    });
  }

  // P2 — callback rate dropped > 25% vs 7-day avg (handled separately in health cron)
  // QC fail rate > 1%
  if (today.drops_attempted >= 100 && qcFailRate > 0.01) {
    alerts.push({
      severity: "P2",
      code: "qc_fail_rate_high",
      message: `QC fail rate ${(qcFailRate * 100).toFixed(1)}% — above 1% threshold`,
    });
  }

  // P3 — cost per callback > $1.50
  if (today.callbacks_received >= 10 && costPerCallback > 1.5) {
    alerts.push({
      severity: "P3",
      code: "cost_per_callback_high",
      message: `Cost per callback $${costPerCallback.toFixed(2)} — above $1.50 target`,
    });
  }

  return { deliveryRate, callbackRate, qcFailRate, costPerCallback, alerts };
}
