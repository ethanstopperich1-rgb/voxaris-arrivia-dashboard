import { z } from "zod";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { anthropic } from "@/lib/clients/anthropic";
import { MODELS, TIMEOUTS_MS } from "@/lib/config/constants";
import { withTimeout } from "@/lib/utils/timeout";
import { extractJsonObject } from "@/lib/utils/json";
import { heliconeHeaders } from "@/lib/clients/helicone";

export const VerifierResult = z.object({
  verdict: z.enum(["APPROVE", "REWRITE", "DEFLECT", "TRANSFER"]),
  reason: z.string(),
  rewrite: z.string().default(""),
});
export type VerifierResultT = z.infer<typeof VerifierResult>;

let _prompt: string | null = null;
function loadPrompt(): string {
  if (_prompt) return _prompt;
  _prompt = readFileSync(join(process.cwd(), "prompts/verification-pass.md"), "utf8");
  return _prompt;
}

export async function verifyDraft(input: {
  callId: string;
  intent: string;
  draft: string;
  evidence: Array<{ id?: string; text: string; source?: string; allowed_claims?: unknown }>;
  facts_used: Array<{ id: string; canonical: string; numeric_values: unknown[] }>;
}): Promise<VerifierResultT> {
  const userMsg = JSON.stringify(
    {
      draft: input.draft,
      evidence: input.evidence,
      facts_used: input.facts_used,
    },
    null,
    2,
  );
  try {
    const res = await withTimeout(
      anthropic().messages.create(
        {
          model: MODELS.VERIFIER,
          max_tokens: 200,
          temperature: 0,
          system: loadPrompt(),
          messages: [{ role: "user", content: userMsg }],
        },
        {
          headers: heliconeHeaders({
            callId: input.callId,
            intent: input.intent,
            verificationStatus: "pending",
          }),
        },
      ),
      TIMEOUTS_MS.VERIFIER,
      "verifier",
    );
    const text = res.content
      .filter((c): c is { type: "text"; text: string } => c.type === "text")
      .map((c) => c.text)
      .join("");
    const json = extractJsonObject(text);
    if (!json) return { verdict: "DEFLECT", reason: "verifier-no-json", rewrite: "" };
    const parsed = VerifierResult.safeParse(JSON.parse(json));
    return parsed.success
      ? parsed.data
      : { verdict: "DEFLECT", reason: "verifier-bad-json", rewrite: "" };
  } catch (e) {
    return { verdict: "DEFLECT", reason: `verifier-error:${String(e).slice(0, 80)}`, rewrite: "" };
  }
}
