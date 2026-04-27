import { readFileSync } from "node:fs";
import { join } from "node:path";
import { openai } from "@/lib/clients/openai";
import { anthropic } from "@/lib/clients/anthropic";
import { MODELS, TIMEOUTS_MS } from "@/lib/config/constants";
import { withTimeout } from "@/lib/utils/timeout";
import { heliconeHeaders } from "@/lib/clients/helicone";
import type { EvidenceLedger } from "@/lib/rag/evidence-ledger";

export type SpecialistKind = "education" | "discovery" | "objection" | "pricing" | "escalation";

const PROMPT_FILE: Record<SpecialistKind, string> = {
  education: "education-specialist.md",
  discovery: "discovery-specialist.md",
  objection: "objection-handler.md",
  pricing: "pricing-specialist.md",
  escalation: "escalation-specialist.md",
};

const KIND_TO_MODEL: Record<SpecialistKind, string> = {
  education: MODELS.EDUCATION,
  discovery: MODELS.DISCOVERY,
  objection: MODELS.OBJECTION,
  pricing: MODELS.PRICING,
  escalation: "deterministic",
};

const KIND_TO_TEMP: Record<SpecialistKind, number> = {
  education: 0.2,
  discovery: 0.1,
  objection: 0.2,
  pricing: 0.0,
  escalation: 0.0,
};

const KIND_TO_MAX: Record<SpecialistKind, number> = {
  education: 260,
  discovery: 160,
  objection: 220,
  pricing: 120,
  escalation: 80,
};

const promptCache = new Map<SpecialistKind, string>();
function loadPrompt(kind: SpecialistKind): string {
  const cached = promptCache.get(kind);
  if (cached) return cached;
  const text = readFileSync(join(process.cwd(), "prompts", PROMPT_FILE[kind]), "utf8");
  promptCache.set(kind, text);
  return text;
}

export async function runSpecialist(input: {
  kind: SpecialistKind;
  callId: string;
  utterance: string;
  ledger: EvidenceLedger;
}): Promise<string> {
  if (input.kind === "escalation") {
    return "Connecting you now to a GVR specialist — please hold for just a moment while I brief them on what we discussed.";
  }
  const system = loadPrompt(input.kind);
  const userMsg = JSON.stringify(
    {
      caller_question: input.utterance,
      facts_used: input.ledger.facts_used,
      evidence: input.ledger.chunks.map((c) => ({
        text: c.text,
        source: c.source,
        allowed_claims: c.allowed_claims,
        forbidden_extrapolations: c.forbidden_extrapolations,
      })),
    },
    null,
    2,
  );

  const model = KIND_TO_MODEL[input.kind];
  const temp = KIND_TO_TEMP[input.kind];
  const max = KIND_TO_MAX[input.kind];
  const headers = heliconeHeaders({
    callId: input.callId,
    intent: input.kind,
    evidenceIds: input.ledger.chunks.map((c) => c.id),
  });

  if (model.startsWith("claude")) {
    const res = await withTimeout(
      anthropic().messages.create(
        {
          model,
          max_tokens: max,
          temperature: temp,
          system,
          messages: [{ role: "user", content: userMsg }],
        },
        { headers },
      ),
      TIMEOUTS_MS.SPECIALIST,
      `specialist:${input.kind}`,
    );
    return res.content
      .filter((c): c is { type: "text"; text: string } => c.type === "text")
      .map((c) => c.text)
      .join("")
      .trim();
  }

  const res = await withTimeout(
    openai().chat.completions.create(
      {
        model,
        temperature: temp,
        max_tokens: max,
        messages: [
          { role: "system", content: system },
          { role: "user", content: userMsg },
        ],
      },
      { headers },
    ),
    TIMEOUTS_MS.SPECIALIST,
    `specialist:${input.kind}`,
  );
  return (res.choices[0]?.message?.content ?? "").trim();
}
