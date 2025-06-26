# Codex Local Environment Setup

This folder contains helper scripts to configure the local development environment without Docker.

## Setup Steps

1. **Install dependencies**
   ```bash
   ./.codex/setup.sh
   ```
   This installs Node.js, Go, and PostgreSQL via `apt-get`, prepares a `studio_test` database and downloads all npm and Go modules.

2. **Start PostgreSQL**
   ```bash
   ./.codex/run-postgres.sh
   ```
   Running this ensures the PostgreSQL service is up. Connection details are written to `.codex/test.env` and `.db_connection.test`.

3. **Verify the environment**
   ```bash
   ./codex/check-db.sh
   ./codex/check-backend.sh
   ./codex/status.sh
   ```
   These commands check database connectivity, run backend linters and tests, execute frontend tests, and display recent logs.

Database credentials can be overridden with the `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_NAME`, `DATABASE_USER`, and `DATABASE_PASSWORD` environment variables. If they are not provided, `backend/config.json` or `.db_connection` will be used.
