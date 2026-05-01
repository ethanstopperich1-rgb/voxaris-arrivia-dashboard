/**
 * Trigger an outbound call from the GVR OUTBOUND agent.
 *
 * Usage:
 *   pnpm dial:outbound -- --to=+14155551234 --name="Stacey" --incentive='$250'
 *
 * Optional flags:
 *   --transfer-bonus='$250'   default: $250
 *   --total='$500'            default: $500 (use the math you want)
 *   --last-activity=never     default: "never"
 *   --member-id=GVR-12345     default: "demo"
 *   --from=+14072890294       default: the registered Retell DID
 *   --record                  pass to enable Retell call recording (default on)
 *
 * Returns the call_id so you can pull the recording later via:
 *   pnpm logs:call -- --id=call_xxx
 */
import { config as dotenvConfig } from "dotenv";
dotenvConfig({ path: ".env.local" });
dotenvConfig();

const API_KEY = process.env.RETELL_API_KEY;
const OUTBOUND_AGENT_ID = process.env.RETELL_OUTBOUND_AGENT_ID;
const DEFAULT_FROM = process.env.RETELL_PHONE_NUMBER ?? "+14072890294";

if (!API_KEY) { console.error("Missing RETELL_API_KEY"); process.exit(1); }
if (!OUTBOUND_AGENT_ID) { console.error("Missing RETELL_OUTBOUND_AGENT_ID"); process.exit(1); }

const args = Object.fromEntries(
  process.argv.slice(2)
    .filter((a) => a.startsWith("--"))
    .map((a) => {
      const [k, ...rest] = a.replace(/^--/, "").split("=");
      return [k!, rest.join("=") || "true"];
    }),
);

if (!args.to) {
  console.error(
    "Missing --to=<E.164 number>. Example:\n" +
    "  pnpm dial:outbound -- --to=+14155551234 --name=\"Stacey\" --incentive='$250'",
  );
  process.exit(1);
}

const dynVars: Record<string, string> = {
  member_name: args.name ?? "there",
  incentive_amount: args.incentive ?? "$250",
  transfer_bonus_amount: args["transfer-bonus"] ?? "$250",
  total_after_bonus: args.total ?? "$500",
  last_activity_date: args["last-activity"] ?? "never",
  member_id: args["member-id"] ?? "demo",
};

const body = {
  from_number: args.from ?? DEFAULT_FROM,
  to_number: args.to,
  override_agent_id: OUTBOUND_AGENT_ID,
  retell_llm_dynamic_variables: dynVars,
};

console.log(`→ Dialing outbound:`);
console.log(`    from: ${body.from_number}`);
console.log(`    to:   ${body.to_number}`);
console.log(`    agent: ${body.override_agent_id}`);
console.log(`    vars:  ${JSON.stringify(dynVars)}`);

const res = await fetch("https://api.retellai.com/create-phone-call", {
  method: "POST",
  headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

if (!res.ok) {
  console.error(`✗ Retell ${res.status}: ${await res.text()}`);
  process.exit(1);
}

const json = (await res.json()) as { call_id?: string };
console.log(`\n✓ Call placed. call_id = ${json.call_id ?? "(unknown)"}`);
console.log(`  Pull recording when complete:`);
console.log(`    curl -H "Authorization: Bearer $RETELL_API_KEY" \\`);
console.log(`      https://api.retellai.com/get-call/${json.call_id}`);
