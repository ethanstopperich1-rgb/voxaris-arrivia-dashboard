import "dotenv/config";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { retell } from "../../lib/clients/retell";

function interpolate(text: string): string {
  return text.replace(/\$\{([A-Z0-9_]+)\}/g, (_, name) => process.env[name] ?? "");
}

async function main() {
  const llm = JSON.parse(interpolate(readFileSync(join(process.cwd(), "infra/retell/llm.json"), "utf8")));
  const agent = JSON.parse(interpolate(readFileSync(join(process.cwd(), "infra/retell/agent.json"), "utf8")));

  console.log("Updating LLM…");
  const llmRes = await retell.updateLLM(process.env.RETELL_LLM_ID!, llm);
  console.log("LLM updated:", JSON.stringify(llmRes).slice(0, 200));

  console.log("Updating agent…");
  const agentRes = await retell.updateAgent(process.env.RETELL_AGENT_ID!, agent);
  console.log("Agent updated:", JSON.stringify(agentRes).slice(0, 200));

  writeFileSync(
    join(process.cwd(), "infra/retell/last-synced.json"),
    JSON.stringify({ syncedAt: new Date().toISOString(), llm: llmRes, agent: agentRes }, null, 2),
  );
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
