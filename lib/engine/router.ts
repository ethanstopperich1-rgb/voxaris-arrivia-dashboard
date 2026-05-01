import { z } from "zod";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { anthropic } from "@/lib/clients/anthropic";
import { MODELS, TIMEOUTS_MS } from "@/lib/config/constants";
import { withTimeout } from "@/lib/utils/timeout";
import { extractJsonObject } from "@/lib/utils/json";
import { heliconeHeaders } from "@/lib/clients/helicone";

export const RouterResult = z.object({
  intent: z.enum([
    "greeting",
    "small_talk",
    "education",
    "discovery",
    "objection",
    "pricing",
    "account_specific",
    "jailbreak",
    "pii",
    "safety",
    "transfer_request",
    "end_call",
    "out_of_scope",
  ]),
  risk_level: z.enum([
    "low",
    "medium",
    "high_fact",
    "high_policy",
    "pii",
    "legal_financial",
    "jailbreak",
  ]),
  answer_card_candidate: z.string().nullable(),
  allowed_response_mode: z.enum(["answer_card", "rag", "deflect", "transfer"]),
  confidence: z.number().min(0).max(1),
});
export type RouterResultT = z.infer<typeof RouterResult>;

let _prompt: string | null = null;
function loadPrompt(): string {
  if (_prompt) return _prompt;
  _prompt = readFileSync(join(process.cwd(), "prompts/router-classifier.md"), "utf8");
  return _prompt;
}

function fallback(utterance: string): RouterResultT {
  const u = utterance.toLowerCase();
  if (/\b(person|representative|specialist|human|agent)\b/.test(u))
    return {
      intent: "transfer_request",
      risk_level: "low",
      answer_card_candidate: "specialist_transfer",
      allowed_response_mode: "transfer",
      confidence: 0.7,
    };
  if (/\$|\bpoint|percent|balance|expires|account|apr|financ/.test(u))
    return {
      intent: "pricing",
      risk_level: "legal_financial",
      answer_card_candidate: "pricing_transfer",
      allowed_response_mode: "transfer",
      confidence: 0.7,
    };
  return {
    intent: "education",
    risk_level: "high_fact",
    answer_card_candidate: "travel_savings_dollars_core",
    allowed_response_mode: "answer_card",
    confidence: 0.5,
  };
}

export async function routeUtterance(input: {
  callId: string;
  utterance: string;
}): Promise<RouterResultT> {
  if (!input.utterance.trim()) return fallback(input.utterance);
  try {
    const res = await withTimeout(
      anthropic().messages.create(
        {
          model: MODELS.ROUTER,
          max_tokens: 96,
          temperature: 0,
          system: loadPrompt(),
          messages: [{ role: "user", content: `Utterance: ${input.utterance}` }],
        },
        { headers: heliconeHeaders({ callId: input.callId, intent: "router" }) },
      ),
      TIMEOUTS_MS.ROUTER,
      "router",
    );
    const text = res.content
      .filter((c): c is Extract<typeof c, { type: "text" }> => c.type === "text")
      .map((c) => c.text)
      .join("");
    const json = extractJsonObject(text);
    if (!json) return fallback(input.utterance);
    const parsed = RouterResult.safeParse(JSON.parse(json));
    return parsed.success ? parsed.data : fallback(input.utterance);
  } catch {
    return fallback(input.utterance);
  }
}
