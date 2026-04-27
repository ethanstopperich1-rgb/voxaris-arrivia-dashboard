import "dotenv/config";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { validatePricingFacts } from "../../lib/guardrails/pricing-fact-validator";
import { recordEvalRun } from "../../lib/observability/eval-logger";

type Case = { id: string; draft: string; expect_blocked: boolean };

async function main() {
  const cases: Case[] = JSON.parse(
    readFileSync(join(process.cwd(), "tests/adversarial/forbidden-numeric-claims.json"), "utf8"),
  );
  const items = cases.map((c) => {
    const r = validatePricingFacts({ draft: c.draft });
    const got = r.status === "blocked";
    return {
      case_id: c.id,
      passed: got === c.expect_blocked,
      expected: { blocked: c.expect_blocked },
      actual: r,
      duration_ms: 0,
    };
  });
  const passed = items.filter((i) => i.passed).length;
  console.log(`validator: ${passed}/${cases.length}`);
  if (process.env.EVAL_PERSIST !== "false") {
    await recordEvalRun({
      suite: "validator",
      total: cases.length,
      passed,
      failed: cases.length - passed,
      items,
    });
  }
  process.exit(passed === cases.length ? 0 : 1);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
