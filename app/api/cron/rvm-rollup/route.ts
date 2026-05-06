/**
 * GET /api/cron/rvm-rollup
 *
 * Vercel Cron — runs nightly at 6am UTC (after the overnight batch completes).
 * Recomputes yesterday's and today's RVM metrics from source tables
 * (`rvm_drops`, `rvm_compliance_audit`) and writes to `rvm_daily_metrics`.
 *
 * Auth: Vercel Cron sends `Authorization: Bearer $CRON_SECRET`
 *
 * Schedule: declared in vercel.json — "0 6 * * *"
 */

import { NextResponse } from "next/server";
import { rollupDailyMetrics } from "@/lib/rvm/metrics";
import { logger } from "@/lib/observability/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<Response> {
  const auth = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  if (!process.env.CRON_SECRET || auth !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400 * 1000).toISOString().slice(0, 10);

  try {
    const [todayRow, yesterdayRow] = await Promise.all([
      rollupDailyMetrics(today),
      rollupDailyMetrics(yesterday),
    ]);

    logger.info({ today: todayRow, yesterday: yesterdayRow }, "rvm: daily rollup complete");

    return NextResponse.json({
      ok: true,
      rolled_up: [today, yesterday],
      today: todayRow,
      yesterday: yesterdayRow,
    });
  } catch (err) {
    logger.error({ err: String(err) }, "rvm: daily rollup failed");
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
