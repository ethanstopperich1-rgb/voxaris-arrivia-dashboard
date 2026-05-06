-- 0018_rvm_cowboy.sql
-- RVM Cowboy: ringless voicemail product for cold-lead reactivation
-- Tables: leads, voice_clones, rvm_drops, rvm_compliance_audit, suppression_list,
--         generation_cache, rvm_script_templates, rvm_campaigns, rvm_daily_metrics

-- ─────────────────────────────────────────────
-- Shared lead database (all four Voxaris products)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leads (
    id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    livevox_contact_id          text UNIQUE,
    phone_e164                  text NOT NULL,
    first_name                  text,
    last_name                   text,
    email                       text,
    enrollment_date             date NOT NULL,
    last_transaction_date       date,
    lifetime_value              numeric DEFAULT 0,
    brand_affinity_score        numeric DEFAULT 0.5,
    attempt_count_in_period     int DEFAULT 0,
    recency_of_last_attempt_days int,
    response_history            jsonb DEFAULT '{}'::jsonb,
    last_outcome                text,

    -- Segmentation
    segment                     text NOT NULL DEFAULT 'cold'
                                    CHECK (segment IN ('hot', 'warm', 'cold')),
    product_assignment          text NOT NULL DEFAULT 'rvm_drop'
                                    CHECK (product_assignment IN (
                                        'andy_outbound', 'andy_inbound',
                                        'rvm_drop', 'hold', 'suppress'
                                    )),

    -- RVM-specific
    is_hand_raiser_from_rvm     boolean DEFAULT false,
    callback_number_assigned    text,   -- dedicated Twilio callback number for this lead's campaign

    -- Compliance gates
    dnc                         boolean DEFAULT false,
    tcpa_consent                boolean DEFAULT true,
    tcpa_consent_source         text,
    tcpa_consent_timestamp      timestamptz,

    -- Geography / carrier (for FL geofence + carrier A/B)
    state                       text,
    carrier                     text,

    -- Florida hard block: null state is treated as unknown, routed to hold
    -- Enforced at application layer; state IS NULL → product_assignment = 'hold'
    fl_geofence_cleared         boolean DEFAULT false,

    last_sync_at                timestamptz,
    created_at                  timestamptz DEFAULT now(),
    updated_at                  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leads_segment_product   ON leads (segment, product_assignment);
CREATE INDEX IF NOT EXISTS idx_leads_phone             ON leads (phone_e164);
CREATE INDEX IF NOT EXISTS idx_leads_state             ON leads (state);
CREATE INDEX IF NOT EXISTS idx_leads_tcpa_dnc          ON leads (tcpa_consent, dnc);
-- Block FL + unknown-state from RVM queue at query time
CREATE INDEX IF NOT EXISTS idx_leads_rvm_eligible      ON leads (segment, product_assignment, state)
    WHERE dnc = false AND tcpa_consent = true;

-- ─────────────────────────────────────────────
-- Voice clone registry (shared: Andy + DeeDee)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS voice_clones (
    id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name                    text NOT NULL,          -- 'Andy_v1'
    rime_clone_id           text NOT NULL,
    reference_audio_url     text,
    style_prompt_outbound   text,
    style_prompt_inbound    text,
    style_prompt_concierge  text,
    style_prompt_rvm        text,
    is_production           boolean DEFAULT false,
    voice_license_url       text,                   -- signed contract with voice talent
    license_expires_at      timestamptz,
    created_at              timestamptz DEFAULT now()
);

-- Only one production clone at a time
CREATE UNIQUE INDEX IF NOT EXISTS idx_voice_clones_production
    ON voice_clones (is_production)
    WHERE is_production = true;

-- ─────────────────────────────────────────────
-- RVM script templates (versioned, facts-driven)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rvm_script_templates (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    version         int NOT NULL,
    name            text NOT NULL,              -- 'credit_reminder_v1'
    body            text NOT NULL,              -- template with {first_name}, {enrollment_month_year}, etc.
    -- Dynamic variables resolved at render time from facts.json:
    --   {savings_credits_display} → facts.json savings_credits_display
    --   {first_name}              → lead.first_name
    --   {enrollment_month_year}   → lead.enrollment_date formatted
    --   {callback_number}         → lead.callback_number_assigned (spoken digit form)
    target_segment  text CHECK (target_segment IN ('hot', 'warm', 'cold')),
    target_duration_min_s numeric DEFAULT 18,
    target_duration_max_s numeric DEFAULT 35,
    is_active       boolean DEFAULT false,
    approved_by     text,
    approved_at     timestamptz,
    created_at      timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_rvm_templates_active
    ON rvm_script_templates (target_segment)
    WHERE is_active = true;

-- Seed active cold-lead template (body matches approved script; credits value via facts.json)
INSERT INTO rvm_script_templates (version, name, body, target_segment, is_active)
VALUES (
    1,
    'credit_reminder_v1',
    E'Hi {first_name}, this is Andy calling on behalf of Government Vacation Rewards.\n\n'
    'I''m reaching out because you have {savings_credits_display} in your account that are ready to use '
    '— and I just want to make sure you know how to access them.\n\n'
    'You enrolled back in {enrollment_month_year}, and these credits have been waiting for you ever since.\n\n'
    'We''d love to walk you through your benefits and help you put them to work on your next trip — '
    'just give us a call back at {callback_number}. Again, that''s {callback_number}.\n\n'
    'If you''d prefer not to hear from us, call that same number and we''ll get you removed right away.\n\n'
    'Talk soon, {first_name}.',
    'cold',
    true
);

-- ─────────────────────────────────────────────
-- RVM campaigns
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rvm_campaigns (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name                text NOT NULL,              -- 'GVR Cold Q2 Reactivation'
    client              text NOT NULL DEFAULT 'arrivia-gvr',
    script_template_id  uuid REFERENCES rvm_script_templates (id),
    voice_clone_id      uuid REFERENCES voice_clones (id),
    callback_number     text NOT NULL,              -- dedicated Twilio number for this campaign
    target_segment      text CHECK (target_segment IN ('hot', 'warm', 'cold')),
    offer_display       text,               -- campaign-specific credit display e.g. "$500 in travel savings credits"; null = use facts.json default
    daily_cap           int DEFAULT 2500,
    weekly_cap          int DEFAULT 10000,
    status              text NOT NULL DEFAULT 'draft'
                            CHECK (status IN ('draft', 'active', 'paused', 'complete')),
    pilot_week          int,                        -- 1-4 during pilot phase
    starts_at           timestamptz,
    ends_at             timestamptz,
    created_at          timestamptz DEFAULT now(),
    updated_at          timestamptz DEFAULT now()
);

-- ─────────────────────────────────────────────
-- RVM drop records
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rvm_drops (
    id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id                 uuid NOT NULL REFERENCES leads (id),
    campaign_id             uuid REFERENCES rvm_campaigns (id),
    drop_cowboy_id          text UNIQUE,
    audio_url               text NOT NULL,
    script_hash             text NOT NULL,
    script_template_version int NOT NULL,
    callback_number         text NOT NULL,
    scheduled_at            timestamptz,
    delivered_at            timestamptz,
    delivery_status         text NOT NULL DEFAULT 'pending'
                                CHECK (delivery_status IN (
                                    'pending', 'delivered', 'failed', 'rejected'
                                )),
    delivery_failure_reason text,
    callback_received_at    timestamptz,
    callback_call_sid       text,
    callback_call_id        uuid,                   -- FK to call_sessions once linked
    promoted_to_hot         boolean DEFAULT false,
    cost_usd                numeric,
    created_at              timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rvm_drops_lead        ON rvm_drops (lead_id);
CREATE INDEX IF NOT EXISTS idx_rvm_drops_campaign    ON rvm_drops (campaign_id);
CREATE INDEX IF NOT EXISTS idx_rvm_drops_status      ON rvm_drops (delivery_status);
CREATE INDEX IF NOT EXISTS idx_rvm_drops_callback    ON rvm_drops (callback_received_at)
    WHERE callback_received_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_rvm_drops_phone_lookup ON rvm_drops (callback_number, scheduled_at DESC);

-- ─────────────────────────────────────────────
-- Suppression list (real-time DNC + opt-outs)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS suppression_list (
    phone_e164      text PRIMARY KEY,
    reason          text NOT NULL
                        CHECK (reason IN (
                            'opt_out', 'dnc_federal', 'dnc_state',
                            'litigator', 'reassigned', 'manual'
                        )),
    source          text NOT NULL,
    suppressed_at   timestamptz DEFAULT now(),
    metadata        jsonb
);

CREATE INDEX IF NOT EXISTS idx_suppression_reason ON suppression_list (reason);

-- ─────────────────────────────────────────────
-- Generation cache (hash-keyed, 7-day TTL managed at app layer)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS generation_cache (
    script_hash     text PRIMARY KEY,
    audio_url       text NOT NULL,
    voice_clone_id  uuid REFERENCES voice_clones (id),
    rime_voice_id   text,
    duration_s      numeric,
    qc_passed       boolean,
    created_at      timestamptz DEFAULT now(),
    expires_at      timestamptz
);

CREATE INDEX IF NOT EXISTS idx_gen_cache_expires ON generation_cache (expires_at);

-- ─────────────────────────────────────────────
-- Compliance audit log (7-year retention required)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rvm_compliance_audit (
    id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    drop_id                 uuid REFERENCES rvm_drops (id),
    lead_id                 uuid NOT NULL REFERENCES leads (id),
    drop_timestamp          timestamptz NOT NULL,
    phone_e164              text NOT NULL,

    -- Consent provenance (litigation defense)
    consent_provenance      jsonb NOT NULL,
    -- {
    --   "source": "gvr_membership",
    --   "signup_date": "2024-03-15",
    --   "tc_version": "2026-04-10",
    --   "proof_url": "...",
    --   "consent_language": "artificial voice + prerecorded + autodialed"
    -- }

    -- DNC / compliance gate results
    dnc_check_result        jsonb NOT NULL,
    -- { "federal": "pass", "state_fl": "pass", "internal": "pass", "queried_at": "..." }

    rnd_result              jsonb,
    -- { "status": "valid"|"reassigned", "queried_at": "...", "billed": true }

    litigator_result        jsonb,
    -- { "realresolve": "clean", "blacklist_alliance": "clean" }

    -- Opt-out tracking
    opt_out_timestamp       timestamptz,
    opt_out_method          text CHECK (opt_out_method IN (
                                'callback', 'sms', 'email', 'web', null
                            )),
    suppression_applied     boolean DEFAULT false,
    suppression_propagated_at timestamptz,

    -- Generation fingerprint
    script_hash             text,
    audio_url               text,
    delivery_carrier_response jsonb,
    callback_received       boolean DEFAULT false,

    created_at              timestamptz DEFAULT now()
);

-- Partition hint: in production partition by month for retention management
CREATE INDEX IF NOT EXISTS idx_rvm_audit_phone         ON rvm_compliance_audit (phone_e164);
CREATE INDEX IF NOT EXISTS idx_rvm_audit_drop_ts       ON rvm_compliance_audit (drop_timestamp);
CREATE INDEX IF NOT EXISTS idx_rvm_audit_opt_out       ON rvm_compliance_audit (opt_out_timestamp)
    WHERE opt_out_timestamp IS NOT NULL;

-- ─────────────────────────────────────────────
-- Daily metrics rollup (cron job writes here nightly)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rvm_daily_metrics (
    date                    date PRIMARY KEY,
    drops_attempted         int DEFAULT 0,
    drops_delivered         int DEFAULT 0,
    drops_failed            int DEFAULT 0,
    callbacks_received      int DEFAULT 0,
    callbacks_qualified     int DEFAULT 0,
    callbacks_transferred   int DEFAULT 0,
    suppression_events      int DEFAULT 0,
    qc_fail_count           int DEFAULT 0,
    cache_hits              int DEFAULT 0,
    cost_generation_usd     numeric DEFAULT 0,
    cost_delivery_usd       numeric DEFAULT 0,
    cost_compliance_usd     numeric DEFAULT 0,
    cost_total_usd          numeric DEFAULT 0
);

-- ─────────────────────────────────────────────
-- updated_at triggers (leads, rvm_campaigns)
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER leads_updated_at
    BEFORE UPDATE ON leads
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER rvm_campaigns_updated_at
    BEFORE UPDATE ON rvm_campaigns
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────
-- Row-level security (enable; policies added per product)
-- ─────────────────────────────────────────────
ALTER TABLE leads                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_clones           ENABLE ROW LEVEL SECURITY;
ALTER TABLE rvm_script_templates   ENABLE ROW LEVEL SECURITY;
ALTER TABLE rvm_campaigns          ENABLE ROW LEVEL SECURITY;
ALTER TABLE rvm_drops              ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppression_list       ENABLE ROW LEVEL SECURITY;
ALTER TABLE generation_cache       ENABLE ROW LEVEL SECURITY;
ALTER TABLE rvm_compliance_audit   ENABLE ROW LEVEL SECURITY;
ALTER TABLE rvm_daily_metrics      ENABLE ROW LEVEL SECURITY;

-- Service-role bypass (backend only, no anon access)
CREATE POLICY leads_service_only               ON leads                USING (auth.role() = 'service_role');
CREATE POLICY voice_clones_service_only        ON voice_clones         USING (auth.role() = 'service_role');
CREATE POLICY rvm_templates_service_only       ON rvm_script_templates USING (auth.role() = 'service_role');
CREATE POLICY rvm_campaigns_service_only       ON rvm_campaigns        USING (auth.role() = 'service_role');
CREATE POLICY rvm_drops_service_only           ON rvm_drops            USING (auth.role() = 'service_role');
CREATE POLICY suppression_service_only         ON suppression_list     USING (auth.role() = 'service_role');
CREATE POLICY gen_cache_service_only           ON generation_cache     USING (auth.role() = 'service_role');
CREATE POLICY rvm_audit_service_only           ON rvm_compliance_audit USING (auth.role() = 'service_role');
CREATE POLICY rvm_metrics_service_only         ON rvm_daily_metrics    USING (auth.role() = 'service_role');
