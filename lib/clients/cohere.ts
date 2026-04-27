import { CohereClient } from "cohere-ai";
import { env } from "@/lib/config/env";

let _client: CohereClient | null = null;

export function cohere(): CohereClient {
  if (_client) return _client;
  _client = new CohereClient({ token: env().COHERE_API_KEY });
  return _client;
}
