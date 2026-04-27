import { supabaseAdmin } from "@/lib/clients/supabase-admin";

export type EvalSuite =
  | "router"
  | "answer_card"
  | "rag"
  | "validator"
  | "verifier"
  | "adversarial"
  | "latency"
  | "transfer";

export async function recordEvalRun(input: {
  suite: EvalSuite;
  git_sha?: string;
  total: number;
  passed: number;
  failed: number;
  p50_ms?: number;
  p95_ms?: number;
  p99_ms?: number;
  meta?: Record<string, unknown>;
  items: Array<{
    case_id: string;
    passed: boolean;
    expected?: unknown;
    actual?: unknown;
    reason?: string;
    duration_ms?: number;
  }>;
}): Promise<{ run_id: string }> {
  const sb = supabaseAdmin();
  const pass_rate = input.total === 0 ? 0 : input.passed / input.total;
  const { data: run, error } = await sb
    .from("eval_runs")
    .insert({
      suite: input.suite,
      git_sha: input.git_sha ?? null,
      total: input.total,
      passed: input.passed,
      failed: input.failed,
      pass_rate,
      p50_ms: input.p50_ms ?? null,
      p95_ms: input.p95_ms ?? null,
      p99_ms: input.p99_ms ?? null,
      meta: input.meta ?? {},
    })
    .select("id")
    .single();
  if (error || !run) throw new Error(`eval_runs insert: ${error?.message}`);
  if (input.items.length) {
    await sb.from("eval_items").insert(
      input.items.map((it) => ({
        run_id: run.id,
        case_id: it.case_id,
        passed: it.passed,
        expected: it.expected ?? null,
        actual: it.actual ?? null,
        reason: it.reason ?? null,
        duration_ms: it.duration_ms ?? null,
      })),
    );
  }
  return { run_id: run.id };
}

export function percentiles(values: number[]): { p50: number; p95: number; p99: number } {
  if (!values.length) return { p50: 0, p95: 0, p99: 0 };
  const s = [...values].sort((a, b) => a - b);
  const at = (p: number) => s[Math.min(s.length - 1, Math.floor(p * s.length))]!;
  return { p50: at(0.5), p95: at(0.95), p99: at(0.99) };
}
