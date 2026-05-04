// Transcript drawer — AI-Chat styling. Renders alternating bubbles
// with avatars when the source contains "Agent: ..." / "Caller: ..."
// turn markers; falls back to monospace block for raw text.
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Bot, User, Search, ChevronDown, Copy, Check } from "lucide-react";

type Role = "agent" | "caller" | "system";
type Turn = { role: Role; text: string; idx: number };

function parseTurns(transcript: string): Turn[] | null {
  const lines = transcript.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return null;

  const turns: Turn[] = [];
  const re = /^(agent|assistant|deedy|andie|caller|user|system)\s*:\s*(.*)$/i;
  let matched = 0;

  for (const line of lines) {
    const m = line.match(re);
    if (m && m[1] && m[2] !== undefined) {
      matched += 1;
      const tag = m[1].toLowerCase();
      const role: Role =
        tag === "caller" || tag === "user"
          ? "caller"
          : tag === "system"
            ? "system"
            : "agent";
      turns.push({ role, text: m[2], idx: turns.length });
    } else if (turns.length > 0) {
      const last = turns[turns.length - 1];
      if (last) last.text += " " + line;
    }
  }

  if (matched / lines.length < 0.5) return null;
  return turns;
}

function highlight(text: string, q: string): React.ReactNode {
  if (!q.trim()) return text;
  const re = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  const parts = text.split(re);
  return parts.map((part, i) =>
    re.test(part) ? (
      <mark
        key={i}
        className="rounded bg-cyan-400/30 px-0.5 text-cyan-100"
      >
        {part}
      </mark>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

export function TranscriptPanel({
  transcript,
  agentLabel = "Agent",
}: {
  transcript: string;
  agentLabel?: string;
}) {
  const turns = useMemo(() => parseTurns(transcript), [transcript]);
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState(false);
  const [autoscroll, setAutoscroll] = useState(true);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Stick to bottom while autoscroll is on
  useEffect(() => {
    if (!autoscroll) return;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [autoscroll, turns?.length]);

  const filtered = useMemo(() => {
    if (!turns || !query.trim()) return turns;
    const q = query.toLowerCase();
    return turns.filter((t) => t.text.toLowerCase().includes(q));
  }, [turns, query]);

  async function copyAll() {
    try {
      await navigator.clipboard.writeText(transcript);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      /* noop */
    }
  }

  if (!turns) {
    return (
      <div className="rounded-md border border-neutral-800 bg-neutral-900/60">
        <div className="flex items-center justify-between border-b border-neutral-800 px-3 py-2">
          <span className="text-xs font-medium uppercase tracking-widest text-neutral-500">
            Raw transcript
          </span>
          <button
            onClick={copyAll}
            className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200"
          >
            {copied ? (
              <Check className="h-3 w-3 text-emerald-400" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <pre className="max-h-[480px] overflow-y-auto whitespace-pre-wrap p-4 font-mono text-xs leading-relaxed text-neutral-300">
          {transcript}
        </pre>
      </div>
    );
  }

  const visibleTurnCount = filtered?.length ?? 0;

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950/40">
      {/* Header — search + count + actions */}
      <div className="flex flex-wrap items-center gap-3 border-b border-neutral-800 bg-neutral-900/40 px-3 py-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search transcript..."
            className="w-full rounded-md border border-neutral-800 bg-neutral-900 pl-8 pr-3 py-1.5 text-xs text-neutral-200 placeholder-neutral-500 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
          />
        </div>
        <span className="text-[11px] tabular-nums text-neutral-500">
          {visibleTurnCount} / {turns.length} turns
        </span>
        <label className="flex items-center gap-1.5 text-[11px] text-neutral-500">
          <input
            type="checkbox"
            checked={autoscroll}
            onChange={(e) => setAutoscroll(e.target.checked)}
            className="accent-cyan-500"
          />
          Auto-scroll
        </label>
        <button
          onClick={copyAll}
          className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200"
          title="Copy entire transcript"
        >
          {copied ? (
            <Check className="h-3 w-3 text-emerald-400" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      {/* Bubbles */}
      <div
        ref={scrollRef}
        className="max-h-[560px] space-y-3 overflow-y-auto p-4"
      >
        {(filtered ?? turns).length === 0 && (
          <p className="py-12 text-center text-sm text-neutral-500">
            No turns match &ldquo;{query}&rdquo;.
          </p>
        )}
        {(filtered ?? turns).map((t) => {
          if (t.role === "system") {
            return (
              <div
                key={t.idx}
                className="flex items-center gap-2 py-1"
              >
                <div className="h-px flex-1 bg-neutral-800" />
                <p className="text-[10px] uppercase tracking-widest text-neutral-500">
                  {t.text}
                </p>
                <div className="h-px flex-1 bg-neutral-800" />
              </div>
            );
          }
          const isAgent = t.role === "agent";
          return (
            <div
              key={t.idx}
              className={`flex items-end gap-2 ${
                isAgent ? "justify-start" : "justify-end flex-row-reverse"
              }`}
            >
              {/* Avatar */}
              <div
                className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border ${
                  isAgent
                    ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-300"
                    : "border-neutral-700 bg-neutral-800 text-neutral-300"
                }`}
                title={isAgent ? agentLabel : "Caller"}
              >
                {isAgent ? (
                  <Bot className="h-3.5 w-3.5" />
                ) : (
                  <User className="h-3.5 w-3.5" />
                )}
              </div>

              {/* Bubble */}
              <div
                className={`group relative max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
                  isAgent
                    ? "rounded-bl-md border border-neutral-800 bg-neutral-900 text-neutral-100"
                    : "rounded-br-md border border-cyan-500/20 bg-gradient-to-br from-cyan-500/15 to-cyan-500/5 text-cyan-50"
                }`}
              >
                <p className="mb-0.5 text-[10px] font-medium uppercase tracking-wider opacity-70">
                  {isAgent ? agentLabel : "Caller"}
                  <span className="ml-2 font-normal opacity-50">
                    #{t.idx + 1}
                  </span>
                </p>
                <p>{highlight(t.text, query)}</p>
                <button
                  onClick={() => navigator.clipboard.writeText(t.text)}
                  className="absolute -right-1 -top-1 rounded-full border border-neutral-700 bg-neutral-950 p-1 opacity-0 transition group-hover:opacity-100 hover:border-cyan-500/40"
                  title="Copy this turn"
                >
                  <Copy className="h-2.5 w-2.5 text-neutral-300" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Jump-to-bottom helper */}
      {!autoscroll && turns.length > 8 && (
        <button
          onClick={() => {
            setAutoscroll(true);
            const el = scrollRef.current;
            if (el) el.scrollTop = el.scrollHeight;
          }}
          className="absolute right-6 bottom-6 inline-flex items-center gap-1 rounded-full border border-neutral-700 bg-neutral-900/95 px-3 py-1.5 text-xs text-neutral-200 shadow-lg backdrop-blur hover:border-cyan-500/40"
        >
          <ChevronDown className="h-3.5 w-3.5" />
          Jump to latest
        </button>
      )}
    </div>
  );
}
