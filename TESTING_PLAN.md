# Testing Plan

This document defines expectations, environment variables, and conventions for running the backend and frontend test suites.

## Database Test Environment

The backend integration and orchestrator tests require a PostgreSQL 16+ instance. By default the repository assumes a running local service with a database and role created as described in `.github/copilot-instructions.md`:

```
Database: domainflow_production
User:     domainflow (CREATEDB privilege recommended for clean test isolation)
```

### Connection Resolution Order
Test helpers resolve the database DSN in this order:
1. `TEST_POSTGRES_DSN` (highest precedence)
2. Contents of `./.db_connection` (workspace root relative)
3. Fallback hardcoded local DSN: `postgres://studio:studio@localhost:5432/studio_test?sslmode=disable`

### Clean State Strategy
`internal/testutil/SetupTestDatabase` attempts to provide a pristine schema for each logical test session:
1. Try: `DROP SCHEMA public CASCADE` then recreate `public`.
2. If drop fails (typical when role lacks ownership), attempt TRUNCATE of all tables in `public`.
3. Allocate a brand new temporary database (`test_isolated_<timestamp>`) if truncation still risks drift or partial enum/type conflicts. This requires the role to possess `CREATEDB` privilege.
4. Run migrations via the in-repo migrate tool: `go run ./cmd/migrate -migrations database/migrations -direction up`.

This layered fallback removes brittle assumptions around superuser access while preserving semantic test intent (fresh schema).

## STRICT_SCHEMA_TESTS Flag

Set `STRICT_SCHEMA_TESTS=1` to convert otherwise skipped schema-dependent tests into hard failures when expected columns are missing. This guards against accidental drift (e.g., running against a partially migrated or stale database). Without the flag, such tests call `t.Skip` to avoid noisy false negatives in non-critical environments.

Example:
```
STRICT_SCHEMA_TESTS=1 go test ./backend/tests -run CampaignDomainsListReasons
```

## Patterns for New Tests

When writing integration tests that touch the database directly:
* Prefer using helper `testutil.SetupTestDatabase(t)` to obtain a cleaned & migrated DB handle.
* Only use raw `sql.Open` in edge cases (e.g., verifying DSN discovery paths or intentionally bypassing helper logic). Plan: legacy tests will gradually be refactored to the helper.
* Introspect optional columns using `information_schema.columns` rather than assuming presence; support forward and backward migration compatibility where practical.

## Planned Refactor: Centralized Connection Helper Adoption

Several existing tests in `backend/tests/` still open direct connections and embed inserts with column lists. These will be migrated in a follow-up pass to reduce duplication and to unify cleanup semantics. Migration steps:
1. Replace `sql.Open` with `SetupTestDatabase(t)`.
2. Remove duplicated insert scaffolding if equivalent builder utilities exist (future enhancement).
3. Gate legacy schema field assumptions behind feature / existence checks.

## Environment Variables Reference

| Variable | Purpose | Default Behavior |
|----------|---------|------------------|
| TEST_POSTGRES_DSN | Explicit DSN for test DB | Overrides all other sources |
| STRICT_SCHEMA_TESTS | Fail instead of skip when schema drift detected | Disabled when unset / != `1` |
| DOMAINS_LISTING_MODE | Controls domain listing mode in certain store/handler tests | Some tests force `direct` |

## Running Full Backend Tests

```
cd backend
make test
```

To force strict schema validation and a clean ephemeral DB (assuming CREATEDB privilege):
```
STRICT_SCHEMA_TESTS=1 make test
```

## Frontend Tests & Type Checking

Frontend tests (Jest / Playwright) are outside the scope of this initial backend-focused expansion; ensure you run:
```
npm run lint
npm run typecheck
```
prior to committing changes that alter shared API contracts.

## Maintenance Guidelines

* Update this document whenever test isolation logic or required environment variables change.
* Prefer additive migrations; tests rely on forward-only migration application via the migrate tool.
* Keep skip conditions narrow; promote to failures under `STRICT_SCHEMA_TESTS` to surface real regressions early in CI.

