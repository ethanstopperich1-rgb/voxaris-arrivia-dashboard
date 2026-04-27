import { redis } from "@/lib/clients/redis";
import { CallMemorySchema, type CallMemory } from "./memory-types";

const TTL_SEC = 60 * 60 * 2; // 2 hours

const key = (id: string) => `call:${id}`;

export async function initCallMemory(input: {
  retell_call_id: string;
  caller_phone?: string;
}): Promise<CallMemory> {
  const m: CallMemory = CallMemorySchema.parse({
    retell_call_id: input.retell_call_id,
    caller_phone: input.caller_phone,
    started_at: Date.now(),
    recording_disclosed: false,
    ai_disclosed: false,
    turn_count: 0,
    recent_turns: [],
    slots: {},
    flags: {
      jailbreak_attempts: 0,
      pii_offered: false,
      transfer_requested: false,
      hallucination_blocks: 0,
    },
  });
  await redis().set(key(input.retell_call_id), m, { ex: TTL_SEC });
  return m;
}

export async function getCallMemory(retellCallId: string): Promise<CallMemory | null> {
  const raw = await redis().get(key(retellCallId));
  if (!raw) return null;
  const parsed = CallMemorySchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export async function updateCallMemory(
  retellCallId: string,
  patch: (m: CallMemory) => CallMemory,
): Promise<CallMemory> {
  const cur = (await getCallMemory(retellCallId)) ??
    (await initCallMemory({ retell_call_id: retellCallId }));
  const next = patch(cur);
  await redis().set(key(retellCallId), next, { ex: TTL_SEC });
  return next;
}

export async function appendTurn(
  retellCallId: string,
  turn: CallMemory["recent_turns"][number],
): Promise<CallMemory> {
  return updateCallMemory(retellCallId, (m) => {
    const turns = [...m.recent_turns, turn].slice(-10);
    return { ...m, turn_count: m.turn_count + 1, recent_turns: turns };
  });
}

export async function finalizeCallMemory(retellCallId: string): Promise<void> {
  // Keep 2-hour TTL so post-call analyzers can still read.
  await redis().expire(key(retellCallId), TTL_SEC);
}
