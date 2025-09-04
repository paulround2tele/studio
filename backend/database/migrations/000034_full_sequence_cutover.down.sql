-- 000034_full_sequence_cutover.down.sql
-- Revert phase_configurations table and reintroduce legacy columns (best-effort)

DROP TABLE IF EXISTS phase_configurations;

-- Re-add legacy columns (nullability simplified; original defaults approximated)
ALTER TABLE lead_generation_campaigns ADD COLUMN IF NOT EXISTS is_full_sequence_mode BOOLEAN DEFAULT FALSE;
ALTER TABLE lead_generation_campaigns ADD COLUMN IF NOT EXISTS auto_advance_phases BOOLEAN DEFAULT FALSE;

-- Optional: keep campaign_state.mode (do not drop to avoid enum dependency issues)
