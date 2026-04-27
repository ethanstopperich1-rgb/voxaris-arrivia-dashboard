import "dotenv/config";
import { retell } from "../../lib/clients/retell";

async function main() {
  const e = process.env;
  await retell.updateAgent(e.RETELL_AGENT_ID!, {
    responsiveness: 0,
    end_call_after_silence_ms: 5000,
    webhook_events: [],
  });
  console.log("kill switch ENGAGED. Agent muted. Reverse with `pnpm ops:rollback --version v1.0`.");
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
