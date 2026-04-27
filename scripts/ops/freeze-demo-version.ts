import "dotenv/config";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";
import { retell } from "../../lib/clients/retell";

async function main() {
  mkdirSync("infra/retell", { recursive: true });
  const llm = await retell.getLLM(process.env.RETELL_LLM_ID!);
  const agent = await retell.getAgent(process.env.RETELL_AGENT_ID!);
  writeFileSync(join("infra/retell", "agent-v1.0.json"), JSON.stringify(agent, null, 2));
  writeFileSync(join("infra/retell", "llm-v1.0.json"), JSON.stringify(llm, null, 2));
  await retell.publishAgent(process.env.RETELL_AGENT_ID!, { version_label: "v1.0" });
  try {
    execSync("git add infra/retell/agent-v1.0.json infra/retell/llm-v1.0.json", { stdio: "inherit" });
    execSync(`git commit -m "freeze: gvr-demo-v1.0"`, { stdio: "inherit" });
    execSync("git tag -f gvr-demo-v1.0", { stdio: "inherit" });
  } catch {
    console.warn("git commit/tag skipped (not in a repo yet?)");
  }
  console.log("frozen as gvr-demo-v1.0");
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
