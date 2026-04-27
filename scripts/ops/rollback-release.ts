import "dotenv/config";
import { retell } from "../../lib/clients/retell";

async function main() {
  const flag = process.argv.find((a) => a.startsWith("--version="));
  const version = flag ? flag.split("=")[1]! : "v1.0";
  await retell.updatePhoneNumber(process.env.TWILIO_GVR_DEMO_DID!, {
    inbound_agent_id: process.env.RETELL_AGENT_ID,
    inbound_agent_version: version,
  });
  console.log(`rolled back inbound DID to agent version ${version}`);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
