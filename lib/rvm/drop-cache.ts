/**
 * Redis cache for RVM drop records, keyed by caller E.164 phone.
 *
 * Written at queue time (pipeline.ts → queueDrops).
 * Read at callback time (Twilio webhook → callback route).
 * Also used by the Retell inbound hook to inject Andy's dynamic vars.
 */

import { redis } from "@/lib/clients/redis";

const DROP_KEY_PREFIX = "rvm_drop:phone:";
const CALLBACK_CONTEXT_PREFIX = "rvm_callback:phone:";
const DROP_TTL_SECONDS = 7 * 24 * 60 * 60;     // 7 days — matches gen cache
const CALLBACK_CONTEXT_TTL_SECONDS = 60 * 60;   // 1 hour — call should happen within minutes

export interface CachedDropRecord {
  leadId: string;
  dropId: string;
  campaignId: string;
  campaignName: string;
  firstName: string;
  enrollmentDate: string;
  offerDisplay: string | null;
  callbackNumber: string;
  droppedAt: string;        // ISO
}

export interface RvmCallbackContext {
  isRvmCallback: true;
  leadId: string;
  dropId: string;
  firstName: string;
  enrollmentDate: string;
  offerDisplay: string | null;
  campaignName: string;
  promotedToHot: boolean;
}

// ─────────────────────────────────────────────
// Written immediately after Drop Cowboy queues the drop
// ─────────────────────────────────────────────
export async function cacheDropByPhone(
  phone: string,
  record: CachedDropRecord
): Promise<void> {
  await redis().setex(
    `${DROP_KEY_PREFIX}${phone}`,
    DROP_TTL_SECONDS,
    JSON.stringify(record)
  );
}

// ─────────────────────────────────────────────
// Read at callback time (Twilio webhook)
// ─────────────────────────────────────────────
export async function getDropByPhone(phone: string): Promise<CachedDropRecord | null> {
  const raw = await redis().get<string>(`${DROP_KEY_PREFIX}${phone}`);
  if (!raw) return null;
  try {
    return JSON.parse(typeof raw === "string" ? raw : JSON.stringify(raw)) as CachedDropRecord;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────
// Stores context for Andy's inbound hook to consume
// Written by the Twilio callback webhook; read by /api/retell/inbound
// ─────────────────────────────────────────────
export async function setCallbackContext(
  phone: string,
  ctx: RvmCallbackContext
): Promise<void> {
  await redis().setex(
    `${CALLBACK_CONTEXT_PREFIX}${phone}`,
    CALLBACK_CONTEXT_TTL_SECONDS,
    JSON.stringify(ctx)
  );
}

export async function getCallbackContext(phone: string): Promise<RvmCallbackContext | null> {
  const raw = await redis().get<string>(`${CALLBACK_CONTEXT_PREFIX}${phone}`);
  if (!raw) return null;
  try {
    return JSON.parse(typeof raw === "string" ? raw : JSON.stringify(raw)) as RvmCallbackContext;
  } catch {
    return null;
  }
}

export async function clearCallbackContext(phone: string): Promise<void> {
  await redis().del(`${CALLBACK_CONTEXT_PREFIX}${phone}`);
}
