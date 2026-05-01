/**
 * Push the latest prompt + tool config to the live INBOUND and OUTBOUND LLMs.
 *
 * Reads:
 *   infra/retell/agent-prompt.md           → INBOUND general_prompt
 *   infra/retell/agent-prompt.outbound.md  → OUTBOUND general_prompt
 *   infra/retell/llm.json                  → tools, dynamic vars, model, etc.
 *
 * Run after editing either prompt file:
 *   pnpm sync:prompts
 *
 * Tools whose URLs still contain ${NEXT_PUBLIC_APP_URL} or localhost are
 * skipped — they go live once Vercel is deployed and the env var is set.
 */
import { config as dotenvConfig } from "dotenv";
dotenvConfig({ path: ".env.local" });
dotenvConfig();
import { readFileSync } from "node:fs";
import { join } from "node:path";

const BASE = "https://api.retellai.com";

type LLMTarget = {
  label: "INBOUND" | "OUTBOUND";
  llm_id: string;
  promptFile: string;
};

function need(name: string): string {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing env var: ${name}`);
    process.exit(1);
  }
  return v;
}

function interpolate(text: string): string {
  return text.replace(/\$\{([A-Z0-9_]+)\}/g, (m, name) => process.env[name] ?? m);
}

function stripComments<T>(o: T): T {
  if (Array.isArray(o)) return o.map(stripComments) as T;
  if (o && typeof o === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(o)) {
      if (k.startsWith("$")) continue;
      out[k] = stripComments(v as unknown);
    }
    return out as T;
  }
  return o;
}

async function api<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${need("RETELL_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    throw new Error(`Retell ${method} ${path} ${res.status}: ${await res.text()}`);
  }
  return (await res.json()) as T;
}

function filterReachableTools(tools: Array<Record<string, unknown>>): Array<Record<string, unknown>> {
  return tools.filter((t) => {
    const url = t.url as string | undefined;
    if (!url) return true;
    const isLocal = /(\$\{|localhost|127\.0\.0\.1|0\.0\.0\.0|example\.com)/i.test(url);
    if (isLocal) {
      console.warn(`    ⚠ skipping tool "${t.name}" (unreachable URL: ${url})`);
      return false;
    }
    return true;
  });
}

async function main() {
  const root = process.cwd();

  const targets: LLMTarget[] = [
    {
      label: "INBOUND",
      llm_id: need("RETELL_INBOUND_LLM_ID"),
      promptFile: "infra/retell/agent-prompt.md",
    },
    {
      label: "OUTBOUND",
      llm_id: need("RETELL_OUTBOUND_LLM_ID"),
      promptFile: "infra/retell/agent-prompt.outbound.md",
    },
  ];

  // Load the shared LLM config (tools, model, dynamic vars)
  const llmCfgRaw = JSON.parse(
    interpolate(readFileSync(join(root, "infra/retell/llm.json"), "utf8")),
  );
  const cleanedLlm = stripComments(llmCfgRaw) as Record<string, unknown>;
  cleanedLlm.general_tools = filterReachableTools(
    cleanedLlm.general_tools as Array<Record<string, unknown>>,
  );

  // Demote unresolved transfer destinations
  for (const tool of cleanedLlm.general_tools as Array<Record<string, unknown>>) {
    if (tool.type === "transfer_call") {
      const dest = tool.transfer_destination as { number?: string };
      const n = dest.number ?? "";
      if (n.includes("${") || /^\+?1?0{10,}$/.test(n.replace(/[^\d+]/g, ""))) {
        console.warn(`    ⚠ transfer destination unresolved → +14155551234 sentinel`);
        dest.number = "+14155551234";
      }
    }
  }

  for (const target of targets) {
    const prompt = readFileSync(join(root, target.promptFile), "utf8");
    if (prompt.trim().includes("REPLACE THIS FILE") || prompt.trim().endsWith("REPLACE_ME_WITH_YOUR_OPENER")) {
      console.warn(`\n⚠ ${target.label}: ${target.promptFile} is still a stub — skipping.`);
      continue;
    }

    const beginRaw = (cleanedLlm.begin_message as string) ?? "";
    const begin = beginRaw === "REPLACE_ME_WITH_YOUR_OPENER"
      ? `(begin_message will be set per agent — see ${target.promptFile})`
      : beginRaw;

    const body: Record<string, unknown> = {
      ...cleanedLlm,
      general_prompt: prompt,
      begin_message: begin,
    };

    console.log(`\n→ Updating ${target.label} LLM (${target.llm_id})…`);
    await api(`PATCH`, `/update-retell-llm/${target.llm_id}`, body);
    const tools = (body.general_tools as unknown[]) ?? [];
    console.log(`  ✓ pushed prompt (${prompt.length} chars) + ${tools.length} tools`);
  }

  console.log(`\n✅ sync-prompts complete.`);
}

main().catch((e) => {
  console.error("\n❌ sync-prompts failed:", e);
  process.exit(1);
});
