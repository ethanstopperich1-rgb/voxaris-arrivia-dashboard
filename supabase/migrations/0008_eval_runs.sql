-- 0008_eval_runs.sql — Per-suite eval results for verification gates
create table if not exists eval_runs (
  id uuid primary key default gen_random_uuid(),
  suite text not null,                       -- router | rag | validator | verifier | adversarial | latency | transfer
  git_sha text,
  total int not null,
  passed int not null,
  failed int not null,
  pass_rate numeric not null,
  p50_ms int,
  p95_ms int,
  p99_ms int,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists eval_items (
  id bigserial primary key,
  run_id uuid not null references eval_runs(id) on delete cascade,
  case_id text not null,
  passed boolean not null,
  expected jsonb,
  actual jsonb,
  reason text,
  duration_ms int,
  created_at timestamptz not null default now()
);
create index if not exists eval_items_run_idx on eval_items(run_id);
create index if not exists eval_runs_suite_idx on eval_runs(suite, created_at desc);
