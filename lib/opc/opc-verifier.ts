import { detectOpcForbidden, hasPciHit, type ForbiddenHit } from "./opc-forbidden-detector";

const E164 = /^\+\d{10,15}$/;

export type OpcBookVerification = {
  ok: boolean;
  errors: string[];
  warnings: string[];
  forbidden_hits: ForbiddenHit[];
  blocked_for_pci: boolean;
};

export type OpcBookPayloadShape = {
  retell_call_id: string;
  caller_phone: string;
  caller_name?: string | null;
  placement_name: string;
  incentive: string;
  property_name: string;
  tour_slot: string;
  sms_consent_captured: boolean;
  sms_consent_phrase?: string | null;
};

/**
 * Verifier gate for opc_book.
 * Borrowed from the educational agent's verifier pattern — runs before any
 * external side effect (DB write, SMS send, welcome-team ping).
 *
 * Hard fails (ok=false):
 *   - Phone not E.164 normalizable
 *   - Any PCI / card-number / SSN / CVV pattern in any free-text field
 *   - sms_consent_captured=true without a non-empty consent_phrase
 *
 * Soft fails (warnings, ok=true):
 *   - Forbidden global phrase in a free-text field (logged but not blocked)
 *   - Empty caller_name when SMS consent is true
 */
export function verifyOpcBookPayload(
  payload: OpcBookPayloadShape,
): OpcBookVerification {
  const errors: string[] = [];
  const warnings: string[] = [];
  const allHits: ForbiddenHit[] = [];

  // 1. Phone normalization
  const phone = payload.caller_phone.startsWith("+")
    ? payload.caller_phone
    : `+1${payload.caller_phone}`;
  if (!E164.test(phone)) {
    errors.push(`caller_phone "${payload.caller_phone}" is not a valid E.164 number`);
  }

  // 2. Consent integrity
  if (payload.sms_consent_captured) {
    const phrase = (payload.sms_consent_phrase ?? "").trim();
    if (phrase.length < 2) {
      errors.push(
        "sms_consent_captured=true but sms_consent_phrase is empty — cannot write to opc_consent_log without verbatim consent",
      );
    }
    if (!payload.caller_name) {
      warnings.push("SMS consent captured but no caller_name — confirmation will be impersonal");
    }
  }

  // 3. PCI scan across every free-text field
  const fieldsToScan: { name: string; value: string }[] = [
    { name: "caller_name", value: payload.caller_name ?? "" },
    { name: "sms_consent_phrase", value: payload.sms_consent_phrase ?? "" },
    { name: "placement_name", value: payload.placement_name },
    { name: "incentive", value: payload.incentive },
    { name: "tour_slot", value: payload.tour_slot },
    { name: "property_name", value: payload.property_name },
  ];
  for (const f of fieldsToScan) {
    if (!f.value) continue;
    const hits = detectOpcForbidden(f.value);
    if (hits.length === 0) continue;
    for (const h of hits) {
      allHits.push(h);
      if (h.category === "pci" || h.category === "numeric_pattern") {
        errors.push(
          `PCI-class hit in field "${f.name}": ${h.phrase} (source: ${h.source_fact_id})`,
        );
      } else if (h.category === "global") {
        warnings.push(
          `Forbidden global phrase in field "${f.name}": "${h.phrase}"`,
        );
      } else {
        warnings.push(
          `Fact-forbidden phrase in "${f.name}": "${h.phrase}" (source: ${h.source_fact_id})`,
        );
      }
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    forbidden_hits: allHits,
    blocked_for_pci: hasPciHit(allHits),
  };
}
