import { env } from "./env";

/**
 * Loaded shape of /infra/retell/agent.json + runtime overrides.
 * Authoritative spec lives in infra/retell/agent.json (Blueprint 5).
 */
export function retellAgentConfig() {
  const e = env();
  return {
    agent_id: e.RETELL_AGENT_ID,
    llm_id: e.RETELL_LLM_ID,
    llm_websocket_url: e.RETELL_LLM_WEBSOCKET_URL,
    phone_number: e.RETELL_PHONE_NUMBER,
    webhook_url: `${e.NEXT_PUBLIC_APP_URL}/api/retell/events`,
    inbound_url: `${e.NEXT_PUBLIC_APP_URL}/api/retell/inbound`,
    outage_fallback_number: e.RETELL_OUTAGE_FALLBACK_NUMBER,
  };
}
