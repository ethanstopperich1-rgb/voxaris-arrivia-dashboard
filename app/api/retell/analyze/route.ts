import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/clients/supabase-admin";
import { anthropic } from "@/lib/clients/anthropic";
import { MODELS } from "@/lib/config/constants";
import { readFileSync } from "node:fs";
import { join } from "node:path";

export const runtime = "nodejs";

const Body = z.object({ retell_call_id: z.string() });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "bad-body" }, { status: 422 });
  const sb = supabaseAdmin();
  const { data: session } = await sb
    .from("call_sessions")
    .select("id")
    .eq("retell_call_id", parsed.data.retell_call_id)
    .maybeSingle();
  if (!session) return NextResponse.json({ error: "no-session" }, { status: 404 });

  const { data: turns } = await sb
    .from("evidence_ledgers")
    .select("turn_index, user_question, agent_final, route_intent, verifier_verdict")
    .eq("call_session_id", session.id)
    .order("turn_index");

  const transcript = (turns ?? [])
    .map((t) => `User: ${t.user_question}\nAgent: ${t.agent_final}`)
    .join("\n\n");

  const prompt = readFileSync(join(process.cwd(), "prompts/post-call-summary.md"), "utf8");
  const res = await anthropic().messages.create({
    model: MODELS.POST_CALL_SUMMARY,
    max_tokens: 300,
    temperature: 0.1,
    system: prompt,
    messages: [{ role: "user", content: transcript }],
  });
  const text = res.content
    .filter((c): c is Extract<typeof c, { type: "text" }> => c.type === "text")
    .map((c) => c.text)
    .join("");
  return NextResponse.json({ summary: text });
}
