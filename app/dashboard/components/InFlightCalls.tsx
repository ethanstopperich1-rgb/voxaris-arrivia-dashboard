// Live in-flight calls — the most impressive moment of the demo.
// Shows every call currently mid-conversation with a live duration
// counter and a pulsing cyan dot. Empty-state is intentionally calm
// ("No calls in flight") so a quiet moment doesn't look broken.
"use client";

import { useEffect, useState } from "react";
import { Phone, PhoneOutgoing } from "lucide-react";

type Call = {
  id: string;
  livekit_room_name: string | null;
  agent_name: string | null;
  direction: string | null;
  sip_caller_number: string | null;
  caller_name: string | null;
  started_at: string;
  ended_at: string | null;
};

// A call is treated as "in flight" only if:
//   1. It has a livekit_room_name (it's a real LK call)
//   2. ended_at is NULL (room_ended webhook hasn't landed)
//   3. started_at is within the last STALE_CUTOFF_MS
// (3) protects against the webhook silently dropping room_ended —
// without it, every old row sticks on the dashboard forever showing
// "LIVE 19:21". Real demo calls never run >15 min.
const STALE_CUTOFF_MS = 15 * 60 * 1000;

function maskPhone(p: string | null): string {
  if (!p) return "anonymous";
  if (p.length < 4) return "•••";
  return `•••-•••-${p.slice(-4)}`;
}

function agentLabel(a: string | null): string {
  if (a === "deedy-vba") return "Deedy";
  if (a === "andie-gvr") return "Andie";
  return a ?? "—";
}

function useElapsed(startedAt: string): string {
  const [now, setNow] = useState<number>(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const s = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

function Row({ c }: { c: Call }) {
  const elapsed = useElapsed(c.started_at);
  const isOutbound = c.direction === "outbound";
  return (
    <tr className="border-t border-neutral-900 transition hover:bg-neutral-900/40">
      <td className="px-4 py-3">
        <span className="inline-flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <span className="text-xs font-medium uppercase tracking-widest text-emerald-300">
            LIVE
          </span>
        </span>
      </td>
      <td className="px-4 py-3 text-neutral-200">{agentLabel(c.agent_name)}</td>
      <td className="px-4 py-3">
        <span className="inline-flex items-center gap-1.5 text-xs text-neutral-400">
          {isOutbound ? (
            <PhoneOutgoing className="h-3.5 w-3.5 text-cyan-400" />
          ) : (
            <Phone className="h-3.5 w-3.5 text-emerald-400" />
          )}
          {isOutbound ? "outbound" : "inbound"}
        </span>
      </td>
      <td className="px-4 py-3 text-neutral-300">
        {c.caller_name ?? maskPhone(c.sip_caller_number)}
      </td>
      <td className="px-4 py-3 font-mono tabular-nums text-cyan-300">{elapsed}</td>
    </tr>
  );
}

export function InFlightCalls({ calls }: { calls: Call[] }) {
  const cutoff = Date.now() - STALE_CUTOFF_MS;
  const liveCalls = calls.filter(
    (c) =>
      c.livekit_room_name !== null &&
      c.ended_at === null &&
      new Date(c.started_at).getTime() >= cutoff,
  );
  return (
    <section className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950/60">
      <header className="flex items-center justify-between border-b border-neutral-800 bg-neutral-900/40 px-4 py-3">
        <h2 className="text-sm font-semibold text-neutral-100">In-flight calls</h2>
        <span className="inline-flex items-center gap-1.5 text-xs text-neutral-500">
          {liveCalls.length > 0 && (
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-cyan-500" />
            </span>
          )}
          {liveCalls.length} {liveCalls.length === 1 ? "call" : "calls"} · auto-updating
        </span>
      </header>
      {liveCalls.length === 0 ? (
        <div className="px-4 py-10 text-center text-sm text-neutral-500">
          No calls in flight. <span className="text-neutral-600">Inbound numbers are armed.</span>
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead className="bg-neutral-900/30 text-left text-[10px] uppercase tracking-widest text-neutral-500">
            <tr>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Agent</th>
              <th className="px-4 py-2 font-medium">Direction</th>
              <th className="px-4 py-2 font-medium">Caller</th>
              <th className="px-4 py-2 font-medium">Elapsed</th>
            </tr>
          </thead>
          <tbody>
            {liveCalls.map((c) => (
              <Row key={c.id} c={c} />
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
