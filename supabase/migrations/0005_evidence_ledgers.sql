-- 0005_evidence_ledgers.sql — Per-turn provenance for every claim sent to TTS
create table if not exists evidence_ledgers (
  id uuid primary key default gen_random_uuid(),
  call_session_id uuid not null references call_sessions(id) on delete cascade,
  turn_index int not null,
  user_question text,
  route_intent text,
  risk_level text,
  response_source text,                      -- answer_card | rag | specialist | deflect | transfer
  answer_card_id text,
  chunks jsonb not null default '[]'::jsonb, -- [{id, text, source_doc, similarity, rerank_score, allowed_claims, forbidden_extrapolations}]
  facts_used jsonb not null default '[]'::jsonb,
  agent_draft text,
  agent_final text,
  unsupported_claims jsonb not null default '[]'::jsonb,
  validator_status text,                     -- passed | blocked
  verifier_verdict text,                     -- APPROVE | REWRITE | DEFLECT | TRANSFER
  verifier_reason text,
  rewrite_count int not null default 0,
  created_at timestamptz not null default now(),
  unique (call_session_id, turn_index)
);
create index if not exists evidence_ledgers_call_idx on evidence_ledgers(call_session_id, turn_index);
create index if not exists evidence_ledgers_verdict_idx on evidence_ledgers(verifier_verdict);
