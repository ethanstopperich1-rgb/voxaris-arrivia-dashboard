/** Build a single completed response chunk for Retell custom-LLM (REST or final WS frame). */
export function formatFinalResponse(opts: {
  responseId: number;
  text: string;
  toolCalls?: Array<{ name: string; arguments: Record<string, unknown> }>;
  endCall?: boolean;
}) {
  return {
    response_id: opts.responseId,
    content: opts.text,
    content_complete: true,
    end_call: opts.endCall ?? false,
    tool_calls: opts.toolCalls ?? [],
  };
}

/** Stream chunk (incomplete). */
export function formatStreamChunk(opts: { responseId: number; text: string }) {
  return {
    response_id: opts.responseId,
    content: opts.text,
    content_complete: false,
  };
}

/** Standard graceful fallback if engine errors. */
export function formatFallbackResponse(responseId: number) {
  return formatFinalResponse({
    responseId,
    text:
      "Let me check the approved details and a GVR specialist can confirm — would you like me to connect you?",
  });
}
