-- 0014_livekit_extras.sql
-- Additive extras for LiveKit voice-agent dashboard:
--   * recording / transcript / summary columns on call_sessions
--   * appointments table (booked tour slots from opc_book + future flows)
--   * placements + placement_scans (per-location QR attribution)
--
-- Additive only. Safe to apply alongside existing 0013 schema.

-- ─────────────────────────────────────────────────────────────────────────────
-- Per-call extras
-- ─────────────────────────────────────────────────────────────────────────────
alter table call_sessions
  add column if not exists recording_url text,
  add column if not exists recording_egress_id text,
  add column if not exists transcript text,
  add column if not exists summary text,
  add column if not exists summary_outcome text,           -- e.g. "booked" / "no-show-risk" / "transferred" / "scheduler-link" / "not-interested"
  add column if not exists caller_name text,
  add column if not exists placement_slug text;

create index if not exists call_sessions_summary_outcome_idx
  on call_sessions(summary_outcome);
create index if not exists call_sessions_placement_idx
  on call_sessions(placement_slug);

-- ─────────────────────────────────────────────────────────────────────────────
-- Appointments produced by opc_book tool invocations + future booking flows
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists appointments (
  id uuid primary key default gen_random_uuid(),
  call_session_id uuid references call_sessions(id) on delete set null,
  livekit_room_name text,
  agent_name text,
  caller_name text,
  caller_phone text,
  property_name text,
  placement_slug text,
  tour_slot text,                                          -- human-readable, e.g. "Wed Aug 14 10:30 AM"
  tour_at timestamptz,                                     -- parsed normalized timestamp (best-effort, nullable)
  on_property boolean,
  deposit_path text,                                       -- "folio" or "team_followup"
  confirmation_id text,
  status text default 'booked',                            -- booked | cancelled | no_show | completed
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists appointments_tour_at_idx on appointments(tour_at);
create index if not exists appointments_status_idx on appointments(status);
create index if not exists appointments_call_idx on appointments(call_session_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Placements: per-location QR + attribution
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists placements (
  slug text primary key,                                   -- e.g. "westgate-lakes-pool", "moncton-mall-kiosk"
  name text not null,
  property_name text,                                      -- "Westgate Lakes Resort & Spa"
  premium_offer text,                                      -- "complimentary three-night Orlando getaway"
  brand text default 'ARRIVIA',
  qr_target_url text,                                      -- absolute URL the QR encodes
  scan_count int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists placement_scans (
  id bigserial primary key,
  placement_slug text references placements(slug) on delete cascade,
  scanned_at timestamptz not null default now(),
  user_agent text,
  ip_hash text,                                            -- sha256 of remote IP, no raw IP
  referrer text
);
create index if not exists placement_scans_slug_idx on placement_scans(placement_slug, scanned_at desc);
