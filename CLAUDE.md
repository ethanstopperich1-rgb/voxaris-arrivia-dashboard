# CLAUDE.md — Local Operating Manual

This is the GVR / Arrivia LiveKit voice agent platform. Built by Voxaris.

## Hard rules (NEVER violate)
1. **No source, no claim. No approved number, no number. No confident answer, transfer.**
2. Never hardcode dollar / point / percent / date values in prompts or code. Numbers flow through `/content/facts/facts.json` only.
3. Never quote Select Access pricing ($3,499, 5,000 / 75,000 points, 5x earnings, financing, APR, expiration). All marked `transfer_only` in facts.json.
4. Never imply government/military endorsement. Forbidden phrases live in `facts.json.global_forbidden_phrases`.
5. State call recording at the start of every interaction.
6. Zod-validate every external payload (LiveKit, Twilio, Supabase, Redis, LLMs, Cohere).
7. No TODOs, no placeholders. If a file can't be completed, surface the blocker.

## Stack
- **LiveKit Agents SDK** (Python worker — separate `voxaris-vba` repo) for both Andie (outbound) and Deedy (inbound).
- **LiveKit Inference** for LLM routing — primary GPT-4o-mini, fallbacks GPT-4.1-mini and Grok 4.20.
- **Cartesia Sonic-3** for Andie TTS (cloned voice).
- **Rime mistv3 / moraine** for Deedy TTS, with `phonemize_between_brackets=True` for custom pronunciation.
- **Deepgram Flux** for STT.
- **Twilio** for PSTN — carrier-side, no SIP transfers from this repo.

## Where things live (this Next.js dashboard repo)
- `lib/config/env.ts` — Zod-validated env schema
- `lib/clients/` — typed wrappers around Supabase, Redis, Twilio
- `lib/dashboard/`, `lib/livekit/` — dashboard helpers + LiveKit dispatch
- `lib/observability/logger.ts` — pino logger (PII-redacting)
- `app/dashboard/` — live ops dashboard (Overview, Calendar, Calls, Placements, Dial queue, Outbound)
- `app/api/cron/dial-batch/route.ts` — Andie outbound dial batcher (every minute, 9am–6pm ET, Mon–Fri)
- `app/api/cron/prewarm/route.ts`, `app/api/cron/cleanup/route.ts` — supporting crons
- `app/api/outbound/livekit-call/route.ts` — manual LiveKit dispatch endpoint
- `app/api/webhooks/livekit/route.ts` — LiveKit room/participant lifecycle ingest
- `app/api/twilio/callback-forward/route.ts` — TwiML carrier-bridge for inbound callbacks to outbound caller-ID
- `content/facts/facts.json` — authoritative fact registry
- `content/kb/` — markdown knowledge base
- `supabase/migrations/` — schema (call_sessions, dial_queue, livekit_calls, inbound_callbacks, KB chunks, facts, answer cards)

## LiveKit agent repo (separate)
- `/Users/voxaris/voxaris-vba/apps/agent/voxaris_agent/worker.py` — Deedy (Westgate VBA inbound).
- Andie outbound worker — same repo, separate persona.

## Master sources of truth
- `/docs/architecture.md`
- `/docs/livekit-observability.md`
- `/docs/supabase-setup.md`
- `/docs/vercel-deployment.md`
- `/docs/demo-runbook.md`
