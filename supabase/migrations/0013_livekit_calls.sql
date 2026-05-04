-- 0013_livekit_calls.sql
-- LiveKit Cloud voice-agent observability schema.
-- Additive only: every column on call_sessions is nullable, every retell_*
-- column stays untouched. The dashboard reads these alongside the existing
-- Retell columns until Retell is fully decommissioned.

alter table call_sessions
  add column if not exists livekit_room_name text,
  add column if not exists livekit_session_id text,
  add column if not exists agent_name text,
  add column if not exists direction text,
  add column if not exists sip_caller_number text,
  add column if not exists sip_callee_number text,
  add column if not exists llm_prompt_tokens bigint default 0,
  add column if not exists llm_completion_tokens bigint default 0,
  add column if not exists tts_characters bigint default 0,
  add column if not exists stt_audio_seconds numeric default 0,
  add column if not exists fallback_engaged jsonb default '{}'::jsonb,
  add column if not exists shutdown_reason text;

create unique index if not exists call_sessions_livekit_room_idx
  on call_sessions(livekit_room_name)
  where livekit_room_name is not null;

create index if not exists call_sessions_agent_name_idx
  on call_sessions(agent_name);

-- Per-tool invocation log. Driven by the Python workers' tool decorators.
create table if not exists tool_invocations (
  id bigserial primary key,
  call_session_id uuid references call_sessions(id) on delete cascade,
  livekit_room_name text,
  agent_name text,
  tool_name text not null,
  args jsonb default '{}'::jsonb,
  result jsonb default '{}'::jsonb,
  success boolean,
  duration_ms int,
  created_at timestamptz not null default now()
);
create index if not exists tool_invocations_call_idx
  on tool_invocations(call_session_id);
create index if not exists tool_invocations_tool_idx
  on tool_invocations(tool_name, created_at desc);

-- Raw audit log for every event the workers and webhook receiver emit.
create table if not exists agent_events (
  id bigserial primary key,
  livekit_room_name text,
  agent_name text,
  event_type text not null,                 -- usage_update | turn_metrics | tool_invocation | escalation | shutdown | error | room_started | room_finished | participant_joined | participant_left
  payload jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists agent_events_room_idx
  on agent_events(livekit_room_name, created_at desc);
create index if not exists agent_events_type_idx
  on agent_events(event_type, created_at desc);
