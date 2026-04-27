import type { RouterResultT } from "@/lib/engine/router";

/** Decide whether to invoke the full RAG lane based on router result + flags. */
export function shouldRunFullRag(opts: {
  router: RouterResultT;
  answerCardConfidence: number | null;
  allowFullRag: boolean;
  answerCardThreshold?: number;
}): boolean {
  if (!opts.allowFullRag) return false;
  if (opts.router.allowed_response_mode === "transfer") return false;
  if (opts.router.allowed_response_mode === "deflect") return false;
  const threshold = opts.answerCardThreshold ?? 0.88;
  if (opts.answerCardConfidence != null && opts.answerCardConfidence >= threshold) return false;
  return true;
}
