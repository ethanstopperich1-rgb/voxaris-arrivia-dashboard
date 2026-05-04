"use server";

// Server actions for placements CRUD. Server-side only — uses the
// admin Supabase client so the browser never needs the API key.

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/clients/supabase-admin";

const SlugRe = /^[a-z0-9][a-z0-9-]*$/;

const Create = z.object({
  slug: z.string().min(1).max(120).regex(SlugRe),
  name: z.string().min(1),
  property_name: z.string().optional(),
  premium_offer: z.string().optional(),
  brand: z.string().optional(),
  qr_target_url: z.string().url().optional(),
});

const Update = z.object({
  slug: z.string().min(1),
  name: z.string().optional(),
  property_name: z.string().optional(),
  premium_offer: z.string().optional(),
  brand: z.string().optional(),
  qr_target_url: z.string().url().optional(),
  active: z.boolean().optional(),
});

function emptyToUndef(v: FormDataEntryValue | null): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t.length === 0 ? undefined : t;
}

export async function createPlacement(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const parsed = Create.safeParse({
    slug: emptyToUndef(formData.get("slug")),
    name: emptyToUndef(formData.get("name")),
    property_name: emptyToUndef(formData.get("property_name")),
    premium_offer: emptyToUndef(formData.get("premium_offer")),
    brand: emptyToUndef(formData.get("brand")),
    qr_target_url: emptyToUndef(formData.get("qr_target_url")),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join(", ") };
  }
  const { error } = await supabaseAdmin()
    .from("placements")
    .insert({
      slug: parsed.data.slug,
      name: parsed.data.name,
      property_name: parsed.data.property_name ?? null,
      premium_offer: parsed.data.premium_offer ?? null,
      brand: parsed.data.brand ?? "ARRIVIA",
      qr_target_url: parsed.data.qr_target_url ?? null,
      active: true,
    });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/placements");
  return { ok: true };
}

export async function updatePlacement(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const activeRaw = formData.get("active");
  const parsed = Update.safeParse({
    slug: emptyToUndef(formData.get("slug")),
    name: emptyToUndef(formData.get("name")),
    property_name: emptyToUndef(formData.get("property_name")),
    premium_offer: emptyToUndef(formData.get("premium_offer")),
    brand: emptyToUndef(formData.get("brand")),
    qr_target_url: emptyToUndef(formData.get("qr_target_url")),
    active: activeRaw == null ? undefined : activeRaw === "true",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join(", ") };
  }
  const { slug, ...rest } = parsed.data;
  const update: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(rest)) {
    if (v !== undefined) update[k] = v;
  }
  if (Object.keys(update).length === 0) return { ok: true };
  const { error } = await supabaseAdmin().from("placements").update(update).eq("slug", slug);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/placements");
  return { ok: true };
}

export async function togglePlacementActive(
  slug: string,
  active: boolean,
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabaseAdmin().from("placements").update({ active }).eq("slug", slug);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/placements");
  return { ok: true };
}
