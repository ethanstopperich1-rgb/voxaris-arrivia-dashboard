-- 0019_inbound_callbacks.sql
-- Tracks inbound callbacks from members who saw a missed call from
-- our outbound footprint and dialed back. Russell flagged on the
-- discovery call that ~50% of Arrivia's inbound traces back to
-- outbound — this table is how we measure that lift in real time
-- and tune Andie's voicemail strategy against it.
--
-- Written by /api/twilio/callback-forward on every callback. The
-- caller is forwarded to INBOUND_SALES_NUMBER at the carrier level
-- (no agent involvement, zero per-min agent cost).

CREATE TABLE IF NOT EXISTS inbound_callbacks (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    caller_phone        text NOT NULL,           -- E.164 of the person calling back
    called_number       text NOT NULL,           -- our outbound caller-ID number they dialed
    twilio_call_sid     text UNIQUE NOT NULL,    -- Twilio's call ID for debugging / dedup
    forwarded_to        text NOT NULL,           -- INBOUND_SALES_NUMBER at the time of the call
    received_at         timestamptz NOT NULL DEFAULT now(),

    -- Optional enrichment (populated later by a join job that matches
    -- the caller_phone against recent rvm_drops or dial_queue entries)
    matched_rvm_drop_id uuid,                    -- if this callback matches a recent VM drop
    matched_lead_id     uuid,                    -- if matched to a known lead in our system
    seconds_since_outbound_touch int,            -- how fresh the outbound footprint was

    created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inbound_callbacks_caller_phone
    ON inbound_callbacks (caller_phone);
CREATE INDEX IF NOT EXISTS idx_inbound_callbacks_received_at
    ON inbound_callbacks (received_at DESC);
CREATE INDEX IF NOT EXISTS idx_inbound_callbacks_called_number
    ON inbound_callbacks (called_number);

-- RLS — service-role only (the Twilio webhook writes; the dashboard
-- reads via supabaseAdmin server actions, never client-side).
ALTER TABLE inbound_callbacks ENABLE ROW LEVEL SECURITY;

CREATE POLICY inbound_callbacks_service_only
    ON inbound_callbacks USING (auth.role() = 'service_role');

COMMENT ON TABLE inbound_callbacks IS
    'Inbound callbacks to our outbound caller-ID, forwarded at carrier level. Used to measure the 50% inbound-lift Arrivia sees from outbound footprint.';
