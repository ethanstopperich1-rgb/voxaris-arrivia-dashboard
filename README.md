# gvr-livekit-voice-agent

LiveKit voice agent platform (Andie outbound + Deedy inbound) for **Arrivia / Government Vacation Rewards (GVR)**, built by Voxaris for a 14-day stage demo.

## Stack
- LiveKit Agents SDK (Python worker, separate repo) · Twilio carrier-side DIDs
- Next.js 16 on Vercel (dashboard, dial-batch cron, LiveKit dispatch + webhook ingress, Twilio callback-forward)
- Supabase Postgres (call sessions, dial queue, livekit_calls, inbound_callbacks, KB chunks, fact registry, answer cards, eval runs)
- Upstash Redis (rate limits + short-term state)
- LiveKit Inference (LLM routing) — primary GPT-4o-mini, fallbacks GPT-4.1-mini and Grok 4.20
- Cartesia Sonic-3 (Andie outbound) · Rime mistv3 / moraine (Deedy inbound)
- Deepgram Flux STT
- Cohere rerank-v3.5

## Architecture
- **Andie (outbound):** Vercel cron `/api/cron/dial-batch` (every minute, 9am–6pm ET, Mon–Fri) pulls from `dial_queue`, dispatches LiveKit room → Python agent picks up via `@server.rtc_session` → Twilio places PSTN leg → caller answers → discovery flow.
- **Deedy (inbound):** Westgate VBA pilot. Twilio DID points at LiveKit SIP ingress → Deedy agent answers, runs scan-and-call discovery, books slot, hands off to welcome team.
- **Inbound callback:** When members miss an Andie outbound and dial back the caller-ID number, `/api/twilio/callback-forward` returns TwiML `<Dial>` and bridges them to the inbound sales team — zero-cost carrier transfer.

## Quickstart

```bash
cp .env.example .env.local      # fill secrets in YOUR .env.local — never commit
pnpm install
pnpm check:env
# 1. Apply migrations in /supabase/migrations to your Supabase project
# 2. Seed local content into Supabase:
pnpm seed:facts
pnpm seed:cards
pnpm ingest:kb && pnpm embed:kb
# 3. Run dev:
pnpm dev
# 4. Eval:
pnpm eval:all
```

## License
Confidential — Voxaris, 2026.
