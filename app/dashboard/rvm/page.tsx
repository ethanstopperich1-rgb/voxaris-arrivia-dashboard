import { fetchRvmMetrics } from "@/lib/rvm/metrics";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function fmt(n: number, decimals = 0): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: decimals });
}

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

function usd(n: number): string {
  return `$${n.toFixed(2)}`;
}

const SEVERITY_COLOR: Record<string, string> = {
  P0: "bg-red-500/20 text-red-300 border-red-500/40",
  P1: "bg-red-400/10 text-red-400 border-red-400/30",
  P2: "bg-orange-400/10 text-orange-400 border-orange-400/30",
  P3: "bg-yellow-400/10 text-yellow-400 border-yellow-400/30",
};

export default async function RvmDashboardPage() {
  const data = await fetchRvmMetrics(7);
  const { today, last7Days, health, complianceFailures, pendingOptOuts } = data;

  const kpis = [
    {
      label: "Drops today",
      value: today ? fmt(today.drops_attempted) : "—",
      sub: today ? `${fmt(today.drops_delivered)} delivered` : "No data yet",
      ok: !today || health.deliveryRate >= 0.85,
    },
    {
      label: "Delivery rate",
      value: today ? pct(health.deliveryRate) : "—",
      sub: "target ≥ 85%",
      ok: !today || health.deliveryRate >= 0.85,
    },
    {
      label: "Callback rate",
      value: today ? pct(health.callbackRate) : "—",
      sub: today ? `${fmt(today.callbacks_received)} callbacks` : "target ≥ 1%",
      ok: !today || today.drops_delivered < 100 || health.callbackRate >= 0.01,
    },
    {
      label: "Cost / callback",
      value: today && today.callbacks_received > 0 ? usd(health.costPerCallback) : "—",
      sub: "target ≤ $1.50",
      ok: !today || today.callbacks_received < 10 || health.costPerCallback <= 1.5,
    },
  ];

  const allAlerts = [
    ...(complianceFailures > 0
      ? [{ severity: "P0", code: "compliance_audit_gap", message: `${complianceFailures} drop(s) missing audit records today` }]
      : []),
    ...health.alerts,
  ];

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-12">
      {/* Header */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500">
          VOXARIS · RVM COWBOY · OBSERVABILITY
        </p>
        <h1 className="mt-1 text-2xl font-bold text-neutral-100">RVM Cowboy</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Ringless voicemail pipeline — delivery, callback, compliance health
        </p>
      </div>

      {/* Alerts */}
      {allAlerts.length > 0 && (
        <section className="flex flex-col gap-2">
          {allAlerts.map((a, i) => (
            <div
              key={i}
              className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${SEVERITY_COLOR[a.severity] ?? "bg-neutral-800 text-neutral-300 border-neutral-700"}`}
            >
              <span className="shrink-0 font-bold">{a.severity}</span>
              <span>
                <span className="font-semibold">{a.code}</span> — {a.message}
              </span>
            </div>
          ))}
        </section>
      )}

      {allAlerts.length === 0 && today && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
          <span className="font-bold">All clear</span>
          <span>— no active alerts</span>
        </div>
      )}

      {/* KPI cards */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((k) => (
          <div
            key={k.label}
            className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-5"
          >
            <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">{k.label}</p>
            <p className={`mt-2 text-3xl font-bold tabular-nums ${k.ok ? "text-neutral-100" : "text-red-400"}`}>
              {k.value}
            </p>
            <p className="mt-1 text-xs text-neutral-500">{k.sub}</p>
          </div>
        ))}
      </section>

      {/* 7-day trend table */}
      <section className="rounded-xl border border-neutral-800 bg-neutral-950/60 overflow-hidden">
        <div className="px-5 py-4 border-b border-neutral-800">
          <h2 className="text-sm font-semibold text-neutral-200">7-day trend</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-800 text-xs font-medium uppercase tracking-wider text-neutral-500">
                <th className="px-5 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-right">Attempted</th>
                <th className="px-4 py-3 text-right">Delivered</th>
                <th className="px-4 py-3 text-right">Del. rate</th>
                <th className="px-4 py-3 text-right">Callbacks</th>
                <th className="px-4 py-3 text-right">CB rate</th>
                <th className="px-4 py-3 text-right">QC fails</th>
                <th className="px-4 py-3 text-right">Cost</th>
              </tr>
            </thead>
            <tbody>
              {last7Days.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-8 text-center text-neutral-600">
                    No data yet — run the first batch to populate
                  </td>
                </tr>
              )}
              {last7Days.map((row, i) => {
                const delRate = row.drops_attempted > 0
                  ? row.drops_delivered / row.drops_attempted
                  : 0;
                const cbRate = row.drops_delivered > 0
                  ? row.callbacks_received / row.drops_delivered
                  : 0;
                return (
                  <tr
                    key={row.date}
                    className={`border-b border-neutral-800/50 ${i % 2 === 0 ? "" : "bg-neutral-900/30"}`}
                  >
                    <td className="px-5 py-3 font-mono text-neutral-300">{row.date}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-neutral-400">{fmt(row.drops_attempted)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-neutral-300">{fmt(row.drops_delivered)}</td>
                    <td className={`px-4 py-3 text-right tabular-nums font-medium ${delRate >= 0.85 ? "text-emerald-400" : "text-red-400"}`}>
                      {row.drops_attempted > 0 ? pct(delRate) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-neutral-300">{fmt(row.callbacks_received)}</td>
                    <td className={`px-4 py-3 text-right tabular-nums font-medium ${cbRate >= 0.01 ? "text-emerald-400" : row.drops_delivered >= 100 ? "text-red-400" : "text-neutral-500"}`}>
                      {row.drops_delivered > 0 ? pct(cbRate) : "—"}
                    </td>
                    <td className={`px-4 py-3 text-right tabular-nums ${row.qc_fail_count > 0 ? "text-orange-400" : "text-neutral-600"}`}>
                      {fmt(row.qc_fail_count)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-neutral-400">
                      {usd(row.cost_total_usd)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Compliance + suppression */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">Compliance failures</p>
          <p className={`mt-2 text-3xl font-bold tabular-nums ${complianceFailures === 0 ? "text-neutral-100" : "text-red-400"}`}>
            {fmt(complianceFailures)}
          </p>
          <p className="mt-1 text-xs text-neutral-500">drops missing audit records today — must be 0</p>
        </div>

        <div className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">Opt-outs today</p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-neutral-100">{fmt(pendingOptOuts)}</p>
          <p className="mt-1 text-xs text-neutral-500">suppressed today — propagated immediately</p>
        </div>

        <div className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">QC fail rate</p>
          <p className={`mt-2 text-3xl font-bold tabular-nums ${health.qcFailRate > 0.01 ? "text-orange-400" : "text-neutral-100"}`}>
            {today ? pct(health.qcFailRate) : "—"}
          </p>
          <p className="mt-1 text-xs text-neutral-500">target ≤ 1% — Rime generation quality</p>
        </div>
      </section>

      {/* Cron schedule reference */}
      <section className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-5">
        <h2 className="mb-3 text-sm font-semibold text-neutral-200">Pipeline schedule</h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 text-xs text-neutral-400">
          <div>
            <span className="font-mono text-neutral-300">11pm–5am ET</span>
            <span className="ml-2">Generation batch (overnight)</span>
          </div>
          <div>
            <span className="font-mono text-neutral-300">6am UTC daily</span>
            <span className="ml-2">Metrics rollup cron</span>
          </div>
          <div>
            <span className="font-mono text-neutral-300">Every hour</span>
            <span className="ml-2">Health check + Slack alerts</span>
          </div>
        </div>
      </section>
    </main>
  );
}
