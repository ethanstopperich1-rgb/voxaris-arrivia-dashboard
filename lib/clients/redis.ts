import { Redis } from "@upstash/redis";
import { env } from "@/lib/config/env";

let _client: Redis | null = null;

export function redis(): Redis {
  if (_client) return _client;
  const e = env();
  _client = new Redis({ url: e.UPSTASH_REDIS_REST_URL, token: e.UPSTASH_REDIS_REST_TOKEN });
  return _client;
}
