import { z } from "zod";

export const TurnSchema = z.object({
  turn_index: z.number().int(),
  role: z.enum(["agent", "user", "system"]),
  content: z.string(),
  route: z.string().optional(),
  risk_class: z.string().optional(),
  response_source: z.string().optional(),
  answer_card_id: z.string().optional(),
  validator_status: z.string().optional(),
  verifier_verdict: z.string().optional(),
  ts: z.number(),
});

export const CallMemorySchema = z.object({
  retell_call_id: z.string(),
  call_session_id: z.string().uuid().optional(),
  caller_phone: z.string().optional(),
  caller_state_code: z.string().optional(),
  started_at: z.number(),
  recording_disclosed: z.boolean().default(false),
  ai_disclosed: z.boolean().default(false),
  turn_count: z.number().int().default(0),
  recent_turns: z.array(TurnSchema).max(10).default([]),
  slots: z.record(z.string()).default({}),
  flags: z
    .object({
      jailbreak_attempts: z.number().default(0),
      pii_offered: z.boolean().default(false),
      transfer_requested: z.boolean().default(false),
      hallucination_blocks: z.number().default(0),
    })
    .default({}),
});

export type CallMemory = z.infer<typeof CallMemorySchema>;
