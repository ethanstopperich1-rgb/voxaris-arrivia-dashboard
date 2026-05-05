-- 0017_call_sessions_unique_room_name.sql
-- Add the UNIQUE constraint that the LiveKit webhook handler + agent
-- telemetry routes require for ON CONFLICT (livekit_room_name) upserts.
--
-- Symptom that surfaced this: every room_started webhook from LK was
-- being logged into agent_events successfully but the parallel
-- handleRoomStarted() upsert into call_sessions was failing with
-- PostgreSQL 42P10 ("no unique or exclusion constraint matching the
-- ON CONFLICT specification") — silently because the route catches
-- and logs, and LK retries kept things looking like just transient
-- noise. Result: call_sessions stayed empty, dashboards showed
-- nothing for any real call.
--
-- Cleanup before constraint:
-- 1. DELETE any orphan rows where livekit_room_name IS NULL (legacy
--    Retell rows that pre-date the LK migration). Those can never
--    match the new constraint anyway.
-- 2. DEDUPE any rows that share a livekit_room_name (keep the first
--    by id, drop the rest).

-- 1. Drop legacy NULL-room rows that were never tied to an LK session.
delete from call_sessions
where livekit_room_name is null;

-- 2. Dedupe — keep one row per livekit_room_name (oldest by id).
delete from call_sessions a
using call_sessions b
where a.livekit_room_name = b.livekit_room_name
  and a.id > b.id;

-- 3. Add the unique constraint the upsert path expects.
alter table call_sessions
  add constraint call_sessions_livekit_room_name_key
  unique (livekit_room_name);
