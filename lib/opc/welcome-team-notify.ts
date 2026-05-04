import { twilioClient } from "@/lib/clients/twilio";
import { supabaseAdmin } from "@/lib/clients/supabase-admin";
import { env } from "@/lib/config/env";
import { logger } from "@/lib/observability/logger";

/**
 * Welcome-team handoff.
 * When opc_book succeeds, the resort welcome team needs to know a guest is
 * coming — otherwise the booking is fictional. Three channels:
 *   1. SMS to WELCOME_TEAM_SMS_NUMBER (immediate, the must-have)
 *   2. Row in opc_welcome_team_notifications (the dashboard backbone)
 *   3. Optional email (nice-to-have, not wired yet)
 *
 * Failures here are non-fatal for the guest-facing booking — but we log loud
 * so the dashboard can show "booking succeeded but welcome-team ping failed".
 */

export type WelcomeTeamNotificationInput = {
  confirmation_id: string;
  booking_id: string | null;
  caller_name: string | null;
  caller_phone: string;
  property_name: string;
  placement_name: string;
  tour_slot: string;
  incentive: string;
  sms_consent_captured: boolean;
};

export type WelcomeTeamNotificationResult = {
  sms: { ok: boolean; sid?: string; error?: string };
  notification_row_id: string | null;
  channels_attempted: string[];
};

export async function notifyWelcomeTeam(
  input: WelcomeTeamNotificationInput,
): Promise<WelcomeTeamNotificationResult> {
  const channels: string[] = [];
  const e = env();
  const teamNumber = e.WELCOME_TEAM_SMS_NUMBER || "";

  // 1) SMS to welcome team
  let smsOk = false;
  let smsSid: string | undefined;
  let smsError: string | undefined;

  if (!teamNumber) {
    smsError = "WELCOME_TEAM_SMS_NUMBER not configured";
    logger.warn({ confirmation_id: input.confirmation_id }, "welcome-team SMS skipped — no number configured");
  } else {
    channels.push("sms");
    const guest = input.caller_name?.trim() || "Guest";
    const consentTag = input.sms_consent_captured ? "[SMS-CONSENT YES]" : "[SMS-CONSENT NO]";
    const body =
      `[Westgate OPC] New tour booked\n` +
      `Guest: ${guest} (${input.caller_phone})\n` +
      `Slot: ${input.tour_slot}\n` +
      `Incentive: ${input.incentive}\n` +
      `Placement: ${input.placement_name}\n` +
      `Conf #: ${input.confirmation_id}\n` +
      `${consentTag}`;
    try {
      const sms = await twilioClient().messages.create({
        to: teamNumber,
        from: e.TWILIO_FROM_NUMBER,
        body,
      });
      smsOk = true;
      smsSid = sms.sid;
    } catch (err) {
      smsError = String(err).slice(0, 200);
      logger.warn({ err: smsError, confirmation_id: input.confirmation_id }, "welcome-team SMS send failed");
    }
  }

  // 2) Persist notification row (dashboard backbone)
  let notificationRowId: string | null = null;
  try {
    channels.push("supabase");
    const { data } = await supabaseAdmin()
      .from("opc_welcome_team_notifications")
      .insert({
        confirmation_id: input.confirmation_id,
        booking_id: input.booking_id,
        caller_name: input.caller_name,
        caller_phone: input.caller_phone,
        property_name: input.property_name,
        placement_name: input.placement_name,
        tour_slot: input.tour_slot,
        incentive: input.incentive,
        sms_consent_captured: input.sms_consent_captured,
        sms_to_team_sid: smsSid ?? null,
        sms_to_team_ok: smsOk,
        sms_to_team_error: smsError ?? null,
      })
      .select("id")
      .single();
    notificationRowId = data?.id ?? null;
  } catch (err) {
    logger.warn(
      { err: String(err), confirmation_id: input.confirmation_id },
      "welcome-team notification row insert failed",
    );
  }

  return {
    sms: { ok: smsOk, sid: smsSid, error: smsError },
    notification_row_id: notificationRowId,
    channels_attempted: channels,
  };
}
