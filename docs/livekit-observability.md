# LiveKit Observability — Wiring Guide

This page tells you how to point LiveKit Cloud and the Python workers at the
`arrivia-gvr` Vercel app so the dashboard at `/dashboard` lights up.

## 1. Apply the migration

```bash
cd /Users/voxaris/arrivia-gvr
supabase db push
```

Migration `0013_livekit_calls.sql` is additive — it adds nullable columns to
`call_sessions` and creates `tool_invocations` and `agent_events`.

## 2. Install the SDK and deploy

```bash
pnpm add livekit-server-sdk
git commit -am "feat(observability): livekit webhook + agent events"
git push   # Vercel auto-deploys
```

## 3. Vercel environment variables

The following must be present on the `arrivia-gvr` project (Production +
Preview):

| Variable | Where it comes from | Notes |
|---|---|---|
| `LIVEKIT_API_KEY` | LiveKit Cloud project settings | Used to verify webhook signatures |
| `LIVEKIT_API_SECRET` | LiveKit Cloud project settings | Same secret used by the Python workers |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project | Already set |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase project | Already set |
| `APP_API_KEY` | Project root `.env` | Already set; reused for `/api/agent/events` auth |

After updating, redeploy or run `vercel env pull && vercel deploy --prod`.

## 4. Configure the LiveKit Cloud webhook

LiveKit Cloud → Project (`voxaris-vba-ks6ggp0s`) → **Settings → Webhooks**:

- **URL**: `https://arrivia-gvr.vercel.app/api/webhooks/livekit`
- **Events**: `room_started`, `room_finished`, `participant_joined`,
  `participant_left` (others are accepted and audited but not required).
- **API Key**: same `LIVEKIT_API_KEY` you set in Vercel — LiveKit signs the
  webhook with the matching `LIVEKIT_API_SECRET`.

The receiver lives at `app/api/webhooks/livekit/route.ts` and uses
`WebhookReceiver` from `livekit-server-sdk` for signature verification.

## 5. Wire the Python workers to `/api/agent/events`

In `voxaris-vba`, the Deedy and Andie workers should POST every
`usage_update`, `turn_metrics`, `tool_invocation`, `escalation`, `shutdown`,
and `error` event to:

```
POST https://arrivia-gvr.vercel.app/api/agent/events
Content-Type: application/json
x-api-key: $APP_API_KEY

{
  "livekit_room_name": "<room.name>",
  "agent_name": "deedy-vba" | "andie-gvr",
  "event_type": "usage_update" | "turn_metrics" | "tool_invocation" | "escalation" | "shutdown" | "error",
  "payload": { ... }
}
```

Payload conventions the dashboard expects:

- **usage_update**: `{ llm_prompt_tokens, llm_completion_tokens, tts_characters, stt_audio_seconds }` — all deltas, accumulated server-side onto `call_sessions`.
- **turn_metrics**: `{ turn_total_ms, stt_ms, llm_ttft_ms, tts_ttfb_ms }` — `turn_total_ms` drives the latency card.
- **tool_invocation**: `{ tool_name, args, result, success, duration_ms }` — written into `tool_invocations`.
- **escalation** / **error**: include `{ stage: "stt" | "llm" | "tts" }` to count toward the Fallback panel.
- **shutdown**: `{ reason }` — mirrored to `call_sessions.shutdown_reason` and `ended_at`.

## 6. Verify the wiring

After a redeploy, dispatch a test agent into a fresh room:

```bash
lk dispatch create --agent-name deedy-vba --room test --metadata '{}'
```

Then confirm the event audit trail:

```sql
select id, event_type, livekit_room_name, agent_name, created_at
from agent_events
order by id desc
limit 5;
```

You should see at least a `room_started` row, optionally followed by
`participant_joined` rows once the agent joins. Open
`https://arrivia-gvr.vercel.app/dashboard` — the test room should appear in
**Recent calls** within ~1 second thanks to the Supabase Realtime refresh.

## 7. Tail logs while debugging

```bash
vercel logs arrivia-gvr --follow | grep livekit-webhook
```

Every webhook delivery prints `livekit-webhook event: <event> <room-name>`
before any DB write, so a missing line means the request never reached the
function (signature mismatch or wrong URL). A 401 means the `LIVEKIT_API_*`
pair on Vercel doesn't match the LiveKit Cloud project.
