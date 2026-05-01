# Inbound vs Outbound — what differs

Stacey's flow PPT (Apr 30) defines two agents with the **same happy path** but
different openers and one extra branch on outbound. Both agents share the same
voice clone, voice tuning, and the 4-pillar Benefits Overview.

## The two live agents

| | INBOUND | OUTBOUND |
|---|---|---|
| `agent_name` | Andie — GVR INBOUND | Andie — GVR OUTBOUND |
| `agent_id` | `agent_42b27fc301f218ce97b23dd390` | `agent_728c38ae97d84abc7d1091de45` |
| `llm_id` | `llm_765a00d4bfe7b15b96bebdbe2a77` | `llm_f04143faa0b1d21ddf300b028b3c` |
| `voice_id` | `custom_voice_64dd4d7112a69b8ddb68b1caef` (your clone) | same |
| `voice_speed` / `responsiveness` / `backchannel` | 1.15 / 0.95 / off | same |

## Differences in the prompt (you write these — Ethan owns the prompt)

### 1. Begin message

**INBOUND** — caller dials, Andie picks up. Open with what she **can** explain.
> *(e.g.)* "Hi, this is Andie with Government Vacation Rewards. Just so you know, I'm an AI assistant and this call may be recorded. I can walk you through your travel benefits — savings credits, reward points, quarterly specials, and great getaways — and connect you with a specialist for anything else. What can I help you with today?"

**OUTBOUND** — Andie dials, member picks up. Open with the **reason for the call**.
> *(e.g.)* "Hi {{member_name}}, this is Andie calling from Government Vacation Rewards — I'm an AI assistant, and this call may be recorded. I'm reaching out because you have {{incentive_amount}} of unused travel credits in your account, and I'd love to walk you through what they're for. Got a quick minute?"

### 2. Routing decision tree

Both agents share this, except the **scheduler-link branch** is outbound-only:

```
Andie's opener
   │
   ▼
"Confirm what member wants" — Andie listens & routes
   │
   ├─ ENGAGED ────────► Discovery (Travel Q&A) ─► Benefits Overview (4 pillars)
   │                                                    │
   │                                                    ▼
   │                                          Member engaged → offer credits → transfer
   │
   └─ NOT ENGAGED ────► two paths:
        │
        ├─ INBOUND  → direct transfer (live agent closes from here)
        │
        └─ OUTBOUND → ask: "schedule for later or transfer now?"
                       │
                       ├─ schedule → call `send_scheduler_link`
                       │
                       └─ transfer → call `transfer_to_specialist`
```

### 3. Tool inventory

| Tool | INBOUND | OUTBOUND |
|---|:---:|:---:|
| `transfer_to_specialist` | ✅ | ✅ |
| `end_call` | ✅ | ✅ |
| `send_scheduler_link` | ✅ (handles "I'll book later" cases too) | ✅ (primary use) |
| `lookup_fact` | ✅ | ✅ |
| `create_transfer_context` | ✅ | ✅ |
| `log_demo_event` | ✅ | ✅ |

> **Note:** Tools 3–6 above are defined in `llm.json` but not yet pushed to the
> live LLMs because their URLs use `${NEXT_PUBLIC_APP_URL}` which is unresolved
> until Vercel deploys. Run `pnpm sync:retell-config` after the Vercel URL is
> set and these will go live on both agents.

## Shared pieces (don't diverge)

- The 4 pillars (Savings Credits / Reward Points / Quarterly Specials / Great Getaways)
- Hard rules (no government endorsement, no unapproved numbers, no PII, no jailbreak)
- Voice + tuning (the speed-up applies to both)
- Recording + AI disclosure in the first 5 seconds
- The `+{{transfer_bonus_amount}}` carrot during transfer hold

## Where the dynamic variables come from

| Variable | INBOUND | OUTBOUND |
|---|---|---|
| `{{member_name}}` | Unknown until Andie asks (or until caller-ID lookup is wired). Default: "there" | Injected at `create-phone-call` time from CRM/CSV |
| `{{incentive_amount}}` | "$250" default; updated if account lookup is added | Injected at `create-phone-call` time |
| `{{transfer_bonus_amount}}` | "$250" | "$250" |
| `{{total_after_bonus}}` | "$500" | "$500" |
| `{{last_activity_date}}` | "never" default | Injected (or "never" for new members) |

## What Ethan needs to do

1. Write the **inbound** prompt in `infra/retell/agent-prompt.md`.
2. Write the **outbound** prompt in `infra/retell/agent-prompt.outbound.md` (new file — see below for template stub).
3. Run `pnpm bootstrap:retell` once you're ready to push (script needs a small update to know which prompt goes with which LLM — flagged below).

## Bootstrap script update needed

`scripts/setup/bootstrap-retell.ts` currently creates **one** LLM + agent. Needs
to be updated to push **two** prompts to **two** LLMs:

```ts
// In bootstrap-retell.ts:
const INBOUND_LLM_ID  = "llm_765a00d4bfe7b15b96bebdbe2a77";
const OUTBOUND_LLM_ID = "llm_f04143faa0b1d21ddf300b028b3c";

const inboundPrompt  = readFileSync("infra/retell/agent-prompt.md",          "utf8");
const outboundPrompt = readFileSync("infra/retell/agent-prompt.outbound.md", "utf8");

await retell.updateLLM(INBOUND_LLM_ID,  { general_prompt: inboundPrompt,  begin_message: ... });
await retell.updateLLM(OUTBOUND_LLM_ID, { general_prompt: outboundPrompt, begin_message: ... });
```

I'll wire this once you've drafted the outbound prompt.
