# Stealth Cursor Migration Completion Checklist

Use this document to gate final removal of legacy fallback pagination.

## Preconditions
- [ ] Force cursor flag (`enableStealthForceCursor`) enabled in production
- [ ] Legacy fallback code path still present but not exercised (counters stable at 0)

## Observation Window
- [ ] 7 consecutive days: `stealth_cursor_fallback` count == 0
- [ ] 7 consecutive days: `stealth_cursor_error` count == 0
- [ ] p95 pages per collection < 50 (adjust threshold if data justifies)
- [ ] p95 latency < 250ms (≤10K domains campaigns) / < 2s (≤500K domains campaigns)

## Data Integrity
- [ ] Spot check script executed (no duplicates, ordering invariant passes)
- [ ] Random sample of campaigns manually reviewed (>=3 sizes: small, medium, large)

## Observability
- [ ] Dashboard panels: success rate, error count, pages distribution, latency percentiles
- [ ] Alerts deployed:
  - StealthCursorForcedError (critical)
  - StealthCursorHighPagesP95 (warning)
  - (Temporary) StealthCursorFallbackSpike (to be removed post-legacy deletion)

## Code Changes
- [ ] Remove `collectDomainsLegacy` & fallback branch
- [ ] Remove `stealth_cursor_fallback` metric emission
- [ ] Update tests: delete fallback tests; add negative test ensuring legacy code is gone
- [ ] Update feature flag docs (decide removal or inversion to `enableStealthCursorFallback` default false)

## Documentation
- [ ] Update `STEALTH_PAGINATION_MIGRATION.md` final state section
- [ ] Update architecture docs referencing pagination
- [ ] Add changelog entry in `PIPELINE_CHANGELOG.md`

## Post-Removal Validation
- [ ] All tests green in CI
- [ ] Runtime smoke test campaign triggers cursor success logs only
- [ ] No alerts for 24h after removal

## Sign-off
| Role | Name | Date | Notes |
|------|------|------|-------|
| Engineering |  |  |  |
| SRE / Ops   |  |  |  |
| QA          |  |  |  |

---
Document generated as part of automated migration tasks.
