/**
 * Build the OPC scan-to-call demo — Andie at the pool.
 *
 *   1. Creates the OPC Conversation Flow (opener → qualify → book)
 *   2. Creates a dedicated agent bound to the flow
 *   3. Buys a fresh Retell phone number
 *   4. Binds the new number to the new agent (inbound)
 *   5. Saves IDs to .env.local + writes the QR target
 *
 * Run:  pnpm build:opc-demo
 */
import { config as dotenvConfig } from "dotenv";
dotenvConfig({ path: ".env.local" });
dotenvConfig();
import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";

const API = process.env.RETELL_API_KEY!;
if (!API) { console.error("Missing RETELL_API_KEY"); process.exit(1); }

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://arrivia-gvr.vercel.app";
const APP_API_KEY = process.env.APP_API_KEY ?? "";
const VOICE_ID = process.env.RETELL_OPC_VOICE_ID ?? "custom_voice_64dd4d7112a69b8ddb68b1caef";

async function api<T>(method: string, path: string, body?: unknown): Promise<T> {
  const r = await fetch(`https://api.retellai.com${path}`, {
    method,
    headers: { Authorization: `Bearer ${API}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) throw new Error(`Retell ${method} ${path} ${r.status}: ${await r.text()}`);
  return (await r.json()) as T;
}

// ─── OPC Conversation Flow ────────────────────────────────────────────────
// Flow: opener → 4-step qualification → book or graceful no
const opcFlow = {
  start_speaker: "agent" as const,
  model_choice: { type: "cascading" as const, model: "claude-4.5-haiku" },
  model_temperature: 0,
  tool_call_strict_mode: true,
  start_node_id: "opener",
  global_prompt:
    "You are Andie, an AI concierge for Westgate Lakes Resort & Spa, an Arrivia-affiliated property. " +
    "A guest just scanned a QR code at the resort — you are calling them back. " +
    "Your job: warmly qualify the guest in 4 quick questions, then book them a 90-minute resort preview tour " +
    "in exchange for the placement's incentive. Speak in short, clean sentences. Use contractions. " +
    "Do NOT use filler words ('um', 'uh', 'like'). Disclose recording + AI in the first sentence. " +
    "If a guest doesn't qualify, end warmly without revealing why. " +
    "Never ask for SSN, credit card, or DOB year — only age range. " +
    "If guest says do-not-call or wrong-person, end immediately and politely.",
  default_dynamic_variables: {
    placement_name: "the pool deck",
    placement_opener_hook: "Hey, hope you're enjoying the pool",
    incentive: "two complimentary 2-day Disney park hopper tickets",
    property_name: "Westgate Lakes Resort & Spa",
    tour_slot: "tomorrow at 10:00 AM",
    caller_name: "there",
  },
  tools: [
    {
      type: "custom",
      tool_id: "opc_book",
      name: "opc_book",
      description:
        "Books the resort preview tour after the guest passes qualification. " +
        "Sends an SMS confirmation to their phone within 60 seconds. " +
        "Always call this AFTER all 4 qualification questions pass and the guest agrees to attend.",
      url: `${APP_URL}/api/tools/opc-book`,
      speak_during_execution: true,
      execution_message_description: "Booking your tour and texting you confirmation now.",
      execution_message_type: "static_text",
      headers: { "x-api-key": APP_API_KEY },
      parameters: {
        type: "object",
        properties: {
          retell_call_id: { type: "string" },
          caller_phone: { type: "string", description: "Caller's phone in E.164." },
          caller_name: { type: "string" },
          placement_name: { type: "string" },
          incentive: { type: "string" },
          property_name: { type: "string" },
          tour_slot: { type: "string" },
        },
        required: ["retell_call_id", "caller_phone", "placement_name", "incentive"],
      },
    },
  ],
  nodes: [
    // Opener — placement-specific hook + AI/recording disclosure
    {
      id: "opener",
      type: "conversation" as const,
      name: "Opener (placement-specific)",
      instruction: {
        type: "static_text" as const,
        text:
          "{{placement_opener_hook}} — got a sec while you're relaxing? " +
          "I'm Andie, an AI concierge with Westgate Lakes — this call is recorded for quality. " +
          "I noticed you scanned our QR. We've got {{incentive}} we can hand you tomorrow at the resort " +
          "if you can spare 90 minutes for a quick property tour. Want to lock that in?",
      },
      interruption_sensitivity: 0.4,
      edges: [
        {
          id: "edge_opener_to_q1",
          transition_condition: {
            type: "prompt" as const,
            prompt: "Guest is interested, says yes, sure, ok, tell me more, sounds good — wants to learn about the tour.",
          },
          destination_node_id: "qualify_living_situation",
        },
        {
          id: "edge_opener_to_decline",
          transition_condition: {
            type: "prompt" as const,
            prompt: "Guest declines, not interested, no thanks, wrong person, do-not-call, or hangs up.",
          },
          destination_node_id: "end_polite",
        },
      ],
    },

    // Q1 — Living situation
    {
      id: "qualify_living_situation",
      type: "conversation" as const,
      name: "Q1: Married / Cohabitating",
      instruction: {
        type: "prompt" as const,
        text:
          "Ask the guest in a warm tone: " +
          "'Quick question — is your spouse or partner here at the resort with you? Tours work best when both decision-makers can attend.'",
      },
      edges: [
        {
          id: "edge_q1_pass",
          transition_condition: {
            type: "prompt" as const,
            prompt: "Guest says yes spouse/partner is here, or yes both attending.",
          },
          destination_node_id: "qualify_age",
        },
        {
          id: "edge_q1_solo",
          transition_condition: {
            type: "prompt" as const,
            prompt: "Guest is solo, traveling alone, or partner is not on this trip — does NOT have a co-attendee.",
          },
          destination_node_id: "end_polite_disqual",
        },
      ],
    },

    // Q2 — Age range
    {
      id: "qualify_age",
      type: "conversation" as const,
      name: "Q2: Age range",
      instruction: {
        type: "prompt" as const,
        text:
          "Ask: 'And just for tour eligibility — are you both between the ages of 25 and 70?' " +
          "Do not ask for an exact birthdate.",
      },
      edges: [
        {
          id: "edge_q2_pass",
          transition_condition: {
            type: "prompt" as const,
            prompt: "Guest confirms both attendees are 25-70.",
          },
          destination_node_id: "qualify_income",
        },
        {
          id: "edge_q2_fail",
          transition_condition: {
            type: "prompt" as const,
            prompt: "Guest is outside 25-70, or one attendee is, or refuses to confirm.",
          },
          destination_node_id: "end_polite_disqual",
        },
      ],
    },

    // Q3 — Household income
    {
      id: "qualify_income",
      type: "conversation" as const,
      name: "Q3: Household income",
      instruction: {
        type: "prompt" as const,
        text:
          "Ask warmly: 'And the tours are designed for households earning over $75,000 a year combined — does that fit?' " +
          "Do not ask for an exact number.",
      },
      edges: [
        {
          id: "edge_q3_pass",
          transition_condition: {
            type: "prompt" as const,
            prompt: "Guest confirms income above $75K.",
          },
          destination_node_id: "qualify_residency",
        },
        {
          id: "edge_q3_fail",
          transition_condition: {
            type: "prompt" as const,
            prompt: "Guest indicates income below $75K or refuses to confirm.",
          },
          destination_node_id: "end_polite_disqual",
        },
      ],
    },

    // Q4 — US/CA residency
    {
      id: "qualify_residency",
      type: "conversation" as const,
      name: "Q4: US or Canada residency",
      instruction: {
        type: "prompt" as const,
        text:
          "Last one: 'And you're a US or Canada resident, right?'",
      },
      edges: [
        {
          id: "edge_q4_pass",
          transition_condition: {
            type: "prompt" as const,
            prompt: "Guest confirms US or Canada residency.",
          },
          destination_node_id: "confirm_and_book",
        },
        {
          id: "edge_q4_fail",
          transition_condition: {
            type: "prompt" as const,
            prompt: "Guest is not a US/CA resident.",
          },
          destination_node_id: "end_polite_disqual",
        },
      ],
    },

    // Confirm + book
    {
      id: "confirm_and_book",
      type: "conversation" as const,
      name: "Confirm + book",
      instruction: {
        type: "prompt" as const,
        text:
          "Tell the guest: 'Perfect — you're qualified. I have you down for {{tour_slot}}. ' " +
          "'Your {{incentive}} will be ready when you arrive at the activity desk. ' " +
          "Then ask: 'Can I confirm the cell number you're calling from is the best for the confirmation text?' " +
          "Once they say yes (or give a different number), call the opc_book tool with their phone, the placement name, " +
          "the incentive, the property name, and the tour slot from the dynamic variables.",
      },
      edges: [
        {
          id: "edge_book_to_end",
          transition_condition: {
            type: "prompt" as const,
            prompt: "After opc_book has been called and SMS confirmation noted.",
          },
          destination_node_id: "end_booked",
        },
      ],
    },

    // End — booked
    {
      id: "end_booked",
      type: "end" as const,
      name: "End — tour booked",
      instruction: {
        type: "static_text" as const,
        text:
          "You're all set — see you {{tour_slot}}. Enjoy the rest of your day at the resort, and grab another drink for me.",
      },
    },

    // End — polite (early decline)
    {
      id: "end_polite",
      type: "end" as const,
      name: "End — polite decline",
      instruction: {
        type: "static_text" as const,
        text:
          "No worries at all — enjoy the rest of your stay. If you change your mind, just scan the QR again. Have a great one.",
      },
    },

    // End — polite disqual (don't reveal why)
    {
      id: "end_polite_disqual",
      type: "end" as const,
      name: "End — disqual",
      instruction: {
        type: "static_text" as const,
        text:
          "Got it — really appreciate you taking the time. Enjoy the rest of your stay. Have a great one.",
      },
    },
  ],
};

async function upsertEnv(updates: Record<string, string>) {
  const path = ".env.local";
  if (!existsSync(path)) {
    writeFileSync(path, Object.entries(updates).map(([k, v]) => `${k}=${v}`).join("\n") + "\n");
    return;
  }
  const lines = readFileSync(path, "utf8").split("\n");
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of lines) {
    if (!line.trim() || line.startsWith("#") || !line.includes("=")) {
      out.push(line);
      continue;
    }
    const [k = ""] = line.split("=", 1);
    if (k in updates) {
      out.push(`${k}=${updates[k]}`);
      seen.add(k);
    } else {
      out.push(line);
    }
  }
  for (const [k, v] of Object.entries(updates)) {
    if (!seen.has(k)) out.push(`${k}=${v}`);
  }
  writeFileSync(path, out.join("\n"));
}

async function main() {
  console.log("→ Creating OPC Conversation Flow…");
  const flowRes = await api<{ conversation_flow_id: string }>("POST", "/create-conversation-flow", opcFlow);
  console.log(`  ✓ flow_id = ${flowRes.conversation_flow_id}`);

  console.log("\n→ Creating OPC agent…");
  const agentBody = {
    agent_name: "Andie — OPC (pool demo)",
    voice_id: VOICE_ID,
    voice_model: "eleven_turbo_v2_5",
    voice_speed: 1.05,
    voice_temperature: 0.8,
    fallback_voice_ids: ["retell-Cimo"],
    responsiveness: 0.95,
    interruption_sensitivity: 0.55,
    enable_backchannel: false,
    reminder_trigger_ms: 6000,
    language: "en-US",
    webhook_url: `${APP_URL}/api/retell/events`,
    webhook_events: [
      "call_started",
      "call_ended",
      "call_analyzed",
      "transfer_started",
      "transfer_bridged",
      "transfer_cancelled",
      "transfer_ended",
    ],
    boosted_keywords: ["Westgate", "Andie", "Arrivia", "concierge", "tour", "QR", "Disney", "incentive"],
    data_storage_setting: "everything_except_pii",
    end_call_after_silence_ms: 30000,
    max_call_duration_ms: 600000,
    stt_mode: "accurate",
    denoising_mode: "noise-cancellation",
    begin_message_delay_ms: 200,
    ring_duration_ms: 20000,
    response_engine: { type: "conversation-flow", conversation_flow_id: flowRes.conversation_flow_id },
    post_call_analysis_data: [
      { type: "boolean", name: "qualified", description: "True if guest passed all 4 qualification questions." },
      { type: "boolean", name: "tour_booked", description: "True if opc_book tool was called and a confirmation was sent." },
      {
        type: "enum", name: "disqual_reason", description: "If not qualified, which step they failed.",
        choices: ["solo_traveler", "age", "income", "residency", "declined", "wrong_person", "dnc", "n/a"],
      },
      { type: "string", name: "summary", description: "One-paragraph summary of the call outcome." },
    ],
  };
  const agentRes = await api<{ agent_id: string }>("POST", "/create-agent", agentBody);
  console.log(`  ✓ agent_id = ${agentRes.agent_id}`);

  console.log("\n→ Persisting IDs to .env.local…");
  await upsertEnv({
    RETELL_OPC_FLOW_ID: flowRes.conversation_flow_id,
    RETELL_OPC_AGENT_ID: agentRes.agent_id,
  });
  console.log(`  ✓ saved RETELL_OPC_FLOW_ID + RETELL_OPC_AGENT_ID`);

  console.log("\n✅ OPC demo agent ready.");
  console.log(`   Flow:  ${flowRes.conversation_flow_id}`);
  console.log(`   Agent: ${agentRes.agent_id}`);
  console.log(`\nNext: bind a phone number to this agent (or override at call time).`);
  console.log(`   pnpm buy:opc-number   (buys a fresh Retell DID + binds inbound to this agent)`);
}

main().catch((e) => {
  console.error("\n❌ build-opc-demo failed:", e);
  process.exit(1);
});
