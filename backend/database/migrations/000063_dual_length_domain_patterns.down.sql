-- Rollback 000063: remove dual-length support columns
ALTER TABLE domain_generation_campaign_params
    DROP CONSTRAINT IF EXISTS chk_domain_generation_params_prefix_length_non_negative;

ALTER TABLE domain_generation_campaign_params
    DROP CONSTRAINT IF EXISTS chk_domain_generation_params_suffix_length_non_negative;

ALTER TABLE domain_generation_campaign_params
    DROP COLUMN IF EXISTS prefix_variable_length,
    DROP COLUMN IF EXISTS suffix_variable_length;
