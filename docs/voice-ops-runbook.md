# Voice Ops Runbook

Operational reference for the LiveKit voice-agent dashboard (Deedy = Arrivia,
Andie = GVR). All paths below are routes on the `arrivia-gvr` Next.js app.

## Apply migration 0014

`supabase/migrations/0014_livekit_extras.sql` is additive (new columns +
`appointments`, `placements`, `placement_scans` tables). Apply with:

```bash
supabase db push                 # if using local-linked Supabase CLI
# or in the Supabase dashboard: SQL editor → paste file contents → run
```

Migration 0013 must be applied first.

## View a call recording

1. Open `/dashboard/calls`.
2. Filter by agent / outcome / date range if desired.
3. Click the row of the call you want.
4. The detail page (`/dashboard/calls/[room]`) renders an `<audio controls>`
   player when the worker has reported a `recording_url` via the
   `recording_started` event. The egress ID (LiveKit Egress) is shown below
   the player for cross-referencing in LiveKit Cloud.

If no player appears, the worker hasn't yet posted a `recording_started`
event for that room — check `agent_events` filtered by
`event_type = 'recording_started'`.

## Find a transcript

The same per-call page (`/dashboard/calls/[room]`) shows the full transcript
as alternating chat bubbles (when the format is `Agent: …` / `Caller: …`)
or a monospace block otherwise. Transcripts arrive on the `summary` event.

To pull a transcript programmatically:

```sql
select transcript
from call_sessions
where livekit_room_name = '<room>';
```

## Add a new placement

A placement is one physical location (pool deck, mall kiosk, sales-office
brochure, etc.) that has its own QR code and scan-attribution.

1. Open `/dashboard/placements`.
2. Click **+ New placement**.
3. Fill in:
   - **Slug** — lowercase, hyphenated (`westgate-lakes-pool`). Used in the
     QR URL — keep it short and human-readable.
   - **Name** — display label (`Westgate Lakes — Pool Bar`).
   - **Property** — full property name.
   - **Premium offer** — what the prospect gets if they tour
     (`complimentary three-night Orlando getaway`).
   - **Brand** — defaults to `ARRIVIA`.
   - **Landing URL** — where the QR scan ultimately redirects after the
     attribution log.
4. Save. The placement shows up in the table immediately.
5. Click **Download QR** to grab the 1024px PNG. The QR encodes
   `https://arrivia-gvr.vercel.app/api/scan/<slug>` so every scan is logged
   to `placement_scans` before redirecting.

To temporarily disable a placement, click its **active** chip in the table.

## Create a QR-attributed link

Every placement is automatically QR-attributed — there is no separate
"create link" step. The flow is:

1. Physical scan → `GET /api/scan/<slug>` (public, no auth).
2. Server hashes the IP (sha256), inserts into `placement_scans`, increments
   `placements.scan_count`.
3. 302 redirect to the placement's `qr_target_url` (or `https://arrivia.com/`
   if the slug is unknown).

If you need a clickable equivalent (e.g. for an SMS or email), use the same
URL as the QR encodes:

```
https://arrivia-gvr.vercel.app/api/scan/<slug>
```

## Read the calendar

`/dashboard/calendar` shows a month-grid of upcoming tour appointments for
the next 30 days. Each cell displays the count of bookings for that day.

- **Click a day** with bookings to open a side drawer listing every
  appointment with caller name, tour slot, property, and a link to the
  source call (`View call →`).
- Use the arrows / **Today** button to navigate months.
- Appointments come from the `appointments` table — populated by the
  `opc_book` tool fan-out (`appointment` event) or the
  `POST /api/appointments` fallback.

## How the worker posts telemetry

The Python LiveKit workers (`apps/agent` for Deedy, `apps/andie` for Andie)
POST every event to:

```
POST  https://<host>/api/agent/events
Header: x-api-key: $APP_API_KEY
Body:   {
  "livekit_room_name": "<room>",
  "agent_name": "deedy-vba" | "andie-gvr",
  "event_type": "<type>",
  "payload": { ... }
}
```

Supported `event_type` values:

| event_type          | side-effect                                                       |
| ------------------- | ----------------------------------------------------------------- |
| `usage_update`      | accumulate LLM/TTS/STT counters on `call_sessions`                |
| `turn_metrics`      | audit-only (read by latency cards)                                |
| `tool_invocation`   | insert into `tool_invocations`                                    |
| `escalation`        | bump `call_sessions.fallback_engaged.<stage>`                     |
| `error`             | bump `call_sessions.fallback_engaged.<stage>`                     |
| `shutdown`          | set `ended_at` + `shutdown_reason`                                |
| `summary`           | write `summary`, `summary_outcome`, optional `transcript`         |
| `appointment`       | insert into `appointments` (resolves `call_session_id` from room) |
| `recording_started` | write `recording_url` + `recording_egress_id`                     |

Every event is also recorded raw in `agent_events` for the audit trail.

The fallback path for appointment creation (when the worker can't reach the
events endpoint) is `POST /api/appointments` with the same x-api-key auth.
