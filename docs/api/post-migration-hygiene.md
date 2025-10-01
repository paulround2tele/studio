# Post-Migration API Contract Hygiene

This document codifies the guardrails that enforce the envelope deprecation and proxy schema modernization.

## Enforced In CI

1. Spectral Lint (`npm run api:lint`)
   - Fails if deprecated schemas (`SuccessEnvelope`, `ProxyDetailsResponse`) reappear.
   - Policy rules: no envelopes in 2xx, consistent error envelope usage, other contract style checks.
2. OpenAPI Structural Validation (`scripts/validate-openapi-spec.sh`)
   - kin-openapi + Redocly bundling and spec validation.
3. Contract Drift Go Tests (`go test -run ContractDrift ./tests` in `backend/`)
   - Enforced checks:
     - No `SuccessEnvelope` references in any 2xx responses
     - Deleted schemas absent (`SuccessEnvelope`, `ProxyDetailsResponse`, etc.)
     - All 4xx/5xx responses include `ErrorEnvelope` (hard fail if missing)
4. Fossil Check
   - Blocks reintroduction of swagger/swaggo artifacts.

## Removed Transitional Code
- `src/api/normalizeResponse.ts` (temporary adapter) deleted.
- Deprecated `extractResponseData` helper fully removed.

## Repository Hygiene
- `lint_output.txt` artifact removed and ignored.
- Added ignore patterns for future spectral report files.

## How To Add New Endpoints
- Return direct models for all successful 2xx responses (never wrap).
- Reference standardized error responses (`#/components/responses/BadRequest`, etc.) for 4xx/5xx.
- Run locally:
  ```bash
  npm run api:lint
  npm run api:validate-spec
  (cd backend && go test -run ContractDrift -count=1 ./tests)
  ```

## Extending Guardrails
- Add new deleted schema names to `checkDeletedSchemasAbsent` in `contract_drift_test.go` when retiring models.
- Promote Spectral warnings to errors by editing `.spectral.yml` when ready.

## Rationale
Eliminating envelopes reduced client boilerplate, improved DX, and simplified generated types. Drift tests + lint form a defense-in-depth layer to prevent accidental regression.

---
Maintainers: update this file when altering contract guardrails.
