# Supabase Setup

## Project
Create a Supabase project (region: `us-west-2` to be near Vercel's IAD/SFO regions and Retell US infra).

## Migrations
Apply in order via Supabase CLI or the SQL editor:

```bash
supabase db push      # if using local dev
# or paste each file from /supabase/migrations/ into the SQL editor
```

Files:
- `0001_extensions.sql` — vector, pgcrypto, pg_trgm
- `0002_call_sessions.sql`
- `0003_kb_chunks.sql` — HNSW vector index + tsvector full-text
- `0004_fact_registry.sql`
- `0005_evidence_ledgers.sql`
- `0006_transfer_contexts.sql`
- `0007_latency_events.sql`
- `0008_eval_runs.sql`
- `0009_answer_cards.sql`
- `0010_indexes_and_rpc.sql` — `match_kb_chunks`, `search_kb_chunks_fulltext`

## Seed
```bash
pnpm seed:facts        # writes 25 entries to fact_registry
pnpm seed:cards        # writes 25 entries to answer_cards
pnpm ingest:kb         # chunks /content/kb/**/*.md into kb_chunks
pnpm embed:kb          # populates the embedding column for null rows
```

## RLS
Demo runs with the service role key from server-side only (see `lib/clients/supabase-admin.ts`). The public `anon` key is used solely for read access to the dashboard at `/dashboard`, which is gated by Basic Auth in `middleware.ts`.

For production, enable RLS on every table and write policies that restrict reads to authenticated dashboard users only.
