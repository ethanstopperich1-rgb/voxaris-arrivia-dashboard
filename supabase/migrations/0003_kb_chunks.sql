-- 0003_kb_chunks.sql — RAG knowledge base, hybrid (BM25 + pgvector)
create table if not exists kb_chunks (
  id uuid primary key default gen_random_uuid(),
  brand text not null default 'GVR',
  source_doc text not null,
  source_commit text,
  section text not null,
  chunk_index int not null,
  body text not null,
  body_tsv tsvector generated always as (to_tsvector('english', body)) stored,
  embedding vector(1536),
  approved boolean not null default false,
  risk_class text not null default 'general',
  effective_date timestamptz not null default now(),
  retired_at timestamptz,
  allowed_claims jsonb not null default '[]'::jsonb,
  forbidden_extrapolations jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists kb_chunks_tsv_idx on kb_chunks using gin(body_tsv);
create index if not exists kb_chunks_brand_idx on kb_chunks(brand);
create index if not exists kb_chunks_approved_idx on kb_chunks(approved);
create index if not exists kb_chunks_embedding_idx on kb_chunks
  using hnsw (embedding vector_cosine_ops);
