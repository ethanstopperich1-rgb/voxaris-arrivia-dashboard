import { z } from "zod";

export const RetellTranscriptItem = z.object({
  role: z.enum(["agent", "user", "system"]),
  content: z.string(),
});

export const RetellInteractionType = z.enum([
  "update_only",
  "response_required",
  "reminder_required",
  "ping_pong",
  "call_details",
]);

/** Inbound WebSocket frame from Retell (custom-llm WS protocol). */
export const RetellWsFrame = z.object({
  interaction_type: RetellInteractionType,
  response_id: z.number().optional(),
  transcript: z.array(RetellTranscriptItem).default([]),
  call: z
    .object({
      call_id: z.string().optional(),
      from_number: z.string().optional(),
      to_number: z.string().optional(),
      direction: z.enum(["inbound", "outbound"]).optional(),
      agent_id: z.string().optional(),
      retell_llm_dynamic_variables: z.record(z.string()).optional(),
    })
    .partial()
    .optional(),
  timestamp: z.number().optional(),
});

export type RetellWsFrameT = z.infer<typeof RetellWsFrame>;

/** REST custom-llm body (sim mode). */
export const RetellLLMRequest = z.object({
  call_id: z.string(),
  transcript: z.array(RetellTranscriptItem),
  agent_id: z.string().optional(),
  retell_llm_id: z.string().optional(),
});
export type RetellLLMRequestT = z.infer<typeof RetellLLMRequest>;

export const RetellWebhookEvent = z.object({
  event: z.enum([
    "call_started",
    "call_ended",
    "call_analyzed",
    "transfer_started",
    "transfer_bridged",
    "transfer_cancelled",
    "transfer_ended",
    "transfer_failed",
  ]),
  call: z
    .object({
      call_id: z.string(),
      from_number: z.string().optional(),
      to_number: z.string().optional(),
      direction: z.enum(["inbound", "outbound"]).optional(),
      start_timestamp: z.number().optional(),
      end_timestamp: z.number().optional(),
      transcript: z.string().optional(),
      transcript_object: z.array(RetellTranscriptItem).optional(),
      recording_url: z.string().url().optional(),
      call_analysis: z.record(z.unknown()).optional(),
      disconnection_reason: z.string().optional(),
    })
    .passthrough(),
});
export type RetellWebhookEventT = z.infer<typeof RetellWebhookEvent>;

export function lastUserUtterance(transcript: { role: string; content: string }[]): string {
  for (let i = transcript.length - 1; i >= 0; i--) {
    const t = transcript[i];
    if (t && t.role === "user") return t.content;
  }
  return "";
}
