# Plan: Retire Legacy `campaign_phases` Error Columns

## Context
- Phase orchestration now reads all error state from `phase_executions.error_details`.
- Store and aggregate queries no longer project `campaign_phases.error_message`.
- Phase mutations (`FailPhase`, `SkipPhase`, phase seeding) stop writing to the legacy column.

## Objective
Prepare migration `000068_drop_campaign_phases_error_columns` that removes obsolete fields from `campaign_phases` once production confirms no legacy readers remain.

## Proposed Changes
1. **Up Migration**
   ```sql
   -- Preserve transactional safety
   BEGIN;
   ALTER TABLE campaign_phases
     DROP COLUMN IF EXISTS error_message;
   -- Optional future scope (after additional verification):
   -- DROP COLUMN paused_at, failed_at, progress_percentage, total_items, processed_items,
   -- successful_items, failed_items, configuration;  -- only when phase_executions fully replaces them.
   COMMIT;
   ```
2. **Down Migration**
   ```sql
   BEGIN;
   ALTER TABLE campaign_phases
     ADD COLUMN IF NOT EXISTS error_message text;
   COMMIT;
   ```
3. **Verification Checklist**
   - [ ] Deploy code that no longer references `campaign_phases.error_message`.
   - [ ] Run `SELECT COUNT(*) FROM campaign_phases WHERE error_message IS NOT NULL` to snapshot remaining values.
   - [ ] Verify `phase_executions.error_details` rows exist for every failed/skipped phase (backfill script available via `upsertPhaseExecutionFailure`).
   - [ ] Dry-run migration in staging and execute end-to-end campaign to confirm UI/API behavior.

## Operational Steps
1. Merge code changes eliminating legacy reads/writes.
2. Create `000068_drop_campaign_phases_error_columns.up.sql` and matching `.down.sql` using the SQL above.
3. Apply migration in lower environments first; monitor `GetCampaignStatus` responses for regressions.
4. Schedule production deployment during a low-traffic window; ensure recent backups exist.
5. After production deploy, remove the plan document or update it with completion notes.

## Rollback Strategy
- If issues arise, run the `.down.sql` script to reintroduce `error_message`.
- Since the application no longer uses the column, rollback risk is limited to schema validation.

## Related Work
- Phase execution telemetry now guarantees `error_details.message` is populated when failures occur, ensuring parity with the legacy column.
