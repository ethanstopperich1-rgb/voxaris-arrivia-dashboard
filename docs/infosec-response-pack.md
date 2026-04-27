# InfoSec Response Pack

## Subprocessors (9)
1. Retell AI (voice runtime)
2. Twilio (PSTN, SMS)
3. Deepgram (STT)
4. ElevenLabs (TTS) + Cartesia (TTS fallback)
5. Anthropic (LLM)
6. OpenAI (LLM + embeddings)
7. Cohere (rerank)
8. Supabase (Postgres)
9. Upstash (Redis)

Vercel and Render are infra hosts; Helicone is optional observability.

## Data residency
All US-region data centers. Supabase project pinned to `us-west-2`. Upstash to `us-east-1`. Retell + Twilio US infrastructure.

## PII handling
- The voice agent does **not** collect or store raw PII (SSN, credit card, full DOB, member ID).
- `lib/guardrails/pii-redactor.ts` strips PII from logs.
- Retell `data_storage_setting: everything_except_pii`, `data_storage_retention_days: 90`.
- Caller phone numbers stored as SHA-256 hashes in `call_sessions.caller_number_hash`. Raw phone is held only in Redis short-term memory (TTL 2h).

## Authentication
- Service role key for Supabase server-side only.
- All `/api/tools/*` routes require `x-api-key` header matching `APP_API_KEY`.
- All `/api/retell/events` calls verify HMAC-SHA256 signature with `RETELL_WEBHOOK_SECRET`.
- `/dashboard` gated by Basic Auth (`DASHBOARD_BASIC_AUTH_*`).

## SOC 2 posture
- Vercel: SOC 2 Type II.
- Supabase: SOC 2 Type II.
- Upstash: SOC 2 Type II.
- Anthropic / OpenAI / Cohere / Retell / Twilio / Deepgram: enterprise SOC 2 available on request.

## Incident response
- Slack channel `#voxaris-gvr-incident` paged on 5xx spikes via Vercel monitoring.
- Kill switch (`pnpm ops:kill`) tested in staging; documented in `/docs/disaster-recovery.md`.
- Post-incident: write-up within 48h with timeline, root cause, mitigations.
