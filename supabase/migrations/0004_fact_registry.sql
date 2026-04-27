-- 0004_fact_registry.sql — Authoritative facts mirrored from content/facts/facts.json
create table if not exists fact_registry (
  id text primary key,                       -- e.g. FACT-TSD-DEFINITION-001
  brand text not null default 'GVR',
  scope text not null,                       -- product | pricing | compliance | process | brand
  category text not null,
  canonical text not null,                   -- the single sentence the agent may say
  allowed_phrases jsonb not null default '[]'::jsonb,
  forbidden_phrases jsonb not null default '[]'::jsonb,
  numeric_values jsonb not null default '[]'::jsonb,
  transfer_only boolean not null default false,
  risk_class text not null default 'medium',
  source text not null,
  last_verified date,
  note text,
  retired_at timestamptz,
  updated_at timestamptz not null default now()
);
create index if not exists fact_registry_scope_idx on fact_registry(scope);
create index if not exists fact_registry_transfer_only_idx on fact_registry(transfer_only);
