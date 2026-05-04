// HMAC-signed session cookie. Edge-runtime safe (uses Web Crypto, not
// node:crypto) so middleware + API routes share the same code.
//
// Cookie: `voxaris_session=<base64url(payload)>.<base64url(hmac)>`
// Payload: { sub: "arrivia", iat: <unix>, exp: <unix> }
// Signing key: LIVEKIT_API_SECRET (already on Vercel; long random
// string, perfectly fine to reuse as an HMAC key).

const COOKIE_NAME = "voxaris_session";
const TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

type Payload = { sub: string; iat: number; exp: number };

function b64urlFromBytes(bytes: ArrayBuffer | Uint8Array): string {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = "";
  for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]!);
  return btoa(s).replace(/=+$/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function b64urlFromString(s: string): string {
  return b64urlFromBytes(new TextEncoder().encode(s));
}

function b64urlDecodeToString(s: string): string {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const bin = atob(s);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

function getSecret(): string {
  const s = process.env.LIVEKIT_API_SECRET ?? process.env.NEXTAUTH_SECRET ?? "";
  if (!s) throw new Error("session secret missing");
  return s;
}

async function hmacKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

async function sign(payloadJson: string): Promise<string> {
  const key = await hmacKey();
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payloadJson),
  );
  return b64urlFromBytes(sig);
}

export async function makeSessionCookie(sub: string): Promise<{
  name: string;
  value: string;
  ttlSeconds: number;
}> {
  const now = Math.floor(Date.now() / 1000);
  const payload: Payload = { sub, iat: now, exp: now + TTL_SECONDS };
  const body = b64urlFromString(JSON.stringify(payload));
  const sig = await sign(body);
  return { name: COOKIE_NAME, value: `${body}.${sig}`, ttlSeconds: TTL_SECONDS };
}

export function clearSessionCookie(): { name: string; value: string; ttlSeconds: number } {
  return { name: COOKIE_NAME, value: "", ttlSeconds: 0 };
}

function timingSafeEqualStrings(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let acc = 0;
  for (let i = 0; i < a.length; i++) {
    acc |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return acc === 0;
}

export async function verifySession(
  rawCookie: string | null | undefined,
): Promise<Payload | null> {
  if (!rawCookie) return null;
  const m = rawCookie.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
  const token = m ? m[1]! : rawCookie;
  if (!token || token.indexOf(".") < 0) return null;
  const [body, gotSig] = token.split(".");
  if (!body || !gotSig) return null;
  let expected: string;
  try {
    expected = await sign(body);
  } catch {
    return null;
  }
  if (!timingSafeEqualStrings(expected, gotSig)) return null;
  let payload: Payload;
  try {
    payload = JSON.parse(b64urlDecodeToString(body));
  } catch {
    return null;
  }
  if (typeof payload.exp !== "number" || payload.exp < Math.floor(Date.now() / 1000)) {
    return null;
  }
  return payload;
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;
