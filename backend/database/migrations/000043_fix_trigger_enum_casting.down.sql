-- 000043_fix_trigger_enum_casting.down.sql
BEGIN;
DROP TRIGGER IF EXISTS trigger_domain_validation ON generated_domains;
DROP FUNCTION IF EXISTS trigger_domain_validation_update();
CREATE OR REPLACE FUNCTION trigger_domain_validation_update() RETURNS TRIGGER AS $$ BEGIN RETURN NEW; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trigger_domain_validation AFTER UPDATE ON generated_domains FOR EACH ROW EXECUTE FUNCTION trigger_domain_validation_update();
COMMIT;
