import { NextResponse, type NextRequest } from "next/server";
import { verifySession, SESSION_COOKIE_NAME } from "@/lib/auth/session";

// Gate /dashboard/* (and any future /app/* routes) behind a session
// cookie issued by /api/auth/sign-in. Unauthenticated traffic gets
// redirected to /sign-in?next=<original>.
export const config = {
  matcher: ["/dashboard/:path*"],
};

export async function middleware(req: NextRequest) {
  const cookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = await verifySession(cookie);
  if (session) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/sign-in";
  url.searchParams.set("next", req.nextUrl.pathname + req.nextUrl.search);
  return NextResponse.redirect(url);
}
