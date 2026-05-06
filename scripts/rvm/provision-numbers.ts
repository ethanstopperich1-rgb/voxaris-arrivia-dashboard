/**
 * RVM Cowboy — Twilio callback number provisioner
 *
 * Buys dedicated callback numbers for RVM campaigns and configures them
 * to point at /api/rvm/callback for inbound calls and /api/rvm/opt-out
 * for incoming STOP SMS messages.
 *
 * Usage:
 *   pnpm rvm:provision-numbers -- --count=5 --area-code=866
 *   pnpm rvm:provision-numbers -- --count=10 --area-code=800 --toll-free
 *   pnpm rvm:provision-numbers -- --list           # list existing RVM numbers
 *
 * Each number costs ~$1/month on Twilio. Buy 10-20 to rotate per campaign.
 */

import "dotenv/config";
import twilio from "twilio";
import { env } from "@/lib/config/env";

const args = process.argv.slice(2);
const countArg = args.find((a) => a.startsWith("--count="));
const areaCodeArg = args.find((a) => a.startsWith("--area-code="));
const isList = args.includes("--list");
const isTollFree = args.includes("--toll-free");

const count = countArg ? parseInt(countArg.split("=")[1] ?? "5", 10) : 5;
const areaCode = areaCodeArg?.split("=")[1] ?? "866";

async function main() {
  const e = env();
  const client = twilio(e.TWILIO_ACCOUNT_SID, e.TWILIO_AUTH_TOKEN);
  const appUrl = e.NEXT_PUBLIC_APP_URL;

  const callbackWebhook = `${appUrl}/api/rvm/callback`;
  const optOutWebhook = `${appUrl}/api/rvm/opt-out`;

  if (isList) {
    console.log("Listing existing RVM callback numbers...");
    const numbers = await client.incomingPhoneNumbers.list({ limit: 100 });
    const rvmNumbers = numbers.filter((n) =>
      n.voiceUrl === callbackWebhook || n.friendlyName?.startsWith("RVM-")
    );
    if (rvmNumbers.length === 0) {
      console.log("No RVM numbers found.");
    } else {
      rvmNumbers.forEach((n) =>
        console.log(`  ${n.phoneNumber}  SID: ${n.sid}  Friendly: ${n.friendlyName}`)
      );
    }
    return;
  }

  console.log(`Searching for ${count} ${isTollFree ? "toll-free" : "local"} numbers in area ${areaCode}...`);

  const searchParams = isTollFree
    ? { tollFree: true, limit: count * 2 }
    : { areaCode: parseInt(areaCode, 10), limit: count * 2, capabilities: { voice: true, sms: true } };

  const available = isTollFree
    ? await client.availablePhoneNumbers("US").tollFree.list(searchParams as never)
    : await client.availablePhoneNumbers("US").local.list(searchParams as never);

  if (available.length === 0) {
    console.error(`No available numbers found for area code ${areaCode}. Try a different area code.`);
    process.exit(1);
  }

  const toBuy = available.slice(0, count);
  console.log(`Found ${available.length} available, buying ${toBuy.length}...`);

  const purchased: string[] = [];

  for (let i = 0; i < toBuy.length; i++) {
    const num = toBuy[i];
    if (!num) continue;

    try {
      const purchased_number = await client.incomingPhoneNumbers.create({
        phoneNumber: num.phoneNumber,
        friendlyName: `RVM-callback-${i + 1}-${new Date().toISOString().slice(0, 10)}`,
        voiceUrl: callbackWebhook,
        voiceMethod: "POST",
        smsUrl: optOutWebhook,
        smsMethod: "POST",
        // Assign to Arrivia's SIP trunk
        trunkSid: e.TWILIO_SIP_TRUNK_SID || undefined,
      });

      console.log(`  ✓ Purchased ${purchased_number.phoneNumber}  SID: ${purchased_number.sid}`);
      purchased.push(purchased_number.phoneNumber);
    } catch (err) {
      console.error(`  ✗ Failed to purchase ${num.phoneNumber}:`, err);
    }
  }

  console.log(`\nDone. ${purchased.length}/${toBuy.length} numbers purchased.`);
  console.log("Numbers:", purchased.join(", "));
  console.log("\nNext step: assign one of these to your active rvm_campaign.callback_number in Supabase.");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
