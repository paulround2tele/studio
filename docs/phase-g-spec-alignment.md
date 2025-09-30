## Phase G: Spec Alignment & Final Cleanup

Objective: Align OpenAPI specifications with the already-migrated backend implementations (Phases A–F) by removing lingering `SuccessEnvelope` references from 2xx responses, regenerating clients, and performing final frontend + server cleanup.

### Background
Phase F surfaced that many backend handlers now return direct payloads while specs still declare envelope-based 2xx responses. This causes:
- Incorrect generated TS client shapes
- Continued reliance on `extractResponseData` helpers
- Redundant legacy schema components lingering in specs

### Scope
1. Remove `SuccessEnvelope` (and nested `data`) from all remaining 2xx responses.
2. Convert acknowledgement endpoints to `204 No Content` where appropriate (already partially done in Phase E/F code paths; specs must match).
3. Keep error envelopes (4xx/5xx) unchanged.
4. Regenerate Go server + TS client.
5. Remove unused helpers in frontend after regeneration (`extractResponseData`, envelope mappers) for migrated endpoints.
6. Prune orphaned schemas: `SuccessEnvelope`, `Metadata`, `Pagination`, `RateLimitInfo`, `ProcessingInfo`, `BulkOperationInfo` IF no longer referenced.
7. Ensure union/discriminator types (persona configs) generate without manual patching.
8. Update global contract test (Phase F) to pass with zero 2xx envelope references.

### Deliverables
- Updated modular path specs (under `backend/openapi/paths/**`).
- Cleaned `backend/openapi/components/schemas` to remove unreferenced success/metadata schemas.
- Regenerated `backend/internal/api/gen` and TS API client.
- Frontend refactor commit removing success/data extraction for aligned endpoints.
- Updated `docs/api-contract-migrations.md` with Phase G completion note.

### Non-Goals
- Introducing new functional endpoints
- Changing error response format
- Altering business logic

### Task Checklist
- [ ] Inventory current 2xx `SuccessEnvelope` refs (verify count from Phase F test)
- [ ] Batch edit specs (grouped logically: personas, proxies, database, extraction, scoring, SSE, monitoring, campaigns adjunct)
- [ ] Re-bundle + validate spec (kin-openapi)
- [ ] Regenerate Go server, build, fix any compile fallout
- [ ] Regenerate TS client (`npm run gen:all`)
- [ ] Frontend: remove envelope extraction usage for migrated endpoints
- [ ] Run contract Phase F test (should pass / rename to global final test)
- [ ] Remove orphaned schema components if unreferenced
- [ ] Update docs (`api-contract-migrations.md` Phase G section)
- [ ] Final lint / typecheck / tests
- [ ] Open (or update) draft PR -> ready for merge

### Validation Steps
1. `make openapi` → bundle & generate
2. `make build` → backend builds cleanly
3. `go test ./backend/tests -run TestPhaseF` → zero violations
4. `npm run gen:all && npm run typecheck` → no type errors referencing success/data
5. Manual spot check: personas list, proxies list, database bulk query direct payloads from curl vs spec

### Rollback Plan
If a regression is detected:
1. Revert offending path spec change
2. Regenerate server + client
3. Re-run contract + smoke tests

### Risks & Mitigations
| Risk | Mitigation |
|------|------------|
| Missed envelope reference in nested spec file | Global contract test after each batch edit |
| Frontend still referencing removed helper | Typecheck + grep for `extractResponseData` |
| Persona discriminator regression | Verify generated union functions & run related handler tests |
| Accidental removal of still-used metadata schemas | Use grep before deletion; only delete if count=0 |

---
Generated: Phase G planning document.
