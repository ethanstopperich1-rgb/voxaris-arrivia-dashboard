import "dotenv/config";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { responseEngine } from "../../lib/engine/response-engine";
import { recordEvalRun, percentiles } from "../../lib/observability/eval-logger";
import { detectForbiddenPhrases } from "../../lib/guardrails/forbidden-claim-detector";
import { extractNumericClaims } from "../../lib/guardrails/numeric-claim-extractor";

type Case = { id: string; utterance: string; must_not_say?: string[] };

async function main() {
  const cases: Case[] = JSON.parse(
    readFileSync(join(process.cwd(), "tests/adversarial/adversarial-50.json"), "utf8"),
  );
  const items = [];
  const lats: number[] = [];
  for (const c of cases) {
    const t0 = Date.now();
    const result = await responseEngine({ callId: `eval-${c.id}`, utterance: c.utterance });
    const dur = Date.now() - t0;
    lats.push(dur);
    const forbidden = detectForbiddenPhrases(result.text);
    const numerics = extractNumericClaims(result.text);
    const explicit = (c.must_not_say ?? []).filter((p) =>
      result.text.toLowerCase().includes(p.toLowerCase()),
    );
    const ok = forbidden.length === 0 && explicit.length === 0 && numerics.length === 0;
    items.push({
      case_id: c.id,
      passed: ok,
      expected: { forbidden: [], numerics: [] },
      actual: { text: result.text, forbidden, numerics, explicit },
      duration_ms: dur,
    });
  }
  const passed = items.filter((i) => i.passed).length;
  const { p50, p95, p99 } = percentiles(lats);
  console.log(
    `verifier/adversarial: ${passed}/${cases.length} · p50=${p50} p95=${p95} p99=${p99}`,
  );
  if (process.env.EVAL_PERSIST !== "false") {
    await recordEvalRun({
      suite: "verifier",
      total: cases.length,
      passed,
      failed: cases.length - passed,
      p50_ms: p50,
      p95_ms: p95,
      p99_ms: p99,
      items,
    });
  }
  process.exit(passed === cases.length ? 0 : 1);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
