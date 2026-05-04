-- 0011_opc_compliance.sql — OPC compliance-by-design layer
-- Per multi-model legal council Apr 2026: SMS consent + scan attribution
-- + immutable consent audit log are the actual product moat.

-- 1) Bookings table — every successful opc_book call lands here
create table if not exists opc_bookings (
  id uuid primary key default gen_random_uuid(),
  retell_call_id text not null,
  confirmation_id text not null unique,
  caller_phone text not null,
  caller_name text,
  placement_name text not null,
  incentive text not null,
  property_name text not null,
  tour_slot text not null,
  sms_consent_captured boolean not null default false,
  sms_consent_phrase text,
  booking_source text not null default 'opc_voice_agent_v2',
  showed_up boolean,
  showed_up_recorded_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists opc_bookings_retell_call_idx on opc_bookings(retell_call_id);
create index if not exists opc_bookings_phone_idx on opc_bookings(caller_phone);
create index if not exists opc_bookings_placement_idx on opc_bookings(placement_name, created_at desc);

-- 2) Consent audit log — immutable, separate from bookings
-- Every SMS dispatch traces back to a row here. This is the table Arrivia
-- legal will ask to see during the audit. Never delete rows — append only.
create table if not exists opc_consent_log (
  id uuid primary key default gen_random_uuid(),
  retell_call_id text not null,
  phone text not null,
  consent_type text not null,
  consent_phrase text not null,
  captured_via text not null,
  booking_id uuid references opc_bookings(id) on delete set null,
  recorded_at timestamptz not null default now()
);
create index if not exists opc_consent_phone_idx on opc_consent_log(phone);
create index if not exists opc_consent_call_idx on opc_consent_log(retell_call_id);

-- 3) Scan attribution — server-side log of every QR scan, even if the
-- guest never completes the call. Backbone for funnel analytics +
-- redundant attribution layer when DTMF-in-tel: fails.
create table if not exists opc_scans (
  id uuid primary key default gen_random_uuid(),
  scan_token text not null unique,
  placement_id text not null,
  placement_name text,
  property_id text,
  property_name text,
  user_agent text,
  ip_hash text,
  referrer text,
  scanned_at timestamptz not null default now(),
  call_started_at timestamptz,
  call_id text,
  call_outcome text
);
create index if not exists opc_scans_placement_idx on opc_scans(placement_id, scanned_at desc);
create index if not exists opc_scans_token_idx on opc_scans(scan_token);

-- 4) Placement registry — one row per QR placement
create table if not exists opc_placements (
  id text primary key,
  property_id text not null,
  property_name text not null,
  location_name text not null,
  opener_hook text not null,
  incentive text not null default 'two complimentary 2-day Disney park hopper tickets',
  qualification_path text not null default 'standard_v2',
  agent_id text,
  flow_id text,
  status text not null default 'active' check (status in ('active', 'paused', 'retired')),
  qr_destination_url text not null,
  dtmf_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists opc_placements_property_idx on opc_placements(property_id, status);

-- 5) DNC list — phone numbers that have requested no further contact
create table if not exists opc_dnc (
  phone text primary key,
  reason text not null default 'guest_request',
  requested_via text not null,
  recorded_at timestamptz not null default now(),
  notes text
);
