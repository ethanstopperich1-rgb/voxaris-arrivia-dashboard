import "dotenv/config";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { retell } from "../../lib/clients/retell";

async function main() {
  mkdirSync("out", { recursive: true });
  const llm = await retell.getLLM(process.env.RETELL_LLM_ID!);
  const agent = await retell.getAgent(process.env.RETELL_AGENT_ID!);
  const out = {
    exportedAt: new Date().toISOString(),
    llm,
    agent,
    env: {
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
      RETELL_AGENT_ID: process.env.RETELL_AGENT_ID,
      RETELL_LLM_ID: process.env.RETELL_LLM_ID,
      TWILIO_GVR_DEMO_DID: process.env.TWILIO_GVR_DEMO_DID,
    },
  };
  writeFileSync(join("out", `gvr-release-${Date.now()}.json`), JSON.stringify(out, null, 2));
  console.log("exported snapshot to /out/");
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
