type ToolStat = {
  tool_name: string;
  calls: number;
  successes: number;
  failures: number;
  avg_duration_ms: number;
};

const TRACKED_TOOLS: string[] = [
  "lookup_qa",
  "lookup_objection",
  "opc_book",
  "send_sms_confirmation",
  "transfer_to_specialist",
  "send_scheduler_link",
];

export function ToolSuccessTable({ stats }: { stats: ToolStat[] }) {
  const map = new Map(stats.map((s) => [s.tool_name, s]));
  return (
    <section className="rounded-lg border border-neutral-800">
      <header className="border-b border-neutral-800 px-4 py-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-300">
          Tool invocations
        </h2>
      </header>
      <table className="w-full text-sm">
        <thead className="text-left text-xs uppercase tracking-wider text-neutral-500">
          <tr>
            <th className="px-4 py-2">Tool</th>
            <th className="px-4 py-2 text-right">Calls</th>
            <th className="px-4 py-2 text-right">Success</th>
            <th className="px-4 py-2 text-right">Avg ms</th>
          </tr>
        </thead>
        <tbody>
          {TRACKED_TOOLS.map((name) => {
            const s = map.get(name);
            const calls = s?.calls ?? 0;
            const successes = s?.successes ?? 0;
            const rate = calls > 0 ? Math.round((successes / calls) * 100) : null;
            const avg = s?.avg_duration_ms ?? 0;
            const rateColor =
              rate == null
                ? "text-neutral-500"
                : rate >= 95
                  ? "text-emerald-400"
                  : rate >= 80
                    ? "text-cyan-400"
                    : "text-amber-400";
            return (
              <tr key={name} className="border-t border-neutral-900">
                <td className="px-4 py-2 font-mono text-xs">{name}</td>
                <td className="px-4 py-2 text-right">{calls}</td>
                <td className={`px-4 py-2 text-right ${rateColor}`}>
                  {rate == null ? "—" : `${rate}%`}
                </td>
                <td className="px-4 py-2 text-right">{calls > 0 ? Math.round(avg) : "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
