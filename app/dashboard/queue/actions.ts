"use server";

// Server actions for the dial-queue page. Bulk-insert from CSV upload,
// status updates, and emergency clear.
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/clients/supabase-admin";

type RowInput = {
  agent_name: "andie-gvr" | "deedy-vba";
  phone_number: string;
  member_name?: string;
  metadata?: Record<string, unknown>;
  ai_score?: number;
  ai_score_reason?: string;
};

function normalizeE164(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (raw.trim().startsWith("+")) return "+" + digits;
  if (digits.length === 10) return "+1" + digits;
  if (digits.length === 11 && digits.startsWith("1")) return "+" + digits;
  return raw.trim().startsWith("+") ? raw.trim() : `+${digits}`;
}

export async function bulkEnqueue(rows: RowInput[]): Promise<{
  inserted: number;
  skipped: number;
  errors: string[];
}> {
  const errors: string[] = [];
  const cleaned: RowInput[] = [];
  let skipped = 0;

  for (const r of rows) {
    const phone = normalizeE164(r.phone_number || "");
    if (!/^\+\d{10,15}$/.test(phone)) {
      skipped += 1;
      errors.push(`bad phone: ${r.phone_number}`);
      continue;
    }
    if (r.agent_name !== "andie-gvr" && r.agent_name !== "deedy-vba") {
      skipped += 1;
      errors.push(`bad agent: ${r.agent_name}`);
      continue;
    }
    cleaned.push({ ...r, phone_number: phone });
  }

  if (cleaned.length === 0) {
    return { inserted: 0, skipped, errors };
  }

  const sb = supabaseAdmin();
  const now = new Date().toISOString();
  const { error } = await sb.from("dial_queue").insert(
    cleaned.map((r) => ({
      agent_name: r.agent_name,
      phone_number: r.phone_number,
      member_name: r.member_name ?? null,
      metadata: r.metadata ?? {},
      ai_score: r.ai_score ?? null,
      ai_score_reason: r.ai_score_reason ?? null,
      ai_score_model: r.ai_score != null ? "grok-4-1-fast-non-reasoning" : null,
      ai_scored_at: r.ai_score != null ? now : null,
    })),
  );
  if (error) {
    errors.push(error.message);
    return { inserted: 0, skipped: skipped + cleaned.length, errors };
  }

  revalidatePath("/dashboard/queue");
  return { inserted: cleaned.length, skipped, errors };
}

export async function setStatus(
  id: string,
  status: "pending" | "completed" | "failed" | "dnc",
): Promise<{ ok: boolean; error?: string }> {
  const sb = supabaseAdmin();
  const { error } = await sb
    .from("dial_queue")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/queue");
  return { ok: true };
}

export async function clearAllPending(
  agent: "andie-gvr" | "deedy-vba",
): Promise<{ ok: boolean; cleared: number; error?: string }> {
  const sb = supabaseAdmin();
  const { count, error } = await sb
    .from("dial_queue")
    .delete({ count: "exact" })
    .eq("agent_name", agent)
    .eq("status", "pending");
  if (error) return { ok: false, cleared: 0, error: error.message };
  revalidatePath("/dashboard/queue");
  return { ok: true, cleared: count ?? 0 };
}
