import "dotenv/config";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { selectAnswerCard } from "../../lib/engine/answer-card-selector";
import { routeUtterance } from "../../lib/engine/router";
import { recordEvalRun } from "../../lib/observability/eval-logger";

type Case = { id: string; utterance: string; expected_card_id: string };

async function main() {
  const cases: Case[] = JSON.parse(
    readFileSync(join(process.cwd(), "tests/router/answer-cards-50.json"), "utf8"),
  );
  const items = [];
  for (const c of cases) {
    const router = await routeUtterance({ callId: `eval-${c.id}`, utterance: c.utterance });
    const sel = selectAnswerCard({ router, utterance: c.utterance });
    const got = sel?.card.id ?? null;
    items.push({
      case_id: c.id,
      passed: got === c.expected_card_id,
      expected: { card: c.expected_card_id },
      actual: { card: got, confidence: sel?.confidence, reason: sel?.reason },
      duration_ms: 0,
    });
  }
  const passed = items.filter((i) => i.passed).length;
  console.log(`answer-card: ${passed}/${cases.length}`);
  if (process.env.EVAL_PERSIST !== "false") {
    await recordEvalRun({
      suite: "answer_card",
      total: cases.length,
      passed,
      failed: cases.length - passed,
      items,
    });
  }
  process.exit(passed / cases.length >= 0.9 ? 0 : 1);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
