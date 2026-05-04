// Public QR-scan attribution endpoint.
//
// QR codes encode  https://arrivia-gvr.vercel.app/api/scan/<slug>
// so every physical scan is recorded in `placement_scans` and the
// caller is then 302-redirected to the placement's `qr_target_url`.
//
// We never store raw IP — only sha256(ip).
//
// No auth: this is the public endpoint physical QR codes hit.

import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { supabaseAdmin } from "@/lib/clients/supabase-admin";
import { logger } from "@/lib/observability/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_FALLBACK_URL = "https://arrivia.com/";

function hashIp(ip: string | null): string | null {
  if (!ip) return null;
  return createHash("sha256").update(ip).digest("hex");
}

function firstForwardedIp(req: Request): string | null {
  const xff = req.headers.get("x-forwarded-for");
  if (!xff) return null;
  const first = xff.split(",")[0]?.trim();
  return first && first.length > 0 ? first : null;
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ slug: string }> },
): Promise<Response> {
  const { slug } = await ctx.params;
  const sb = supabaseAdmin();

  const { data: placement, error } = await sb
    .from("placements")
    .select("slug, qr_target_url, active, scan_count")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    logger.warn({ err: error.message, slug }, "scan: placement lookup failed");
  }

  if (!placement) {
    // Unknown slug → safe fallback.
    return NextResponse.redirect(DEFAULT_FALLBACK_URL, { status: 302 });
  }

  const target = placement.qr_target_url || DEFAULT_FALLBACK_URL;

  // Log the scan + bump counter (best-effort; never block the redirect).
  try {
    const userAgent = req.headers.get("user-agent");
    const referrer = req.headers.get("referer");
    const ipHash = hashIp(firstForwardedIp(req));

    await sb.from("placement_scans").insert({
      placement_slug: slug,
      user_agent: userAgent,
      ip_hash: ipHash,
      referrer,
    });
    await sb
      .from("placements")
      .update({ scan_count: Number(placement.scan_count ?? 0) + 1 })
      .eq("slug", slug);
  } catch (err) {
    logger.error({ err: String(err), slug }, "scan: log/increment failed");
  }

  return NextResponse.redirect(target, { status: 302 });
}
