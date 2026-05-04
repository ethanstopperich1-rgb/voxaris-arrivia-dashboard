import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/clients/supabase-admin";
import { sha256 } from "@/lib/utils/hash";
import { logger } from "@/lib/observability/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /scan/[id]
 *
 * Server-side scan attribution layer. Per multi-model legal council, DTMF
 * encoded in tel: URIs is unreliable across iOS/Android dialers. This
 * route is the redundant attribution backbone:
 *
 *   QR encodes:  https://arrivia-gvr.vercel.app/scan/<placement_id>
 *   Server logs the scan with placement_id + UA + IP hash + timestamp,
 *   then 302 redirects to tel:+<placement-bound-number>.
 *
 * Even if the user never taps the green call button, we still know they
 * scanned which QR, when, from what device. The redirect is invisible.
 */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const url = new URL(req.url);
  const userAgent = req.headers.get("user-agent") ?? "";
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
  const referrer = req.headers.get("referer") ?? "";

  // Look up the placement
  let destinationPhone = "+14072890294"; // fallback to GVR demo line
  let placement_name: string | null = null;
  let property_name: string | null = null;
  let property_id: string | null = null;

  try {
    const { data } = await supabaseAdmin()
      .from("opc_placements")
      .select("id, property_id, property_name, location_name, qr_destination_url, status")
      .eq("id", id)
      .maybeSingle();
    if (data && data.status === "active") {
      // qr_destination_url stored as the tel: URI or just the phone
      destinationPhone = data.qr_destination_url || destinationPhone;
      placement_name = data.location_name;
      property_name = data.property_name;
      property_id = data.property_id;
    }
  } catch (e) {
    logger.warn({ err: String(e), placement: id }, "scan: placement lookup failed");
  }

  // Always log the scan, even if placement lookup fails
  const scan_token = `${id}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  try {
    await supabaseAdmin().from("opc_scans").insert({
      scan_token,
      placement_id: id,
      placement_name,
      property_id,
      property_name,
      user_agent: userAgent.slice(0, 500),
      ip_hash: ip ? sha256(ip).slice(0, 16) : null,
      referrer: referrer.slice(0, 500) || null,
    });
  } catch (e) {
    logger.warn({ err: String(e), placement: id }, "scan: log insert failed");
  }

  // Build tel: URI — accepts either bare phone or full tel: in qr_destination_url
  const telUri = destinationPhone.startsWith("tel:")
    ? destinationPhone
    : `tel:${destinationPhone}`;

  // 302 → opens the dialer immediately
  return NextResponse.redirect(telUri, { status: 302 });
}
