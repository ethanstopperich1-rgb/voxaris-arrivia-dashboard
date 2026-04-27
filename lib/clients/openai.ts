import OpenAI from "openai";
import { env } from "@/lib/config/env";

let _client: OpenAI | null = null;

export function openai(): OpenAI {
  if (_client) return _client;
  const e = env();
  _client = new OpenAI({
    apiKey: e.OPENAI_API_KEY,
    baseURL: e.HELICONE_API_KEY ? "https://oai.helicone.ai/v1" : undefined,
    defaultHeaders: e.HELICONE_API_KEY
      ? { "Helicone-Auth": `Bearer ${e.HELICONE_API_KEY}` }
      : {},
  });
  return _client;
}
