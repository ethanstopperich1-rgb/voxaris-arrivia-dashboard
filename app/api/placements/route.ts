// Placements REST: list + create + update.
// Used by /dashboard/placements.

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiKey } from "@/lib/auth/api-key";
import { supabaseAdmin } from "@/lib/clients/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CreateBody = z.object({
  slug: z
    .string()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9][a-z0-9-]*$/, "slug must be lowercase, hyphenated"),
  name: z.string().min(1),
  property_name: z.string().optional(),
  premium_offer: z.string().optional(),
  brand: z.string().optional(),
  qr_target_url: z.string().url().optional(),
  active: z.boolean().optional(),
});

const UpdateBody = z.object({
  slug: z.string().min(1),
  name: z.string().optional(),
  property_name: z.string().optional(),
  premium_offer: z.string().optional(),
  brand: z.string().optional(),
  qr_target_url: z.string().url().optional(),
  active: z.boolean().optional(),
});

export async function GET(req: Request): Promise<Response> {
  const auth = requireApiKey(req);
  if (!auth.ok) return auth.res;
  const { data, error } = await supabaseAdmin()
    .from("placements")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, placements: data ?? [] });
}

export async function POST(req: Request): Promise<Response> {
  const auth = requireApiKey(req);
  if (!auth.ok) return auth.res;
  const json = await req.json().catch(() => null);
  const parsed = CreateBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "bad-body", issues: parsed.error.issues },
      { status: 422 },
    );
  }
  const p = parsed.data;
  const { data, error } = await supabaseAdmin()
    .from("placements")
    .insert({
      slug: p.slug,
      name: p.name,
      property_name: p.property_name ?? null,
      premium_offer: p.premium_offer ?? null,
      brand: p.brand ?? "ARRIVIA",
      qr_target_url: p.qr_target_url ?? null,
      active: p.active ?? true,
    })
    .select("*")
    .single();
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, placement: data });
}

export async function PATCH(req: Request): Promise<Response> {
  const auth = requireApiKey(req);
  if (!auth.ok) return auth.res;
  const json = await req.json().catch(() => null);
  const parsed = UpdateBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "bad-body", issues: parsed.error.issues },
      { status: 422 },
    );
  }
  const { slug, ...rest } = parsed.data;
  const update: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(rest)) {
    if (v !== undefined) update[k] = v;
  }
  const { data, error } = await supabaseAdmin()
    .from("placements")
    .update(update)
    .eq("slug", slug)
    .select("*")
    .single();
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, placement: data });
}
