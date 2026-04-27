-- 0002_call_sessions.sql
create table if not exists call_sessions (
  id uuid primary key default gen_random_uuid(),
  retell_call_id text unique,
  retell_agent_version text not null default 'v1.0',
  retell_llm_version text,
  twilio_call_sid text,
  caller_number_hash text,
  brand text not null default 'GVR',
  environment text not null default 'production',
  demo_mode boolean not null default true,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  outcome text,
  transfer_success boolean,
  transfer_context_id uuid,
  hallucination_blocks int not null default 0,
  verification_failures int not null default 0,
  answer_card_hits int not null default 0,
  full_rag_uses int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists call_sessions_started_at_idx on call_sessions(started_at desc);
create index if not exists call_sessions_outcome_idx on call_sessions(outcome);
