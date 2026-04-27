import Anthropic from "@anthropic-ai/sdk";
import { env } from "@/lib/config/env";

let _client: Anthropic | null = null;

export function anthropic(): Anthropic {
  if (_client) return _client;
  const e = env();
  _client = new Anthropic({
    apiKey: e.ANTHROPIC_API_KEY,
    baseURL: e.HELICONE_API_KEY ? "https://anthropic.helicone.ai" : undefined,
    defaultHeaders: e.HELICONE_API_KEY
      ? { "Helicone-Auth": `Bearer ${e.HELICONE_API_KEY}` }
      : {},
  });
  return _client;
}
