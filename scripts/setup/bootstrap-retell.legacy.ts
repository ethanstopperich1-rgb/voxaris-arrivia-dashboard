/**
 * One-shot bootstrap:
 *   1. POST /create-retell-llm with our prompt + tools
 *   2. POST /create-agent with our voice + webhook + LLM reference
 *   3. Append RETELL_LLM_ID and RETELL_AGENT_ID to .env.local
 *
 * Usage:
 *   pnpm bootstrap:retell
 *
 * Requires: RETELL_API_KEY in .env.local. All other env vars optional —
 * unset placeholders are left as ${VAR} strings (you fill them in later when
 * Vercel/Twilio/Supabase are provisioned).
 */
import { config as dotenvConfig } from "dotenv";
dotenvConfig({ path: ".env.local" });
dotenvConfig(); // also pull from .env if present
import { readFileSync, appendFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const BASE = "https://api.retellai.com";

function need(name: string): string {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing required env var: ${name}. Add it to .env.local.`);
    process.exit(1);
  }
  return v;
}

function interpolate(text: string): string {
  return text.replace(/\$\{([A-Z0-9_]+)\}/g, (m, name) => process.env[name] ?? m);
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
    const t = await res.text();
    throw new Error(`Retell ${method} ${path} ${res.status}: ${t}`);
  }
  return (await res.json()) as T;
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

async function main() {
  const root = process.cwd();
  const prompt = readFileSync(join(root, "infra/retell/agent-prompt.md"), "utf8");
  const llmCfg = JSON.parse(
    interpolate(readFileSync(join(root, "infra/retell/llm.json"), "utf8")),
  );
  const agentCfg = JSON.parse(
    interpolate(readFileSync(join(root, "infra/retell/agent.json"), "utf8")),
  );

  const cleanedLlm = stripComments({
    ...llmCfg,
    general_prompt: prompt,
  });
  const cleanedAgent = stripComments(agentCfg);

  // Strip tools whose URLs still contain unresolved ${...} (i.e. NEXT_PUBLIC_APP_URL not set yet).
  // The transfer_call and end_call tools are predefined and don't need URLs.
  cleanedLlm.general_tools = (cleanedLlm.general_tools as Array<Record<string, unknown>>).filter(
    (t) => {
      const url = t.url as string | undefined;
      if (!url) return true; // predefined tools (transfer_call, end_call) — keep
      const isLocal = /(\$\{|localhost|127\.0\.0\.1|0\.0\.0\.0|example\.com)/i.test(url);
      if (isLocal) {
        console.warn(
          `  ⚠ Skipping tool "${t.name}" — URL not publicly reachable: ${url}. Wire it after Vercel deploy via sync:retell-config.`,
        );
        return false;
      }
      return true;
    },
  );

  // If transfer destination still has unresolved placeholder, demote to a safe placeholder
  for (const tool of cleanedLlm.general_tools as Array<Record<string, unknown>>) {
    if (tool.type === "transfer_call") {
      const dest = tool.transfer_destination as { number?: string };
      const n = dest.number ?? "";
      const looksPlaceholder = n.includes("${") || /^\+?1?0{10,}$/.test(n.replace(/[^\d+]/g, ""));
      if (looksPlaceholder) {
        console.warn(
          `  ⚠ ${tool.name}: PRIMARY_SPECIALIST_NUMBER unset/placeholder; using +14155551234 sentinel. Update before going live.`,
        );
        dest.number = "+14155551234";
      }
    }
  }

  // Drop webhook_url if NEXT_PUBLIC_APP_URL not set
  if (typeof cleanedAgent.webhook_url === "string" && cleanedAgent.webhook_url.includes("${")) {
    console.warn(
      "  ⚠ NEXT_PUBLIC_APP_URL not set — agent created without webhook_url. Set after Vercel deploy and re-run sync:retell-config.",
    );
    delete cleanedAgent.webhook_url;
    delete cleanedAgent.webhook_events;
  }

  console.log("→ Creating Retell LLM…");
  const llmRes = await api<{ llm_id: string }>("POST", "/create-retell-llm", cleanedLlm);
  console.log(`  ✓ llm_id = ${llmRes.llm_id}`);

  console.log("→ Creating Retell agent…");
  const agentBody = {
    ...cleanedAgent,
    response_engine: {
      type: "retell-llm",
      llm_id: llmRes.llm_id,
    },
  };
  const agentRes = await api<{ agent_id: string }>("POST", "/create-agent", agentBody);
  console.log(`  ✓ agent_id = ${agentRes.agent_id}`);

  const envPath = join(root, ".env.local");
  if (existsSync(envPath)) {
    appendFileSync(
      envPath,
      `\n# auto-appended by bootstrap-retell on ${new Date().toISOString()}\n` +
        `RETELL_LLM_ID=${llmRes.llm_id}\n` +
        `RETELL_AGENT_ID=${agentRes.agent_id}\n`,
    );
    console.log(`  ✓ wrote RETELL_LLM_ID + RETELL_AGENT_ID to .env.local`);
  } else {
    console.log(
      `\nAdd these to your env:\n  RETELL_LLM_ID=${llmRes.llm_id}\n  RETELL_AGENT_ID=${agentRes.agent_id}\n`,
    );
  }

  console.log("\n✅ Bootstrap complete.");
  console.log(`   Test in Retell dashboard simulator: agent_id=${agentRes.agent_id}`);
  console.log(`   Next: import a Twilio DID via \`pnpm import:twilio-number\``);
}

main().catch((e) => {
  console.error("\n❌ Bootstrap failed:", e);
  process.exit(1);
});
