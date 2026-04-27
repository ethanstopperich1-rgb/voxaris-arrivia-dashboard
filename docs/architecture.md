# Architecture

```
              ┌─────────────────┐
   Caller ──► │  Twilio SIP DID │
              └────────┬────────┘
                       ▼
              ┌─────────────────┐  webhook events  ┌─────────────────────┐
              │      Retell AI  ├─────────────────►│  Next.js (Vercel)   │
              │  (Deepgram STT, │  custom-LLM WS   │  /api/retell/events │
              │   ElevenLabs    │◄─────────────────┤  /api/tools/*       │
              │   Turbo TTS)    │                  │  /api/metrics/*     │
              └────────┬────────┘                  │  /dashboard         │
                       │                           └──────────┬──────────┘
                       ▼                                      │
              ┌─────────────────┐                             ▼
              │  ws-server      │   Anthropic / OpenAI / Cohere
              │  (Render Node)  │   ────► routes through Helicone
              │  responseEngine │
              └─────────────────┘
                       │
                       ▼
                ┌──────────────┐
                │   Supabase   │  call_sessions · evidence_ledgers
                │   Postgres   │  transfer_contexts · latency_events
                │  + pgvector  │  kb_chunks · fact_registry · answer_cards
                └──────────────┘
                       │
                ┌──────────────┐
                │ Upstash Redis│  per-call short-term memory (TTL 2h)
                └──────────────┘
```

## Request flow (one user turn)

```
Retell WS frame  ─►  responseEngine()
                       │
                       ├─ Router (Haiku) ────────► RouterResult
                       │
                       ├─ Hard transfer? ────► escalation script + create_transfer_context tool call
                       │
                       ├─ Answer-card lane ──► validator → (verifier?) → APPROVE / fallback
                       │
                       └─ Full RAG lane ─────► hybridSearch (BM25+vec RRF, top 20)
                                              → Cohere rerank top 6
                                              → specialist (GPT-4o or Haiku)
                                              → validator
                                              → verifier
                                              → APPROVE / REWRITE / DEFLECT / TRANSFER
```

## Persistence
- Every turn: `evidence_ledgers` row + `latency_events` rows + `recent_turns` push to Redis.
- Every transfer: `transfer_contexts` row + SMS screen-pop URL.
- Every call: `call_sessions` row.
- Every eval: `eval_runs` + `eval_items`.
