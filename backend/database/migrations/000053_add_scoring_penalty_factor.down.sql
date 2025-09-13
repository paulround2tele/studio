-- Migration: 000053_add_scoring_penalty_factor.down.sql
-- Reverts parked_penalty_factor addition

ALTER TABLE scoring_profiles
    DROP COLUMN IF EXISTS parked_penalty_factor;
