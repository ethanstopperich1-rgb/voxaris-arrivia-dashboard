/**
 * Pull live state from Retell and write back to infra/retell/*.json so the
 * repo reflects what's actually deployed. Run after dashboard tweaks.
 *
 *   pnpm sync:from-retell
 */
import { config as dotenvConfig } from "dotenv";
dotenvConfig({ path: ".env.local" });
dotenvConfig();
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const API = process.env.RETELL_API_KEY!;
if (!API) { console.error("Missing RETELL_API_KEY"); process.exit(1); }

const INBOUND_AGENT  = process.env.RETELL_INBOUND_AGENT_ID!;
const OUTBOUND_AGENT = process.env.RETELL_OUTBOUND_AGENT_ID!;
const INBOUND_LLM    = process.env.RETELL_INBOUND_LLM_ID!;
const OUTBOUND_LLM   = process.env.RETELL_OUTBOUND_LLM_ID!;

async function get<T>(path: string): Promise<T> {
  const r = await fetch(`https://api.retellai.com${path}`, {
    headers: { Authorization: `Bearer ${API}` },
  });
  if (!r.ok) throw new Error(`Retell GET ${path} ${r.status}: ${await r.text()}`);
  return (await r.json()) as T;
}

// Strip read-only fields so the file is suitable for re-pushing
const READONLY = new Set([
  "agent_id", "llm_id", "version", "is_published", "last_modification_timestamp",
  "channel", "post_call_analysis_model",
]);

function clean<T extends Record<string, unknown>>(o: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) {
    if (!READONLY.has(k) && v !== null) out[k] = v;
  }
  return out as T;
}

async function main() {
  const root = process.cwd();

  for (const [label, agentId] of [["INBOUND", INBOUND_AGENT], ["OUTBOUND", OUTBOUND_AGENT]] as const) {
    const a = await get<Record<string, unknown>>(`/get-agent/${agentId}`);
    const cleaned = clean(a);
    const filename = label === "INBOUND" ? "agent.inbound.live.json" : "agent.outbound.live.json";
    writeFileSync(join(root, "infra/retell", filename), JSON.stringify(cleaned, null, 2));
    console.log(`✓ ${label} agent → infra/retell/${filename}`);
  }

  for (const [label, llmId] of [["INBOUND", INBOUND_LLM], ["OUTBOUND", OUTBOUND_LLM]] as const) {
    const l = await get<Record<string, unknown>>(`/get-retell-llm/${llmId}`);
    const cleaned = clean(l);
    const filename = label === "INBOUND" ? "llm.inbound.live.json" : "llm.outbound.live.json";
    writeFileSync(join(root, "infra/retell", filename), JSON.stringify(cleaned, null, 2));
    console.log(`✓ ${label} LLM   → infra/retell/${filename}`);
  }

  console.log("\n✅ Pulled live state. Diff against the canonical infra/retell/{agent,llm}.json to see drift.");
}

main().catch((e) => { console.error("\n❌ sync-from-retell failed:", e); process.exit(1); });
