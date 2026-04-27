# CLAUDE.md — Local Operating Manual

This is the GVR / Arrivia Retell voice agent. Built by Voxaris for a 14-day stage demo.

## Hard rules (NEVER violate)
1. **No source, no claim. No approved number, no number. No confident answer, transfer.**
2. Never hardcode dollar / point / percent / date values in prompts or code. Numbers flow through `/content/facts/facts.json` only.
3. Never use SIP custom headers as the primary transfer-context delivery mechanism — they're stripped on PSTN. Always persist to Supabase `transfer_contexts` and SMS-screen-pop the specialist before bridging.
4. Never quote Select Access pricing ($3,499, 5,000 / 75,000 points, 5x earnings, financing, APR, expiration). All marked `transfer_only` in facts.json.
5. Never imply government/military endorsement. Forbidden phrases live in `facts.json.global_forbidden_phrases`.
6. State call recording at the start of every interaction (Module 0 opener).
7. Zod-validate every external payload (Retell, Twilio, Supabase, Redis, LLMs, Cohere).
8. Verification pass runs on every high-risk route AND every full-RAG response. It is *skipped* for answer-card hits at risk_level low/medium for the p95 budget.
9. Custom-LLM responses stream over WebSocket via `/ws-server/index.ts` (Render subdomain). REST route at `/api/retell/custom-llm` is for Retell dashboard sim only.
10. No TODOs, no placeholders. If a file can't be completed, surface the blocker.

## Where things live
- `lib/config/` — env, constants, Retell config loader
- `lib/clients/` — typed wrappers around Anthropic, OpenAI, Cohere, Supabase, Redis, Twilio, Retell, Helicone
- `lib/retell/` — signature verification, request parsing, response formatting, event handler, call state
- `lib/engine/` — router, response engine, answer-card selector, specialist runner, fallback, interruption, response-budget
- `lib/rag/` — embeddings, chunker, hybrid search (RRF), Cohere rerank, evidence ledger, retrieval policy
- `lib/guardrails/` — numeric extractor, pricing-fact validator, forbidden-claim detector, verifier, PII redactor, safety policy, facts loader
- `lib/memory/` — Redis short-term, Supabase long-term, shared memory types
- `lib/transfer/` — context builder, whisper string, transfer client, fallback, policy
- `lib/observability/` — logger, latency events, eval logger
- `prompts/` — markdown system prompts (router, education, discovery, objection, pricing, escalation, verification, post-call, deflections, KB grounding)
- `content/facts/facts.json` — 25-entry authoritative fact registry
- `content/answer-cards/` — 25 pre-vetted answer cards
- `content/kb/` — markdown knowledge base for RAG
- `infra/retell/` — agent.json, llm.json, kb-sources.json (sync via `pnpm sync:retell-config`)
- `supabase/migrations/0001-0010` — schema
- `scripts/` — setup, seed, eval, telephony, ops
- `tests/` — adversarial-50, router-100, answer-cards-50, rag-50, jailbreaks, pii-probes, forbidden-numerics, barge-in, silence, prosodic, unit
- `ws-server/index.ts` — production custom-LLM WebSocket handler (Render)
- `app/dashboard/` — live ops dashboard (latency, transfers, verifications, recent calls)
- `app/transfer/[contextId]/` — specialist screen-pop page

## Day-by-day exit criteria
See `/docs/demo-runbook.md` and `/docs/disaster-recovery.md`. Build is complete only when all criteria in `/docs/verification-gates.md` pass.

## Master sources of truth
- `/docs/architecture.md`
- `/docs/retell-setup.md`
- `/docs/twilio-sip-setup.md`
- `/docs/supabase-setup.md`
- `/docs/vercel-deployment.md`
- `/docs/demo-runbook.md`
- `/docs/disaster-recovery.md`
- `/docs/infosec-response-pack.md`
- `/docs/phase-2-roadmap.md`
- The two master briefing PDFs in this conversation's history.
