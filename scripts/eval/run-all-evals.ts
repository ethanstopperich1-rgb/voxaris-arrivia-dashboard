import { spawnSync } from "node:child_process";

const SUITES = [
  "scripts/eval/run-router-eval.ts",
  "scripts/eval/run-answer-card-eval.ts",
  "scripts/eval/run-validator-eval.ts",
  "scripts/eval/run-verifier-eval.ts",
  "scripts/eval/run-rag-eval.ts",
];

let any_failed = false;
for (const s of SUITES) {
  console.log(`\n--- ${s} ---`);
  const r = spawnSync("tsx", [s], { stdio: "inherit" });
  if (r.status !== 0) any_failed = true;
}
process.exit(any_failed ? 1 : 0);
