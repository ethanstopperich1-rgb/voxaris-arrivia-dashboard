type AgentTotals = {
  agent_name: string;
  calls: number;
  llm_tokens: number;
  tts_characters: number;
  stt_audio_seconds: number;
};

const KNOWN_AGENTS: { id: string; label: string; brand: string }[] = [
  { id: "deedy-vba", label: "Deedy", brand: "Arrivia" },
  { id: "andie-gvr", label: "Andie", brand: "GVR" },
];

export function AgentSplit({ totals }: { totals: AgentTotals[] }) {
  const map = new Map(totals.map((t) => [t.agent_name, t]));
  return (
    <section className="rounded-lg border border-neutral-800">
      <header className="border-b border-neutral-800 px-4 py-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-300">
          Per-agent split
        </h2>
      </header>
      <div className="grid grid-cols-2 divide-x divide-neutral-900">
        {KNOWN_AGENTS.map((a) => {
          const t = map.get(a.id);
          const calls = t?.calls ?? 0;
          const tokens = t?.llm_tokens ?? 0;
          const ttsChars = t?.tts_characters ?? 0;
          const sttSecs = t?.stt_audio_seconds ?? 0;
          return (
            <div key={a.id} className="px-4 py-4">
              <p className="text-xs uppercase tracking-wider text-neutral-500">
                {a.label}{" "}
                <span className="text-neutral-600">· {a.brand}</span>
              </p>
              <p className="mt-2 text-3xl font-semibold text-neutral-100">{calls}</p>
              <p className="text-xs text-neutral-500">calls</p>
              <dl className="mt-3 grid grid-cols-3 gap-2 text-xs text-neutral-400">
                <div>
                  <dt className="text-neutral-500">LLM</dt>
                  <dd>{tokens.toLocaleString()}</dd>
                </div>
                <div>
                  <dt className="text-neutral-500">TTS chars</dt>
                  <dd>{ttsChars.toLocaleString()}</dd>
                </div>
                <div>
                  <dt className="text-neutral-500">STT s</dt>
                  <dd>{Math.round(sttSecs)}</dd>
                </div>
              </dl>
            </div>
          );
        })}
      </div>
    </section>
  );
}
