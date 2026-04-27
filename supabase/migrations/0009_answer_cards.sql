-- 0009_answer_cards.sql — 25 pre-vetted answer cards (loaded from /content/answer-cards/*.json)
create table if not exists answer_cards (
  id text primary key,                       -- e.g. travel_savings_dollars_core
  brand text not null default 'GVR',
  intent text not null,
  triggers jsonb not null default '[]'::jsonb,
  response_text text not null,
  fact_ids jsonb not null default '[]'::jsonb,
  risk_class text not null default 'medium', -- low | medium | high | high_fact | high_policy | pii | legal_financial | jailbreak
  requires_verifier boolean not null default false,
  next_action text,                          -- continue | offer_transfer | transfer | end_call
  embedding vector(1536),
  approved boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create index if not exists answer_cards_intent_idx on answer_cards(intent);
create index if not exists answer_cards_embedding_idx on answer_cards
  using hnsw (embedding vector_cosine_ops);
