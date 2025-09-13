-- Migration: 000053_add_scoring_penalty_factor.up.sql
-- Adds configurable parked penalty factor to scoring_profiles
-- Safe additive change; existing rows default to 0.5 (previous hard-coded value)

ALTER TABLE scoring_profiles
    ADD COLUMN IF NOT EXISTS parked_penalty_factor DOUBLE PRECISION DEFAULT 0.5;

COMMENT ON COLUMN scoring_profiles.parked_penalty_factor IS 'Multiplicative factor applied to relevance score when parked penalty conditions met (range 0..1, default 0.5)';
