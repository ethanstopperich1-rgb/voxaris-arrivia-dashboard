import { format } from "date-fns";
import type { Lead, ScriptTemplate, RvmCampaign } from "./types";

// Default display value from facts.json FACT-RVM-CREDITS-DISPLAY-001.
// A specific campaign can override this via rvm_campaigns.offer_display.
const DEFAULT_CREDITS_DISPLAY = "travel savings credits";

export function renderScript(
  template: ScriptTemplate,
  lead: Lead,
  campaign: RvmCampaign
): string {
  const enrollmentDate = new Date(lead.enrollment_date);
  const enrollmentMonthYear = format(enrollmentDate, "MMMM yyyy"); // "March 2024"

  const callbackSpoken = phoneToSpoken(campaign.callbackNumber);
  const creditsDisplay = campaign.offerDisplay ?? DEFAULT_CREDITS_DISPLAY;

  return template.body
    .replace(/\{first_name\}/g, lead.first_name ?? "there")
    .replace(/\{enrollment_month_year\}/g, enrollmentMonthYear)
    .replace(/\{savings_credits_display\}/g, creditsDisplay)
    .replace(/\{callback_number\}/g, callbackSpoken);
}

export function phoneToSpoken(phone: string): string {
  // E.164 → spoken digit groups: "+18665551234" → "8 6 6, 5 5 5, 1 2 3 4"
  const digits = phone.replace(/\D/g, "").replace(/^1/, "");
  if (digits.length !== 10) return phone;
  const area = digits.slice(0, 3).split("").join(" ");
  const prefix = digits.slice(3, 6).split("").join(" ");
  const line = digits.slice(6).split("").join(" ");
  return `${area}, ${prefix}, ${line}`;
}

export function scriptHash(script: string): string {
  // Simple deterministic hash — no crypto import needed at render time.
  // SHA-256 is computed in the pipeline where crypto is available.
  // This function is a convenience wrapper kept here for co-location.
  let hash = 0;
  for (let i = 0; i < script.length; i++) {
    hash = (Math.imul(31, hash) + script.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(16).padStart(8, "0");
}
