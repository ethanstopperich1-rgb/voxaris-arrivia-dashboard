// GET /api/cron/dial-batch
//
// Vercel Cron pulls the next batch of pending rows from `dial_queue`
// for each enrolled agent, respects a live concurrency cap (counts
// rooms currently in flight), dispatches via LiveKit AgentDispatch,
// and updates the queue row's status.
//
// Auth: Vercel Cron sends `Authorization: Bearer $CRON_SECRET`.
// Set CRON_SECRET on Vercel before enabling the schedule.
//
// Schedule: declared in vercel.json — every 30 min, M-F 8am-8pm ET.

import { NextResponse } from "next/server";
import { AgentDispatchClient } from "livekit-server-sdk";
import { supabaseAdmin } from "@/lib/clients/supabase-admin";
import { logger } from "@/lib/observability/logger";
import { scoreLeads, type RawRow } from "@/app/dashboard/queue/scoreActions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Batch sizing rationale:
//   POOL_SIZE — how many oldest pending rows we pull as a "candidate
//     pool" per agent each tick. We score whichever ones don't have a
//     fresh ai_score yet, then take the top BATCH_SIZE by score from
//     the pool (already-scored + freshly-scored).
//   BATCH_SIZE — number actually dialed per tick (capped further by
//     live concurrency).
//   SCORE_REFRESH_HOURS — re-score a row's priority if its score is
//     older than this. Keeps rankings honest as the queue ages.
const POOL_SIZE = 100;
const BATCH_SIZE = 20;
const MAX_CONCURRENT_PER_AGENT = 20;
const SCORE_REFRESH_HOURS = 24;
// Deedy is INBOUND-ONLY (after-hours QR-scan booking agent — guests
// dial her, she never dials them). Only Andie runs outbound campaigns.
const AGENTS = ["andie-gvr"] as const;

type QueueRow = {
  id: string;
  agent_name: string;
  phone_number: string;
  member_name: string | null;
  metadata: Record<string, unknown> | null;
  status: string;
  attempts: number;
  max_attempts: number;
  ai_score: number | null;
  ai_scored_at: string | null;
};

function lkHttpUrl(): string {
  return (process.env.LIVEKIT_URL ?? "").replace(/^wss?:\/\//, "https://");
}

async function logTransition(
  sb: ReturnType<typeof supabaseAdmin>,
  id: string,
  from: string,
  to: string,
  detail?: string,
): Promise<void> {
  await sb.from("dial_queue_events").insert({
    queue_id: id,
    from_status: from,
    to_status: to,
    detail: detail ?? null,
  });
}

async function dispatchOne(
  client: AgentDispatchClient,
  row: QueueRow,
): Promise<{ ok: true; room: string; dispatch_id: string } | { ok: false; error: string }> {
  const prefix = row.agent_name === "andie-gvr" ? "andie-out" : "deedy-out";
  const room = `${prefix}-${row.phone_number.replace(/\D/g, "")}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;

  const md: Record<string, unknown> = {
    direction: "outbound",
    phone_number: row.phone_number,
    queue_id: row.id,
    ...(row.member_name
      ? { caller_name: row.member_name, member_name: row.member_name }
      : {}),
    ...(row.metadata ?? {}),
  };

  try {
    const dispatch = await client.createDispatch(room, row.agent_name, {
      metadata: JSON.stringify(md),
    });
    return { ok: true, room, dispatch_id: dispatch.id };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function processAgent(
  agent: string,
  client: AgentDispatchClient,
): Promise<{
  agent: string;
  dialed: number;
  failed: number;
  pool: number;
  scored_now: number;
  used_fallback: boolean;
  skipped_concurrency: boolean;
}> {
  const sb = supabaseAdmin();

  // 1. live in-flight count for this agent
  const { count: inFlight, error: cntErr } = await sb
    .from("call_sessions")
    .select("id", { count: "exact", head: true })
    .is("ended_at", null)
    .eq("agent_name", agent);
  if (cntErr) {
    logger.warn({ agent, cntErr: cntErr.message }, "dial_batch_count_error");
  }

  const available = Math.max(0, MAX_CONCURRENT_PER_AGENT - (inFlight ?? 0));
  if (available === 0) {
    return {
      agent,
      dialed: 0,
      failed: 0,
      pool: 0,
      scored_now: 0,
      used_fallback: false,
      skipped_concurrency: true,
    };
  }
  const limit = Math.min(BATCH_SIZE, available);

  // 2. Pull a CANDIDATE POOL of pending rows for this agent. We pull
  //    POOL_SIZE oldest rows ordered by (existing score desc, created
  //    asc). Then score the ones that lack a fresh score, sort by
  //    score, take the top `limit` to dial.
  const { data: rows, error: pullErr } = await sb
    .from("dial_queue")
    .select(
      "id, agent_name, phone_number, member_name, metadata, status, attempts, max_attempts, ai_score, ai_scored_at",
    )
    .eq("status", "pending")
    .eq("agent_name", agent)
    .order("ai_score", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: true })
    .limit(POOL_SIZE);

  if (pullErr || !rows || rows.length === 0) {
    return {
      agent,
      dialed: 0,
      failed: 0,
      pool: 0,
      scored_now: 0,
      used_fallback: false,
      skipped_concurrency: false,
    };
  }
  const pool: QueueRow[] = (rows as QueueRow[]).filter(
    (r) => r.attempts < r.max_attempts,
  );
  if (pool.length === 0) {
    return {
      agent,
      dialed: 0,
      failed: 0,
      pool: 0,
      scored_now: 0,
      used_fallback: false,
      skipped_concurrency: false,
    };
  }

  // 3. Identify rows that need scoring (no score, OR score is stale).
  const refreshCutoff = Date.now() - SCORE_REFRESH_HOURS * 3600 * 1000;
  const needsScore = pool.filter((r) => {
    if (r.ai_score == null) return true;
    if (!r.ai_scored_at) return true;
    return new Date(r.ai_scored_at).getTime() < refreshCutoff;
  });

  let scoredNow = 0;
  let usedFallback = false;
  if (needsScore.length > 0) {
    const inputs: RawRow[] = needsScore.map((r) => ({
      agent_name: r.agent_name as "andie-gvr" | "deedy-vba",
      phone_number: r.phone_number,
      member_name: r.member_name ?? undefined,
      metadata: r.metadata ?? undefined,
    }));
    const scored = await scoreLeads(inputs);
    usedFallback = scored.fallbackUsed;
    const now = new Date().toISOString();
    for (let i = 0; i < needsScore.length; i++) {
      const row = needsScore[i];
      const got = scored.scored[i];
      if (!row || !got) continue;
      // Persist the score; reflect it on the local pool object so
      // sorting below works without re-querying.
      row.ai_score = got.ai_score;
      row.ai_scored_at = now;
      await sb
        .from("dial_queue")
        .update({
          ai_score: got.ai_score,
          ai_score_reason: got.ai_score_reason,
          ai_score_model: scored.fallbackUsed
            ? "heuristic"
            : "gpt-4o-mini",
          ai_scored_at: now,
          updated_at: now,
        })
        .eq("id", row.id);
      scoredNow += 1;
    }
  }

  // 4. Pick the top `limit` from the pool by score.
  const eligible: QueueRow[] = [...pool]
    .sort((a, b) => (b.ai_score ?? 0) - (a.ai_score ?? 0))
    .slice(0, limit);

  if (eligible.length === 0) {
    return {
      agent,
      dialed: 0,
      failed: 0,
      pool: pool.length,
      scored_now: scoredNow,
      used_fallback: usedFallback,
      skipped_concurrency: false,
    };
  }

  // 3. flip to "dialing" + bump attempts (best-effort lock; LK dispatch
  //    is idempotent enough that worst case is one extra dial attempt
  //    per row across overlapping cron firings)
  const ids = eligible.map((r) => r.id);
  await sb
    .from("dial_queue")
    .update({
      status: "dialing",
      last_attempted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .in("id", ids);

  // increment attempts in a separate pass (Supabase REST has no atomic
  // increment for arbitrary rows; we read+write per row)
  for (const r of eligible) {
    await sb
      .from("dial_queue")
      .update({ attempts: r.attempts + 1 })
      .eq("id", r.id);
    await logTransition(sb, r.id, r.status, "dialing");
  }

  // 4. dispatch in parallel
  const results = await Promise.allSettled(
    eligible.map((r) => dispatchOne(client, r).then((res) => ({ row: r, res }))),
  );

  let dialed = 0;
  let failed = 0;
  for (const settled of results) {
    if (settled.status !== "fulfilled") {
      failed += 1;
      continue;
    }
    const { row, res } = settled.value;
    if (res.ok) {
      dialed += 1;
      await sb
        .from("dial_queue")
        .update({
          livekit_room_name: res.room,
          dispatch_id: res.dispatch_id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.id);
      // The row stays "dialing" until the call completes — webhook /
      // shutdown event flips it to "completed" or "failed".
    } else {
      failed += 1;
      const next =
        row.attempts + 1 >= row.max_attempts ? "failed" : "pending";
      await sb
        .from("dial_queue")
        .update({
          status: next,
          last_error: res.error.slice(0, 500),
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.id);
      await logTransition(sb, row.id, "dialing", next, res.error.slice(0, 200));
    }
  }

  return {
    agent,
    dialed,
    failed,
    pool: pool.length,
    scored_now: scoredNow,
    used_fallback: usedFallback,
    skipped_concurrency: false,
  };
}

export async function GET(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  if (!process.env.CRON_SECRET || auth !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.LIVEKIT_API_KEY ?? "";
  const apiSecret = process.env.LIVEKIT_API_SECRET ?? "";
  const httpUrl = lkHttpUrl();
  if (!apiKey || !apiSecret || !httpUrl) {
    return NextResponse.json(
      { error: "livekit_env_missing" },
      { status: 500 },
    );
  }
  const client = new AgentDispatchClient(httpUrl, apiKey, apiSecret);

  const results = await Promise.all(
    AGENTS.map((a) => processAgent(a, client)),
  );

  const summary = {
    ok: true,
    at: new Date().toISOString(),
    results,
    total_dialed: results.reduce((a, r) => a + r.dialed, 0),
    total_failed: results.reduce((a, r) => a + r.failed, 0),
    total_scored: results.reduce((a, r) => a + r.scored_now, 0),
    fallback_used: results.some((r) => r.used_fallback),
  };
  logger.info(summary, "dial_batch_run");
  return NextResponse.json(summary);
}
