import { hmacSha256, safeEqualHex } from "@/lib/utils/hash";
import { env } from "@/lib/config/env";

/** Verify x-retell-signature header. Body = `${timestamp}${rawBody}`. */
export function verifyRetellSignature(opts: {
  header: string | null;
  rawBody: string;
  toleranceSec?: number;
}): { valid: boolean; reason?: string } {
  const { header, rawBody, toleranceSec = 300 } = opts;
  if (!header) return { valid: false, reason: "missing-header" };
  const parts = Object.fromEntries(
    header.split(",").map((kv) => {
      const i = kv.indexOf("=");
      return [kv.slice(0, i).trim(), kv.slice(i + 1).trim()];
    }),
  );
  const t = parts["t"];
  const v1 = parts["v1"];
  if (!t || !v1) return { valid: false, reason: "malformed-header" };
  const ts = Number(t);
  if (!Number.isFinite(ts)) return { valid: false, reason: "bad-timestamp" };
  const drift = Math.abs(Date.now() / 1000 - ts);
  if (drift > toleranceSec) return { valid: false, reason: "stale-timestamp" };
  const expected = hmacSha256(env().RETELL_WEBHOOK_SECRET, `${t}${rawBody}`);
  return { valid: safeEqualHex(expected, v1) };
}
