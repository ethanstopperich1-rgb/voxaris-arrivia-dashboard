import { NextResponse, type NextRequest } from "next/server";

export const config = {
  matcher: ["/dashboard/:path*"],
};

export function middleware(req: NextRequest) {
  const expectedUser = process.env.DASHBOARD_BASIC_AUTH_USER ?? "";
  const expectedPass = process.env.DASHBOARD_BASIC_AUTH_PASS ?? "";
  if (!expectedUser || !expectedPass) return NextResponse.next();

  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Basic ")) {
    const decoded = Buffer.from(auth.slice(6), "base64").toString("utf8");
    const [user, ...rest] = decoded.split(":");
    const pass = rest.join(":");
    if (user === expectedUser && pass === expectedPass) return NextResponse.next();
  }
  return new NextResponse("authentication required", {
    status: 401,
    headers: { "www-authenticate": 'Basic realm="GVR Ops Dashboard"' },
  });
}
