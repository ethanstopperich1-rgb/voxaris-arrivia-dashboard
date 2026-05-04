// At-a-glance KPI counters for the Overview page. The "In flight" tile
// uses GlowingCard (orbiting dot + cyan ring) so a viewer can see at a
// glance whether calls are actively happening — animation = live data.
// Other tiles use BorderBeam on hover for subtle motion polish.
import { GlowingCard } from "@/components/ui/glowing-card";
import { BorderBeam } from "@/components/ui/border-beam";

type Counters = {
  callsLast6h: number;
  callsInFlight: number;
  avgDurationSeconds: number;
  totalLlmTokens: number;
};

function formatSeconds(s: number): string {
  if (!Number.isFinite(s) || s <= 0) return "—";
  const m = Math.floor(s / 60);
  const r = Math.round(s % 60);
  return m > 0 ? `${m}m ${r}s` : `${r}s`;
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

export function AtAGlanceCounters({ counters }: { counters: Counters }) {
  return (
    <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {/* Hero tile — calls in flight, with orbiting accent dot */}
      <GlowingCard
        label="In flight"
        value={counters.callsInFlight}
        caption={
          counters.callsInFlight > 0
            ? `${counters.callsInFlight === 1 ? "1 call" : `${counters.callsInFlight} calls`} live now`
            : "No active calls"
        }
      />

      {/* Standard tiles */}
      <KpiTile label="Calls (6h)" value={counters.callsLast6h.toString()} />
      <KpiTile label="Avg duration" value={formatSeconds(counters.avgDurationSeconds)} />
      <KpiTile label="LLM tokens" value={formatTokens(counters.totalLlmTokens)} />
    </section>
  );
}

function KpiTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950/50 p-5 transition hover:border-neutral-700">
      <p className="text-[10px] font-medium uppercase tracking-widest text-neutral-500">
        {label}
      </p>
      <p className="mt-2 text-3xl font-semibold tabular-nums text-neutral-100 sm:text-4xl">
        {value}
      </p>
      {/* Beam runs while hovered — quiet by default */}
      <BorderBeam
        size={120}
        duration={8}
        colorFrom="#22d3ee"
        colorTo="#06b6d4"
        className="opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      />
    </div>
  );
}
