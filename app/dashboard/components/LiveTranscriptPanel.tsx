type Turn = {
  turn_index: number;
  user_question: string | null;
  agent_final: string | null;
  verifier_verdict: string | null;
  validator_status: string | null;
  response_source: string | null;
};

const VERDICT_COLOR: Record<string, string> = {
  APPROVE: "bg-emerald-900/40 text-emerald-300",
  REWRITE: "bg-cyan-900/40 text-cyan-300",
  DEFLECT: "bg-amber-900/40 text-amber-300",
  TRANSFER: "bg-fuchsia-900/40 text-fuchsia-300",
  skipped: "bg-neutral-800 text-neutral-400",
};

export function LiveTranscriptPanel({ turns }: { turns: Turn[] }) {
  return (
    <div className="space-y-3">
      {turns.map((t) => (
        <div key={t.turn_index} className="rounded border border-neutral-800 p-3">
          <p className="text-xs text-neutral-500">Turn {t.turn_index} · {t.response_source}</p>
          <p className="mt-1 text-sm text-neutral-300">user: {t.user_question}</p>
          <p className="mt-1 text-sm">agent: {t.agent_final}</p>
          <span className={`mt-2 inline-block rounded px-2 py-0.5 text-xs ${VERDICT_COLOR[t.verifier_verdict ?? "skipped"] ?? "bg-neutral-800"}`}>
            {t.verifier_verdict ?? "skipped"} · validator {t.validator_status ?? "—"}
          </span>
        </div>
      ))}
    </div>
  );
}
