-- Restore timestamp trigger for generated_domains table
-- This is the down migration for removing the trigger

CREATE TRIGGER trigger_timestamp_domains
    BEFORE UPDATE ON generated_domains
    FOR EACH ROW EXECUTE FUNCTION trigger_update_timestamp();
