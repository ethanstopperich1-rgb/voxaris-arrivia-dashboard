-- 0016_dial_queue_scoring.sql
-- AI-driven lead scoring on the dial queue. The scoreLeads() server
-- action calls Grok with the full CSV batch, gets back a 0-100 score
-- + one-line reason per row. The cron prefers higher-score rows.

alter table dial_queue
  add column if not exists ai_score int,                   -- 0-100, null = unscored
  add column if not exists ai_score_reason text,           -- one-line "why"
  add column if not exists ai_score_model text,            -- model that produced the score
  add column if not exists ai_scored_at timestamptz;

create index if not exists dial_queue_score_idx
  on dial_queue(agent_name, status, ai_score desc nulls last, created_at);
