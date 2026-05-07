"use client";

// Manual trigger for the dial-batch cron — fires the cron endpoint once
// with the CRON_SECRET so we don't have to wait for the next scheduled
// tick. Used during testing / launch validation.
//
// Same code path as the scheduled cron run — this just kicks it off
// immediately so you can load 10 leads, click "Run now," and watch the
// queue drain in real time on the table below.

import { useState, useTransition } from "react";
import { Loader2, Play, Check, AlertCircle } from "lucide-react";
import { triggerDialBatchNow } from "./actions";

type Result =
  | { kind: "ok"; dialed: number; failed: number; pool: number }
  | { kind: "skip"; reason: string }
  | { kind: "err"; message: string };

export function TriggerNowButton() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<Result | null>(null);

  const onClick = () => {
    setResult(null);
    startTransition(async () => {
      const res = await triggerDialBatchNow();
      if (!res.ok) {
        setResult({ kind: "err", message: res.error ?? "unknown error" });
        return;
      }
      const summary = res.summary as
        | {
            ok?: boolean;
            total_dialed?: number;
            total_failed?: number;
            results?: Array<{
              agent?: string;
              dialed?: number;
              failed?: number;
              pool?: number;
              skipped_concurrency?: boolean;
            }>;
          }
        | undefined;

      if (!summary) {
        setResult({ kind: "err", message: "no summary returned" });
        return;
      }

      const dialed = summary.total_dialed ?? 0;
      const failed = summary.total_failed ?? 0;
      const pool =
        summary.results?.reduce((acc, r) => acc + (r.pool ?? 0), 0) ?? 0;
      const skipped = summary.results?.some((r) => r.skipped_concurrency);

      if (skipped && dialed === 0) {
        setResult({
          kind: "skip",
          reason: "Concurrency cap reached (100). Wait for in-flight calls to finish.",
        });
        return;
      }
      setResult({ kind: "ok", dialed, failed, pool });
    });
  };

  return (
    <section className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onClick}
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-md bg-cyan-500 px-4 py-2 text-sm font-semibold text-neutral-950 transition hover:bg-cyan-400 disabled:opacity-50"
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          {pending ? "Running…" : "Run dial batch now"}
        </button>
        <p className="text-xs text-neutral-400">
          Manual cron trigger — fires the same code path that runs every
          minute on schedule. Use after loading leads to test immediately.
        </p>
      </div>

      {result && result.kind === "ok" && (
        <div className="mt-3 flex items-center gap-2 rounded-md border border-emerald-700/40 bg-emerald-950/30 px-3 py-2 text-xs text-emerald-200">
          <Check className="h-3.5 w-3.5" />
          Dispatched <strong>{result.dialed}</strong>{" "}
          {result.dialed === 1 ? "call" : "calls"}
          {result.failed > 0 ? ` (${result.failed} failed)` : ""} from a pool
          of {result.pool}.
        </div>
      )}
      {result && result.kind === "skip" && (
        <div className="mt-3 flex items-center gap-2 rounded-md border border-amber-700/40 bg-amber-950/30 px-3 py-2 text-xs text-amber-200">
          <AlertCircle className="h-3.5 w-3.5" />
          {result.reason}
        </div>
      )}
      {result && result.kind === "err" && (
        <div className="mt-3 flex items-center gap-2 rounded-md border border-red-700/40 bg-red-950/30 px-3 py-2 text-xs text-red-200">
          <AlertCircle className="h-3.5 w-3.5" />
          {result.message}
        </div>
      )}
    </section>
  );
}
