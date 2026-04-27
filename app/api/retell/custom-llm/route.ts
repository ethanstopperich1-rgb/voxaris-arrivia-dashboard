import { NextResponse } from "next/server";
import { env } from "@/lib/config/env";
import { RetellLLMRequest, lastUserUtterance } from "@/lib/retell/parse-retell-request";
import { responseEngine } from "@/lib/engine/response-engine";
import { formatFinalResponse, formatFallbackResponse } from "@/lib/retell/format-retell-response";
import { logger } from "@/lib/observability/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** REST custom-LLM (sim mode only). Production uses /custom-llm-ws. */
export async function POST(req: Request) {
  const e = env();
  if (e.KILL_SWITCH) {
    return NextResponse.json({
      response_id: 0,
      content: "We're temporarily unavailable. Please try again shortly.",
      content_complete: true,
      end_call: true,
    });
  }

  const body = await req.json();
  const parsed = RetellLLMRequest.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(formatFallbackResponse(0));
  }
  const utterance = lastUserUtterance(parsed.data.transcript);
  try {
    const result = await responseEngine({
      callId: parsed.data.call_id,
      utterance,
    });
    return NextResponse.json(
      formatFinalResponse({
        responseId: 0,
        text: result.text,
        endCall: result.end_call,
        toolCalls: result.transfer.required
          ? [
              {
                name: "create_transfer_context",
                arguments: { reason: result.meta.route.intent },
              },
            ]
          : [],
      }),
    );
  } catch (err) {
    logger.error({ err: String(err) }, "custom-llm error");
    return NextResponse.json(formatFallbackResponse(0));
  }
}
