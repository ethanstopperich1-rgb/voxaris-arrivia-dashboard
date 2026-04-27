import "dotenv/config";
import { retell } from "../../lib/clients/retell";
import { supabaseAdmin } from "../../lib/clients/supabase-admin";
import { recordEvalRun, percentiles } from "../../lib/observability/eval-logger";

const N = Number(process.env.LATENCY_N ?? "50");
const TARGET = process.env.LATENCY_TARGET ?? process.env.TWILIO_GVR_DEMO_DID;

async function main() {
  if (!TARGET) throw new Error("set LATENCY_TARGET or TWILIO_GVR_DEMO_DID");
  const sb = supabaseAdmin();
  const lats: number[] = [];
  const items = [];
  for (let i = 0; i < N; i++) {
    const t0 = Date.now();
    const call = await retell.createPhoneCall<{ call_id: string }>({
      from_number: process.env.RETELL_PHONE_NUMBER,
      to_number: TARGET,
      override_agent_id: process.env.RETELL_AGENT_ID,
    });
    // Poll for first agent turn latency_event
    let firstTurnMs = -1;
    for (let j = 0; j < 30; j++) {
      await new Promise((r) => setTimeout(r, 1000));
      const { data } = await sb
        .from("latency_events")
        .select("event, duration_ms, created_at")
        .eq("retell_call_id", call.call_id)
        .eq("event", "custom_llm_response_ready")
        .limit(1);
      if (data?.length && data[0]!.duration_ms != null) {
        firstTurnMs = data[0]!.duration_ms;
        break;
      }
    }
    const dur = Date.now() - t0;
    lats.push(firstTurnMs > 0 ? firstTurnMs : dur);
    items.push({
      case_id: `dial-${i}`,
      passed: firstTurnMs > 0 && firstTurnMs < 1100,
      expected: { firstTurnMsMax: 1100 },
      actual: { call_id: call.call_id, firstTurnMs, wallClockMs: dur },
      duration_ms: dur,
    });
    console.log(`call ${i + 1}/${N}: first turn ${firstTurnMs}ms`);
  }
  const { p50, p95, p99 } = percentiles(lats);
  console.log(`p50=${p50} p95=${p95} p99=${p99}`);
  await recordEvalRun({
    suite: "latency",
    total: N,
    passed: items.filter((i) => i.passed).length,
    failed: items.filter((i) => !i.passed).length,
    p50_ms: p50,
    p95_ms: p95,
    p99_ms: p99,
    items,
  });
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
