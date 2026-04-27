import { timingSafeEqual } from "node:crypto";
import { env } from "@/lib/config/env";

export function requireApiKey(req: Request): { ok: true } | { ok: false; res: Response } {
  const expected = env().APP_API_KEY;
  const got = req.headers.get("x-api-key") ?? "";
  if (got.length === expected.length && got.length > 0) {
    try {
      if (timingSafeEqual(Buffer.from(got), Buffer.from(expected))) return { ok: true };
    } catch {
      /* fallthrough */
    }
  }
  return { ok: false, res: new Response("unauthorized", { status: 401 }) };
}
