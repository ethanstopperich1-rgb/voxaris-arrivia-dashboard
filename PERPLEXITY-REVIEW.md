# Voxaris × Arrivia — Voice Agent Platform

A production voice-AI ops platform for Arrivia's travel-rewards business.
Two agents handle inbound and outbound calls, every interaction is logged,
recorded, transcribed, summarized, and surfaced on a live dashboard.

---

## Live URLs

| | URL |
|---|---|
| **Dashboard (public, no auth)** | https://arrivia-gvr.vercel.app/dashboard |
| Outbound dialer | https://arrivia-gvr.vercel.app/dashboard/outbound |
| Recent calls | https://arrivia-gvr.vercel.app/dashboard/calls |
| Calendar (appointments) | https://arrivia-gvr.vercel.app/dashboard/calendar |
| Placements + QR generator | https://arrivia-gvr.vercel.app/dashboard/placements |
| **Inbound: Deedy (booking agent)** | `+1 (407) 258-6810` |
| **Inbound: Andie (GVR re-engagement)** | `+1 (689) 260-8790` |

---

## Repos

| | URL |
|---|---|
| Dashboard (Next.js + Supabase + Vercel) | https://github.com/ethanstopperich1-rgb/voxaris-arrivia-dashboard |
| Voice agents (Python + LiveKit Agents) | https://github.com/ethanstopperich1-rgb/voxaris-arrivia-agents |

---

## What this is

**Arrivia** is a travel-rewards platform that powers vacation membership
clubs and resort partners. Two challenges where AI helps:

1. **Resort preview qualification** — when someone scans a QR at a
   placement (resort pool, kiosk, partner site), they need to be
   qualified for a preview tour: 18+, married/engaged/co-decision-maker
   present, sufficient household income, valid travel ID, passport for
   international, no recent timeshare tour, etc. Nine OPC compliance
   gates total. Until now, this was a long phone-screen by a human
   booking agent. Now: **Deedy**, a virtual booking agent.

2. **GVR member re-engagement** — Government Vacation Rewards (a
   private travel-rewards program operated by Arrivia for military,
   veterans, and government employees) has thousands of members with
   unused cash credits. Outbound calls to remind them how to use those
   credits. **Andie**, the virtual benefits guide, runs that flow
   end-to-end with a $250 incentive carrot for live transfer to a real
   travel specialist.

Both agents are **AI-powered, never claim to be human**. Both
explicitly correct misconceptions about government endorsement.

---

## Architecture

### Voice pipeline

```
Caller → Twilio / LiveKit Phone Number
       → SIP Dispatch Rule (matches inboundNumbers + agentName)
       → Worker (Python, agent_name="deedy-vba" | "andie-gvr")
       → STT (Deepgram Flux → Nova-3 fallback)
       → LLM (xAI Grok 4.20 → Grok 4.1 Fast → OpenAI gpt-4.1-mini fallback)
       → TTS (Rime mistv3 → Rime arcana → Cartesia sonic-2 fallback)
       → Speaker (Krisp noise+echo cancellation, semantic turn detection)
```

Sub-second p95 turn latency target. All three stages chained through
LiveKit's `FallbackAdapter` so a single-provider outage doesn't drop
the call mid-conversation. Turn detection is semantic (Deepgram Flux
end-of-thought signals), not just VAD pause.

### Tools the LLM can call

| Tool | Purpose | Agent |
|---|---|---|
| `lookup_qa` | 18-entry knowledge base for Arrivia / Westgate questions | Deedy |
| `lookup_objection` | 150-entry rebuttal library | Deedy |
| `opc_book` | Books the preview tour at the OPC backend, returns confirmation_id | Deedy |
| `send_sms_confirmation` | Personalized iMessage/SMS via SendBlue | Deedy |
| `transfer_to_human` | Dial-and-bridge to a live specialist | Deedy |
| `lookup_faq` | 51-entry GVR FAQ library | Andie |
| `lookup_objection` | 84-entry GVR objection library | Andie |
| `verify_me_to_caller` | Soft identity verification (email domain / masked phone) | Andie |
| `send_scheduler_link` | Microsoft Bookings scheduling link | Andie |
| `transfer_to_specialist` | Dial-and-bridge with a brief | Andie |
| `hangup_call` / `detect_voicemail` / `note_uncertainty` | Lifecycle | both |

**Warm transfer is dial-and-bridge, not SIP REFER.** The agent dials
the specialist via the outbound trunk, the specialist joins the same
LiveKit room as the caller, the agent gives a one-line warm handoff
("Hi, this is Deedy — connecting you with Ethan, here's a quick
brief…") then closes its own session. Caller never leaves the room,
recording stays running.

### Outbound dispatch

The dashboard's `/dashboard/outbound` page exposes **every dynamic
variable** each agent's persona references. Pick agent → fill phone +
optional name + agent-specific context (property name, premium offer,
placement source, tour slots for Deedy; cash-credit amount, transfer
bonus, returning-caller flag, scheduler link label, identity-verify
context for Andie) → click Dial. Server creates a LiveKit
`AgentDispatch` with `direction=outbound` + `phone_number` in metadata,
the worker dials out via the Twilio outbound trunk, agent runs full
conversation flow on answer.

### Telemetry pipeline

```
Worker → POST /api/agent/events (x-api-key auth, fire-and-forget)
         events: usage_update | turn_metrics | tool_invocation
                 | escalation | shutdown | error | summary
                 | appointment | recording_started
       → Supabase (call_sessions, tool_invocations, agent_events,
                   appointments, placements, placement_scans)

LiveKit Cloud → POST /api/webhooks/livekit (HMAC-JWT verified)
         events: room_started | room_finished
                 | participant_joined | participant_left
       → Same Supabase tables (call lifecycle, SIP attributes)

Per-call summary: at hangup, agent feeds chat_ctx to its live LLM,
asks for "summarize in 2-3 sentences + OUTCOME: <enum>", POSTs the
result to /api/agent/events as event_type="summary".

Per-call recording: when S3 credentials are set on the agent, LiveKit
Egress writes audio-only OGG to s3://<bucket>/agents/<agent>/<room>.ogg
and surfaces the URL on the dashboard's call detail page.
```

### Dashboard

Next.js 16 App Router on Vercel. Server components by default;
Supabase service-role client on the server. No client-side data
fetching.

| Route | What |
|---|---|
| `/dashboard` | Live overview: in-flight tile (orbiting cyan dot), KPIs, latency p50/p95/p99, today's appointments, top placements |
| `/dashboard/outbound` | Outbound dialer with full dynamic-variable form |
| `/dashboard/calls` | Linear-style table of last 100 calls; filters: agent / outcome / date range |
| `/dashboard/calls/[room]` | Single-call deep dive: header, AI summary, audio player, **AI-Chat-style transcript drawer** (search, copy-per-turn, autoscroll), tool invocation table, linked appointments, raw events JSON |
| `/dashboard/calendar` | Month-grid view of upcoming bookings; click a day for the appointment list |
| `/dashboard/placements` | Placements CRUD — slug + name + premium offer + QR target URL; Download QR button generates a 1024px PNG; scan tracking via `/api/scan/[slug]` (sha256-hashed IP, 302 redirect) |
| `/dashboard/agents`, `/cost`, `/system` | Stub pages, planned for Phase 2 |

UI components from `21st.dev` (modern-side-bar, grid-pattern, border-beam,
glowing-card) restyled to dark theme with cyan accents. Arrivia logo
(official SVG from `arrivia.com`, inverted for dark mode) in the sidebar
header.

### Schema (Supabase, 14 migrations)

```
call_sessions          — every call lands here; LiveKit + legacy Retell columns
tool_invocations       — every function-tool call: tool_name, args, result, success, duration_ms
agent_events           — append-only event log; raw JSON payload per event
appointments           — produced by opc_book success; linked to call_session
placements             — slug, name, brand, premium_offer, qr_target_url, scan_count
placement_scans        — every QR scan: timestamp, sha256(ip), user_agent, referrer
transfer_contexts      — warm-transfer screen-pop payloads
latency_events         — per-stage timing for p50/p95/p99
evidence_ledgers       — verifier verdicts (legacy)
fact_registry          — pricing / facts authoritative store (legacy Retell era)
kb_chunks              — RAG knowledge base chunks (legacy)
answer_cards           — pre-vetted answer cards (legacy)
eval_runs              — eval pipeline (legacy)
```

All migrations idempotent (`if not exists`). The schema is additive —
Retell-era tables and columns preserved alongside LiveKit-native ones
for backward compatibility.

### Observability

- Per-turn latency metrics (`turn_metrics` event with `turn_total_ms`)
- Per-call usage (`usage_update` event with LLM tokens, TTS chars, STT seconds)
- Fallback engagement tracking (which provider was used, in case primary failed)
- Realtime dashboard auto-refresh via Supabase Realtime (subscribes to inserts on `call_sessions` + `agent_events`)
- Recording playback inline on call detail page

---

## Stack

### Voice agents (Python)

- `livekit-agents==1.5.7` — explicit-dispatch worker pattern, FallbackAdapter for STT/LLM/TTS, semantic turn detection, IVR detection, dial-and-bridge transfer
- `livekit-plugins-deepgram` — Flux STT
- `livekit-plugins-xai` — Grok 4.20 LLM
- `livekit-plugins-rime` — mistv3 TTS
- `livekit-plugins-noise-cancellation` — Krisp BVCTelephony for 8kHz SIP
- `silero` VAD
- `httpx` for telemetry POSTs
- `pydantic` for tool schemas
- `pytest` for unit tests (37 Deedy + 17 Andie)

### Dashboard (TypeScript)

- Next.js 16 App Router
- Supabase (`@supabase/supabase-js` v2)
- `livekit-server-sdk` for AgentDispatch + WebhookReceiver
- `qrcode` for PNG generation
- `zod` for input validation
- Tailwind v4 + shadcn/ui-style components
- Recharts (sparklines on KPI tiles)
- `pino` structured logger
- `lucide-react` icons
- `framer-motion` for live counter animations
- `21st.dev` components (sidebar, grid-pattern, border-beam, glowing-card)

### Infrastructure

- LiveKit Cloud (Ship plan, us-east, 2 deployed agents, 2 native phone numbers)
- Twilio (1 inbound number, 1 outbound trunk for warm-transfer caller-ID)
- Vercel (Next.js host, prod = `arrivia-gvr.vercel.app`)
- Supabase (Postgres + Realtime, project `yzipcusylywhthwdtcme`)
- SendBlue (iMessage/SMS for personalized confirmations)
- Future: S3 (recording storage), Microsoft Bookings (Andie scheduling)

---

## Compliance & guardrails

- **TCPA / FCC PEWC** — agents identify as AI in the first 10 seconds of every outbound call.
- **No government endorsement** — Andie's persona explicitly corrects "is this the government?" / "are you military?". The phrase "government-approved" is on a forbidden list.
- **No SSN, no credit card** — both personas refuse to capture either; redirect to a secure handoff.
- **Recording disclosure** — first line of every greeting: "this call may be recorded for quality."
- **Privacy** — phone numbers masked in dashboard tables (`•••-•••-5809`); IP addresses sha256-hashed before storage in `placement_scans`.

---

## Status

This is a working production demo deployed at `arrivia-gvr.vercel.app`.
Both phone numbers are live, both agents respond on first ring,
outbound dialing works from the dashboard, telemetry flows end-to-end,
recordings ready to enable on S3 credentials.

Reach the dashboard, place a call, view the transcript and summary
within seconds of hangup. No login required for review purposes.

---

*Built by Voxaris for Arrivia. Not a government agency. Not endorsed by the U.S. military.*
