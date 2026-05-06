/**
 * RVM Cowboy — daily batch runner
 *
 * Usage:
 *   pnpm rvm:batch                        # full daily cap from env
 *   pnpm rvm:batch -- --limit=100         # test run, 100 leads
 *   pnpm rvm:batch -- --limit=100 --dry   # dry run (compliance + generation, no Drop Cowboy queue)
 *
 * Designed to run overnight (11pm-5am ET) via cron or Vercel Cron.
 * Writes results to rvm_daily_metrics and rvm_compliance_audit.
 */

import "dotenv/config";
import { runDailyBatch } from "@/lib/rvm/pipeline";

const args = process.argv.slice(2);
const limitArg = args.find((a) => a.startsWith("--limit="));
const limitStr = limitArg?.split("=")[1];
const limit = limitStr ? parseInt(limitStr, 10) : undefined;
const dry = args.includes("--dry");

if (dry) {
  console.log("[rvm:batch] Dry run — compliance + generation only, no Drop Cowboy queue");
  process.env.RVM_DRY_RUN = "true";
}

console.log(`[rvm:batch] Starting at ${new Date().toISOString()}${limit ? ` (limit: ${limit})` : ""}`);

runDailyBatch({ leadLimit: limit })
  .then((summary) => {
    console.log("[rvm:batch] Complete:", JSON.stringify(summary, null, 2));
    process.exit(0);
  })
  .catch((err) => {
    console.error("[rvm:batch] Fatal error:", err);
    process.exit(1);
  });
