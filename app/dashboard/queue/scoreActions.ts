"use server";

// AI lead-scoring server action. Takes the parsed CSV rows from the
// uploader, sends them to Grok in a single batched call, returns
// the rows enriched with a 0-100 score + a short reason. The page
// then sorts and highlights the top 20.
//
// Model: openai/gpt-4o-mini  (cheap + fast for scoring)
// Auth: OPENAI_API_KEY on the server (already on Vercel).
// Migrated 2026-05-05 — Grok 4.1 fast non-reasoning was deprecated.
//
// Heuristic the prompt asks the model to apply:
//   - Returning callers (last_call_date != "never") who haven't booked
//     yet are HIGHEST priority — they've shown interest before.
//   - Higher incentive_amount + higher total_after_bonus = warmer.
//   - Members who provided a real-looking name (not "guest", not blank)
//     score better than anonymous.
//   - Recent enrollments (last_call_date within 90 days) score higher
//     because the original interest is fresh.
//   - DNC, "not_interested" hints in metadata = floor (5-15).

const SCORING_MODEL = "gpt-4o-mini";

export type ScoredRow = {
  agent_name: "andie-gvr" | "deedy-vba";
  phone_number: string;
  member_name?: string;
  metadata?: Record<string, unknown>;
  ai_score: number;
  ai_score_reason: string;
};

export type RawRow = {
  agent_name: "andie-gvr" | "deedy-vba";
  phone_number: string;
  member_name?: string;
  metadata?: Record<string, unknown>;
};

type ScoringResponse = {
  scores: { i: number; score: number; reason: string }[];
};

const SYSTEM_PROMPT = `You are a sales-ops lead-prioritization assistant for a travel-rewards
program. You will receive a JSON array of leads to be auto-dialed by an
AI voice agent. Score each lead 0-100 on likelihood of conversion to a
warm transfer or a booked appointment, and give a one-line reason
(<= 90 chars).

Score with this rubric:
- Returning callers (last_call_date != "never" / not blank) who never
  converted: 75-95 (warm re-engagement)
- Recent enrollments (last_call_date within ~90 days): 65-85
- Higher incentive_amount or total_after_bonus = bump 5-10 pts
- Real-looking first name (not "guest", "test", blank, single letter): +5
- Andie-bound leads with member context (program-specific metadata): +5
- DNC hints, "not_interested" history, "wrong_number" notes: 5-25 floor
- No metadata, no name, plain phone-only: baseline 50

Return STRICT JSON:
{ "scores": [ { "i": 0, "score": 78, "reason": "..." }, ... ] }
Index "i" must match the input array index. Score 0-100, integer.
Reason is plain text, no quotes around it.`;

function buildUserPayload(rows: RawRow[]): string {
  return JSON.stringify(
    rows.map((r, i) => ({
      i,
      agent: r.agent_name,
      name: r.member_name ?? null,
      ...(r.metadata ?? {}),
      // Phone deliberately omitted — score should be content-driven, not
      // tied to area-code biases.
    })),
  );
}

export async function scoreLeads(rows: RawRow[]): Promise<{
  scored: ScoredRow[];
  fallbackUsed: boolean;
  error?: string;
}> {
  if (rows.length === 0) {
    return { scored: [], fallbackUsed: false };
  }

  const apiKey = process.env.OPENAI_API_KEY ?? "";
  if (!apiKey) {
    // Graceful fallback: deterministic priority by metadata richness.
    return {
      scored: heuristicFallback(rows),
      fallbackUsed: true,
      error: "OPENAI_API_KEY missing — used heuristic fallback.",
    };
  }

  // Cap the batch so a 500-row CSV doesn't blow the LLM budget.
  // We score the first 250 by deterministic ordering; remaining rows
  // get a baseline 50 from the fallback.
  const head = rows.slice(0, 250);
  const tail = rows.slice(250);
  const payload = buildUserPayload(head);

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: SCORING_MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: payload },
        ],
        temperature: 0,
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) {
      const txt = await res.text();
      return {
        scored: heuristicFallback(rows),
        fallbackUsed: true,
        error: `Ranking engine HTTP ${res.status}: ${txt.slice(0, 160)}`,
      };
    }
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const raw = data.choices?.[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as ScoringResponse;

    const byIndex = new Map<number, { score: number; reason: string }>();
    for (const s of parsed.scores ?? []) {
      if (typeof s.i === "number" && typeof s.score === "number") {
        byIndex.set(s.i, {
          score: Math.max(0, Math.min(100, Math.round(s.score))),
          reason: String(s.reason ?? "").slice(0, 200),
        });
      }
    }

    const headScored: ScoredRow[] = head.map((r, i) => {
      const got = byIndex.get(i);
      return {
        ...r,
        ai_score: got?.score ?? 50,
        ai_score_reason: got?.reason ?? "no score returned",
      };
    });
    // Tail rows: deterministic baseline so they're still in the queue
    // but ranked below scored rows.
    const tailScored: ScoredRow[] = tail.map((r) => ({
      ...r,
      ai_score: 50,
      ai_score_reason: "batch overflow — used baseline 50",
    }));

    return { scored: [...headScored, ...tailScored], fallbackUsed: false };
  } catch (err) {
    return {
      scored: heuristicFallback(rows),
      fallbackUsed: true,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

function heuristicFallback(rows: RawRow[]): ScoredRow[] {
  return rows.map((r) => {
    const md = r.metadata ?? {};
    let score = 50;
    const reasons: string[] = [];
    const name = (r.member_name ?? "").trim().toLowerCase();
    if (name && name.length > 2 && !["guest", "test", "user"].includes(name)) {
      score += 5;
      reasons.push("named recipient");
    }
    const last = String(md["last_call_date"] ?? "").toLowerCase();
    if (last && last !== "never" && last !== "false") {
      score += 20;
      reasons.push("returning caller");
    }
    const isReturning = String(md["is_returning_caller"] ?? "").toLowerCase();
    if (isReturning === "true") {
      score += 5;
      reasons.push("flagged returning");
    }
    if (md["incentive_amount"]) {
      score += 3;
      reasons.push("incentive context");
    }
    if (Object.keys(md).length === 0 && !name) {
      score = 35;
      reasons.length = 0;
      reasons.push("phone-only, no context");
    }
    return {
      ...r,
      ai_score: Math.max(0, Math.min(100, score)),
      ai_score_reason: reasons.join(", ") || "baseline",
    };
  });
}
