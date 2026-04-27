-- 0010_indexes_and_rpc.sql — RPC for hybrid retrieval

create or replace function match_kb_chunks(
  query_embedding vector(1536),
  match_count int,
  brand_filter text
) returns table (
  id uuid,
  source_doc text,
  section text,
  body text,
  similarity float,
  allowed_claims jsonb,
  forbidden_extrapolations jsonb,
  metadata jsonb
) language sql stable as $$
  select
    kb_chunks.id,
    kb_chunks.source_doc,
    kb_chunks.section,
    kb_chunks.body,
    1 - (kb_chunks.embedding <=> query_embedding) as similarity,
    kb_chunks.allowed_claims,
    kb_chunks.forbidden_extrapolations,
    kb_chunks.metadata
  from kb_chunks
  where kb_chunks.brand = brand_filter
    and kb_chunks.approved = true
    and kb_chunks.retired_at is null
    and kb_chunks.embedding is not null
  order by kb_chunks.embedding <=> query_embedding
  limit match_count;
$$;

create or replace function search_kb_chunks_fulltext(
  query_text text,
  match_count int,
  brand_filter text
) returns table (
  id uuid,
  source_doc text,
  section text,
  body text,
  rank float,
  allowed_claims jsonb,
  forbidden_extrapolations jsonb,
  metadata jsonb
) language sql stable as $$
  select
    kb_chunks.id,
    kb_chunks.source_doc,
    kb_chunks.section,
    kb_chunks.body,
    ts_rank(kb_chunks.body_tsv, plainto_tsquery('english', query_text)) as rank,
    kb_chunks.allowed_claims,
    kb_chunks.forbidden_extrapolations,
    kb_chunks.metadata
  from kb_chunks
  where kb_chunks.brand = brand_filter
    and kb_chunks.approved = true
    and kb_chunks.retired_at is null
    and kb_chunks.body_tsv @@ plainto_tsquery('english', query_text)
  order by rank desc
  limit match_count;
$$;
