import "dotenv/config";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { retell } from "../../lib/clients/retell";

function interpolate(text: string): string {
  return text.replace(/\$\{([A-Z0-9_]+)\}/g, (_, name) => process.env[name] ?? "");
}

async function main() {
  const llmCfg = JSON.parse(
    interpolate(readFileSync(join(process.cwd(), "infra/retell/llm.json"), "utf8")),
  );
  const agentCfg = JSON.parse(
    interpolate(readFileSync(join(process.cwd(), "infra/retell/agent.json"), "utf8")),
  );

  const llm = (await retell.createLLM<{ llm_id: string }>(llmCfg));
  console.log("LLM created:", llm.llm_id);

  agentCfg.response_engine.llm_id = llm.llm_id;
  const agent = await retell.createAgent<{ agent_id: string }>(agentCfg);
  console.log("Agent created:", agent.agent_id);
  console.log("Set RETELL_LLM_ID and RETELL_AGENT_ID in .env now.");
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
