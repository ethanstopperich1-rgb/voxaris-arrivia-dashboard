// Appointments REST API.
//
// GET  — list appointments (filterable by date range, agent, status).
// POST — create an appointment. Used as a fallback when the worker cannot
//        post via /api/agent/events (e.g. tool-handler retries that need
//        idempotent record-keeping outside the per-event fan-out).
//
// Both routes require x-api-key auth.

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiKey } from "@/lib/auth/api-key";
import { supabaseAdmin } from "@/lib/clients/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ListQuery = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  agent_name: z.string().optional(),
  status: z.string().optional(),
  limit: z.coerce.number().int().positive().max(500).optional(),
});

const CreateBody = z.object({
  livekit_room_name: z.string().optional(),
  agent_name: z.string().optional(),
  caller_name: z.string().optional(),
  caller_phone: z.string().optional(),
  property_name: z.string().optional(),
  placement_slug: z.string().optional(),
  tour_slot: z.string().optional(),
  tour_at: z.string().datetime().optional(),
  on_property: z.boolean().optional(),
  deposit_path: z.string().optional(),
  confirmation_id: z.string().optional(),
  status: z.string().optional(),
  notes: z.string().optional(),
});

function parseTourAt(slot: string | undefined): string | null {
  if (!slot) return null;
  const t = Date.parse(slot);
  return Number.isFinite(t) ? new Date(t).toISOString() : null;
}

export async function GET(req: Request): Promise<Response> {
  const auth = requireApiKey(req);
  if (!auth.ok) return auth.res;

  const url = new URL(req.url);
  const parsed = ListQuery.safeParse({
    from: url.searchParams.get("from") ?? undefined,
    to: url.searchParams.get("to") ?? undefined,
    agent_name: url.searchParams.get("agent_name") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "bad-query", issues: parsed.error.issues },
      { status: 422 },
    );
  }
  const q = parsed.data;

  let query = supabaseAdmin()
    .from("appointments")
    .select("*")
    .order("tour_at", { ascending: true, nullsFirst: false })
    .limit(q.limit ?? 200);

  if (q.from) query = query.gte("tour_at", q.from);
  if (q.to) query = query.lte("tour_at", q.to);
  if (q.agent_name) query = query.eq("agent_name", q.agent_name);
  if (q.status) query = query.eq("status", q.status);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, appointments: data ?? [] });
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

  // Resolve call_session_id from livekit_room_name (best-effort).
  let callSessionId: string | null = null;
  if (p.livekit_room_name) {
    const { data: row } = await supabaseAdmin()
      .from("call_sessions")
      .select("id")
      .eq("livekit_room_name", p.livekit_room_name)
      .maybeSingle();
    callSessionId = row?.id ?? null;
  }

  const tour_at = p.tour_at ?? parseTourAt(p.tour_slot);

  const { data, error } = await supabaseAdmin()
    .from("appointments")
    .insert({
      call_session_id: callSessionId,
      livekit_room_name: p.livekit_room_name ?? null,
      agent_name: p.agent_name ?? null,
      caller_name: p.caller_name ?? null,
      caller_phone: p.caller_phone ?? null,
      property_name: p.property_name ?? null,
      placement_slug: p.placement_slug ?? null,
      tour_slot: p.tour_slot ?? null,
      tour_at,
      on_property: p.on_property ?? null,
      deposit_path: p.deposit_path ?? null,
      confirmation_id: p.confirmation_id ?? null,
      status: p.status ?? "booked",
      notes: p.notes ?? null,
    })
    .select("*")
    .single();
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, appointment: data });
}
