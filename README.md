# gvr-retell-voice-agent

Zero-hallucination Retell AI voice agent for **Arrivia / Government Vacation Rewards (GVR)**, built by Voxaris for a 14-day stage demo.

> **No source, no claim. No approved number, no number. No confident answer, transfer.**

## Stack
- Retell AI (custom-LLM WebSocket) · Twilio SIP DID
- Next.js 16 on Vercel (orchestrator + dashboard + tools + webhook)
- Render Node service (ws-server) for the production custom-LLM WebSocket
- Supabase Postgres + pgvector (call sessions, evidence ledgers, transfer contexts, latency events, KB chunks, fact registry, answer cards, eval runs)
- Upstash Redis (per-call short-term memory)
- Anthropic Claude Haiku 4.5 (router, verifier, post-call summary, discovery)
- OpenAI GPT-4o (education, objection, pricing specialists) + text-embedding-3-small
- Cohere rerank-v3.5
- ElevenLabs Turbo v2.5 (TTS) · Cartesia Sonic-3 (fallback) · Deepgram Nova-3 (STT)
- Helicone (LLM observability)

## Two-lane response engine
1. **Answer-card lane (≤800ms p95).** 25 pre-vetted cards per intent, selected by router-candidate / keyword overlap / intent default. Validator runs always. Verifier runs on high_fact / high_policy / pii / legal_financial / jailbreak.
2. **Custom RAG lane (≤2000ms p95).** BM25 + pgvector hybrid → RRF → Cohere rerank top 6 → specialist (GPT-4o or Haiku) → validator → verifier → APPROVE / REWRITE / DEFLECT / TRANSFER.

## Pricing-fact validator
Every TTS-bound draft passes through:
1. Forbidden-phrase detector (`facts.json.global_forbidden_phrases` ∪ each fact's `forbidden_phrases`).
2. Numeric-claim extractor (regex + word-number conversion).
3. Cross-check against `facts.json[].numeric_values` allowlist.
Blocked → rewrite once → still blocked → graceful deflection + (often) transfer.

## Verification pass
Claude Haiku 4.5, ≤450ms, returns `APPROVE | REWRITE | DEFLECT | TRANSFER` against the evidence ledger.

## Warm transfer (Hard Rule 3)
1. Persist `transfer_contexts` row (caller phone, conversation summary, qualifying data, evidence ledger IDs, whisper text).
2. Fire SMS screen-pop with link to `/transfer/[contextId]`.
3. Call Retell `transfer_call` with whisper + three-way bridge message.
4. Backup endpoint retry on `transfer_failed`. Final fallback: callback offer.

## Quickstart

```bash
cp .env.example .env.local      # fill secrets in YOUR .env.local — never commit
pnpm install
pnpm check:env
# 1. Apply migrations 0001-0010 in /supabase/migrations to your Supabase project
# 2. Create the Retell LLM + agent + import Twilio DID:
pnpm create:retell-agent
pnpm import:twilio-number
pnpm sync:retell-config
# 3. Seed local content into Supabase:
pnpm seed:facts
pnpm seed:cards
pnpm ingest:kb && pnpm embed:kb
# 4. Run dev:
pnpm dev          # Next.js orchestrator
pnpm ws:dev       # WebSocket handler (point Retell llm_websocket_url here)
# 5. Eval:
pnpm eval:all
```

## Verification gates
Build is complete when all of:
- `pnpm typecheck && pnpm lint && pnpm test` pass
- `pnpm eval:router` ≥ 95%
- `pnpm eval:cards` ≥ 90%
- `pnpm eval:rag` ≥ 90% top-3
- `pnpm eval:validator` = 100% blocked
- `pnpm eval:verifier` = 100% adversarial blocked, p95 < 450ms
- `pnpm dial:latency` p95 < 800ms answer-card route
- `pnpm dial:transfer` ≥ 98% bridged across 100 transfers
- `pnpm ops:kill` disables agent in <10s
- `pnpm ops:freeze` produces `gvr-demo-v1.0` tag

See `/docs/verification-gates.md` for the full checklist.

## Kill switch

```bash
pnpm ops:kill         # mutes the agent immediately
pnpm ops:rollback --version=v1.0   # restore the frozen demo version
```

## License
Confidential — Voxaris, 2026.
