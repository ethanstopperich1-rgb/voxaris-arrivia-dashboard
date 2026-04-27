import { NextResponse } from "next/server";
import { anthropic } from "@/lib/clients/anthropic";
import { openai } from "@/lib/clients/openai";
import { MODELS } from "@/lib/config/constants";

export const runtime = "nodejs";

/** Vercel Cron: ping each LLM provider to keep instances warm. */
export async function GET() {
  const tasks = [
    anthropic()
      .messages.create({
        model: MODELS.ROUTER,
        max_tokens: 8,
        messages: [{ role: "user", content: "ping" }],
      })
      .catch((e) => ({ error: String(e).slice(0, 80) })),
    openai()
      .chat.completions.create({
        model: MODELS.EDUCATION,
        max_tokens: 8,
        messages: [{ role: "user", content: "ping" }],
      })
      .catch((e) => ({ error: String(e).slice(0, 80) })),
  ];
  const results = await Promise.all(tasks);
  return NextResponse.json({ ok: true, prewarmed: results.length });
}
