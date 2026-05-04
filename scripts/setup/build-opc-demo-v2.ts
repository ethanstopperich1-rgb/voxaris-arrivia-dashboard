/**
 * Build the OPC demo agent — v2 (ChatGPT-validated, FL Ch. 721 compliant).
 *
 * Major v2 changes from v1:
 *   - "Hold the ticket package" framing instead of "qualify you"
 *   - Disclosure-first opener (AI + recording + 90-min vacation ownership preview)
 *   - 8 qualification questions (added credit card + prior tour + prior 12mo)
 *   - Disqual node never reveals which question failed
 *   - 2-choice scheduling with morning-default conversion framing
 *   - 8 distinct end nodes (booked, polite_decline, polite_disqual, dnc,
 *     wrong_person, scanned_by_accident, human_transfer)
 *   - Global behavior layer (Andie identity, never pretend human, instant DNC)
 *   - Florida Ch. 721 compliant phrasing throughout
 *
 * Run:  npx tsx scripts/setup/build-opc-demo-v2.ts
 */
import { config as dotenvConfig } from "dotenv";
dotenvConfig({ path: ".env.local" });
dotenvConfig();
import { existsSync, readFileSync, writeFileSync } from "node:fs";

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

// ─── Global Andie behavior — applies across every node ──────────────────────
const GLOBAL_PROMPT = `
You are Andie, a warm, calm AI concierge for Westgate Lakes Resort & Spa in Orlando, Florida.
You help guests check eligibility and book a 90-minute vacation ownership preview tied to a Disney park hopper ticket package.

ALWAYS disclose you are an AI assistant when asked, and at the start of every call.
NEVER pretend to be human.
NEVER hide that the preview is a vacation ownership / timeshare presentation.
NEVER say the incentive is guaranteed until the guest is qualified, booked, AND completes the full 90-minute preview.

Frame eligibility checks as "making sure the welcome team can hold the ticket package for you" — not as "qualifying" them.

Ask one question at a time. Keep responses short, calm, confident. Do not argue. Do not pressure.

If the guest says STOP, REMOVE ME, DO NOT CALL, TAKE ME OFF THE LIST, or similar — immediately acknowledge and end politely. Never negotiate, never re-pitch.

If the guest raises an objection, answer in 1-2 sentences max, then either return to the next unanswered eligibility question or offer a clean exit.

Never say:
  - "You won free tickets" — incentive is tied to attending the full preview
  - "Spots are going fast" — only say "limited" if you have a specific real number
  - "This only takes a few minutes" — the preview is 90 minutes, be honest
  - "Come claim your gift" — incentive is conditional, not guaranteed

Always tie the incentive language to: "Qualified guests can receive {{incentive}} for attending the full 90-minute vacation ownership preview. No purchase is required."

If you reach voicemail, leave a 15-second message:
"Hi, this is Andie from Westgate Lakes about the offer you scanned. We have ticket package details for you — call back at your convenience. Thanks."

PAYMENT DATA — ABSOLUTE PROHIBITION (PCI scope avoidance):
NEVER ask for, accept, repeat, confirm, or acknowledge any of the following on this call:
  - Credit card number, debit card number, or PAN (primary account number)
  - CVV, CVC, security code, or expiration date
  - Bank account number or routing number
  - Full date of birth, Social Security Number, driver's license number
  - Billing ZIP or billing address
If the guest starts to read a card number aloud, IMMEDIATELY interrupt with:
"Please stop — I do not take any payment or card information on this call. Nothing is owed today. The welcome team will handle anything like that in person, securely, at the resort."
Then return to the previous question. If the guest insists on giving payment info, end the call politely.
`.trim();

const opcFlow = {
  start_speaker: "agent" as const,
  model_choice: { type: "cascading" as const, model: "claude-4.5-haiku" },
  model_temperature: 0,
  tool_call_strict_mode: true,
  start_node_id: "opener_disclosure",
  global_prompt: GLOBAL_PROMPT,
  default_dynamic_variables: {
    placement_name: "the pool deck",
    placement_opener_hook: "Hey, hope you're enjoying some pool time today.",
    incentive: "two complimentary 2-day Disney park hopper tickets",
    property_name: "Westgate Lakes Resort & Spa",
    slot_1: "tomorrow at 10:30 AM",
    slot_2: "tomorrow at 2:15 PM",
    caller_name: "there",
    caller_phone: "your number",
  },
  tools: [
    {
      type: "custom",
      tool_id: "opc_book",
      name: "opc_book",
      description:
        "Book the resort preview tour AFTER the guest passes all eligibility checks AND confirms a tour slot AND confirms their phone number. " +
        "Sends an SMS confirmation within 60 seconds. Do NOT tell the guest the booking is complete until this tool returns success.",
      url: `${APP_URL}/api/tools/opc-book`,
      speak_during_execution: true,
      execution_message_description: "Holding your tour slot and texting confirmation now.",
      execution_message_type: "static_text",
      headers: { "x-api-key": APP_API_KEY },
      parameters: {
        type: "object",
        properties: {
          retell_call_id: { type: "string" },
          caller_phone: { type: "string" },
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
    // 1. OPENER — disclosure first, then hook, then permission ask
    {
      id: "opener_disclosure",
      type: "conversation" as const,
      name: "Opener — disclosure + hook + permission",
      instruction: {
        type: "static_text" as const,
        text:
          "{{placement_opener_hook}} I'm Andie, an AI assistant calling on behalf of " +
          "Westgate Lakes Resort & Spa. This call may be recorded.\n\n" +
          "You scanned about the Disney park hopper ticket offer. Qualified guests can " +
          "receive {{incentive}} for attending a 90-minute vacation ownership preview. " +
          "I can check eligibility and available times in about a minute. Want me to do that?",
      },
      interruption_sensitivity: 0.4,
      edges: [
        {
          id: "edge_opener_to_interest",
          transition_condition: { type: "prompt" as const, prompt: "Guest agrees, says yes, sure, ok, sounds good — wants to proceed." },
          destination_node_id: "interest_check",
        },
        {
          id: "edge_opener_to_decline",
          transition_condition: { type: "prompt" as const, prompt: "Guest declines, not interested, no thanks, busy." },
          destination_node_id: "end_polite_decline",
        },
        {
          id: "edge_opener_to_dnc",
          transition_condition: { type: "prompt" as const, prompt: "Guest says do not call, take me off list, stop, remove me." },
          destination_node_id: "end_dnc",
        },
        {
          id: "edge_opener_to_wrong",
          transition_condition: { type: "prompt" as const, prompt: "Guest says wrong number, not them, scanned by accident, employee." },
          destination_node_id: "end_wrong_person",
        },
        {
          id: "edge_opener_to_human",
          transition_condition: { type: "prompt" as const, prompt: "Guest asks for a human, real person, agent." },
          destination_node_id: "human_transfer",
        },
      ],
    },

    // 2. INTEREST CHECK
    {
      id: "interest_check",
      type: "conversation" as const,
      name: "Interest check + transition",
      instruction: {
        type: "static_text" as const,
        text:
          "Great. I'll ask four quick questions to see if the welcome team can hold the ticket package for you. " +
          "You can stop anytime.",
      },
      always_edge: {
        id: "always_interest_to_q1",
        transition_condition: { type: "prompt" as const, prompt: "Always" },
        destination_node_id: "qualify_living_situation",
      },
    },

    // 3. Q1 — Living situation
    {
      id: "qualify_living_situation",
      type: "conversation" as const,
      name: "Q1: Spouse/partner attending",
      instruction: {
        type: "prompt" as const,
        text:
          "Ask warmly: 'Will you be attending with your spouse or partner, if you have one?' " +
          "If single, follow up: 'Are you traveling as a single adult decision-maker, or is someone else part of the household decision?' " +
          "If partner not present, say: 'No problem. For the ticket package, both decision-makers usually need to attend together. " +
          "Would there be a time today or tomorrow when both of you could make a 90-minute preview?'",
      },
      edges: [
        {
          id: "edge_q1_pass",
          transition_condition: { type: "prompt" as const, prompt: "Both decision-makers can attend, OR guest is a single adult decision-maker." },
          destination_node_id: "qualify_age",
        },
        {
          id: "edge_q1_fail",
          transition_condition: { type: "prompt" as const, prompt: "Partner cannot attend, no co-attendee available, or guest declines because of partner absence." },
          destination_node_id: "end_polite_disqual",
        },
      ],
    },

    // 4. Q2 — Age range
    {
      id: "qualify_age",
      type: "conversation" as const,
      name: "Q2: Age 25-70",
      instruction: {
        type: "prompt" as const,
        text:
          "Ask: 'Perfect. Are all attending decision-makers between 25 and 70?' " +
          "Do not ask for exact age. " +
          "If they ask why, say: 'That is part of the eligibility guideline for this ticket package. I just need to confirm before checking tour times.'",
      },
      edges: [
        {
          id: "edge_q2_pass",
          transition_condition: { type: "prompt" as const, prompt: "All attendees confirmed in 25-70 range." },
          destination_node_id: "qualify_income",
        },
        {
          id: "edge_q2_fail",
          transition_condition: { type: "prompt" as const, prompt: "Outside 25-70 range, or refuses to confirm." },
          destination_node_id: "end_polite_disqual",
        },
      ],
    },

    // 5. Q3 — Income
    {
      id: "qualify_income",
      type: "conversation" as const,
      name: "Q3: Combined income > $75K",
      instruction: {
        type: "prompt" as const,
        text:
          "Ask warmly: 'And is your combined household income above $75,000 per year?' " +
          "If they resist, say: 'I understand. I do not need exact income or any documents on this call. I only need a yes or no to check eligibility.'",
      },
      edges: [
        {
          id: "edge_q3_pass",
          transition_condition: { type: "prompt" as const, prompt: "Income confirmed above $75K." },
          destination_node_id: "qualify_residency",
        },
        {
          id: "edge_q3_fail",
          transition_condition: { type: "prompt" as const, prompt: "Income below $75K or refuses to confirm." },
          destination_node_id: "end_polite_disqual",
        },
      ],
    },

    // 6. Q4 — Residency
    {
      id: "qualify_residency",
      type: "conversation" as const,
      name: "Q4: US/CA resident",
      instruction: {
        type: "prompt" as const,
        text:
          "Ask: 'Are you currently a resident of the U.S. or Canada?' " +
          "If international, say: 'Got it. This specific package is usually limited by residency. The resort team can point you to other options.'",
      },
      edges: [
        {
          id: "edge_q4_pass",
          transition_condition: { type: "prompt" as const, prompt: "US or Canada resident confirmed." },
          destination_node_id: "qualify_credit",
        },
        {
          id: "edge_q4_fail",
          transition_condition: { type: "prompt" as const, prompt: "Not US/CA resident." },
          destination_node_id: "end_polite_disqual",
        },
      ],
    },

    // 7. Q5 — Credit card in good standing (no check, just confirmation)
    {
      id: "qualify_credit",
      type: "conversation" as const,
      name: "Q5: Major credit card",
      instruction: {
        type: "prompt" as const,
        text:
          "Ask EXACTLY: 'Last one — do you and your attending partner, if applicable, have a major credit card in good standing? Just a yes or no — I do not need any card numbers.' " +
          "If they ask if this is a credit check, say: 'No credit check on this call. This is only a yes-or-no eligibility confirmation. I do not take any card information.' " +
          "If the guest starts to read a card number, immediately interrupt: 'Please stop — I do not take card numbers on this call. Just a yes or no is all I need.' Then re-ask the yes/no question. " +
          "Accept ONLY a yes or no. Never write down, repeat, or confirm any digits.",
      },
      edges: [
        {
          id: "edge_q5_pass",
          transition_condition: { type: "prompt" as const, prompt: "Has major credit card in good standing." },
          destination_node_id: "qualify_prior_tour",
        },
        {
          id: "edge_q5_fail",
          transition_condition: { type: "prompt" as const, prompt: "No major credit card or refuses to confirm." },
          destination_node_id: "end_polite_disqual",
        },
      ],
    },

    // 8. Q6 — Prior tour in last 12 months
    {
      id: "qualify_prior_tour",
      type: "conversation" as const,
      name: "Q6: Prior Westgate tour in 12 mo",
      instruction: {
        type: "prompt" as const,
        text:
          "Ask: 'Have you attended a Westgate vacation ownership preview in the last 12 months?' " +
          "If yes, say: 'Got it. That may affect eligibility for this specific ticket package, but I can still check options.'",
      },
      edges: [
        {
          id: "edge_q6_pass",
          transition_condition: { type: "prompt" as const, prompt: "No prior Westgate tour in last 12 months." },
          destination_node_id: "soft_qualified_transition",
        },
        {
          id: "edge_q6_fail",
          transition_condition: { type: "prompt" as const, prompt: "Yes prior Westgate tour in last 12 months." },
          destination_node_id: "end_polite_disqual",
        },
      ],
    },

    // 9. Soft transition — "looks like you may qualify"
    {
      id: "soft_qualified_transition",
      type: "conversation" as const,
      name: "Soft qualified transition",
      instruction: {
        type: "static_text" as const,
        text:
          "Perfect — based on what you shared, it looks like you may qualify. " +
          "The preview is about 90 minutes, and both decision-makers need to attend. " +
          "Let me check the best available times.",
      },
      always_edge: {
        id: "always_soft_to_slot",
        transition_condition: { type: "prompt" as const, prompt: "Always" },
        destination_node_id: "tour_slot_choice",
      },
    },

    // 10. Tour slot choice — 2 options, morning default
    {
      id: "tour_slot_choice",
      type: "conversation" as const,
      name: "Tour slot — 2 options",
      instruction: {
        type: "prompt" as const,
        text:
          "Say: 'Most guests prefer getting it done earlier so it doesn't interrupt the trip. " +
          "I have {{slot_1}} or {{slot_2}}. Which works better?' " +
          "If neither works, ask: 'What window is easiest before checkout — morning, afternoon, or early evening?'",
      },
      edges: [
        {
          id: "edge_slot_picked",
          transition_condition: { type: "prompt" as const, prompt: "Guest picks a slot or proposes a workable time." },
          destination_node_id: "confirm_phone_for_sms",
        },
        {
          id: "edge_slot_no_time",
          transition_condition: { type: "prompt" as const, prompt: "Guest says no time works at all, declines all slots." },
          destination_node_id: "end_polite_decline",
        },
      ],
    },

    // 11. Confirm phone for SMS
    {
      id: "confirm_phone_for_sms",
      type: "conversation" as const,
      name: "Confirm SMS number",
      instruction: {
        type: "prompt" as const,
        text:
          "Ask: 'Perfect. I'll send the confirmation and check-in details by text. Is {{caller_phone}} the best number?' " +
          "If they give a different number, accept it.",
      },
      always_edge: {
        id: "always_phone_to_book",
        transition_condition: { type: "prompt" as const, prompt: "Always" },
        destination_node_id: "book_tool_call",
      },
    },

    // 12. Book tool call
    {
      id: "book_tool_call",
      type: "conversation" as const,
      name: "Book — call opc_book tool",
      instruction: {
        type: "prompt" as const,
        text:
          "Call the opc_book tool now with the guest's confirmed phone, the placement name, the incentive, " +
          "the property name, and the chosen tour slot. " +
          "Do NOT tell the guest the booking is complete until the tool returns success.",
      },
      edges: [
        {
          id: "edge_book_success",
          transition_condition: { type: "prompt" as const, prompt: "Booking tool returned success." },
          destination_node_id: "end_booked",
        },
        {
          id: "edge_book_fail",
          transition_condition: { type: "prompt" as const, prompt: "Booking tool returned failure or error." },
          destination_node_id: "human_transfer",
        },
      ],
    },

    // 13. END — booked successfully
    {
      id: "end_booked",
      type: "end" as const,
      name: "End — booked",
      instruction: {
        type: "static_text" as const,
        text:
          "You're all set. You'll receive a text with the check-in details, and the Disney ticket package " +
          "is tied to completing the 90-minute vacation ownership preview. Enjoy the rest of your stay.",
      },
    },

    // 14. END — polite decline (early)
    {
      id: "end_polite_decline",
      type: "end" as const,
      name: "End — polite decline",
      instruction: {
        type: "static_text" as const,
        text:
          "No problem at all. Enjoy your stay at Westgate Lakes — and if you decide you want to check availability later, " +
          "you can scan the code again. Have a great day.",
      },
    },

    // 15. END — polite disqual (NEVER reveal which question failed)
    {
      id: "end_polite_disqual",
      type: "end" as const,
      name: "End — disqual (vague)",
      instruction: {
        type: "static_text" as const,
        text:
          "Thanks for answering those. Based on the eligibility guidelines for this specific ticket package, " +
          "I'm not able to book this offer through the automated line. You can still check with the resort team " +
          "in person to see if anything else is available. Enjoy your stay.",
      },
    },

    // 16. END — DNC
    {
      id: "end_dnc",
      type: "end" as const,
      name: "End — do not call",
      instruction: {
        type: "static_text" as const,
        text: "Understood. I'll mark this number as do-not-contact for this offer. Have a good day.",
      },
    },

    // 17. END — wrong person
    {
      id: "end_wrong_person",
      type: "end" as const,
      name: "End — wrong person",
      instruction: {
        type: "static_text" as const,
        text:
          "Got it. I'll close this out so this number is not contacted about the scan. Take care.",
      },
    },

    // 18. END — scanned by accident
    {
      id: "end_scanned_by_accident",
      type: "end" as const,
      name: "End — scanned by accident",
      instruction: {
        type: "static_text" as const,
        text: "No worries. I'll close this out. Enjoy your day.",
      },
    },

    // 19. Human transfer (legal questions, angry, accessibility, booking failure, asks for human)
    {
      id: "human_transfer",
      type: "end" as const,
      name: "End — human transfer (placeholder; pre-pilot is end-call w/ callback offer)",
      instruction: {
        type: "static_text" as const,
        text:
          "I'd like to connect you with the resort team so they can help directly. " +
          "I'll have someone reach out to you shortly — thanks for your patience.",
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
      out.push(line); continue;
    }
    const [k = ""] = line.split("=", 1);
    if (k in updates) { out.push(`${k}=${updates[k]}`); seen.add(k); } else { out.push(line); }
  }
  for (const [k, v] of Object.entries(updates)) {
    if (!seen.has(k)) out.push(`${k}=${v}`);
  }
  writeFileSync(path, out.join("\n"));
}

async function main() {
  console.log("→ Creating OPC v2 Conversation Flow (ChatGPT-validated, FL Ch.721 compliant)…");
  const flowRes = await api<{ conversation_flow_id: string }>("POST", "/create-conversation-flow", opcFlow);
  console.log(`  ✓ flow_id = ${flowRes.conversation_flow_id} (${opcFlow.nodes.length} nodes)`);

  console.log("\n→ Creating OPC v2 agent…");
  const agentBody = {
    agent_name: "Andie — OPC v2 (Westgate pool demo)",
    voice_id: VOICE_ID,
    voice_model: "eleven_turbo_v2_5",
    voice_speed: 1.05,
    voice_temperature: 0.75,
    fallback_voice_ids: ["retell-Cimo"],
    responsiveness: 0.95,
    interruption_sensitivity: 0.55,
    enable_backchannel: false,
    reminder_trigger_ms: 6000,
    language: "en-US",
    webhook_url: `${APP_URL}/api/retell/events`,
    webhook_events: ["call_started","call_ended","call_analyzed","transfer_started","transfer_bridged","transfer_cancelled","transfer_ended"],
    boosted_keywords: ["Westgate","Andie","Arrivia","concierge","tour","preview","Disney","incentive","Lakes","ticket","package"],
    data_storage_setting: "everything_except_pii",
    end_call_after_silence_ms: 30000,
    max_call_duration_ms: 600000,
    stt_mode: "accurate",
    denoising_mode: "noise-cancellation",
    begin_message_delay_ms: 200,
    ring_duration_ms: 20000,
    response_engine: { type: "conversation-flow", conversation_flow_id: flowRes.conversation_flow_id },
    post_call_analysis_data: [
      { type: "boolean", name: "qualified", description: "True if guest passed all 6 eligibility checks." },
      { type: "boolean", name: "tour_booked", description: "True if opc_book tool was called and returned success." },
      {
        type: "enum", name: "disqual_reason",
        description: "Which eligibility check the guest failed (only set if not qualified).",
        choices: ["solo_traveler","age","income","residency","credit","prior_tour","declined_slot","wrong_person","dnc","scanned_by_accident","n/a"],
      },
      { type: "boolean", name: "ai_disclosed", description: "True if Andie disclosed she is an AI in the opener." },
      { type: "boolean", name: "preview_disclosed", description: "True if Andie said the words 'vacation ownership preview' or '90 minutes' in the opener." },
      { type: "boolean", name: "incentive_promised_only_when_qualified", description: "True if incentive language was conditional ('qualified guests can receive') not unconditional." },
      { type: "boolean", name: "compliance_flag", description: "True if any compliance concern arose: pressure tactics, false claim, missed disclosure, or DNC ignored." },
      { type: "string", name: "summary", description: "One-paragraph summary of call outcome and any next steps." },
    ],
  };
  const agentRes = await api<{ agent_id: string }>("POST", "/create-agent", agentBody);
  console.log(`  ✓ agent_id = ${agentRes.agent_id}`);

  await upsertEnv({
    RETELL_OPC_FLOW_ID: flowRes.conversation_flow_id,
    RETELL_OPC_AGENT_ID: agentRes.agent_id,
  });
  console.log(`  ✓ saved RETELL_OPC_FLOW_ID + RETELL_OPC_AGENT_ID to .env.local`);

  console.log("\n✅ OPC v2 demo agent ready.");
  console.log(`   Flow:  ${flowRes.conversation_flow_id}  (${opcFlow.nodes.length} nodes)`);
  console.log(`   Agent: ${agentRes.agent_id}`);
  console.log(`\nTest in Retell dashboard simulator now.`);
  console.log(`Or get a phone number bound to it for live QR scan testing.`);
}

main().catch((e) => {
  console.error("\n❌ build-opc-demo-v2 failed:", e);
  process.exit(1);
});
