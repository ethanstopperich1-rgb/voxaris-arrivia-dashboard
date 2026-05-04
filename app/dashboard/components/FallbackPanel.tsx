type FallbackTotals = {
  stt: number;
  llm: number;
  tts: number;
};

const STAGES: { key: keyof FallbackTotals; label: string; tone: string }[] = [
  { key: "stt", label: "STT", tone: "text-cyan-400" },
  { key: "llm", label: "LLM", tone: "text-fuchsia-400" },
  { key: "tts", label: "TTS", tone: "text-amber-400" },
];

export function FallbackPanel({ totals }: { totals: FallbackTotals }) {
  const grand = totals.stt + totals.llm + totals.tts;
  return (
    <section className="rounded-lg border border-neutral-800">
      <header className="flex items-center justify-between border-b border-neutral-800 px-4 py-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-300">
          Fallback engagement
        </h2>
        <span className="text-xs text-neutral-500">{grand} total</span>
      </header>
      <div className="grid grid-cols-3 gap-3 p-4">
        {STAGES.map((s) => (
          <div key={s.key} className="text-center">
            <p className={`text-2xl font-semibold ${s.tone}`}>{totals[s.key]}</p>
            <p className="text-xs uppercase tracking-wider text-neutral-500">{s.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
