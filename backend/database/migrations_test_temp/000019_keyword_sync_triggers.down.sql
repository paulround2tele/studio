-- Rollback keyword sync triggers migration

-- Drop the trigger
DROP TRIGGER IF EXISTS sync_keyword_rules_to_jsonb ON keyword_rules;

-- Drop the trigger function
DROP FUNCTION IF EXISTS update_keyword_set_rules_jsonb();