import type { EngineResult } from "@/lib/engine/response-engine";

/** Decide if a turn should escalate to a transfer immediately. */
export function shouldTransferNow(result: EngineResult): boolean {
  if (result.transfer.required) return true;
  if (result.meta.verifier_verdict === "TRANSFER") return true;
  if (result.meta.route.allowed_response_mode === "transfer") return true;
  return false;
}
