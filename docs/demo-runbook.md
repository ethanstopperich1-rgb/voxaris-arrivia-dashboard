# Day 14 Demo Runbook

## Pre-demo checklist (T-60 minutes)
- [ ] `pnpm check:env` returns OK on demo laptop AND backup laptop.
- [ ] `pnpm ops:prewarm` (3 warm-up calls) — eliminates cold-start.
- [ ] Open `/dashboard` on monitoring laptop, Basic Auth in.
- [ ] Specialist confirms phone is on, screen-pop URL bookmarked.
- [ ] Backup recording (`/public/backup-demo/gvr-backup-demo.mp4`) accessible offline.
- [ ] Hotspot tested (cellular failover).
- [ ] Printed runbook in folder. Specialist cheat sheet in folder.

## Four-minute beat sheet
| Time      | Beat               | Notes |
|-----------|--------------------|-------|
| 0:00–0:30 | Setup              | Presenter frames demo. Dashboard visible. Backup hidden. |
| 0:30–1:00 | Dial + greeting    | VP dials Twilio DID. Agent greets w/ TCPA disclosure. VP asks "What are travel savings dollars?" |
| 1:00–2:15 | Core explanation   | Agent delivers 60–75s explainer. Validator + verifier badges visible on dashboard. |
| 2:15–2:45 | Planted question   | "So if I have travel savings dollars, is that the same as having cash toward any trip?" Agent shows nuanced cash distinction. |
| 2:45–3:15 | Ad-lib             | Executive asks one unscripted question. Agent answers from approved evidence or transfers. |
| 3:15–4:00 | Warm transfer      | Agent initiates transfer. Whisper delivered. Specialist answers with full context. Three-way bridge. |

## Disaster recovery (printed in folder)
| Failure                   | Detection               | Move                                                  | Backup |
|---------------------------|-------------------------|-------------------------------------------------------|--------|
| Latency spike             | dashboard p95 spikes    | Filler: "Let me check the approved details…"          | answer-card-only mode (`ANSWER_CARD_ONLY_MODE=true`) |
| Hallucination block       | validator/verifier fires| Rewrite or deflect (automatic)                        | Transfer |
| Agent says bad fact       | human hears it          | Acknowledge: "That's why the validation layer is part of the handoff." | Backup recording |
| Transfer fails            | `transfer_failed` event | "I'm having trouble connecting cleanly…"              | Specialist calls VP directly |
| Specialist no-answer      | 8–12s no answer         | Agent retries on `BACKUP_SPECIALIST_NUMBER`           | Recorded specialist pickup |
| Twilio outage             | DID fails               | Retell-hosted backup number                           | Prerecorded demo |
| ElevenLabs choppy         | TTS audio choppy        | Switch to Cartesia Sonic-3 fallback voice             | Prerecorded demo |
| Wi-Fi failure             | dashboard offline       | PSTN path still alive independently                   | Hotspot + backup laptop |

## Post-demo (T+0 → T+72h)
- T+0–2h: thank-you note + 3 dashboard screenshots (call timeline, transfer context, evidence ledger).
- T+2–24h: executive recap (recording, architecture diagram, transcript, evidence sample, risk controls, 30-day pilot SOW).
- T+24–48h: working session with Stacey + Ops + InfoSec + CRM/telephony + Legal.
- T+48–72h: commercial close. Phase-1 SOW: 30 days, 1 DID, 15–25 intents, warm transfer, governance repo, weekly QA, InfoSec packet, analytics dashboard.
