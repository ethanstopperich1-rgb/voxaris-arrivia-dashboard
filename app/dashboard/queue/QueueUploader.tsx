"use client";

// CSV uploader for the dial queue.
// Two paths:
//   1. "Add as parsed" → bulk-insert in CSV order, ai_score = NULL
//   2. "Score with AI" → batch Grok call, sort by score, highlight top 20,
//      let user "Add top 20" or "Add all (sorted)"
//
// Columns (case-insensitive, any order):
//   phone_number (required)
//   member_name | name | first_name
//   agent_name | agent     (default "andie-gvr")
//   incentive_amount, transfer_bonus_amount, total_after_bonus,
//   is_returning_caller, last_call_date, ...
// Anything beyond the recognized fields is folded into `metadata`
// and passed to the agent as dynamic-variable context.

import { useState, useTransition } from "react";
import {
  Upload,
  Loader2,
  CheckCircle2,
  XCircle,
  Sparkles,
  Trophy,
  ListPlus,
} from "lucide-react";
import { bulkEnqueue } from "./actions";
import { scoreLeads, type ScoredRow } from "./scoreActions";

type Row = {
  agent_name: "andie-gvr" | "deedy-vba";
  phone_number: string;
  member_name?: string;
  metadata?: Record<string, unknown>;
};

function parseCsv(raw: string, defaultAgent: "andie-gvr" | "deedy-vba"): Row[] {
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];

  const first: string = lines[0] ?? "";
  const looksLikeHeader = /[a-zA-Z]/.test(first) && !/^\+?\d{7,}/.test(first);
  let headers: string[];
  let dataLines: string[];
  if (looksLikeHeader) {
    headers = first.split(",").map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
    dataLines = lines.slice(1);
  } else {
    headers = ["phone_number", "member_name"];
    dataLines = lines;
  }

  const known = new Set([
    "phone_number",
    "phone",
    "number",
    "to",
    "member_name",
    "name",
    "first_name",
    "agent_name",
    "agent",
  ]);

  const rows: Row[] = [];
  for (const line of dataLines) {
    const cells = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h] = cells[i] ?? "";
    });
    const phone = obj["phone_number"] ?? obj["phone"] ?? obj["number"] ?? obj["to"] ?? "";
    if (!phone) continue;
    const name = obj["member_name"] ?? obj["name"] ?? obj["first_name"] ?? undefined;
    const agent =
      obj["agent_name"] === "deedy-vba" || obj["agent"] === "deedy-vba"
        ? "deedy-vba"
        : defaultAgent;
    const metadata: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (!v) continue;
      if (known.has(k)) continue;
      metadata[k] = v;
    }
    rows.push({
      agent_name: agent,
      phone_number: phone,
      member_name: name?.trim() || undefined,
      metadata: Object.keys(metadata).length ? metadata : undefined,
    });
  }
  return rows;
}

type ScoredView = ScoredRow & { rank: number };

function maskPhone(p: string): string {
  if (p.length < 4) return "•••";
  return `•••-•••-${p.slice(-4)}`;
}

function scoreColor(score: number): string {
  if (score >= 80) return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
  if (score >= 60) return "bg-cyan-500/15 text-cyan-300 border-cyan-500/30";
  if (score >= 40) return "bg-amber-500/15 text-amber-300 border-amber-500/30";
  return "bg-rose-500/15 text-rose-300 border-rose-500/30";
}

export function QueueUploader() {
  const [text, setText] = useState("");
  const [agent, setAgent] = useState<"andie-gvr" | "deedy-vba">("andie-gvr");
  const [insertPending, startInsert] = useTransition();
  const [scorePending, startScore] = useTransition();
  const [scored, setScored] = useState<ScoredView[] | null>(null);
  const [scoreNote, setScoreNote] = useState<string | null>(null);
  const [result, setResult] = useState<
    | { kind: "idle" }
    | { kind: "ok"; inserted: number; skipped: number }
    | { kind: "err"; message: string }
  >({ kind: "idle" });

  const previewRows = text.trim() ? parseCsv(text, agent) : [];

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      setText(typeof reader.result === "string" ? reader.result : "");
      setScored(null);
      setScoreNote(null);
    };
    reader.readAsText(f);
  }

  function onTextChange(v: string) {
    setText(v);
    setScored(null);
    setScoreNote(null);
    setResult({ kind: "idle" });
  }

  function addAsParsed() {
    if (previewRows.length === 0) return;
    startInsert(async () => {
      const res = await bulkEnqueue(previewRows);
      if (res.errors.length > 0 && res.inserted === 0) {
        setResult({ kind: "err", message: res.errors.slice(0, 3).join("; ") });
      } else {
        setResult({ kind: "ok", inserted: res.inserted, skipped: res.skipped });
        setText("");
        setScored(null);
      }
    });
  }

  function runAiScore() {
    if (previewRows.length === 0) return;
    startScore(async () => {
      const res = await scoreLeads(previewRows);
      const ranked = [...res.scored]
        .sort((a, b) => b.ai_score - a.ai_score)
        .map((r, i) => ({ ...r, rank: i + 1 }));
      setScored(ranked);
      setScoreNote(
        res.fallbackUsed
          ? `Heuristic fallback used${res.error ? ` (${res.error})` : ""}.`
          : `Scored ${ranked.length} leads with the Voxaris ranking engine.`,
      );
    });
  }

  function addTop20() {
    if (!scored) return;
    const top = scored.slice(0, 20);
    startInsert(async () => {
      const res = await bulkEnqueue(top);
      if (res.errors.length > 0 && res.inserted === 0) {
        setResult({ kind: "err", message: res.errors.slice(0, 3).join("; ") });
      } else {
        setResult({ kind: "ok", inserted: res.inserted, skipped: res.skipped });
        setScored(null);
        setText("");
      }
    });
  }

  function addAllSorted() {
    if (!scored) return;
    startInsert(async () => {
      const res = await bulkEnqueue(scored);
      if (res.errors.length > 0 && res.inserted === 0) {
        setResult({ kind: "err", message: res.errors.slice(0, 3).join("; ") });
      } else {
        setResult({ kind: "ok", inserted: res.inserted, skipped: res.skipped });
        setScored(null);
        setText("");
      }
    });
  }

  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-950/60 p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold text-neutral-100">Add to queue</h2>
        <span className="text-[10px] uppercase tracking-widest text-neutral-500">
          CSV paste or upload · AI lead scoring
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
        <div>
          <label className="block text-[10px] font-medium uppercase tracking-widest text-neutral-500">
            Default agent
          </label>
          <div className="mt-1 inline-flex rounded-md border border-neutral-800 bg-neutral-900 p-0.5 text-xs">
            {(["andie-gvr", "deedy-vba"] as const).map((a) => (
              <button
                key={a}
                onClick={() => setAgent(a)}
                className={`px-3 py-1 rounded ${
                  agent === a
                    ? "bg-cyan-500/15 text-cyan-300"
                    : "text-neutral-400 hover:text-neutral-200"
                }`}
              >
                {a === "andie-gvr" ? "Andie" : "Deedy"}
              </button>
            ))}
          </div>
        </div>
        <label className="inline-flex items-center gap-2 rounded-md border border-dashed border-neutral-700 bg-neutral-900/40 px-3 py-2 text-xs text-neutral-300 hover:border-cyan-500/40 hover:text-cyan-200 cursor-pointer">
          <Upload className="h-3.5 w-3.5" />
          Upload .csv
          <input type="file" accept=".csv,text/csv" className="hidden" onChange={onFile} />
        </label>
      </div>

      <textarea
        value={text}
        onChange={(e) => onTextChange(e.target.value)}
        rows={6}
        placeholder={`phone_number,member_name,incentive_amount,is_returning_caller,last_call_date\n+14078195809,Stacey Johnson,$250,true,Mar 12 2026\n+15555550100,Jamie Davis,$250,false,never`}
        className="mt-3 w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 font-mono text-xs text-neutral-100 placeholder-neutral-500 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
      />

      {previewRows.length > 0 && !scored && (
        <p className="mt-2 text-[11px] text-neutral-500">
          Parsed <span className="text-neutral-200 tabular-nums">{previewRows.length}</span> row(s)
          (default agent: {agent}).
        </p>
      )}

      {/* Action row */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-neutral-800 pt-4">
        <p className="text-[11px] text-neutral-500">
          Cron auto-dials every 30 min, M–F 9am–6pm ET, capped at 20 in flight per agent.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {!scored && (
            <>
              <button
                type="button"
                onClick={runAiScore}
                disabled={scorePending || previewRows.length === 0}
                className="inline-flex items-center gap-2 rounded-md border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-500/15 disabled:opacity-50"
              >
                {scorePending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                {scorePending ? "Scoring..." : "Score with AI"}
              </button>
              <button
                type="button"
                onClick={addAsParsed}
                disabled={insertPending || previewRows.length === 0}
                className="inline-flex items-center gap-2 rounded-md bg-cyan-500 px-4 py-2 text-sm font-semibold text-neutral-950 transition hover:bg-cyan-400 disabled:opacity-50"
              >
                {insertPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ListPlus className="h-4 w-4" />
                )}
                {insertPending ? "Adding..." : `Add ${previewRows.length || ""} as-is`}
              </button>
            </>
          )}
          {scored && (
            <>
              <button
                type="button"
                onClick={() => setScored(null)}
                className="text-xs text-neutral-400 hover:text-neutral-200"
              >
                Clear ranking
              </button>
              <button
                type="button"
                onClick={addAllSorted}
                disabled={insertPending}
                className="inline-flex items-center gap-2 rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-xs text-neutral-200 transition hover:border-neutral-600 disabled:opacity-50"
              >
                Add all {scored.length} (sorted)
              </button>
              <button
                type="button"
                onClick={addTop20}
                disabled={insertPending}
                className="inline-flex items-center gap-2 rounded-md bg-cyan-500 px-4 py-2 text-sm font-semibold text-neutral-950 transition hover:bg-cyan-400 disabled:opacity-50"
              >
                {insertPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trophy className="h-4 w-4" />
                )}
                {insertPending ? "Adding..." : `Add top ${Math.min(20, scored.length)}`}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Scored preview */}
      {scored && (
        <div className="mt-5 overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950/40">
          <div className="flex items-center justify-between border-b border-neutral-800 bg-neutral-900/40 px-3 py-2">
            <span className="text-xs font-medium text-neutral-200">
              AI ranking ({scored.length} leads · top 20 highlighted)
            </span>
            {scoreNote && (
              <span className="text-[11px] text-neutral-500">{scoreNote}</span>
            )}
          </div>
          <div className="max-h-[420px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-neutral-900/30 text-left text-[10px] uppercase tracking-widest text-neutral-500 sticky top-0">
                <tr>
                  <th className="px-3 py-2 font-medium w-12">#</th>
                  <th className="px-3 py-2 font-medium w-20">Score</th>
                  <th className="px-3 py-2 font-medium">Recipient</th>
                  <th className="px-3 py-2 font-medium">Phone</th>
                  <th className="px-3 py-2 font-medium">Why</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-900">
                {scored.map((r) => {
                  const inTop = r.rank <= 20;
                  return (
                    <tr
                      key={`${r.phone_number}-${r.rank}`}
                      className={inTop ? "bg-cyan-500/[0.04]" : ""}
                    >
                      <td className="px-3 py-2 tabular-nums">
                        <span className={inTop ? "text-cyan-300 font-semibold" : "text-neutral-500"}>
                          {r.rank}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold tabular-nums ${scoreColor(r.ai_score)}`}
                        >
                          {r.ai_score}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-neutral-200">
                        {r.member_name ?? <span className="text-neutral-500">—</span>}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs text-neutral-400">
                        {maskPhone(r.phone_number)}
                      </td>
                      <td className="px-3 py-2 text-xs text-neutral-400">
                        {r.ai_score_reason}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Result toast */}
      {result.kind === "ok" && (
        <div className="mt-4 flex items-start gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm text-emerald-100">
          <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-400" />
          Inserted {result.inserted}, skipped {result.skipped}.
        </div>
      )}
      {result.kind === "err" && (
        <div className="mt-4 flex items-start gap-2 rounded-md border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-100">
          <XCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-400" />
          {result.message}
        </div>
      )}
    </div>
  );
}
