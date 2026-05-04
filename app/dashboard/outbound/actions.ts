"use server";

// Server action that places an outbound call via the agent dispatch
// engine without exposing any internal credentials to the browser.
import { AgentDispatchClient } from "livekit-server-sdk";

type StartArgs = {
  to: string;
  agent: "deedy-vba" | "andie-gvr";
  name?: string;
  metadata?: Record<string, unknown>;
};

type StartResult =
  | {
      ok: true;
      room_name: string;
      dispatch_id: string;
      agent_name: string;
      to: string;
    }
  | { ok: false; error: string };

function lkHttpUrl(): string {
  const url = process.env.LIVEKIT_URL ?? "";
  return url.replace(/^wss?:\/\//, "https://");
}

export async function startOutboundCall(args: StartArgs): Promise<StartResult> {
  const { to, agent, name, metadata } = args;
  if (!/^\+\d{10,15}$/.test(to)) {
    return { ok: false, error: "Phone must be in E.164 format." };
  }

  const apiKey = process.env.LIVEKIT_API_KEY ?? "";
  const apiSecret = process.env.LIVEKIT_API_SECRET ?? "";
  const httpUrl = lkHttpUrl();
  if (!apiKey || !apiSecret || !httpUrl) {
    return { ok: false, error: "Telephony env vars missing on server." };
  }

  const prefix = agent === "andie-gvr" ? "andie-out" : "deedy-out";
  const room = `${prefix}-${to.replace(/\D/g, "")}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;

  const dispatchMetadata: Record<string, unknown> = {
    direction: "outbound",
    phone_number: to,
    ...(name ? { caller_name: name, member_name: name } : {}),
    ...(metadata ?? {}),
  };

  const client = new AgentDispatchClient(httpUrl, apiKey, apiSecret);

  try {
    const dispatch = await client.createDispatch(room, agent, {
      metadata: JSON.stringify(dispatchMetadata),
    });
    return {
      ok: true,
      room_name: room,
      dispatch_id: dispatch.id,
      agent_name: agent,
      to,
    };
  } catch (err) {
    return {
      ok: false,
      error: `Dispatch failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
