import "dotenv/config";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { hybridSearch } from "../../lib/rag/hybrid-search";
import { rerankChunks } from "../../lib/rag/rerank";
import { recordEvalRun, percentiles } from "../../lib/observability/eval-logger";

type Case = { id: string; query: string; expected_source_doc: string };

async function main() {
  const cases: Case[] = JSON.parse(
    readFileSync(join(process.cwd(), "tests/router/rag-50.json"), "utf8"),
  );
  const items = [];
  const lats: number[] = [];
  for (const c of cases) {
    const t0 = Date.now();
    const candidates = await hybridSearch({ query: c.query, topK: 20 });
    const reranked = await rerankChunks({ query: c.query, chunks: candidates, topN: 6 });
    const dur = Date.now() - t0;
    lats.push(dur);
    const top3 = reranked.slice(0, 3).map((r) => r.source_doc);
    const ok = top3.includes(c.expected_source_doc);
    items.push({
      case_id: c.id,
      passed: ok,
      expected: { source_doc: c.expected_source_doc },
      actual: { top3 },
      duration_ms: dur,
    });
  }
  const passed = items.filter((i) => i.passed).length;
  const { p50, p95, p99 } = percentiles(lats);
  console.log(`rag: ${passed}/${cases.length} · p50=${p50} p95=${p95} p99=${p99}`);
  if (process.env.EVAL_PERSIST !== "false") {
    await recordEvalRun({
      suite: "rag",
      total: cases.length,
      passed,
      failed: cases.length - passed,
      p50_ms: p50,
      p95_ms: p95,
      p99_ms: p99,
      items,
    });
  }
  process.exit(passed / cases.length >= 0.9 ? 0 : 1);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
