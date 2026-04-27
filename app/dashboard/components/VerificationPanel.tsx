type Turn = { verifier_verdict: string | null };

export function VerificationPanel({ turns }: { turns: Turn[] }) {
  const counts = turns.reduce<Record<string, number>>((acc, t) => {
    const k = t.verifier_verdict ?? "skipped";
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});
  const total = turns.length || 1;
  const order = ["APPROVE", "REWRITE", "DEFLECT", "TRANSFER", "skipped"] as const;
  const color: Record<string, string> = {
    APPROVE: "text-emerald-400",
    REWRITE: "text-cyan-400",
    DEFLECT: "text-amber-400",
    TRANSFER: "text-fuchsia-400",
    skipped: "text-neutral-500",
  };
  return (
    <section className="rounded-lg border border-neutral-800">
      <header className="border-b border-neutral-800 px-4 py-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-300">
          Verification verdicts
        </h2>
      </header>
      <div className="grid grid-cols-5 gap-3 p-4">
        {order.map((k) => (
          <div key={k} className="text-center">
            <p className={`text-2xl font-semibold ${color[k]}`}>{counts[k] ?? 0}</p>
            <p className="text-xs uppercase tracking-wider text-neutral-500">{k}</p>
            <p className="text-xs text-neutral-500">{Math.round(((counts[k] ?? 0) / total) * 100)}%</p>
          </div>
        ))}
      </div>
    </section>
  );
}
