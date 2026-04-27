-- 0007_latency_events.sql — Per-stage timing for p50/p95/p99 dashboard
create table if not exists latency_events (
  id bigserial primary key,
  call_session_id uuid references call_sessions(id) on delete cascade,
  retell_call_id text,
  turn_index int,
  event text not null,                       -- see /lib/observability/latency.ts EVENTS
  duration_ms int,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists latency_events_event_idx on latency_events(event, created_at desc);
create index if not exists latency_events_call_idx on latency_events(call_session_id, turn_index);
create index if not exists latency_events_retell_idx on latency_events(retell_call_id);
