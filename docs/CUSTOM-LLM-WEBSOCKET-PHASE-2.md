# Custom LLM (WebSocket) — Phase 2 Architecture

**Why:** Per the Retell deep-dive, this is the path to:
- Drop blended cost from $0.10–$0.12/min → **$0.09–$0.11/min** (max margin)
- Run **Haiku primary + Sonnet verifier** in our own process
- Own the conversation transcript end-to-end
- Add a **pre-TTS pricing-fact validator** that Retell-hosted LLM can't do
- Multi-provider fallback (Anthropic → OpenAI on outage)

**When:** Phase 2, post-ARDA. Not blocking the May 13 demo.

---

## Architecture (one-pager)

```
┌──────────────┐                    ┌─────────────────────┐
│   Caller     │                    │  Voxaris Orchestr.  │
│              │                    │  (Render or Fly.io) │
│ +14072890294 │                    │                     │
└──────┬───────┘                    │  Haiku → Validator  │
       │                            │  → Sonnet Verifier  │
       │ PSTN                       │  → Tools / RAG      │
       ▼                            └──────────┬──────────┘
┌──────────────┐                               │ wss://
│  Twilio BYOC │                               │
└──────┬───────┘                               │
       │ SIP                                   │
       ▼                                       │
┌──────────────────────────────────────────────┴──┐
│                 Retell                           │
│  ASR (Deepgram) · turn-taking · TTS (ElevenLabs) │
│                                                  │
│  Conversation Flow nodes call out via WS for the │
│  "Talk" nodes. Other nodes (transfer, end)       │
│  remain Retell-native.                           │
└──────────────────────────────────────────────────┘
```

## Why hybrid (Conversation Flow + Custom LLM)

The deep-dive's recommended pattern: keep Retell's visual guardrails, swap only the brain on the "Talk" nodes.

- **Branch nodes, Transfer nodes, End nodes** — stay Retell-native.
  They're deterministic and need no LLM call.
- **Talk (conversation) nodes** — point each one's `model_choice.type` to `custom-llm-websocket` with our endpoint URL.
  Retell streams the transcript context to us; we stream back the response.

## Endpoint contract (Retell custom-LLM WebSocket protocol)

Our orchestrator exposes one WebSocket endpoint:

```
wss://gvr-orchestrator.voxaris.io/retell/custom-llm-ws?token=<shared_secret>
```

### Inbound frame from Retell (per turn)

```json
{
  "interaction_type": "response_required",
  "response_id": 1,
  "transcript": [
    { "role": "agent", "content": "Hi, this is Andie..." },
    { "role": "user",  "content": "What are travel savings dollars?" }
  ],
  "call": {
    "call_id": "call_xxxx",
    "from_number": "+1...",
    "to_number": "+14072890294",
    "direction": "inbound",
    "agent_id": "agent_963d5a2f8d284889bf225e8d5a",
    "retell_llm_dynamic_variables": {
      "member_name": "Stacey",
      "incentive_amount": "$250"
    }
  }
}
```

### Streaming response back to Retell

Stream chunks as the LLM produces them; final chunk has `content_complete: true`:

```json
{ "response_id": 1, "content": "Travel savings dollars are", "content_complete": false }
{ "response_id": 1, "content": " promotional credits applied at booking",  "content_complete": false }
{ "response_id": 1, "content": "...", "content_complete": true, "end_call": false, "tool_calls": [] }
```

### Other inbound frames

- `update_only` — live transcript update mid-turn. We listen, don't respond.
- `ping_pong` — keepalive every 2s. Echo it back.

## Our orchestrator pipeline (per turn)

```
WS frame received
  ▼
1. PII redact for logs
  ▼
2. Router classifier (Haiku, 96 tok, temp 0)
   → intent + risk_class + suggested next action
  ▼
3. Hard transfer? (pricing / account / PII / jailbreak)
   ─Yes─► Stream deflection + emit transfer tool_call ─► END
   ─No─┐
       ▼
4. Answer-card lookup (in-memory, 25 cards)
   ─Hit ≥ 0.88 confidence─► validator → (verifier?) → STREAM ─► END
   ─Miss─┐
         ▼
5. Full RAG (BM25 + pgvector RRF + Cohere rerank top 6)
   ▼
6. Specialist LLM (GPT-4o or Haiku, scoped prompt)
   ▼
7. Pricing-fact validator (regex + word-number expansion)
   ─Blocked─► rewrite once ─► re-validate
   ─Passed─┐
           ▼
8. Verification pass (Haiku, 160 tok, temp 0)
   APPROVE ─► STREAM
   REWRITE ─► one rewrite, re-validate, then STREAM
   DEFLECT ─► graceful deflection card
   TRANSFER ─► emit transfer tool_call
```

We already have the engine code in `lib/engine/response-engine.ts`. Phase 2 work is wiring it to Retell's WS protocol.

## Implementation plan (5 days)

### Day 1 — WS server scaffold + auth
- Spin up Render Web Service (or Fly.io) running our existing `ws-server/index.ts`.
- Confirm shared-secret query-string token works.
- Health check: `GET /` returns `gvr-retell-ws ok`.
- Add the URL + token to `.env.local` and Vercel.

### Day 2 — Migrate Conversation Flow Talk nodes to Custom LLM
- For each Talk node in both flows, set `model_choice.type = "custom-llm-websocket"` with our endpoint URL.
- Branch / Transfer / End nodes stay native.
- Test in Retell simulator.

### Day 3 — Wire validator + verifier into the live engine
- Already implemented in `lib/guardrails/`.
- Smoke-test: dial the agent, ask for pricing, confirm validator blocks the response before TTS.
- Add Helicone tracing.

### Day 4 — Multi-provider fallback
- Anthropic 5xx → fallback to OpenAI gpt-4o.
- OpenAI 5xx → graceful deflection card.
- Test with manual provider 5xx injection.

### Day 5 — Latency tuning + observability
- Target: `<800ms p95` total (Custom LLM adds ~50–150ms vs Retell-hosted).
- Target: `<450ms p95` for verifier alone.
- Wire latency events to Supabase `latency_events` table (already exists).
- Dashboard panel for per-stage p50/p95/p99.

## Cost model (Phase 2)

| Component | Rate | 120k min/mo |
|---|---|---|
| Retell voice engine | $0.07/min | $8,400 |
| Twilio BYOC | $0.013/min | $1,560 |
| ElevenLabs Turbo | $0.07/min (passed thru by Retell, but if direct: $0.06) | $7,200 |
| Anthropic Haiku (router + verifier) | ~$0.005/min direct | $600 |
| Anthropic Sonnet (specialist on RAG hits) | ~$0.025/min × 30% of turns | $900 |
| Supabase + Upstash | flat | $25 |
| **Total** | **~$0.09–0.11/min** | **~$11k–13k** |

vs current `~$0.10–$0.12/min` = ~$300–500/mo savings + full validator + verifier control.

## Risks

| Risk | Mitigation |
|---|---|
| WS endpoint downtime | Multi-region Render deploy + Retell auto-fallback voice script |
| Latency floor higher than Retell-hosted | Aggressive prompt caching (Anthropic prompt cache); pre-warm connections; co-locate orchestrator with Anthropic in us-east-1 |
| Anthropic outage | OpenAI fallback in orchestrator |
| Validator false positives | Logged + dashboard'd; manual review weekly during pilot |

## What's already built (don't redo)

- `lib/engine/response-engine.ts` — full two-lane engine
- `lib/engine/router.ts` — Haiku classifier
- `lib/guardrails/pricing-fact-validator.ts` — regex + word-number extraction
- `lib/guardrails/verifier.ts` — Haiku verification pass
- `lib/rag/hybrid-search.ts` — BM25 + pgvector RRF
- `lib/rag/rerank.ts` — Cohere rerank top 6
- `ws-server/index.ts` — WebSocket handler skeleton with shared-secret auth
- All Zod schemas for Retell's WS protocol

The Phase 2 work is **deployment + wiring**, not net-new development.
