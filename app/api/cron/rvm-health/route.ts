/**
 * GET /api/cron/rvm-health
 *
 * Vercel Cron — runs every hour during campaign hours.
 * Evaluates threshold alerts and posts to Slack if any P0/P1/P2 fire.
 *
 * Auth: Vercel Cron sends `Authorization: Bearer $CRON_SECRET`
 *
 * Schedule: "0 * * * *" (every hour — Vercel filters inactive hours via daily_cap)
 */

import { NextResponse } from "next/server";
import { fetchRvmMetrics } from "@/lib/rvm/metrics";
import { logger } from "@/lib/observability/logger";
import type { RvmAlert } from "@/lib/rvm/metrics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function postSlackAlert(alerts: RvmAlert[], webhookUrl: string): Promise<void> {
  const severityEmoji: Record<string, string> = {
    P0: "🚨",
    P1: "🔴",
    P2: "🟠",
    P3: "🟡",
  };

  const blocks = alerts.map((a) => ({
    type: "section",
    text: {
      type: "mrkdwn",
      text: `${severityEmoji[a.severity] ?? "⚠️"} *[${a.severity}] RVM Cowboy — ${a.code}*\n${a.message}`,
    },
  }));

  await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: `RVM Cowboy: ${alerts.length} alert(s) firing`,
      blocks,
    }),
  });
}

export async function GET(req: Request): Promise<Response> {
  const auth = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  if (!process.env.CRON_SECRET || auth !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const summary = await fetchRvmMetrics(1);
  const { alerts } = summary.health;

  // Compliance failures are always P0 — audit log is broken
  if (summary.complianceFailures > 0) {
    alerts.unshift({
      severity: "P0",
      code: "compliance_audit_gap",
      message: `${summary.complianceFailures} drop(s) today have no compliance audit record — investigate immediately`,
    });
  }

  const actionable = alerts.filter((a) => ["P0", "P1", "P2"].includes(a.severity));
  const slackUrl = process.env.SLACK_WEBHOOK_URL;

  if (actionable.length > 0) {
    logger.warn({ alerts: actionable }, "rvm: health alerts firing");

    if (slackUrl) {
      await postSlackAlert(actionable, slackUrl).catch((err) =>
        logger.error({ err: String(err) }, "rvm: slack alert failed")
      );
    }
  }

  return NextResponse.json({
    ok: true,
    checked_at: new Date().toISOString(),
    alerts_total: alerts.length,
    alerts_actionable: actionable.length,
    alerts,
    health: summary.health,
    compliance_failures: summary.complianceFailures,
  });
}
