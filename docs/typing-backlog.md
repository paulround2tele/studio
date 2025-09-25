# Typing Backlog (Incremental Hardening)

Purpose: Track intentionally deferred typing targets to reduce lint noise while preserving future implementation intent. We underscore unused parameters instead of deleting them to maintain scaffolding.

## Deferred Unused Parameters

| Location | Parameter | Rationale | Planned Action |
|----------|-----------|-----------|----------------|
| (example) futureService.ts | context | Reserved for future enrichment context injection | Add interface once enrichment spec stabilized |

(Add entries as they are underscored.)

## Deferred Any Surfaces

| File | Surface | Reason | Mitigation Path |
|------|---------|--------|-----------------|
| (none current batch) | | | |

## Notes
- Only underscore when parameter is genuinely unused and near-future wiring expected.
- Prefer narrow helper accessors over broad casting when touching legacy surfaces.
- Keep this list lean; remove entries once addressed.
