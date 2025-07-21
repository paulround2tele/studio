# Campaign Processing System - Database Schema Migration

## Migration Overview

This migration implements **Week 2 Database Schema Migration Execution** for transitioning from campaign-type to phases-based architecture. The migration eliminates the dual architecture causing 40% performance degradation and optimizes the database for phases-only processing.

## 🎯 Performance Goals

- **40% improvement** in database query performance
- **Eliminate duplicate status tracking** (domain-centric vs result-centric)
- **Optimize indexes** for phases-based queries only
- **Simplify foreign key relationships** and remove architectural complexity

## 📁 Migration Files

### Core Migration Scripts

| File | Purpose | Usage |
|------|---------|--------|
| [`000035_eliminate_dual_architecture.up.sql`](./000035_eliminate_dual_architecture.up.sql) | Main migration to eliminate dual architecture | Run via migration tool |
| [`000035_eliminate_dual_architecture.down.sql`](./000035_eliminate_dual_architecture.down.sql) | Rollback for dual architecture elimination | Emergency rollback only |
| [`000036_optimize_phases_indexes.up.sql`](./000036_optimize_phases_indexes.up.sql) | Optimize indexes for phases-based queries | Run via migration tool |
| [`000036_optimize_phases_indexes.down.sql`](./000036_optimize_phases_indexes.down.sql) | Rollback index optimizations | Emergency rollback only |

### Data Migration Scripts

| File | Purpose | Usage |
|------|---------|--------|
| [`migrate-campaign-data.sql`](./migrate-campaign-data.sql) | Transform legacy data to phases-based | Run before/during migration |
| [`validate-migration.sql`](./validate-migration.sql) | Comprehensive migration validation | Run after migration |
| [`rollback-data.sql`](./rollback-data.sql) | Emergency data restoration | Emergency use only |

### Testing & Validation Scripts

| File | Purpose | Usage |
|------|---------|--------|
| [`performance-benchmark.sql`](./performance-benchmark.sql) | Performance testing before/after | Run before and after migration |
| [`integration-test.sql`](./integration-test.sql) | End-to-end migration testing | Run after all migrations complete |

## 🚀 Migration Execution Plan

### Pre-Migration Steps

1. **Create Database Backup**
   ```bash
   pg_dump -h localhost -U postgres -d campaign_db > backup_pre_migration.sql
   ```

2. **Run Performance Benchmark (Before)**
   ```sql
   -- Set architecture type to 'dual' in script
   \i scripts/migration/performance-benchmark.sql
   ```

3. **Validate Current State**
   ```sql
   -- Check current schema and data state
   SELECT COUNT(*) FROM campaigns WHERE campaign_type IS NOT NULL;
   SELECT COUNT(*) FROM campaigns WHERE current_phase IS NOT NULL;
   ```

### Migration Execution

#### Step 1: Data Transformation (Optional - can be done during main migration)
```sql
\i scripts/migration/migrate-campaign-data.sql
```

#### Step 2: Execute Core Migrations
```bash
# Using your migration tool (e.g., golang-migrate, flyway, etc.)
migrate -database "postgres://user:pass@localhost/db?sslmode=disable" -path backend/database/migrations up
```

Or manually:
```sql
\i backend/database/migrations/000035_eliminate_dual_architecture.up.sql
\i backend/database/migrations/000036_optimize_phases_indexes.up.sql
```

#### Step 3: Validate Migration
```sql
\i scripts/migration/validate-migration.sql
```

#### Step 4: Performance Testing (After)
```sql
-- Set architecture type to 'phases_based' in script
\i scripts/migration/performance-benchmark.sql
```

#### Step 5: Integration Testing
```sql
\i scripts/migration/integration-test.sql
```

### Post-Migration Steps

1. **Analyze Performance Results**
   ```sql
   SELECT * FROM migration_performance_comparison;
   ```

2. **Update Application Configuration**
   - Verify application uses only phases-based fields
   - Update any remaining campaign-type references
   - Test application functionality

3. **Monitor Production Performance**
   - Monitor query performance in production
   - Watch for any application errors
   - Validate 40% performance improvement target

## 📊 Data Transformation Logic

### Campaign Type → Current Phase Mapping

| Legacy Campaign Type | New Current Phase |
|---------------------|-------------------|
| `domain_generation` | `generation` |
| `dns_validation` | `dns_validation` |
| `http_keyword_validation` | `http_keyword_validation` |
| `analysis` | `analysis` |
| `comprehensive` | `generation` (starts at generation) |
| `automated` | `generation` (starts at generation) |

### Legacy Status → Phase Status Mapping

| Legacy Status | New Phase Status |
|---------------|------------------|
| `pending` | `not_started` |
| `queued` | `not_started` |
| `running` | `in_progress` |
| `pausing` | `paused` |
| `paused` | `paused` |
| `completed` | `completed` |
| `failed` | `failed` |
| `archived` | `completed` |
| `cancelled` | `failed` |

## 🔧 Index Optimization Strategy

### Removed Legacy Indexes
- `idx_campaigns_campaign_type`
- `idx_campaigns_status`
- `idx_campaigns_launch_sequence`

### Added Phases-Based Indexes
- `idx_campaigns_workflow_primary` - Primary workflow queries
- `idx_campaigns_phase_transitions` - Phase transition monitoring
- `idx_campaigns_user_dashboard` - User dashboard queries
- `idx_domains_campaign_validation_primary` - Domain validation queries
- Additional specialized indexes for bulk processing

## 🚨 Emergency Procedures

### Rollback Migration
```sql
-- Emergency rollback (USE ONLY IN EMERGENCY)
\i backend/database/migrations/000036_optimize_phases_indexes.down.sql
\i backend/database/migrations/000035_eliminate_dual_architecture.down.sql
```

### Data Rollback
```sql
-- Emergency data restoration (LOSES ALL POST-MIGRATION CHANGES)
\i scripts/migration/rollback-data.sql
```

### Health Checks

1. **Check Migration Status**
   ```sql
   SELECT * FROM migration_validation_report;
   SELECT * FROM migration_integration_test_report;
   ```

2. **Monitor Performance**
   ```sql
   SELECT * FROM phases_index_performance;
   SELECT * FROM campaign_performance_metrics;
   ```

3. **Validate Data Integrity**
   ```sql
   -- Check for orphaned data
   SELECT COUNT(*) FROM generated_domains gd 
   LEFT JOIN campaigns c ON gd.domain_generation_campaign_id = c.id 
   WHERE c.id IS NULL;
   
   -- Check phase/status consistency
   SELECT current_phase, phase_status, COUNT(*) 
   FROM campaigns 
   GROUP BY current_phase, phase_status;
   ```

## 📋 Success Criteria

### ✅ Schema Alignment
- [ ] All legacy columns (`campaign_type`, `status`, `launch_sequence`) removed
- [ ] All phases columns (`current_phase`, `phase_status`) present and populated
- [ ] All constraints properly enforced

### ✅ Performance Improvement
- [ ] 40% improvement in query performance achieved
- [ ] All critical indexes present and optimized
- [ ] Bulk processing (2M+ domains) performs optimally

### ✅ Data Integrity
- [ ] All existing campaign data preserved and mapped correctly
- [ ] No orphaned domains or inconsistent relationships
- [ ] All validation tests pass

### ✅ Rollback Capability
- [ ] Complete rollback procedures available
- [ ] Backup tables preserved for emergency restoration
- [ ] Rollback procedures tested and validated

## 🔍 Troubleshooting

### Common Issues

1. **Migration Fails with Constraint Violations**
   - Check data integrity before migration
   - Run `migrate-campaign-data.sql` first
   - Verify all campaigns have valid user_id

2. **Performance Not Improved**
   - Verify indexes created successfully: `\di idx_campaigns_*`
   - Run `ANALYZE campaigns; ANALYZE generated_domains;`
   - Check query plans with `EXPLAIN ANALYZE`

3. **Application Errors After Migration**
   - Verify application code uses phases-based fields only
   - Check for remaining campaign_type/status references
   - Validate API responses match new schema

4. **Data Inconsistencies**
   - Run validation script: `\i scripts/migration/validate-migration.sql`
   - Check campaign-domain relationship integrity
   - Verify domain metrics calculations

### Emergency Contacts

- **Database Administrator**: For performance and schema issues
- **Development Team**: For application compatibility problems  
- **Migration Team**: For migration-specific problems and rollback decisions

## 📈 Monitoring & Maintenance

### Performance Monitoring
```sql
-- Weekly maintenance
SELECT maintain_phases_indexes();

-- Performance tracking
SELECT * FROM migration_performance_comparison;
```

### Regular Health Checks
```sql
-- Monthly data integrity check
\i scripts/migration/validate-migration.sql

-- Quarterly performance review
\i scripts/migration/performance-benchmark.sql
```

## 🎉 Migration Completion

Upon successful completion, the database will be:
- **40% faster** for phases-based queries
- **Architecturally clean** with single phases-based approach
- **Optimally indexed** for bulk domain processing
- **Fully validated** with comprehensive test coverage

The migration eliminates architectural conflicts and positions the system for efficient phases-based campaign processing at scale.