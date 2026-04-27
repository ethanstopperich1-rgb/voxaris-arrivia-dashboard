import type { RouterResultT } from "@/lib/engine/router";

/** Routes that MUST run the verification pass (Hard Rule 8). */
export function verificationRequired(route: RouterResultT, source: "answer_card" | "rag"): boolean {
  if (source === "rag") return true;
  if (
    route.risk_level === "high_fact" ||
    route.risk_level === "high_policy" ||
    route.risk_level === "pii" ||
    route.risk_level === "legal_financial" ||
    route.risk_level === "jailbreak"
  ) {
    return true;
  }
  return false;
}
