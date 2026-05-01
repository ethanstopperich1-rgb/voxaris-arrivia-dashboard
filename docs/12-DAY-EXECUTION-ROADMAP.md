# 12-Day Execution Roadmap (May 1 → May 13, 2026)

**Demo:** Stacey presents at ARDA in Las Vegas, **May 13, 2026**
**Format:** Pre-recorded outbound call played on stage
**Stake:** Voxaris name-dropped at ARDA in front of the industry; post-conference SOW

This roadmap merges everything from the Retell AI deep-dive (May 1, 2026) into a concrete day-by-day plan.

## Status as of Day 0 (May 1)

| | Status |
|---|---|
| Two agents (Andie INBOUND + OUTBOUND) | ✅ live, **Conversation Flow** engine |
| Voice clone (calm, custom) | ✅ |
| Voice tuning (1.15× speed, no backchannel, no fillers) | ✅ |
| Phone `+14072890294` bound to both agents | ✅ |
| Vercel production deploy | ✅ `arrivia-gvr.vercel.app` |
| All 6 tools defined; `send_scheduler_link` route built | ✅ |
| Cross-call memory via `/api/retell/inbound` lookup | ✅ |
| Outbound trigger: `pnpm dial:outbound` + REST API | ✅ |
| Voicemail detection on outbound | ✅ |
| Post-call analysis schema (8 fields) | ✅ |
| Conversation Flow with hard-branch compliance nodes | ✅ |

## What we still need (in priority order)

### Days 1–3 (May 2–4) — Content + Member Data
1. **Stacey's discovery questionnaire response** — drives prompt content for the four pillars.
2. **Real specialist phone number** — currently using GVR demo line as placeholder. Set `PRIMARY_SPECIALIST_NUMBER`, then re-run `pnpm sync:prompts`.
3. **Stacey's own member record** from Arrivia (name, $250 incentive, last activity) — drives the demo recording's dynamic variables.
4. **Knowledge base upload** — push the 4-pillar canonical content + FAQ to Retell's KB so the agent has fast lookup beyond the prompt.
5. **Resend or Twilio SendGrid API key** — so `send_scheduler_link` email channel works (SMS already works via existing Twilio).

### Days 4–6 (May 5–7) — Twilio BYOC + Compliance Posture
6. **Twilio BYOC** — switch from Retell-provided number to Voxaris-owned Twilio DID. ~$0.005/min savings + Arrivia's existing carrier contracts can be honored.
7. **STIR/SHAKEN A attestation** — register Voxaris as the originating brand on Twilio Trust Hub. Without this, AI-dialed calls get "Spam Likely" flagging at scale.
8. **Branded caller ID** — Twilio Branded Calling Display Name. Caller sees "Government Vacation Rewards" instead of an unknown number.
9. **Pacing rules** — limit outbound calls to <5 per minute per number for the first week to avoid carrier reputation damage.

### Days 7–9 (May 8–10) — Recording Sessions
10. **Test calls to your cell** — 5–10 takes, iterate on prompt/voice/tone.
11. **Test call to Stacey's cell** — rehearsal, she gives feedback.
12. **Live recording with Stacey** — 4–5 takes via Retell's auto-recording, pick the cleanest 90-second cut.
13. **Polish recording** — light editing, add a Voxaris title card, export MP4 with waveform visualization.
14. **Backup recording** — pre-stage in 3 places (Stacey's laptop, your USB, private Vimeo link on her phone).

### Days 10–11 (May 11–12) — Demo logistics
15. **Stacey arrives Vegas** — confirm her laptop has the recording loaded.
16. **Backup laptop** — yours, with the recording, hot-spotted, ready to swap in.
17. **Final scope-confirmation note to Stacey** — what you delivered + post-ARDA next step (SOW conversation).

### Day 12 (May 13) — DEMO
18. **Stacey presents** at ARDA. Pre-recorded outbound call plays on stage.
19. **You monitor remotely** for any post-demo questions, ready to send follow-up materials within 2 hours.

## Phase 2 — Post-ARDA (starts May 14)

### Strategic items the deep-dive doc recommends, deferred until after demo

| Item | Effort | Value |
|---|---|---|
| **Apply for Retell Certified Partner Program** | 1 hr | Revenue share on every Voxaris client minute thereafter; co-marketing; dedicated SE |
| **Custom LLM (WebSocket) endpoint** | 3–5 days | Drop blended cost from $0.16 → $0.11/min; full validator + verifier control |
| **MCP server wrapping Arrivia CRM** | 2–3 days | Typed access to member records without bespoke per-endpoint functions |
| **WebRTC click-to-call on website** | 1 day | "24/7 website click-to-call" requirement from Stacey's flow |
| **Add Sonnet verifier loop** | 2 days | Pre-TTS hallucination check; only possible with Custom LLM path |
| **Annual commit pricing negotiation** | 1 day | 15–25% off Retell list price |

## Risk register (per the deep-dive)

| Risk | Likelihood | Mitigation status |
|---|---|---|
| Spam-flagged outbound caller ID | HIGH | ⏸ STIR/SHAKEN registration on Day 4–6 |
| Compliance finding against us | MEDIUM | ✅ Conversation Flow hard branches in place |
| Retell raises per-minute pricing | MEDIUM | ⏸ Annual commit lock + Custom LLM path post-ARDA |
| Anthropic outage | MEDIUM | ⏸ Multi-provider fallback in Custom LLM path post-ARDA |
| Arrivia wants on-prem / VPC | LOW-MED | ⏸ Push to Retell Enterprise; rebuild on open-source as worst case |
| Platform lock-in | MEDIUM | ✅ Prompts, flows, analytics schema all exportable; we own the data layer |

## Cost snapshot (per deep-dive)

Current config: **Haiku + ElevenLabs Turbo + Retell-provided number** = `$0.10–$0.12/min`.
Target post-ARDA: **Haiku + Sonnet verifier + ElevenLabs + Twilio BYOC** = `$0.11–$0.13/min` ("best compliance-to-cost ratio").
Phase 2 with Custom LLM: **Custom LLM (Haiku on our infra) + ElevenLabs + Twilio BYOC** = `$0.09–$0.11/min` (max margin, max control).

For GVR's expected ~120k AI minutes/month: ~$10,800–$14,400/month at current config. Pricing room up to $0.25–$0.30/min to Arrivia with healthy margin.

## What "done" looks like for the demo

A 90-second MP4 played on stage at ARDA showing:
1. Andie dials Stacey, opens with personalized greeting using her name + her $250 credit
2. Stacey asks one or two questions
3. Andie walks through the 4 pillars in <60 seconds
4. Andie offers transfer
5. Andie warm-transfers to a closer (you), delivering the whisper context
6. Closer picks up, three-way bridge, conversation completes
7. Recording ends with a clean cut
