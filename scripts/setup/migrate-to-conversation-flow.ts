/**
 * Migrate INBOUND + OUTBOUND agents from response_engine: retell-llm
 * to response_engine: conversation-flow.
 *
 * Builds two flows that mirror Stacey's flow PPT:
 *   INBOUND  : opener → confirm_routing → benefits_overview → transfer
 *              + global nodes for "speak to human" and graceful end.
 *   OUTBOUND : opener → confirm_routing → discovery → benefits → carrot → transfer
 *              + scheduler_link branch for "not engaged"
 *              + wrong_person + DNC branches
 *              + global nodes
 *
 * Compliance hard branches: pricing / account-specific / jailbreak intents
 * route DIRECTLY to a transfer node — the LLM cannot speak past the branch.
 *
 * Run:  pnpm migrate:flow
 */
import { config as dotenvConfig } from "dotenv";
dotenvConfig({ path: ".env.local" });
dotenvConfig();

const API = process.env.RETELL_API_KEY!;
if (!API) throw new Error("Missing RETELL_API_KEY");

const INBOUND_AGENT  = process.env.RETELL_INBOUND_AGENT_ID!;
const OUTBOUND_AGENT = process.env.RETELL_OUTBOUND_AGENT_ID!;
const SPECIALIST     = process.env.PRIMARY_SPECIALIST_NUMBER ?? "+14072890294";
const APP_URL        = process.env.NEXT_PUBLIC_APP_URL ?? "https://arrivia-gvr.vercel.app";
const APP_API_KEY    = process.env.APP_API_KEY ?? "";

async function api<T>(method: string, path: string, body?: unknown): Promise<T> {
  const r = await fetch(`https://api.retellai.com${path}`, {
    method,
    headers: { Authorization: `Bearer ${API}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) throw new Error(`Retell ${method} ${path} ${r.status}: ${await r.text()}`);
  return (await r.json()) as T;
}

// ─── Flow-level tool definitions ────────────────────────────────────────────
// Only CUSTOM tools (with URLs) belong here. transfer_call and end_call are
// node TYPES (TransferCallNode, EndNode) — defined inline at the node level.
const tools = [
  {
    type: "custom",
    tool_id: "send_scheduler_link",
    name: "send_scheduler_link",
    description:
      "Send the caller a Microsoft Bookings link via SMS or email. Use when caller declines transfer but agrees to schedule for later. Ask channel preference first.",
    url: `${APP_URL}/api/tools/send-scheduler-link`,
    speak_during_execution: true,
    execution_message_description: "Sending the scheduling link now.",
    execution_message_type: "static_text",
    headers: { "x-api-key": APP_API_KEY },
    parameters: {
      type: "object",
      properties: {
        retell_call_id: { type: "string" },
        channel: { type: "string", enum: ["sms", "email"] },
        destination: { type: "string", description: "Phone (E.164) for SMS or email address for email." },
        caller_name: { type: "string" },
      },
      required: ["retell_call_id", "channel", "destination"],
    },
  },
];

// ─── INBOUND FLOW ──────────────────────────────────────────────────────────
const inboundFlow = {
  start_speaker: "agent" as const,
  model_choice: { type: "cascading" as const, model: "claude-4.5-haiku" },
  model_temperature: 0,
  tool_call_strict_mode: true,
  start_node_id: "opener_inbound",
  global_prompt:
    "You are Andie, the AI voice assistant for Government Vacation Rewards (GVR), a private travel-rewards membership operated by Arrivia. " +
    "GVR is NOT a government agency, NOT endorsed by the U.S. military. " +
    "Speak in short, clean sentences. Use contractions. Never use filler words (um, uh, like). Stop talking immediately when the caller speaks. " +
    "Never quote any specific dollar amount, point total, percentage, expiration date, APR, or financing term unless it appears in the dynamic variables for this call. " +
    "Never imply government or military endorsement. " +
    "Travel savings dollars are NOT cash and NOT a gift card.",
  default_dynamic_variables: {
    member_name: "there",
    incentive_amount: "$250",
    transfer_bonus_amount: "$250",
    total_after_bonus: "$500",
    is_returning_caller: "false",
    last_call_date: "never",
  },
  tools,
  nodes: [
    // Opening Talk node — fixed disclosure, low interruption tolerance
    {
      id: "opener_inbound",
      type: "conversation" as const,
      name: "Opener (disclosure)",
      instruction: {
        type: "static_text" as const,
        text:
          "Hi, this is Andie with Government Vacation Rewards. Just so you know, I'm an AI assistant " +
          "and this call may be recorded. I can walk you through how your travel benefits work — " +
          "Savings Credits, Reward Points, Quarterly Specials, Great Getaways — or get you to a " +
          "specialist if you'd rather. What can I help you with today?",
      },
      interruption_sensitivity: 0.3,
      edges: [
        {
          id: "edge_opener_to_benefits",
          transition_condition: {
            type: "prompt" as const,
            prompt:
              "User wants to learn about the membership, the four pillars, savings credits, reward points, quarterly specials, great getaways, or asks 'how does it work'.",
          },
          destination_node_id: "benefits_overview",
        },
        {
          id: "edge_opener_to_transfer_pricing",
          transition_condition: {
            type: "prompt" as const,
            prompt:
              "User asks anything pricing-related — Select Access cost, membership fee, financing, APR, points value, or any specific dollar amount about their account.",
          },
          destination_node_id: "transfer_with_carrot",
        },
        {
          id: "edge_opener_to_transfer_account",
          transition_condition: {
            type: "prompt" as const,
            prompt:
              "User asks about their specific account — balance, point total, expiration, member ID, or volunteers any PII (SSN, credit card, DOB).",
          },
          destination_node_id: "transfer_now",
        },
        {
          id: "edge_opener_to_transfer_request",
          transition_condition: {
            type: "prompt" as const,
            prompt: "User asks for an agent, representative, person, or to be transferred to a human.",
          },
          destination_node_id: "transfer_now",
        },
        {
          id: "edge_opener_to_end",
          transition_condition: {
            type: "prompt" as const,
            prompt: "User says goodbye, that's all, or wants to end the call.",
          },
          destination_node_id: "end_graceful",
        },
      ],
    },

    // Benefits overview Talk node — explain 4 pillars, then offer transfer
    {
      id: "benefits_overview",
      type: "conversation" as const,
      name: "Benefits Overview (4 pillars)",
      instruction: {
        type: "prompt" as const,
        text:
          "Walk the caller through GVR's four membership pillars in plain language, briefly:\n" +
          "1. **Savings Credits** — promotional credits applied at booking against eligible travel through GVR. NOT cash, NOT a gift card.\n" +
          "2. **Reward Points** — loyalty currency earned when booking; redemption details handled by a specialist.\n" +
          "3. **Quarterly Specials** — limited-time partner offers refreshed each quarter.\n" +
          "4. **Great Getaways** — curated, pre-bundled travel packages.\n" +
          "Keep the whole walkthrough under 90 spoken seconds. After the walkthrough, ask: 'Want me to connect you with a specialist who can pull up live options?'",
      },
      edges: [
        {
          id: "edge_benefits_to_transfer",
          transition_condition: {
            type: "prompt" as const,
            prompt: "User agrees to be connected to a specialist, says yes, please, sure, ok, or asks for more detail.",
          },
          destination_node_id: "transfer_with_carrot",
        },
        {
          id: "edge_benefits_to_end",
          transition_condition: {
            type: "prompt" as const,
            prompt: "User declines transfer, says they're done, or wants to end the call.",
          },
          destination_node_id: "end_graceful",
        },
      ],
    },

    // Pre-transfer Talk node — delivers the carrot then auto-transfers
    {
      id: "transfer_with_carrot",
      type: "conversation" as const,
      name: "Transfer carrot",
      instruction: {
        type: "static_text" as const,
        text:
          "Great — while I get a specialist on the line, I'm going to add another {{transfer_bonus_amount}} " +
          "to your account. So you'll have {{total_after_bonus}} waiting when they pick up. One moment.",
      },
      always_edge: {
        id: "always_carrot_to_transfer",
        transition_condition: { type: "prompt" as const, prompt: "Always" },
        destination_node_id: "transfer_node",
      },
    },

    // Direct transfer Talk node (no carrot — used for account/PII/agent-request)
    {
      id: "transfer_now",
      type: "conversation" as const,
      name: "Transfer (no carrot)",
      instruction: {
        type: "static_text" as const,
        text:
          "Of course — let me get a specialist on the line. One moment while I brief them.",
      },
      always_edge: {
        id: "always_now_to_transfer",
        transition_condition: { type: "prompt" as const, prompt: "Always" },
        destination_node_id: "transfer_node",
      },
    },

    // Transfer node — the actual warm transfer
    {
      id: "transfer_node",
      type: "transfer_call" as const,
      name: "Warm transfer",
      transfer_destination: { type: "predefined" as const, number: SPECIALIST },
      transfer_option: {
        type: "warm_transfer" as const,
        agent_detection_timeout_ms: 12000,
        on_hold_music: "relaxing_sound" as const,
        private_handoff_option: {
          type: "prompt" as const,
          prompt:
            "Brief the specialist before bridging. In under 12 seconds: caller name (or 'unknown caller'), " +
            "what they asked, any rebuttal you handled, recommended next step. End with: 'Ready to bridge?'",
        },
        public_handoff_option: {
          type: "static_message" as const,
          message: "Thanks for holding. I have a GVR specialist on the line and gave them the context.",
        },
        show_transferee_as_caller: true,
      },
      edge: {
        id: "edge_transfer_failed",
        transition_condition: { type: "prompt" as const, prompt: "Transfer failed" },
        destination_node_id: "transfer_failed_callback",
      },
    },

    // Transfer-failed fallback — offer scheduler link
    {
      id: "transfer_failed_callback",
      type: "conversation" as const,
      name: "Transfer-failed fallback",
      instruction: {
        type: "prompt" as const,
        text:
          "Apologize briefly that the specialist isn't available right now. Ask: 'Would you prefer a text or an email with a link to schedule a callback at a better time?' Then call send_scheduler_link with their channel choice.",
      },
      edges: [
        {
          id: "edge_failed_to_end",
          transition_condition: {
            type: "prompt" as const,
            prompt: "User accepts the scheduler link or after the link is sent.",
          },
          destination_node_id: "end_graceful",
        },
      ],
    },

    // Graceful end
    {
      id: "end_graceful",
      type: "end" as const,
      name: "End — graceful",
      instruction: {
        type: "static_text" as const,
        text: "Thanks for calling Government Vacation Rewards — have a good one.",
      },
    },
  ],
};

// ─── OUTBOUND FLOW ─────────────────────────────────────────────────────────
const outboundFlow = {
  start_speaker: "agent" as const,
  model_choice: { type: "cascading" as const, model: "claude-4.5-haiku" },
  model_temperature: 0,
  tool_call_strict_mode: true,
  start_node_id: "opener_outbound",
  global_prompt: inboundFlow.global_prompt,
  default_dynamic_variables: inboundFlow.default_dynamic_variables,
  tools,
  nodes: [
    // Outbound opener — Andie identifies + reason for call
    {
      id: "opener_outbound",
      type: "conversation" as const,
      name: "Outbound opener",
      instruction: {
        type: "static_text" as const,
        text:
          "Hi {{member_name}}, this is Andie calling from Government Vacation Rewards. I'm an AI assistant " +
          "and this call may be recorded. I'm reaching out because you have {{incentive_amount}} of unused " +
          "travel credits in your account, and I'd love to walk you through what they're for. Got a quick minute?",
      },
      interruption_sensitivity: 0.3,
      edges: [
        {
          id: "edge_outbound_to_engaged",
          transition_condition: {
            type: "prompt" as const,
            prompt: "User says yes, sure, ok, has time, or shows interest in hearing about their credits.",
          },
          destination_node_id: "discovery",
        },
        {
          id: "edge_outbound_to_not_engaged",
          transition_condition: {
            type: "prompt" as const,
            prompt: "User says they're busy, can't talk now, ask for later, or says no without rejecting outright.",
          },
          destination_node_id: "not_engaged_choice",
        },
        {
          id: "edge_outbound_to_wrong_person",
          transition_condition: {
            type: "prompt" as const,
            prompt:
              "User says they're not {{member_name}}, you have the wrong number, that's not them, or they don't know what GVR is.",
          },
          destination_node_id: "wrong_person_end",
        },
        {
          id: "edge_outbound_to_dnc",
          transition_condition: {
            type: "prompt" as const,
            prompt:
              "User says don't call again, take me off the list, remove me, stop calling, or any do-not-call request.",
          },
          destination_node_id: "dnc_end",
        },
      ],
    },

    // Light discovery — Travel Q&A
    {
      id: "discovery",
      type: "conversation" as const,
      name: "Discovery (Travel Q&A)",
      instruction: {
        type: "prompt" as const,
        text:
          "Briefly ask one or two warm questions about their travel interests — when they're thinking of traveling, where they'd like to go. Don't push. " +
          "After 1–2 turns of light discovery, transition naturally to the Benefits Overview. " +
          "Never ask for SSN, credit card, DOB, or member ID.",
      },
      always_edge: {
        id: "always_discovery_to_benefits",
        transition_condition: { type: "prompt" as const, prompt: "Always" },
        destination_node_id: "benefits_overview_outbound",
      },
    },

    // Benefits overview — same 4-pillar walkthrough as inbound
    {
      id: "benefits_overview_outbound",
      type: "conversation" as const,
      name: "Benefits Overview (4 pillars)",
      instruction: {
        type: "prompt" as const,
        text:
          "Walk through GVR's four membership pillars in plain language, in under 90 seconds:\n" +
          "1. Savings Credits — promotional credits at booking. NOT cash. The {{incentive_amount}} in their account is one of these.\n" +
          "2. Reward Points — loyalty currency earned when booking.\n" +
          "3. Quarterly Specials — limited-time partner offers each quarter.\n" +
          "4. Great Getaways — curated pre-bundled travel packages.\n" +
          "After the walkthrough, ask: 'Want me to connect you with a specialist who can pull up live options for you?'",
      },
      edges: [
        {
          id: "edge_benefits_outbound_to_transfer",
          transition_condition: {
            type: "prompt" as const,
            prompt: "User agrees to transfer, says yes, sure, ok, please, or asks to talk to a person.",
          },
          destination_node_id: "transfer_carrot_outbound",
        },
        {
          id: "edge_benefits_outbound_to_end",
          transition_condition: {
            type: "prompt" as const,
            prompt: "User declines, says no thanks, says they'll think about it, or wants to end.",
          },
          destination_node_id: "end_polite",
        },
      ],
    },

    // Transfer carrot
    {
      id: "transfer_carrot_outbound",
      type: "conversation" as const,
      name: "Transfer carrot",
      instruction: {
        type: "static_text" as const,
        text:
          "Great — while I get a specialist on the line, I'm going to add another {{transfer_bonus_amount}} " +
          "to your account. So you'll have {{total_after_bonus}} waiting when they pick up. One moment.",
      },
      always_edge: {
        id: "always_carrot_outbound_to_transfer",
        transition_condition: { type: "prompt" as const, prompt: "Always" },
        destination_node_id: "transfer_node_outbound",
      },
    },

    // "Not engaged" choice node — schedule or transfer or neither
    {
      id: "not_engaged_choice",
      type: "conversation" as const,
      name: "Not engaged — choice",
      instruction: {
        type: "prompt" as const,
        text:
          "Acknowledge that now isn't a good time. Ask the caller: " +
          "'Would it be easier if I sent you a link to schedule a call when it works better, or would you " +
          "rather I connect you to a specialist now? Or we can leave it for now and the credits stay in your account.'",
      },
      edges: [
        {
          id: "edge_choice_to_scheduler",
          transition_condition: {
            type: "prompt" as const,
            prompt: "User wants the link to schedule for later, says text or email is fine, asks for a callback.",
          },
          destination_node_id: "ask_channel_node",
        },
        {
          id: "edge_choice_to_transfer",
          transition_condition: {
            type: "prompt" as const,
            prompt: "User says yes connect me now, transfer me, talk to someone now.",
          },
          destination_node_id: "transfer_carrot_outbound",
        },
        {
          id: "edge_choice_to_end",
          transition_condition: {
            type: "prompt" as const,
            prompt: "User wants to leave it for now, says no to both, says goodbye.",
          },
          destination_node_id: "end_polite",
        },
      ],
    },

    // Ask channel + dispatch scheduler link
    {
      id: "ask_channel_node",
      type: "conversation" as const,
      name: "Ask channel + send link",
      instruction: {
        type: "prompt" as const,
        text:
          "Ask: 'Do you prefer a text or email?' Once they pick, call send_scheduler_link with channel='sms' or 'email' and destination set to their phone (in E.164) or email address. " +
          "Confirm 'Sent — you should see it any second.' Then close the call.",
      },
      always_edge: {
        id: "always_channel_to_end",
        transition_condition: { type: "prompt" as const, prompt: "Always" },
        destination_node_id: "end_after_scheduler",
      },
    },

    // After scheduler — gentle close
    {
      id: "end_after_scheduler",
      type: "end" as const,
      name: "End — after scheduler",
      instruction: {
        type: "static_text" as const,
        text: "Perfect. Have a great day, {{member_name}} — talk soon.",
      },
    },

    // Wrong person end
    {
      id: "wrong_person_end",
      type: "end" as const,
      name: "End — wrong person",
      instruction: {
        type: "static_text" as const,
        text:
          "I'm so sorry — I had a different name on the account. I'll mark your number to not call again. Have a good day.",
      },
    },

    // Do-not-call end
    {
      id: "dnc_end",
      type: "end" as const,
      name: "End — do not call",
      instruction: {
        type: "static_text" as const,
        text: "Understood — I'll mark your number to not call again. Have a good day.",
      },
    },

    // Polite end (declined)
    {
      id: "end_polite",
      type: "end" as const,
      name: "End — polite",
      instruction: {
        type: "static_text" as const,
        text:
          "No problem — your credits are sitting in your account whenever you're ready. " +
          "Thanks for the time, {{member_name}}. Have a good day.",
      },
    },

    // Transfer node
    {
      id: "transfer_node_outbound",
      type: "transfer_call" as const,
      name: "Warm transfer (outbound)",
      transfer_destination: { type: "predefined" as const, number: SPECIALIST },
      transfer_option: {
        type: "warm_transfer" as const,
        agent_detection_timeout_ms: 12000,
        on_hold_music: "relaxing_sound" as const,
        private_handoff_option: {
          type: "prompt" as const,
          prompt:
            "Brief the specialist before bridging. In under 12 seconds: caller name {{member_name}}, " +
            "credit balance now in their account ({{incentive_amount}} + {{transfer_bonus_amount}} " +
            "= {{total_after_bonus}}), any rebuttal you handled. End with: 'Ready to bridge?'",
        },
        public_handoff_option: {
          type: "static_message" as const,
          message:
            "Thanks for holding. I have a GVR specialist on the line and I added another " +
            "{{transfer_bonus_amount}} to your account, so you'll have {{total_after_bonus}} " +
            "waiting when they pick up.",
        },
        show_transferee_as_caller: true,
      },
      edge: {
        id: "edge_outbound_transfer_failed",
        transition_condition: { type: "prompt" as const, prompt: "Transfer failed" },
        destination_node_id: "ask_channel_node",
      },
    },
  ],
};

// ─── Execute ───────────────────────────────────────────────────────────────
async function main() {
  console.log("Creating INBOUND conversation flow…");
  const inboundRes = await api<{ conversation_flow_id: string }>(
    "POST",
    "/create-conversation-flow",
    inboundFlow,
  );
  console.log(`  ✓ inbound flow_id = ${inboundRes.conversation_flow_id}`);

  console.log("Creating OUTBOUND conversation flow…");
  const outboundRes = await api<{ conversation_flow_id: string }>(
    "POST",
    "/create-conversation-flow",
    outboundFlow,
  );
  console.log(`  ✓ outbound flow_id = ${outboundRes.conversation_flow_id}`);

  console.log("\nMigrating INBOUND agent → conversation-flow…");
  await api("PATCH", `/update-agent/${INBOUND_AGENT}`, {
    response_engine: {
      type: "conversation-flow",
      conversation_flow_id: inboundRes.conversation_flow_id,
    },
  });
  console.log(`  ✓ inbound agent now uses flow ${inboundRes.conversation_flow_id}`);

  console.log("Migrating OUTBOUND agent → conversation-flow…");
  await api("PATCH", `/update-agent/${OUTBOUND_AGENT}`, {
    response_engine: {
      type: "conversation-flow",
      conversation_flow_id: outboundRes.conversation_flow_id,
    },
  });
  console.log(`  ✓ outbound agent now uses flow ${outboundRes.conversation_flow_id}`);

  console.log("\n✅ Migration complete.");
  console.log(`   Inbound flow:  ${inboundRes.conversation_flow_id}`);
  console.log(`   Outbound flow: ${outboundRes.conversation_flow_id}`);
  console.log(`\n   Save to .env.local:`);
  console.log(`     RETELL_INBOUND_FLOW_ID=${inboundRes.conversation_flow_id}`);
  console.log(`     RETELL_OUTBOUND_FLOW_ID=${outboundRes.conversation_flow_id}`);
}

main().catch((e) => {
  console.error("\n❌ Migration failed:", e);
  process.exit(1);
});
