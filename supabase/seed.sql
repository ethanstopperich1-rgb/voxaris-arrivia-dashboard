-- supabase/seed.sql — minimal local seed (most seeding happens via /scripts/seed/*)
-- Insert a placeholder call_session for dashboard smoke checks during local dev.
insert into call_sessions (retell_call_id, demo_mode, started_at, outcome)
values ('seed-call-001', true, now() - interval '1 hour', 'ended')
on conflict (retell_call_id) do nothing;
