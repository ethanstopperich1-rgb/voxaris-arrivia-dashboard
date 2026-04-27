type Call = {
  id: string;
  retell_call_id: string | null;
  started_at: string;
  ended_at: string | null;
  outcome: string | null;
  transfer_success: boolean | null;
};

export function ActiveCallTable({ calls }: { calls: Call[] }) {
  return (
    <section className="rounded-lg border border-neutral-800">
      <header className="flex items-center justify-between border-b border-neutral-800 px-4 py-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-300">Recent calls</h2>
        <span className="text-xs text-neutral-500">{calls.length} shown</span>
      </header>
      <table className="w-full text-sm">
        <thead className="text-left text-xs uppercase tracking-wider text-neutral-500">
          <tr>
            <th className="px-4 py-2">Call ID</th>
            <th className="px-4 py-2">Started</th>
            <th className="px-4 py-2">Ended</th>
            <th className="px-4 py-2">Outcome</th>
            <th className="px-4 py-2">Transfer</th>
          </tr>
        </thead>
        <tbody>
          {calls.map((c) => (
            <tr key={c.id} className="border-t border-neutral-900">
              <td className="px-4 py-2 font-mono text-xs">{c.retell_call_id ?? "—"}</td>
              <td className="px-4 py-2">{new Date(c.started_at).toLocaleTimeString()}</td>
              <td className="px-4 py-2">{c.ended_at ? new Date(c.ended_at).toLocaleTimeString() : "live"}</td>
              <td className="px-4 py-2">{c.outcome ?? "in-progress"}</td>
              <td className="px-4 py-2">
                {c.transfer_success === true ? (
                  <span className="text-emerald-400">bridged</span>
                ) : c.transfer_success === false ? (
                  <span className="text-amber-400">failed</span>
                ) : (
                  <span className="text-neutral-500">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
