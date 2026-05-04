// QR PNG generator. Encodes  https://<host>/api/scan/<slug>  so every
// scan flows through the attribution endpoint before redirecting.
//
// Dependency:  `qrcode` (already installed; types in @types/qrcode).
//   pnpm add qrcode @types/qrcode

import QRCode from "qrcode";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function originFrom(req: Request): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL;
  if (fromEnv) return fromEnv.replace(/\/+$/, "");
  const url = new URL(req.url);
  return `${url.protocol}//${url.host}`;
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ slug: string }> },
): Promise<Response> {
  const { slug } = await ctx.params;
  const target = `${originFrom(req)}/api/scan/${encodeURIComponent(slug)}`;

  const png = await QRCode.toBuffer(target, {
    type: "png",
    errorCorrectionLevel: "M",
    margin: 2,
    width: 1024,
    color: { dark: "#000000", light: "#FFFFFF" },
  });

  return new Response(new Uint8Array(png), {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `inline; filename="qr-${slug}.png"`,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
