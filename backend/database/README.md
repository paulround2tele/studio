# Database Setup Guide

This directory contains the database schema and setup files for DomainFlow Studio.

## Quick Start

### 1. Create Database

```bash
# Create the database and user
sudo -u postgres psql << EOF
CREATE DATABASE domainflow_production;
CREATE USER domainflow WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE domainflow_production TO domainflow;
ALTER USER domainflow CREATEDB;
\q
EOF
```

### 2. Apply Schema

```bash
# From the backend directory
psql "postgres://domainflow:your_password@localhost:5432/domainflow_production?sslmode=disable" < database/schema.sql
```

### 3. Optional: Load Seed Data

```bash
# Load basic development data (optional)
psql "postgres://domainflow:your_password@localhost:5432/domainflow_production?sslmode=disable" < database/seed_data.sql
```

### 4. Configure Environment

Create a `.env` file in the backend directory:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=domainflow_production
DB_USER=domainflow
DB_PASSWORD=your_secure_password
DB_SSLMODE=disable
```

## Files

- **`schema.sql`** - Complete database schema dump (primary file)
- **`seed_data.sql`** - Optional seed data for development
- **`dumps/`** - Directory for database backups
- **`archive/`** - Historical migration files (archived)

## Schema Overview

The database includes the following main components:

### Core Tables
- **`campaigns`** - Campaign management and tracking
- **`generated_domains`** - Domain generation results
- **`dns_validation_results`** - DNS validation outcomes
- **`http_keyword_results`** - HTTP keyword validation results

### Configuration Tables
- **`personas`** - User agent and behavior profiles
- **`keyword_sets`** - Keyword collections for validation
- **`proxy_pools`** - Proxy management
- **`campaign_jobs`** - Background job processing

### Monitoring Tables
- **`connection_pool_metrics`** - Database connection monitoring
- **`memory_usage_metrics`** - Memory usage tracking
- **`query_performance_metrics`** - Query performance data
- **`response_time_metrics`** - API response time tracking

### Key Features
- **UUID Primary Keys** - All tables use UUID for distributed-friendly IDs
- **Audit Logging** - Comprehensive audit trail with `audit_logs` table
- **Status Constraints** - Database-level validation for status enums
- **Indexes** - Optimized indexes for common query patterns
- **Foreign Keys** - Referential integrity with proper cascading

## Development Workflow

### Making Schema Changes

1. **Never modify `schema.sql` directly** - it's generated from the database
2. Make changes through application migrations or direct SQL
3. Test changes thoroughly
4. Regenerate schema dump when ready:
   ```bash
   pg_dump --schema-only --no-owner --no-privileges "your_db_connection" > database/schema.sql
   ```

### Database Backups

```bash
# Create a full backup
pg_dump "your_db_connection" > database/dumps/backup_$(date +%Y%m%d_%H%M%S).sql

# Create schema-only backup
pg_dump --schema-only "your_db_connection" > database/dumps/schema_$(date +%Y%m%d_%H%M%S).sql
```

### Testing Setup

For automated testing, you can create a test database:

```bash
# Create test database
createdb domainflow_test
psql "postgres://domainflow:password@localhost:5432/domainflow_test" < database/schema.sql
```

## Troubleshooting

### Common Issues

1. **Permission Errors**: Ensure the database user has proper privileges
2. **Connection Refused**: Check PostgreSQL service status and connection parameters
3. **Schema Errors**: Verify PostgreSQL version compatibility (requires 12+)

### Useful Commands

```bash
# Check database connection
psql "your_connection_string" -c "SELECT version();"

# List all tables
psql "your_connection_string" -c "\dt"

# Check table constraints
psql "your_connection_string" -c "\d+ table_name"

# View table sizes
psql "your_connection_string" -c "SELECT schemaname,tablename,pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size FROM pg_tables WHERE schemaname='public' ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;"
```

## Migration History

Previous migration files have been archived in `archive/migrations/`. These are kept for historical reference but are no longer actively used. The current schema represents the consolidated state of all previous migrations.

For detailed migration history, see `archive/migration_log_2025_06_20.md`.
