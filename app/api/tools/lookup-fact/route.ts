import { NextResponse } from "next/server";
import { z } from "zod";
import { allFacts, getFact } from "@/lib/guardrails/facts-loader";
import { requireApiKey } from "@/lib/auth/api-key";

export const runtime = "nodejs";

const Body = z.object({
  fact_id: z.string().optional(),
  query: z.string().optional(),
});

export async function POST(req: Request) {
  const auth = requireApiKey(req);
  if (!auth.ok) return auth.res;
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "bad-body" }, { status: 422 });
  if (parsed.data.fact_id) {
    const f = getFact(parsed.data.fact_id);
    return f
      ? NextResponse.json({ fact: f })
      : NextResponse.json({ error: "not-found" }, { status: 404 });
  }
  const q = (parsed.data.query ?? "").toLowerCase();
  const matches = allFacts().filter(
    (f) =>
      f.canonical.toLowerCase().includes(q) ||
      f.allowed_phrases.some((p) => p.toLowerCase().includes(q)) ||
      f.id.toLowerCase().includes(q),
  );
  return NextResponse.json({ facts: matches.slice(0, 5) });
}
