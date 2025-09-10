-- 000041_remove_legacy_domain_validation_trigger.down.sql
-- Purpose: Re-create legacy trigger/function (NOT recommended). Provided only for migration reversibility.
-- NOTE: This reinstates references to deprecated columns and will likely break if schema lacks those columns.

BEGIN;

CREATE OR REPLACE FUNCTION trigger_domain_validation_update() RETURNS TRIGGER AS $$
BEGIN
    RETURN NEW; -- No-op stub (intentionally does nothing to avoid invalid column references)
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_domain_validation
    AFTER UPDATE ON generated_domains
    FOR EACH ROW EXECUTE FUNCTION trigger_domain_validation_update();

COMMIT;
