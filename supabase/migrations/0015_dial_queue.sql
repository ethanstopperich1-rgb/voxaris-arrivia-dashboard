-- 0015_dial_queue.sql
-- Outbound batch-dialing queue for Andie (and Deedy if needed later).
-- Cron job pulls oldest pending rows in batches, respects a live
-- concurrency cap, and dispatches AgentDispatch jobs through LiveKit.

create table if not exists dial_queue (
  id uuid primary key default gen_random_uuid(),
  agent_name text not null,                 -- 'andie-gvr' | 'deedy-vba'
  phone_number text not null,               -- E.164
  member_name text,                         -- caller_name / member_name
  metadata jsonb not null default '{}'::jsonb,
                                            -- incentive_amount, is_returning_caller,
                                            -- last_call_date, etc.
  status text not null default 'pending',   -- pending | dialing | completed
                                            -- | failed | dnc | skipped
  attempts int not null default 0,
  max_attempts int not null default 3,
  last_attempted_at timestamptz,
  last_error text,
  livekit_room_name text,                   -- set when dispatched
  dispatch_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists dial_queue_agent_status_idx
  on dial_queue(agent_name, status, created_at);
create index if not exists dial_queue_phone_idx on dial_queue(phone_number);
create index if not exists dial_queue_status_idx on dial_queue(status);

-- Audit log: every status transition (for the dashboard timeline + retries)
create table if not exists dial_queue_events (
  id bigserial primary key,
  queue_id uuid references dial_queue(id) on delete cascade,
  from_status text,
  to_status text,
  detail text,
  created_at timestamptz not null default now()
);
create index if not exists dial_queue_events_queue_idx
  on dial_queue_events(queue_id, created_at);
