-- 0006_transfer_contexts.sql — Hard Rule 3: SIP headers untrustworthy on PSTN; persist context here
create table if not exists transfer_contexts (
  id uuid primary key default gen_random_uuid(),
  call_session_id uuid not null references call_sessions(id) on delete cascade,
  retell_call_id text not null,
  caller_phone text not null,
  caller_name text,
  caller_state_code text,
  reason text not null,
  conversation_summary text not null,
  qualifying_data jsonb not null default '{}'::jsonb,
  evidence_ledger_ids jsonb not null default '[]'::jsonb,
  whisper_text text not null,
  three_way_message text not null,
  specialist_endpoint text not null,
  endpoint_kind text check (endpoint_kind in ('primary','backup','sip')) not null default 'primary',
  sms_sent_at timestamptz,
  sms_sid text,
  screen_pop_url text not null,
  picked_up_at timestamptz,
  bridged_at timestamptz,
  abandoned_at timestamptz,
  outcome text,                              -- bridged | failed_no_answer | failed_caller_hangup | callback_promised
  created_at timestamptz not null default now()
);
create index if not exists transfer_contexts_retell_idx on transfer_contexts(retell_call_id);
create index if not exists transfer_contexts_call_idx on transfer_contexts(call_session_id);
create index if not exists transfer_contexts_outcome_idx on transfer_contexts(outcome);
