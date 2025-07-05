-- ======================================================================
-- ENTERPRISE SCALE DOMAIN OPTIMIZATION - PART 3: CURSOR PAGINATION FUNCTIONS
-- ======================================================================

-- ======================================================================
-- CURSOR PAGINATION HELPER FUNCTIONS
-- ======================================================================

-- Function to encode cursor for pagination
CREATE OR REPLACE FUNCTION encode_cursor(table_name TEXT, id_value UUID, timestamp_value TIMESTAMP WITH TIME ZONE)
RETURNS TEXT AS $$
BEGIN
    RETURN encode(
        (table_name || '|' || id_value::TEXT || '|' || EXTRACT(EPOCH FROM timestamp_value)::TEXT)::bytea,
        'base64'
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to decode cursor for pagination
CREATE OR REPLACE FUNCTION decode_cursor(cursor_value TEXT)
RETURNS TABLE(table_name TEXT, id_value UUID, timestamp_value TIMESTAMP WITH TIME ZONE) AS $$
DECLARE
    decoded_parts TEXT[];
    decoded_text TEXT;
BEGIN
    decoded_text := convert_from(decode(cursor_value, 'base64'), 'UTF8');
    decoded_parts := string_to_array(decoded_text, '|');
    
    IF array_length(decoded_parts, 1) = 3 THEN
        RETURN QUERY SELECT
            decoded_parts[1]::TEXT,
            decoded_parts[2]::UUID,
            to_timestamp(decoded_parts[3]::NUMERIC);
    END IF;
    
    RETURN;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ======================================================================
-- ANALYZE EXISTING TABLES FOR OPTIMAL PERFORMANCE
-- ======================================================================

-- Update table statistics for better query planning with existing tables
ANALYZE generated_domains;
ANALYZE dns_validation_results;
ANALYZE http_keyword_results;
ANALYZE campaigns;
ANALYZE query_performance_metrics;
ANALYZE connection_pool_metrics;