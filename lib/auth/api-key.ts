import { timingSafeEqual } from "node:crypto";
import { env } from "@/lib/config/env";

export function requireApiKey(req: Request): { ok: true } | { ok: false; res: Response } {
  // Trim both sides — Vercel's env pull occasionally appends \n to
  // values pasted in the dashboard, which made timingSafeEqual
  // reject perfectly valid keys because the lengths didn't match.
  // Trim also normalizes against accidental trailing-space copy/paste
  // when env vars are set via the Render dashboard.
  const expected = (env().APP_API_KEY ?? "").trim();
  const got = (req.headers.get("x-api-key") ?? "").trim();
  if (got.length === expected.length && got.length > 0) {
    try {
      if (timingSafeEqual(Buffer.from(got), Buffer.from(expected))) return { ok: true };
    } catch {
      /* fallthrough */
    }
  }
  return { ok: false, res: new Response("unauthorized", { status: 401 }) };
}
