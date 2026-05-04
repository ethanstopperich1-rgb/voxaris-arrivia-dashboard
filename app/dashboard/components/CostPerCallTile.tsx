// Cost-per-call tile — Arrivia's first question on a sales call:
// "what does this cost vs. our human reps?"
//
// Formulas (per-token / per-char / per-second pricing as of 2026-05):
//   LLM   xAI Grok 4.1 Fast: $0.20/1M prompt + $0.50/1M completion
//   TTS   Rime mistv3:        $30/1M characters
//   STT   Deepgram Nova-3:   ~$0.0059/min  ($0.0059/60s = $0.0000983/s)
//
// (We chain through fallbacks so actual mix may shift; this is the
// expected-case primary-stack rate. Reviewer-grade close-enough.)
import { BorderBeam } from "@/components/ui/border-beam";

const LLM_IN_PER_TOKEN = 0.20 / 1_000_000;
const LLM_OUT_PER_TOKEN = 0.50 / 1_000_000;
const TTS_PER_CHAR = 30 / 1_000_000;
const STT_PER_SECOND = 0.0059 / 60;
const SESSION_PER_MINUTE = 0.01;
const TELEPHONY_PER_MINUTE = 0.01;

type Totals = {
  callsCompleted: number;
  llmIn: number;
  llmOut: number;
  ttsChars: number;
  sttSeconds: number;
  totalDurationSeconds: number;
};

function fmt$(n: number): string {
  if (n < 0.01) return `$${n.toFixed(4)}`;
  if (n < 1) return `$${n.toFixed(3)}`;
  return `$${n.toFixed(2)}`;
}

export function CostPerCallTile({ totals }: { totals: Totals }) {
  const llmCost = totals.llmIn * LLM_IN_PER_TOKEN + totals.llmOut * LLM_OUT_PER_TOKEN;
  const ttsCost = totals.ttsChars * TTS_PER_CHAR;
  const sttCost = totals.sttSeconds * STT_PER_SECOND;
  const minutes = totals.totalDurationSeconds / 60;
  const sessionCost = minutes * SESSION_PER_MINUTE;
  const telephonyCost = minutes * TELEPHONY_PER_MINUTE;
  const total = llmCost + ttsCost + sttCost + sessionCost + telephonyCost;
  const calls = Math.max(1, totals.callsCompleted);
  const perCall = total / calls;
  const perMinute = minutes > 0 ? total / minutes : 0;

  const breakdown: { label: string; v: number; cls: string }[] = [
    { label: "LLM", v: llmCost, cls: "bg-cyan-500" },
    { label: "TTS", v: ttsCost, cls: "bg-violet-500" },
    { label: "STT", v: sttCost, cls: "bg-emerald-500" },
    { label: "Session", v: sessionCost, cls: "bg-amber-500" },
    { label: "Telephony", v: telephonyCost, cls: "bg-rose-500" },
  ];

  return (
    <div className="relative overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950/60 p-5">
      <p className="text-[10px] font-medium uppercase tracking-widest text-cyan-300/80">
        Cost per call
      </p>
      <p className="mt-1 text-4xl font-semibold tabular-nums text-neutral-100 sm:text-5xl">
        {fmt$(perCall)}
      </p>
      <p className="mt-1 text-xs text-neutral-500">
        {fmt$(perMinute)}/min · {totals.callsCompleted} completed
      </p>

      {total > 0 && (
        <>
          <div className="mt-4 flex h-1.5 w-full overflow-hidden rounded-full bg-neutral-900">
            {breakdown.map((b) => {
              if (b.v === 0) return null;
              const w = (b.v / total) * 100;
              return (
                <span
                  key={b.label}
                  className={b.cls}
                  style={{ width: `${w}%` }}
                  title={`${b.label}: ${fmt$(b.v)} (${Math.round(w)}%)`}
                />
              );
            })}
          </div>
          <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
            {breakdown.map((b) => (
              <li key={b.label} className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-neutral-400">
                  <span className={`h-1.5 w-1.5 rounded-full ${b.cls}`} />
                  {b.label}
                </span>
                <span className="tabular-nums text-neutral-500">{fmt$(b.v)}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      <BorderBeam size={120} duration={10} colorFrom="#22d3ee" colorTo="#06b6d4" />
    </div>
  );
}
