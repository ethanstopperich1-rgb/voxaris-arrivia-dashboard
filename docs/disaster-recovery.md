# Disaster Recovery

## Kill switch
```bash
pnpm ops:kill          # mutes agent in <10s
pnpm ops:rollback --version=v1.0   # restore frozen demo
```

## Vendor outage matrix
| Vendor       | Detection                      | Mitigation |
|--------------|--------------------------------|------------|
| Retell       | webhook stops, /api/health 503 | DID fallback to `RETELL_OUTAGE_FALLBACK_NUMBER` (Twilio voicemail or human). |
| Twilio SIP   | calls don't connect            | Use Retell-hosted phone number for the demo window. |
| Anthropic    | 5xx on router/verifier         | Fallback heuristic in `lib/engine/router.ts`; verifier returns DEFLECT on error → graceful deflection. |
| OpenAI       | 5xx on specialist              | `responseEngine` returns deflection when `draft === ""`. |
| Cohere       | rerank timeout                 | Falls back to RRF top 6 (see `lib/rag/rerank.ts`). |
| Supabase     | DB down                        | `latency_events` writes fail silently (logger.warn). Engine still produces a response — just no telemetry. |
| Upstash      | Redis down                     | `getCallMemory` returns null → engine treats as fresh turn. No crash. |
| ElevenLabs   | choppy / 5xx                   | Retell auto-falls-back to Cartesia Sonic-3 via `fallback_voice_ids`. |
| Helicone     | proxy down                     | Clients work without it; Helicone is observability-only. |
| Vercel       | platform down                  | WebSocket still alive on Render — only webhook + dashboard + tools affected. Specialist-direct transfer works regardless. |

## Data retention
- `latency_events` ≥ 30 days deleted by `/api/cron/cleanup`.
- `call_sessions`, `evidence_ledgers`, `transfer_contexts` retained indefinitely (90 days for demo phase, then anonymize).
- Retell `data_storage_retention_days: 90`.
