-- Rollback stored procedures fix
-- Restore the previous broken versions (for testing purposes only)

-- Note: This rollback restores the broken versions that use 'user_id' instead of 'triggered_by'
-- and don't include the required 'operation_context' column

-- The down migration would restore the original broken functions from 000017_stored_procedures.up.sql
-- Since the original functions are complex and this is primarily for emergency rollback,
-- we're noting that manual intervention may be required

-- If rollback is needed, manually restore the functions from:
-- backend/database/migrations/000017_stored_procedures.up.sql

COMMENT ON SCHEMA public IS 'Rollback note: Restore original functions from 000017_stored_procedures.up.sql if needed';
