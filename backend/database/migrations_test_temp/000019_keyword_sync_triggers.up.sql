-- Auto-sync keyword_rules table changes to keyword_sets.rules JSONB
-- This creates a hybrid storage solution: relational for management, JSONB for performance

-- Function to update keyword_sets.rules JSONB when keyword_rules change
CREATE OR REPLACE FUNCTION update_keyword_set_rules_jsonb()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the keyword_sets.rules JSONB column with current rules
    UPDATE keyword_sets 
    SET rules = (
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'id', kr.id,
                'pattern', kr.pattern,
                'ruleType', kr.rule_type,
                'isCaseSensitive', kr.is_case_sensitive,
                'category', kr.category,
                'contextChars', kr.context_chars,
                'createdAt', kr.created_at,
                'updatedAt', kr.updated_at
            )
        ), '[]'::jsonb)
        FROM keyword_rules kr 
        WHERE kr.keyword_set_id = COALESCE(NEW.keyword_set_id, OLD.keyword_set_id)
    ),
    updated_at = NOW()
    WHERE id = COALESCE(NEW.keyword_set_id, OLD.keyword_set_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to sync keyword_rules changes to keyword_sets.rules JSONB
CREATE TRIGGER sync_keyword_rules_to_jsonb
    AFTER INSERT OR UPDATE OR DELETE ON keyword_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_keyword_set_rules_jsonb();

-- Function to initialize existing keyword_sets with rules JSONB (one-time sync)
CREATE OR REPLACE FUNCTION initialize_keyword_sets_rules_jsonb()
RETURNS INTEGER AS $$
DECLARE
    set_record RECORD;
    updated_count INTEGER := 0;
BEGIN
    -- Loop through all keyword sets and populate their rules JSONB
    FOR set_record IN SELECT id FROM keyword_sets
    LOOP
        UPDATE keyword_sets 
        SET rules = (
            SELECT COALESCE(jsonb_agg(
                jsonb_build_object(
                    'id', kr.id,
                    'pattern', kr.pattern,
                    'ruleType', kr.rule_type,
                    'isCaseSensitive', kr.is_case_sensitive,
                    'category', kr.category,
                    'contextChars', kr.context_chars,
                    'createdAt', kr.created_at,
                    'updatedAt', kr.updated_at
                )
            ), '[]'::jsonb)
            FROM keyword_rules kr 
            WHERE kr.keyword_set_id = set_record.id
        )
        WHERE id = set_record.id;
        
        updated_count := updated_count + 1;
    END LOOP;
    
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Initialize existing data (run once during migration)
SELECT initialize_keyword_sets_rules_jsonb();

-- Drop the initialization function (no longer needed after migration)
DROP FUNCTION initialize_keyword_sets_rules_jsonb();

COMMENT ON FUNCTION update_keyword_set_rules_jsonb() IS 
'Automatically syncs keyword_rules table changes to keyword_sets.rules JSONB for high-performance scanning';

COMMENT ON TRIGGER sync_keyword_rules_to_jsonb ON keyword_rules IS
'Maintains hybrid storage: relational keyword_rules for management, JSONB for Phase 3 HTTP scanning performance';