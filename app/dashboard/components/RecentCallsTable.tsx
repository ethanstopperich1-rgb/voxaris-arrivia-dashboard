type Call = {
  id: string;
  livekit_room_name: string | null;
  agent_name: string | null;
  direction: string | null;
  sip_caller_number: string | null;
  started_at: string;
  ended_at: string | null;
  outcome: string | null;
  transfer_success: boolean | null;
  llm_prompt_tokens: number | null;
  llm_completion_tokens: number | null;
};

function durationLabel(started: string, ended: string | null): string {
  if (!ended) return "live";
  const ms = new Date(ended).getTime() - new Date(started).getTime();
  if (ms <= 0) return "—";
  const s = Math.round(ms / 1000);
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
}

function maskPhone(p: string | null): string {
  if (!p) return "—";
  if (p.length < 4) return p;
  return `${p.slice(0, -4)}••${p.slice(-2)}`;
}

export function RecentCallsTable({ calls }: { calls: Call[] }) {
  return (
    <section className="rounded-lg border border-neutral-800">
      <header className="flex items-center justify-between border-b border-neutral-800 px-4 py-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-300">
          Recent calls
        </h2>
        <span className="text-xs text-neutral-500">{calls.length} shown</span>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wider text-neutral-500">
            <tr>
              <th className="px-4 py-2">Room</th>
              <th className="px-4 py-2">Agent</th>
              <th className="px-4 py-2">Dir</th>
              <th className="px-4 py-2">Caller</th>
              <th className="px-4 py-2">Started</th>
              <th className="px-4 py-2">Duration</th>
              <th className="px-4 py-2">Outcome</th>
              <th className="px-4 py-2 text-right">LLM</th>
              <th className="px-4 py-2">Transfer</th>
            </tr>
          </thead>
          <tbody>
            {calls.length === 0 ? (
              <tr>
                <td className="px-4 py-3 text-sm text-neutral-500" colSpan={9}>
                  No calls in window.
                </td>
              </tr>
            ) : (
              calls.map((c) => {
                const tokens = (c.llm_prompt_tokens ?? 0) + (c.llm_completion_tokens ?? 0);
                return (
                  <tr key={c.id} className="border-t border-neutral-900">
                    <td className="px-4 py-2 font-mono text-xs text-neutral-300">
                      {c.livekit_room_name ?? "—"}
                    </td>
                    <td className="px-4 py-2 text-xs">{c.agent_name ?? "—"}</td>
                    <td className="px-4 py-2 text-xs">{c.direction ?? "—"}</td>
                    <td className="px-4 py-2 font-mono text-xs">{maskPhone(c.sip_caller_number)}</td>
                    <td className="px-4 py-2 text-xs">
                      {new Date(c.started_at).toLocaleTimeString()}
                    </td>
                    <td className="px-4 py-2 text-xs">{durationLabel(c.started_at, c.ended_at)}</td>
                    <td className="px-4 py-2 text-xs">{c.outcome ?? "in-progress"}</td>
                    <td className="px-4 py-2 text-right text-xs">{tokens.toLocaleString()}</td>
                    <td className="px-4 py-2 text-xs">
                      {c.transfer_success === true ? (
                        <span className="text-emerald-400">bridged</span>
                      ) : c.transfer_success === false ? (
                        <span className="text-amber-400">failed</span>
                      ) : (
                        <span className="text-neutral-500">—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
