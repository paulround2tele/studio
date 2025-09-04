-- Remove timestamp trigger from generated_domains table since it doesn't have updated_at column
-- The trigger_update_timestamp() tries to set NEW.updated_at which doesn't exist in this table

DROP TRIGGER IF EXISTS trigger_timestamp_domains ON generated_domains;
