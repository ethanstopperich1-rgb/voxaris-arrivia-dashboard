// Shared data loader for the per-agent executive dashboard. One call
// per agent gathers everything the page needs: KPI counts, conversion
// funnel, 30-day trend, upcoming activity, top objections, live calls.
//
// All time math is done in UTC against ISO timestamps and converted
// for display in the page component. The `agent_name` filter narrows
// every query so Deedy's view never picks up Andie's calls (and vice
// versa).

import { supabaseAdmin } from "@/lib/clients/supabase-admin";

export type AgentSlug = "deedy" | "andie";

const AGENT_DB_NAME: Record<AgentSlug, string> = {
  deedy: "deedy-vba",
  andie: "andie-gvr",
};

export type FunnelStage = { label: string; value: number; hint?: string };
export type ActivityRow = {
  when: string;
  who: string;
  where: string;
  status: string;
};
export type ObjectionBucket = { label: string; count: number };

export type AgentDashboardData = {
  agent: AgentSlug;
  kpi: {
    today: number;
    week: number;
    mtd: number;
    deltaToday: number;
    deltaWeek: number;
    deltaMtd: number;
    primaryLabel: string; // "Bookings" or "Transfers + Links"
  };
  liveCalls: number;
  funnel: FunnelStage[];
  trend: { series: number[]; total: number; label: string };
  upcoming: { rows: ActivityRow[]; title: string; emptyMsg: string };
  objections: ObjectionBucket[];
};

// Coarse keyword → category classifier for objections when the
// matched-category isn't already in args_preview.
function classifyObjection(text: string): string {
  const s = (text || "").toLowerCase();
  if (/spouse|husband|wife|partner|other half/.test(s)) return "Spouse / partner";
  if (/time|busy|later|tomorrow|hour|minute|short/.test(s)) return "Time concern";
  if (/timeshare|sales|pitch|pressure|push/.test(s)) return "Sales pressure";
  if (/scam|legit|real|fake|trust|how did you/.test(s)) return "Trust / verification";
  if (/government|military|veteran|va\b|dod/.test(s)) return "Gov / military doubt";
  if (/money|afford|expensive|cost|price/.test(s)) return "Cost concern";
  if (/already|prior|been|attended/.test(s)) return "Already attended";
  if (/email|mail|send|text|link/.test(s)) return "Channel preference";
  if (/think|consider|talk to|discuss/.test(s)) return "Wants to think";
  if (/robot|ai\b|artificial|automated|computer|real person|human/.test(s)) return "AI detection";
  if (/sign.?up|remember|enroll|registered|when did|how did you get/.test(s)) return "Don't recall enrollment";
  return "Other";
}

function startOfTodayUTC(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function startOfWeekUTC(): Date {
  const d = startOfTodayUTC();
  // ISO week starts Monday. JS getUTCDay 0=Sun .. 6=Sat.
  const day = d.getUTCDay();
  const offsetToMonday = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + offsetToMonday);
  return d;
}

function startOfMonthUTC(): Date {
  const d = startOfTodayUTC();
  d.setUTCDate(1);
  return d;
}

function shiftDays(d: Date, days: number): Date {
  const out = new Date(d.getTime());
  out.setUTCDate(out.getUTCDate() + days);
  return out;
}

function shiftMonths(d: Date, months: number): Date {
  const out = new Date(d.getTime());
  out.setUTCMonth(out.getUTCMonth() + months);
  return out;
}

function fmtDayTime(iso: string): string {
  const d = new Date(iso);
  const day = d.toLocaleDateString("en-US", {
    weekday: "short",
    timeZone: "America/New_York",
  });
  const time = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
  });
  return `${day} ${time}`;
}

// Calls older than this with no ended_at are treated as ended — the
// LK room_ended webhook occasionally drops, and without this guard
// every silent failure pegs the "live calls" KPI forever.
const LIVE_STALE_MS = 15 * 60 * 1000;

// Match for this agent. Two ways a row can belong to Deedy:
//   1. agent_name = 'deedy-vba' (worker telemetry has landed)
//   2. agent_name IS NULL AND livekit_room_name like 'deedy-%'
//      (room_started webhook landed but worker hasn't tagged it yet)
// PostgREST .or() string applies at the row level.
const AGENT_ROOM_PREFIX: Record<AgentSlug, string> = {
  deedy: "deedy-",
  andie: "andie-",
};

export async function loadAgentDashboard(agent: AgentSlug): Promise<AgentDashboardData> {
  const sb = supabaseAdmin();
  const dbAgent = AGENT_DB_NAME[agent];
  const roomPrefix = AGENT_ROOM_PREFIX[agent];
  const agentMatchOr = `agent_name.eq.${dbAgent},and(agent_name.is.null,livekit_room_name.like.${roomPrefix}*)`;
  const now = new Date();
  const today0 = startOfTodayUTC();
  const yesterday0 = shiftDays(today0, -1);
  const week0 = startOfWeekUTC();
  const lastWeek0 = shiftDays(week0, -7);
  const month0 = startOfMonthUTC();
  const lastMonth0 = shiftMonths(month0, -1);
  const thirtyDaysAgo = shiftDays(today0, -29); // 30 day inclusive window
  const sevenDaysAhead = shiftDays(today0, 7);

  const [
    apptsAllRes,
    callsLast30Res,
    callsLiveRes,
    objRes,
  ] = await Promise.all([
    // All appointments touching the last 60 days OR upcoming 7 days for this agent.
    sb
      .from("appointments")
      .select(
        "id, agent_name, livekit_room_name, caller_name, property_name, tour_slot, tour_at, status, created_at, on_property",
      )
      .eq("agent_name", dbAgent)
      .gte("created_at", shiftDays(today0, -60).toISOString())
      .order("created_at", { ascending: false })
      .limit(2000),
    // 30-day call sessions for this agent (for trend + funnel + live count + completed-base for cost+%).
    sb
      .from("call_sessions")
      .select(
        "id, agent_name, started_at, ended_at, summary_outcome, outcome, transfer_success, livekit_room_name",
      )
      .or(agentMatchOr)
      .gte("started_at", thirtyDaysAgo.toISOString())
      .order("started_at", { ascending: false })
      .limit(5000),
    // Live (in-flight) calls for this agent.
    // We pull started_at so we can drop stale rows whose room_ended
    // webhook never landed (anything older than LIVE_STALE_MS).
    sb
      .from("call_sessions")
      .select("id, started_at")
      .or(agentMatchOr)
      .is("ended_at", null)
      .not("livekit_room_name", "is", null)
      .gte("started_at", new Date(Date.now() - LIVE_STALE_MS).toISOString()),
    // Objection lookups for this agent (last 30d).
    sb
      .from("tool_invocations")
      .select("tool_name, args_preview, agent_name, created_at")
      .eq("agent_name", dbAgent)
      .eq("tool_name", "lookup_objection")
      .gte("created_at", thirtyDaysAgo.toISOString())
      .limit(5000),
  ]);

  type Appt = {
    id: string;
    agent_name: string | null;
    livekit_room_name: string | null;
    caller_name: string | null;
    property_name: string | null;
    tour_slot: string | null;
    tour_at: string | null;
    status: string | null;
    created_at: string;
    on_property: boolean | null;
  };
  type Call = {
    id: string;
    agent_name: string | null;
    started_at: string;
    ended_at: string | null;
    summary_outcome: string | null;
    outcome: string | null;
    transfer_success: boolean | null;
    livekit_room_name: string | null;
  };
  type ToolInv = {
    tool_name: string;
    args_preview: Record<string, unknown> | null;
    agent_name: string | null;
    created_at: string;
  };

  const appts = (apptsAllRes.data ?? []) as Appt[];
  const calls = (callsLast30Res.data ?? []) as Call[];
  const liveCalls = (callsLiveRes.data ?? []).length;
  const objections = (objRes.data ?? []) as ToolInv[];

  // ── Primary outcome counts per period ────────────────────────────
  // Deedy: a "booking" = appointment row with status in ['booked','confirmed']
  //        and tour_at not null (slot picked). created_at drives the period.
  // Andie: a "successful outcome" = transfer (call_sessions.transfer_success=true)
  //        OR a scheduler-link sent (appointments.status='link-sent').
  function isPrimaryOutcomeAppt(a: Appt): boolean {
    if (agent === "deedy") {
      return (
        (a.status === "booked" || a.status === "confirmed") &&
        a.tour_at != null
      );
    }
    // Andie
    return a.status === "link-sent";
  }
  function isPrimaryOutcomeCall(c: Call): boolean {
    if (agent === "andie") {
      return c.transfer_success === true;
    }
    // Deedy "outcome" via summary doesn't double-count — appts are
    // the canonical source for bookings.
    return false;
  }

  function inWindow(iso: string, lo: Date, hi: Date): boolean {
    const t = new Date(iso).getTime();
    return t >= lo.getTime() && t < hi.getTime();
  }

  const todayHi = shiftDays(today0, 1);
  const yesterdayHi = today0;
  const weekHi = shiftDays(week0, 7);
  const lastWeekHi = week0;
  const monthHi = shiftMonths(month0, 1);
  const lastMonthHi = month0;

  function countAppt(lo: Date, hi: Date): number {
    return appts.filter(
      (a) => isPrimaryOutcomeAppt(a) && inWindow(a.created_at, lo, hi),
    ).length;
  }
  function countCall(lo: Date, hi: Date): number {
    return calls.filter(
      (c) => isPrimaryOutcomeCall(c) && inWindow(c.started_at, lo, hi),
    ).length;
  }
  function countPrimary(lo: Date, hi: Date): number {
    return countAppt(lo, hi) + countCall(lo, hi);
  }

  const today = countPrimary(today0, todayHi);
  const yesterday = countPrimary(yesterday0, yesterdayHi);
  const week = countPrimary(week0, weekHi);
  const lastWeek = countPrimary(lastWeek0, lastWeekHi);
  const mtd = countPrimary(month0, monthHi);
  const lastMonth = countPrimary(lastMonth0, lastMonthHi);

  // ── Funnel (last 30 days) ────────────────────────────────────────
  let funnel: FunnelStage[];
  if (agent === "deedy") {
    const totalCalls = calls.length;
    const eighteenPlus = calls.filter(
      (c) =>
        (c.summary_outcome || c.outcome || "") !== "under-18" &&
        (c.summary_outcome || c.outcome || "") !== "wrong-number",
    ).length;
    const qualified = calls.filter((c) => {
      const o = c.summary_outcome || c.outcome || "";
      return ["booked", "completed", "transferred", "no-show-risk"].includes(
        o,
      );
    }).length;
    const slotsPicked = appts.filter(
      (a) => a.tour_at != null && (a.status === "booked" || a.status === "confirmed"),
    ).length;
    const booked = appts.filter(
      (a) => (a.status === "booked" || a.status === "confirmed") && a.tour_at != null,
    ).length;

    funnel = [
      { label: "Calls answered", value: totalCalls },
      { label: "Cleared 18+ gate", value: eighteenPlus },
      { label: "Passed qualification", value: qualified },
      { label: "Picked a slot", value: slotsPicked },
      { label: "Booked (opc_book success)", value: booked },
    ];
  } else {
    const totalCalls = calls.length;
    const engaged = calls.filter((c) => {
      const o = c.summary_outcome || c.outcome || "";
      return !["wrong-person", "dnc", "voicemail"].includes(o);
    }).length;
    const transferredOrLink = appts.filter(
      (a) => a.status === "link-sent",
    ).length + calls.filter((c) => c.transfer_success === true).length;
    const transferred = calls.filter((c) => c.transfer_success === true).length;
    const linkSent = appts.filter((a) => a.status === "link-sent").length;

    funnel = [
      { label: "Calls answered", value: totalCalls },
      { label: "Engaged past intro", value: engaged },
      { label: "Warm hand-offs", value: transferredOrLink },
      { label: "Transferred to closer", value: transferred },
      { label: "Scheduler links sent", value: linkSent, hint: "fallback path" },
    ];
  }

  // ── 30-day trend series ──────────────────────────────────────────
  const series: number[] = Array.from({ length: 30 }, () => 0);
  function bumpDay(iso: string) {
    const t = new Date(iso).getTime();
    const dayIdx = Math.floor((t - thirtyDaysAgo.getTime()) / 86400000);
    if (dayIdx >= 0 && dayIdx < series.length) {
      series[dayIdx] = (series[dayIdx] ?? 0) + 1;
    }
  }
  for (const a of appts) {
    if (isPrimaryOutcomeAppt(a)) bumpDay(a.created_at);
  }
  for (const c of calls) {
    if (isPrimaryOutcomeCall(c)) bumpDay(c.started_at);
  }
  const trendTotal = series.reduce((a, b) => a + b, 0);

  // ── Upcoming activity ───────────────────────────────────────────
  let upcomingRows: ActivityRow[];
  let upcomingTitle: string;
  let upcomingEmpty: string;
  if (agent === "deedy") {
    upcomingTitle = "Upcoming tours";
    upcomingEmpty = "No tours booked in the next 7 days yet.";
    upcomingRows = appts
      .filter(
        (a) =>
          a.tour_at != null &&
          new Date(a.tour_at as string).getTime() >= today0.getTime() &&
          new Date(a.tour_at as string).getTime() < sevenDaysAhead.getTime() &&
          (a.status === "booked" || a.status === "confirmed"),
      )
      .sort(
        (a, b) =>
          new Date(a.tour_at as string).getTime() -
          new Date(b.tour_at as string).getTime(),
      )
      .map((a) => ({
        when: fmtDayTime(a.tour_at as string),
        who: a.caller_name || "Member",
        where: a.property_name || "Resort",
        status: a.status === "confirmed" ? "confirmed" : "booked",
      }));
  } else {
    upcomingTitle = "Recent hand-offs";
    upcomingEmpty = "No transfers or scheduler links sent in the last 7 days.";
    const sevenDaysAgo = shiftDays(today0, -7);
    const recentTransfers = calls
      .filter(
        (c) =>
          c.transfer_success === true &&
          new Date(c.started_at).getTime() >= sevenDaysAgo.getTime(),
      )
      .map((c) => ({
        when: fmtDayTime(c.started_at),
        who: "Member",
        where: "GVR specialist",
        status: "transferred" as const,
      }));
    const recentLinks = appts
      .filter(
        (a) =>
          a.status === "link-sent" &&
          new Date(a.created_at).getTime() >= sevenDaysAgo.getTime(),
      )
      .map((a) => ({
        when: fmtDayTime(a.created_at),
        who: a.caller_name || "Member",
        where: a.property_name || "GVR — Microsoft Bookings",
        status: "link-sent" as const,
      }));
    upcomingRows = [...recentTransfers, ...recentLinks].sort(
      (a, b) =>
        // newest first — easier to scan for client review
        new Date(b.when).getTime() - new Date(a.when).getTime(),
    );
  }

  // ── Top objections (categorize, count, top 6) ───────────────────
  const objBuckets = new Map<string, number>();
  for (const o of objections) {
    const text = String(
      (o.args_preview as Record<string, unknown> | null)?.["objection_text"] ?? "",
    );
    const cat =
      (String(
        (o.args_preview as Record<string, unknown> | null)?.["category"] ?? "",
      ).trim() || classifyObjection(text)) || "Other";
    objBuckets.set(cat, (objBuckets.get(cat) ?? 0) + 1);
  }
  const objectionsList: ObjectionBucket[] = Array.from(objBuckets.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);

  return {
    agent,
    kpi: {
      today,
      week,
      mtd,
      deltaToday: today - yesterday,
      deltaWeek: week - lastWeek,
      deltaMtd: mtd - lastMonth,
      primaryLabel: agent === "deedy" ? "Bookings" : "Transfers + Links",
    },
    liveCalls,
    funnel,
    trend: {
      series,
      total: trendTotal,
      label: agent === "deedy" ? "Bookings per day" : "Successful hand-offs per day",
    },
    upcoming: { rows: upcomingRows, title: upcomingTitle, emptyMsg: upcomingEmpty },
    objections: objectionsList,
  };
}
