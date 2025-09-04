-- Rollback Foreign Key Constraints and Referential Integrity Rules

-- Drop views created for monitoring
DROP VIEW IF EXISTS foreign_key_violations;

-- Note: Most foreign key constraints are dropped automatically when tables are dropped
-- in the reverse migration order. This file serves as a placeholder for any 
-- additional foreign key constraint rollbacks that might be needed.

-- The foreign keys are defined inline with table creation in the up migrations,
-- so they are automatically dropped when the tables are dropped in the reverse order
-- in the individual table migration down files.