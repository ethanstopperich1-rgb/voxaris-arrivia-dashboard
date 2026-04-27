import factsJson from "@/content/facts/facts.json";
import { extractNumericClaims, type NumericClaim } from "./numeric-claim-extractor";
import { detectForbiddenPhrases, type ForbiddenHit } from "./forbidden-claim-detector";

type Fact = {
  id: string;
  scope: string;
  category: string;
  numeric_values: Array<number | string>;
  transfer_only: boolean;
  risk_class: string;
};

const FACTS = factsJson.facts as unknown as Fact[];

export type ValidatorResult =
  | { status: "passed" }
  | {
      status: "blocked";
      reason: "forbidden_phrase" | "unsupported_numeric" | "transfer_only_topic";
      offending_claims: Array<NumericClaim | ForbiddenHit>;
      transfer_required: boolean;
      suggested_rewrite: string;
    };

const APPROVED_NUMERIC_VALUES: Set<string> = new Set(
  FACTS.flatMap((f) => f.numeric_values.map((v) => String(v))),
);

function stripUnsupportedNumerics(text: string, claims: NumericClaim[]): string {
  let out = text;
  for (const c of claims) {
    out = out.replaceAll(c.raw, "[specialist can confirm]");
  }
  return out;
}

export function validatePricingFacts(opts: {
  draft: string;
  routeRiskClass?: string;
}): ValidatorResult {
  const { draft } = opts;
  const forbidden = detectForbiddenPhrases(draft);
  if (forbidden.length) {
    return {
      status: "blocked",
      reason: "forbidden_phrase",
      offending_claims: forbidden,
      transfer_required: forbidden.some(
        (f) =>
          f.source_fact_id !== "GLOBAL" &&
          FACTS.find((x) => x.id === f.source_fact_id)?.transfer_only === true,
      ),
      suggested_rewrite:
        "I can't quote that detail over the phone — a GVR specialist can confirm the exact numbers tied to your offer. Would you like me to connect you?",
    };
  }

  const claims = extractNumericClaims(draft);
  const unsupported = claims.filter((c) => {
    if (c.kind === "date") return true;
    return !APPROVED_NUMERIC_VALUES.has(String(c.value));
  });

  if (unsupported.length > 0) {
    return {
      status: "blocked",
      reason: "unsupported_numeric",
      offending_claims: unsupported,
      transfer_required: true,
      suggested_rewrite: stripUnsupportedNumerics(draft, unsupported),
    };
  }

  return { status: "passed" };
}
