import "dotenv/config";
import { retell } from "../../lib/clients/retell";

async function main() {
  const e = process.env;
  const res = await retell.importPhoneNumber({
    termination_uri: e.TWILIO_TERMINATION_SIP_URI,
    phone_number: e.TWILIO_GVR_DEMO_DID,
    sip_trunk_auth_username: e.TWILIO_ACCOUNT_SID,
    sip_trunk_auth_password: e.TWILIO_AUTH_TOKEN,
    inbound_agent_id: e.RETELL_AGENT_ID,
    inbound_webhook_url: `${e.NEXT_PUBLIC_APP_URL}/api/retell/inbound`,
    nickname: "GVR Demo DID",
  });
  console.log("imported:", JSON.stringify(res).slice(0, 300));
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
