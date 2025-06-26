-- Reverse migration for add_archived_status
-- This is a rollback migration, use with caution

BEGIN;

-- Drop the archived_status column if it exists
ALTER TABLE campaigns DROP COLUMN IF EXISTS archived_status;

-- Drop the archived_at column if it exists
ALTER TABLE campaigns DROP COLUMN IF EXISTS archived_at;

-- Drop the archived_reason column if it exists
ALTER TABLE campaigns DROP COLUMN IF EXISTS archived_reason;

COMMIT;
