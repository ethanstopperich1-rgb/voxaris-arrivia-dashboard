-- 0012_opc_welcome_team.sql — Welcome-team handoff notifications
-- When opc_book succeeds, the resort welcome team needs to be notified.
-- This table is the dashboard backbone — every notification attempt
-- (SMS, email, etc.) writes a row here, success or failure.

create table if not exists opc_welcome_team_notifications (
  id uuid primary key default gen_random_uuid(),
  confirmation_id text not null,
  booking_id uuid references opc_bookings(id) on delete set null,
  caller_name text,
  caller_phone text not null,
  property_name text not null,
  placement_name text not null,
  tour_slot text not null,
  incentive text not null,
  sms_consent_captured boolean not null default false,
  sms_to_team_sid text,
  sms_to_team_ok boolean not null default false,
  sms_to_team_error text,
  email_to_team_ok boolean not null default false,
  email_to_team_error text,
  acknowledged_by text,
  acknowledged_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists opc_welcome_team_conf_idx
  on opc_welcome_team_notifications(confirmation_id);
create index if not exists opc_welcome_team_booking_idx
  on opc_welcome_team_notifications(booking_id);
create index if not exists opc_welcome_team_recent_idx
  on opc_welcome_team_notifications(created_at desc);
create index if not exists opc_welcome_team_unack_idx
  on opc_welcome_team_notifications(acknowledged_at)
  where acknowledged_at is null;
