import "dotenv/config";
import { retell } from "../../lib/clients/retell";

async function main() {
  const target = process.env.PREWARM_TARGET ?? process.env.TWILIO_GVR_DEMO_DID;
  for (let i = 0; i < 3; i++) {
    const r = await retell
      .createPhoneCall<{ call_id: string }>({
        from_number: process.env.RETELL_PHONE_NUMBER,
        to_number: target,
        override_agent_id: process.env.RETELL_AGENT_ID,
      })
      .catch((e) => ({ error: String(e).slice(0, 80) }));
    console.log(`prewarm ${i + 1}/3:`, JSON.stringify(r));
    await new Promise((r) => setTimeout(r, 5000));
  }
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
