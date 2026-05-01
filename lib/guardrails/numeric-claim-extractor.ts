import { wordsToNumbers } from "@/lib/utils/text";

export type NumericClaim =
  | { kind: "dollar"; raw: string; value: number; index: number }
  | { kind: "percent"; raw: string; value: number; index: number }
  | { kind: "points"; raw: string; value: number; index: number }
  | { kind: "date"; raw: string; index: number }
  | { kind: "duration"; raw: string; value: number; unit: string; index: number };

// Match either "$3,499" / "$3499" OR a bare "3499 dollars" (after wordsToNumbers
// expands "three thousand four hundred ninety-nine" into digits).
const DOLLAR_RE = /(?:\$\s?\d{1,3}(?:[,\d]{0,12})?(?:\.\d+)?|\b\d{1,3}(?:[,\d]{0,12})?(?:\.\d+)?\s+dollars?\b)/gi;
// Drop trailing \b — `%` is a non-word char so \b after it never fires
const PERCENT_RE = /\b\d+(?:\.\d+)?\s?(?:percent|%)/gi;
const POINTS_RE = /\b\d{1,3}(?:[,\d]{0,9})\s?points?\b/gi;
const DATE_RE = /\b(?:\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{2,4})\b/g;
const DURATION_RE = /\b(\d+)\s?-?(year|yr|yrs|month|mo|day|days|week|weeks)\b/gi;

function toNumber(s: string): number {
  const cleaned = s.replace(/[^\d.]/g, "");
  return Number(cleaned);
}

export function extractNumericClaims(input: string): NumericClaim[] {
  const expanded = wordsToNumbers(input);
  const claims: NumericClaim[] = [];
  for (const m of expanded.matchAll(DOLLAR_RE)) {
    claims.push({ kind: "dollar", raw: m[0], value: toNumber(m[0]), index: m.index ?? -1 });
  }
  for (const m of expanded.matchAll(PERCENT_RE)) {
    claims.push({ kind: "percent", raw: m[0], value: toNumber(m[0]), index: m.index ?? -1 });
  }
  for (const m of expanded.matchAll(POINTS_RE)) {
    claims.push({ kind: "points", raw: m[0], value: toNumber(m[0]), index: m.index ?? -1 });
  }
  for (const m of expanded.matchAll(DATE_RE)) {
    claims.push({ kind: "date", raw: m[0], index: m.index ?? -1 });
  }
  for (const m of expanded.matchAll(DURATION_RE)) {
    const v = Number(m[1]);
    const unit = (m[2] ?? "").toLowerCase();
    if (Number.isFinite(v))
      claims.push({ kind: "duration", raw: m[0], value: v, unit, index: m.index ?? -1 });
  }
  return claims;
}
