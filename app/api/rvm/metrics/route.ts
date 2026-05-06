/**
 * GET /api/rvm/metrics
 *
 * Returns RVM Cowboy performance metrics for the last N days.
 * Usable by Grafana (JSON datasource), external monitoring, or the dashboard.
 *
 * Auth: x-api-key header (same as other internal API routes)
 *
 * Query params:
 *   ?days=7    (default 7, max 90)
 */

import { NextResponse } from "next/server";
import { requireApiKey } from "@/lib/auth/api-key";
import { fetchRvmMetrics } from "@/lib/rvm/metrics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<Response> {
  const auth = requireApiKey(req);
  if (!auth.ok) return auth.res;

  const url = new URL(req.url);
  const days = Math.min(90, Math.max(1, parseInt(url.searchParams.get("days") ?? "7", 10)));

  const summary = await fetchRvmMetrics(days);

  return NextResponse.json({
    ok: true,
    generated_at: new Date().toISOString(),
    window_days: days,
    ...summary,
  });
}
