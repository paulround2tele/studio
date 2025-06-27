# DomainFlow AI Agents

DomainFlow uses several specialized AI agents to maintain different parts of the project.
Each agent has a limited scope and explicit responsibilities. Changes outside the allowed
scope or in violation of constraints are rejected.

## Agents

### DomainValidator
- **Scope**: `backend/internal/dnsvalidator`, `backend/internal/httpvalidator`, `backend/internal/domainexpert`, `backend/internal/services/*campaign*`, and related tests.
- **Responsibilities**:
  - Implement and refine domain generation logic, DNS validation, and HTTP keyword checks.
  - Maintain validation middleware and service functions.
  - Ensure Go code conforms to existing style and passes tests.
- **Editing Constraints**:
  - Only modify Go files related to validation and campaign services.
  - Do **not** edit database schema or frontend files.
- **Task Handoff**:
  - If a missing field or type mismatch is found in database models, create a notice for **SchemaAligner**.
- **Tools/Models**: Prefer Codex‑1 for Go changes; fallback to Claude Sonnet 4 for reasoning or refactoring guidance.

### UIAgent
- **Scope**: All files under `src/` and `public/` excluding `src/lib/schemas`.
- **Responsibilities**:
  - Build and update React components, hooks, and utilities.
  - Keep TypeScript code type‑safe and aligned with API contracts.
  - Handle styling with Tailwind and manage frontend state logic.
- **Editing Constraints**:
  - Only safe diffs—do not rewrite backend contracts.
  - Do **not** touch Go backend or SQL migrations.
- **Task Handoff**:
  - When API responses diverge from frontend types, notify **SchemaAligner**.
- **Tools/Models**: Use Claude Sonnet 4 for TypeScript and UI design; Codex‑1 for automated transformations or lint fixes.

### SchemaAligner
- **Scope**: `backend/database/`, `backend/internal/models`, `migrations/`, `src/lib/schemas`, and OpenAPI specs in `docs/`.
- **Responsibilities**:
  - Keep database schema, Go models, and TypeScript validation schemas in sync.
  - Manage SQL migrations and update schema documentation.
  - Regenerate API client models when schemas change.
- **Editing Constraints**:
  - Only append migrations—never rewrite existing ones.
  - Maintain backward‑compatible schema updates whenever possible.
  - Do **not** modify UI components or campaign orchestration code.
- **Task Handoff**:
  - If UI or backend code relies on fields not present in `schema.sql`, alert relevant agent (DomainValidator or UIAgent).
- **Tools/Models**: Codex‑1 for SQL and Go models; Claude Sonnet 4 for cross‑file reasoning and documentation.

### OrchestratorAgent
- **Scope**: `backend/internal/services/campaign_*`, `backend/internal/api/campaign_orchestrator_handlers.go`, `mcp/` server code, and orchestration scripts under `scripts/`.
- **Responsibilities**:
  - Maintain the campaign workflow engine and worker coordination logic.
  - Ensure state transitions and orchestration APIs match documented behavior.
  - Integrate monitoring hooks and performance metrics.
- **Editing Constraints**:
  - Avoid changing database schema—delegate to **SchemaAligner** if needed.
  - Do not modify frontend code.
- **Task Handoff**:
  - When new workflow data must be stored, request a migration via **SchemaAligner**.
- **Tools/Models**: Codex‑1 for Go orchestration code; Claude Sonnet 4 for complex coordination logic.

## General Guidelines
- Agents must stay within their defined scopes.
- All edits must compile and pass existing tests relevant to the modified code.
- Cross‑agent coordination occurs through the handoff rules above.

## Codex Commands

The `.codex` directory contains helper scripts for validating the local environment.

For a full setup guide see `.codex/README.md` which explains how to install dependencies and start PostgreSQL.

- **check db**: `./.codex/check-db.sh` verifies PostgreSQL connectivity, ensures the `schema_migrations` table exists and can apply pending migrations when run with `--migrate`.
- **check backend**: `./.codex/check-backend.sh` runs `go fmt`, `go vet`, and `go test ./...` while loading database settings from environment variables or `backend/config.json`.
- **check status**: `./.codex/status.sh` executes database and backend checks, runs frontend tests, lists available npm scripts, and prints recent backend log lines.

### Execution Capabilities (Non-Docker Setup)

Codex interacts directly with the host system without Docker:

- **PostgreSQL**: Connection details are read from environment variables or `backend/config.json`. `pg_isready` and `psql` are used to validate connectivity. Migrations run with `go run ./backend/cmd/migrate`.
- **NPM**: Commands such as `npm install`, `npm run dev`, and `npm test` work locally. When the backend is unavailable, the frontend falls back to mock API handlers found under `src/mocks`.
- **Go**: All Go tooling runs on the host. `.codex/check-backend.sh` formats, vets, and tests the backend.

### Troubleshooting

- Ensure PostgreSQL is running and credentials are correct if database checks fail.
- If npm commands fail, confirm Node.js and npm are installed and try reinstalling dependencies.
- For Go build issues run `go mod download` and verify your `GOPATH`.
