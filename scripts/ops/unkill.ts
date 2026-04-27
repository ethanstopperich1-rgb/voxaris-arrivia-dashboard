import "dotenv/config";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { retell } from "../../lib/clients/retell";

function interpolate(text: string): string {
  return text.replace(/\$\{([A-Z0-9_]+)\}/g, (_, name) => process.env[name] ?? "");
}

async function main() {
  const agent = JSON.parse(
    interpolate(readFileSync(join(process.cwd(), "infra/retell/agent.json"), "utf8")),
  );
  await retell.updateAgent(process.env.RETELL_AGENT_ID!, agent);
  console.log("kill switch RELEASED. Agent restored from infra/retell/agent.json.");
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
