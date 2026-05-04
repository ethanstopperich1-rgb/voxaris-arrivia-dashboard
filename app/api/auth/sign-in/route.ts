// POST /api/auth/sign-in
// Body: { username, password }. Validates against env (or hardcoded
// demo creds) and sets the HMAC-signed session cookie.
import { NextResponse } from "next/server";
import { z } from "zod";
import { makeSessionCookie } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  username: z.string().min(1).max(80),
  password: z.string().min(1).max(200),
});

const DEMO_USER = "arrivia";
const DEMO_PASS = "demo2026";

export async function POST(req: Request) {
  let parsed: z.infer<typeof Body>;
  try {
    parsed = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }
  const { username, password } = parsed;

  const expectedUser = process.env.DASHBOARD_BASIC_AUTH_USER || DEMO_USER;
  const expectedPass = process.env.DASHBOARD_BASIC_AUTH_PASS || DEMO_PASS;

  if (username !== expectedUser || password !== expectedPass) {
    return NextResponse.json(
      { ok: false, error: "invalid_credentials" },
      { status: 401 },
    );
  }

  const cookie = await makeSessionCookie(username);
  const res = NextResponse.json({ ok: true, redirect: "/dashboard" });
  res.cookies.set({
    name: cookie.name,
    value: cookie.value,
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: cookie.ttlSeconds,
  });
  return res;
}
