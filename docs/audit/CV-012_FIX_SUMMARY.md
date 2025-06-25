# CV-012 Fix Summary: Drop Obsolete http_keyword_params Table

## Issue Description
The `http_keyword_params` table was an early attempt to store parameters for HTTP keyword campaigns. The codebase has since migrated to the `http_keyword_campaign_params` table, and no queries reference the old table.

## Resolution
A new migration `cv008_drop_http_keyword_params.sql` drops the obsolete table if it exists and records the change in `schema_migrations`.

## Impact
- **Database cleanup**: Removes unused table and indexes.
- **No functional changes**: The application uses `http_keyword_campaign_params` exclusively.
