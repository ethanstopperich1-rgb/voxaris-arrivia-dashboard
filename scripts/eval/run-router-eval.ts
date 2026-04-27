import "dotenv/config";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { routeUtterance } from "../../lib/engine/router";
import { recordEvalRun, percentiles } from "../../lib/observability/eval-logger";

type Case = { id: string; utterance: string; expected_intent: string; expected_mode?: string };

async function main() {
  const cases: Case[] = JSON.parse(
    readFileSync(join(process.cwd(), "tests/router/router-100.json"), "utf8"),
  );
  const items: Array<{
    case_id: string;
    passed: boolean;
    expected: unknown;
    actual: unknown;
    duration_ms: number;
  }> = [];
  const lats: number[] = [];
  let passed = 0;

  for (const c of cases) {
    const t0 = Date.now();
    const result = await routeUtterance({ callId: `eval-${c.id}`, utterance: c.utterance });
    const dur = Date.now() - t0;
    lats.push(dur);
    const ok =
      result.intent === c.expected_intent &&
      (!c.expected_mode || result.allowed_response_mode === c.expected_mode);
    if (ok) passed++;
    items.push({
      case_id: c.id,
      passed: ok,
      expected: { intent: c.expected_intent, mode: c.expected_mode },
      actual: result,
      duration_ms: dur,
    });
  }
  const { p50, p95, p99 } = percentiles(lats);
  const pass_rate = passed / cases.length;
  console.log(
    `router: ${passed}/${cases.length} (${(pass_rate * 100).toFixed(1)}%) · p50=${p50} p95=${p95} p99=${p99}`,
  );
  if (process.env.EVAL_PERSIST !== "false") {
    await recordEvalRun({
      suite: "router",
      total: cases.length,
      passed,
      failed: cases.length - passed,
      p50_ms: p50,
      p95_ms: p95,
      p99_ms: p99,
      items,
    });
  }
  process.exit(pass_rate >= 0.95 ? 0 : 1);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
