import { createServer } from "node:http";
import { WebSocketServer } from "ws";
import { RetellWsFrame, lastUserUtterance } from "../lib/retell/parse-retell-request";
import { responseEngine } from "../lib/engine/response-engine";
import {
  formatFinalResponse,
  formatFallbackResponse,
} from "../lib/retell/format-retell-response";
import { logger } from "../lib/observability/logger";
import { env } from "../lib/config/env";

const PORT = Number(process.env.WS_PORT ?? 8787);

const http = createServer((_req, res) => {
  res.writeHead(200, { "content-type": "text/plain" });
  res.end("gvr-retell-ws ok");
});

const wss = new WebSocketServer({ server: http, path: "/retell/custom-llm-ws" });
const SHARED_SECRET = process.env.RETELL_LLM_WEBSOCKET_SECRET ?? "";

wss.on("connection", (ws, req) => {
  const u = new URL(req.url ?? "/", "http://x");
  if (SHARED_SECRET && u.searchParams.get("token") !== SHARED_SECRET) {
    logger.warn({ ip: req.socket.remoteAddress }, "ws auth failed");
    ws.close(4401, "unauthorized");
    return;
  }
  const callId = u.searchParams.get("call_id") ?? "unknown";
  logger.info({ callId }, "ws connected");

  ws.on("message", async (data) => {
    let parsed;
    try {
      parsed = RetellWsFrame.safeParse(JSON.parse(data.toString()));
    } catch (e) {
      logger.warn({ err: String(e) }, "ws frame parse fail");
      return;
    }
    if (!parsed.success) return;

    const frame = parsed.data;
    if (frame.interaction_type === "ping_pong") {
      ws.send(JSON.stringify({ interaction_type: "ping_pong", timestamp: Date.now() }));
      return;
    }
    if (frame.interaction_type === "update_only" || frame.interaction_type === "call_details") {
      return;
    }
    if (frame.interaction_type === "response_required" || frame.interaction_type === "reminder_required") {
      const responseId = frame.response_id ?? 0;
      try {
        if (env().KILL_SWITCH) {
          ws.send(
            JSON.stringify(
              formatFinalResponse({
                responseId,
                text: "We're temporarily unavailable. Please try again shortly.",
                endCall: true,
              }),
            ),
          );
          return;
        }
        const utterance = lastUserUtterance(frame.transcript);
        const result = await responseEngine({
          callId: frame.call?.call_id ?? callId,
          utterance,
        });
        ws.send(
          JSON.stringify(
            formatFinalResponse({
              responseId,
              text: result.text,
              endCall: result.end_call,
              toolCalls: result.transfer.required
                ? [{ name: "create_transfer_context", arguments: { reason: result.meta.route.intent } }]
                : [],
            }),
          ),
        );
      } catch (e) {
        logger.error({ err: String(e) }, "engine error");
        ws.send(JSON.stringify(formatFallbackResponse(responseId)));
      }
    }
  });

  ws.on("close", () => logger.info({ callId }, "ws closed"));
});

http.listen(PORT, () => logger.info({ port: PORT }, "gvr ws-server listening"));
