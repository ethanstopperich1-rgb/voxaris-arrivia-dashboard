// /dashboard — per-agent executive view.
//
// Top-of-page tabs swap between Deedy (Arrivia · booking) and Andie
// (GVR · re-engagement). Each agent has different success metrics so
// the page is built around what THAT agent is responsible for, not a
// blended scorecard.
//
// Engineering / ops view lives at /dashboard/ops.

import { Suspense } from "react";
import { AgentSwitcher } from "./components/agent/AgentSwitcher";
import { KpiHero } from "./components/agent/KpiHero";
import { ConversionFunnel } from "./components/agent/ConversionFunnel";
import { TrendSparkline } from "./components/agent/TrendSparkline";
import { UpcomingActivityCard } from "./components/agent/UpcomingActivityCard";
import { TopObjectionsCard } from "./components/agent/TopObjectionsCard";
import { RealtimeRefresh } from "./components/RealtimeRefresh";
import {
  loadAgentDashboard,
  type AgentSlug,
} from "./components/agent/loadAgentData";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SearchParams = { agent?: string };

function resolveAgent(p: SearchParams): AgentSlug {
  return p.agent === "andie" ? "andie" : "deedy";
}

const AGENT_META: Record<AgentSlug, { title: string; subtitle: string; accent: "cyan" | "violet"; live: string }> = {
  deedy: {
    title: "Deedy",
    subtitle: "Arrivia Virtual Booking Agent",
    accent: "cyan",
    live: "Live · Deedy",
  },
  andie: {
    title: "Andie",
    subtitle: "GVR Member Re-engagement",
    accent: "violet",
    live: "Live · Andie",
  },
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const agent = resolveAgent(sp);
  const meta = AGENT_META[agent];
  const data = await loadAgentDashboard(agent);

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-8 px-8 py-12">
      <RealtimeRefresh />

      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-cyan-400">
            VOXARIS · LIVE OPS
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-neutral-100">
            {meta.title}{" "}
            <span className="text-base font-normal text-neutral-400">
              · {meta.subtitle}
            </span>
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Executive view · auto-refreshing · for engineering health see{" "}
            <a href="/dashboard/ops" className="text-cyan-400 underline-offset-2 hover:underline">
              /ops
            </a>
            .
          </p>
        </div>
        <Suspense fallback={null}>
          <AgentSwitcher active={agent} />
        </Suspense>
      </header>

      <KpiHero
        accent={meta.accent}
        liveLabel={meta.live}
        liveCount={data.liveCalls}
        cards={[
          {
            label: `${data.kpi.primaryLabel} — today`,
            value: data.kpi.today,
            delta: data.kpi.deltaToday,
            hint: "vs yesterday",
          },
          {
            label: `${data.kpi.primaryLabel} — this week`,
            value: data.kpi.week,
            delta: data.kpi.deltaWeek,
            hint: "vs last week",
          },
          {
            label: `${data.kpi.primaryLabel} — month-to-date`,
            value: data.kpi.mtd,
            delta: data.kpi.deltaMtd,
            hint: "vs last month",
          },
        ]}
      />

      <section className="grid gap-6 lg:grid-cols-2">
        <ConversionFunnel
          stages={data.funnel}
          accent={meta.accent}
          title={
            agent === "deedy"
              ? "Booking funnel — last 30 days"
              : "Hand-off funnel — last 30 days"
          }
        />
        <TrendSparkline
          series={data.trend.series}
          total={data.trend.total}
          label={data.trend.label}
          accent={meta.accent}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <UpcomingActivityCard
          rows={data.upcoming.rows}
          title={data.upcoming.title}
          emptyMsg={data.upcoming.emptyMsg}
        />
        <TopObjectionsCard buckets={data.objections} accent={meta.accent} />
      </section>

      <footer className="mt-4 flex items-center justify-between border-t border-neutral-800 pt-4 text-[11px] text-neutral-500">
        <p>
          Powered by Voxaris · {agent === "deedy" ? "Arrivia" : "GVR"} program
        </p>
        <p>
          Engineering ops at{" "}
          <a href="/dashboard/ops" className="text-cyan-400 hover:underline">
            /dashboard/ops
          </a>{" "}
          · Calendar at{" "}
          <a href="/dashboard/calendar" className="text-cyan-400 hover:underline">
            /dashboard/calendar
          </a>
        </p>
      </footer>
    </main>
  );
}
