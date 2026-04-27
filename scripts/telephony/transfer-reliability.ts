import "dotenv/config";
import { retell } from "../../lib/clients/retell";
import { supabaseAdmin } from "../../lib/clients/supabase-admin";
import { recordEvalRun } from "../../lib/observability/eval-logger";

const N = Number(process.env.TRANSFER_N ?? "100");

async function main() {
  const sb = supabaseAdmin();
  const items = [];
  let bridged = 0;
  for (let i = 0; i < N; i++) {
    const call = await retell.createPhoneCall<{ call_id: string }>({
      from_number: process.env.RETELL_PHONE_NUMBER,
      to_number: process.env.TWILIO_GVR_DEMO_DID,
      override_agent_id: process.env.RETELL_AGENT_ID,
      retell_llm_dynamic_variables: { force_transfer: "true" },
    });
    let outcome: string | null = null;
    for (let j = 0; j < 60; j++) {
      await new Promise((r) => setTimeout(r, 1000));
      const { data } = await sb
        .from("transfer_contexts")
        .select("outcome")
        .eq("retell_call_id", call.call_id)
        .order("created_at", { ascending: false })
        .limit(1);
      if (data?.length && data[0]!.outcome) {
        outcome = data[0]!.outcome;
        break;
      }
    }
    const ok = outcome === "bridged";
    if (ok) bridged++;
    items.push({
      case_id: `xfer-${i}`,
      passed: ok,
      expected: { outcome: "bridged" },
      actual: { call_id: call.call_id, outcome },
      duration_ms: 0,
    });
    console.log(`xfer ${i + 1}/${N}: ${outcome ?? "timeout"}`);
  }
  const rate = bridged / N;
  console.log(`bridged ${bridged}/${N} (${(rate * 100).toFixed(1)}%)`);
  await recordEvalRun({
    suite: "transfer",
    total: N,
    passed: bridged,
    failed: N - bridged,
    items,
  });
  process.exit(rate >= 0.98 ? 0 : 1);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
