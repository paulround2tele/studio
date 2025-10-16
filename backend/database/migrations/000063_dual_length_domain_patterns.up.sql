-- Migration 000063: dual-length support for domain generation patterns
ALTER TABLE domain_generation_campaign_params
    ADD COLUMN prefix_variable_length INTEGER,
    ADD COLUMN suffix_variable_length INTEGER;

ALTER TABLE domain_generation_campaign_params
    ADD CONSTRAINT chk_domain_generation_params_prefix_length_non_negative
        CHECK (prefix_variable_length IS NULL OR prefix_variable_length >= 0);

ALTER TABLE domain_generation_campaign_params
    ADD CONSTRAINT chk_domain_generation_params_suffix_length_non_negative
        CHECK (suffix_variable_length IS NULL OR suffix_variable_length >= 0);
