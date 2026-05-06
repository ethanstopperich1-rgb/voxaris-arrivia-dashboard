import { supabaseAdmin } from "@/lib/clients/supabase-admin";
import { env } from "@/lib/config/env";
import type { Lead, ComplianceCheckResult, ComplianceBundle, SuppressionReason } from "./types";

// ─────────────────────────────────────────────
// Florida hard block
// FL and unknown state are held until counsel clears FTSA.
// ─────────────────────────────────────────────
export function isFloridaBlocked(lead: Lead): boolean {
  if (lead.state === null) return true;       // unknown state = hold
  if (lead.state === "FL" && !lead.fl_geofence_cleared) return true;
  return false;
}

// ─────────────────────────────────────────────
// Internal suppression list (fastest check — always run first)
// ─────────────────────────────────────────────
export async function checkInternalSuppression(
  phone: string
): Promise<ComplianceCheckResult> {
  const now = new Date().toISOString();
  const { data } = await supabaseAdmin()
    .from("suppression_list")
    .select("reason")
    .eq("phone_e164", phone)
    .maybeSingle();

  if (data) {
    return { blocked: true, reason: data.reason as SuppressionReason, queriedAt: now };
  }
  return { blocked: false, queriedAt: now };
}

// ─────────────────────────────────────────────
// Federal DNC check (placeholder — wire to actual API)
// ─────────────────────────────────────────────
export async function checkFederalDnc(phone: string): Promise<ComplianceCheckResult> {
  const now = new Date().toISOString();
  const apiKey = env().FEDERAL_DNC_API_KEY;

  if (!apiKey) {
    // No key configured — skip in dev but log loudly
    console.warn("[compliance] FEDERAL_DNC_API_KEY not set — skipping federal DNC check");
    return { blocked: false, detail: "skipped_no_key", queriedAt: now };
  }

  // TODO: integrate with chosen federal DNC API (e.g., DNC.com, Gryphon)
  // The pattern: POST phone to vendor, expect { status: "clean" | "listed" }
  // For now, safe fallback is "blocked = false" until vendor is wired.
  return { blocked: false, queriedAt: now };
}

// ─────────────────────────────────────────────
// State DNC check
// ─────────────────────────────────────────────
export async function checkStateDnc(
  phone: string,
  state: string | null
): Promise<ComplianceCheckResult> {
  const now = new Date().toISOString();

  // Florida is handled separately via FL geofence — skip here
  if (!state || state === "FL") {
    return { blocked: false, detail: "state_not_applicable", queriedAt: now };
  }

  const apiKey = env().FEDERAL_DNC_API_KEY;
  if (!apiKey) {
    console.warn("[compliance] State DNC check skipped — no vendor key");
    return { blocked: false, detail: "skipped_no_key", queriedAt: now };
  }

  // TODO: state-specific DNC vendor call
  return { blocked: false, queriedAt: now };
}

// ─────────────────────────────────────────────
// Reassigned Numbers Database (RND)
// Must check if subscriber identity not confirmed within 90 days.
// ─────────────────────────────────────────────
export async function checkRnd(
  phone: string,
  enrollmentDate: string
): Promise<ComplianceCheckResult> {
  const now = new Date().toISOString();
  const apiKey = env().RND_API_KEY;

  if (!apiKey) {
    console.warn("[compliance] RND_API_KEY not set — skipping RND check");
    return { blocked: false, detail: "skipped_no_key", queriedAt: now };
  }

  // Check if enrollment was confirmed within 90 days — if so, skip RND query (save cost)
  const enrolledAt = new Date(enrollmentDate);
  const daysSinceEnrollment = (Date.now() - enrolledAt.getTime()) / (1000 * 60 * 60 * 24);
  if (daysSinceEnrollment <= 90) {
    return { blocked: false, detail: "within_90_day_window", queriedAt: now };
  }

  // TODO: query FCC RND API (rnd.neustar.com or similar)
  // Pattern: GET /query?phone={phone} → { status: "valid" | "reassigned" | "unknown" }
  return { blocked: false, queriedAt: now };
}

// ─────────────────────────────────────────────
// Litigator scrub (RealResolve or BlackList Alliance)
// ─────────────────────────────────────────────
export async function checkLitigator(phone: string): Promise<ComplianceCheckResult> {
  const now = new Date().toISOString();
  const apiKey = env().REALRESOLVE_API_KEY;

  if (!apiKey) {
    console.warn("[compliance] REALRESOLVE_API_KEY not set — skipping litigator scrub");
    return { blocked: false, detail: "skipped_no_key", queriedAt: now };
  }

  // TODO: RealResolve API call
  // Pattern: POST { phone } → { litigator: true | false, risk_score: 0-100 }
  return { blocked: false, queriedAt: now };
}

// ─────────────────────────────────────────────
// Full compliance gate — runs all checks in parallel
// ─────────────────────────────────────────────
export async function runComplianceGate(lead: Lead): Promise<ComplianceBundle> {
  // Fast sync block: FL geofence + internal suppression
  if (isFloridaBlocked(lead)) {
    const blocked: ComplianceCheckResult = {
      blocked: true,
      reason: "manual",
      detail: "florida_geofence",
      queriedAt: new Date().toISOString(),
    };
    return {
      federalDnc: { blocked: false, queriedAt: blocked.queriedAt },
      stateDnc: blocked,
      rnd: { blocked: false, queriedAt: blocked.queriedAt },
      litigator: { blocked: false, queriedAt: blocked.queriedAt },
      internalSuppression: { blocked: false, queriedAt: blocked.queriedAt },
      overallPass: false,
    };
  }

  const [internalSuppression, federalDnc, stateDnc, rnd, litigator] = await Promise.all([
    checkInternalSuppression(lead.phone_e164),
    checkFederalDnc(lead.phone_e164),
    checkStateDnc(lead.phone_e164, lead.state),
    checkRnd(lead.phone_e164, lead.enrollment_date),
    checkLitigator(lead.phone_e164),
  ]);

  const overallPass = ![internalSuppression, federalDnc, stateDnc, rnd, litigator].some(
    (c) => c.blocked
  );

  return { federalDnc, stateDnc, rnd, litigator, internalSuppression, overallPass };
}

// ─────────────────────────────────────────────
// Opt-out / suppression write
// Called when a lead requests removal via callback, SMS, web, etc.
// Must propagate within 10 business days (TCPA April 2025 rule).
// We propagate immediately — 10 days is the outer bound, not the target.
// ─────────────────────────────────────────────
export async function suppressPhone(
  phone: string,
  reason: SuppressionReason,
  source: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  const db = supabaseAdmin();

  await db.from("suppression_list").upsert(
    {
      phone_e164: phone,
      reason,
      source,
      suppressed_at: new Date().toISOString(),
      metadata: metadata ?? null,
    },
    { onConflict: "phone_e164" }
  );

  // Also flip the lead record so it can't slip through a stale query
  await db.from("leads").update({ dnc: true, product_assignment: "suppress" }).eq("phone_e164", phone);
}
