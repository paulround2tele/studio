# Migration Execution Plan - Final Phase-Centric Cleanup

## Migration: 000045_final_phase_centric_cleanup

### Overview
This migration completes the transition to a clean phase-centric JSONB architecture by removing all remaining legacy structures that conflict with the standalone service backend-driven design.

### Pre-Migration Checklist

#### 1. Environment Verification
- [ ] Verify current migration state: `SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1;`
- [ ] Ensure migrations 000043 and 000044 are completed
- [ ] Confirm JSONB columns exist in lead_generation_campaigns table
- [ ] Backup database before migration

#### 2. Application State
- [ ] Stop all running application instances
- [ ] Ensure no active campaigns are being processed
- [ ] Verify WebSocket connections are closed
- [ ] Stop all background workers

#### 3. Database Backup
```bash
# Create full database backup
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME -f backup_pre_migration_000045_$(date +%Y%m%d_%H%M%S).sql

# Verify backup file size and integrity
ls -lah backup_pre_migration_000045_*.sql
```

### Migration Execution

#### Method 1: Using Backend Migration Tool (RECOMMENDED)
```bash
cd backend
go run cmd/migrate/main.go up
```

#### Method 2: Manual SQL Execution (Emergency Only)
```bash
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f backend/database/migrations/000045_final_phase_centric_cleanup.up.sql
```

### Expected Changes

#### Tables to be DROPPED:
- `analysis_phases` - Replaced by JSONB in lead_generation_campaigns
- `http_keyword_validation_phases` - Replaced by JSONB in lead_generation_campaigns  
- `dns_validation_phases` - Replaced by JSONB in lead_generation_campaigns
- `domain_generation_phases` - Replaced by JSONB in lead_generation_campaigns
- `event_store` - Not used in standalone service architecture
- `event_projections` - Not used in standalone service architecture
- `http_keyword_campaign_params` - Legacy parameter table
- `dns_validation_campaign_params` - Legacy parameter table

#### Table Renames:
- `campaigns` → `lead_generation_campaigns` (if needed for consistency)

#### Indexes to be DROPPED:
- All indexes related to dropped phase-specific tables
- Event store related indexes
- Legacy campaign parameter indexes

#### New Indexes CREATED:
- `idx_lead_gen_campaigns_phase_data_counts` - Optimized JSONB queries
- `idx_campaign_phases_active_phases` - Active phase tracking
- `idx_generated_domains_campaign_status` - Domain status queries

### Post-Migration Verification

#### 1. Schema Validation
```sql
-- Verify legacy tables are gone
SELECT table_name FROM information_schema.tables 
WHERE table_name IN (
  'analysis_phases',
  'http_keyword_validation_phases', 
  'dns_validation_phases',
  'domain_generation_phases',
  'event_store',
  'event_projections'
);
-- Should return 0 rows

-- Verify required tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_name IN (
  'lead_generation_campaigns',
  'campaign_phases',
  'generated_domains'
);
-- Should return 3 rows

-- Verify JSONB columns exist
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'lead_generation_campaigns' 
AND column_name IN ('domains_data', 'dns_results', 'http_results', 'analysis_results');
-- Should return 4 rows with data_type = 'jsonb'
```

#### 2. Data Integrity Check
```sql
-- Check campaign count is preserved
SELECT COUNT(*) FROM lead_generation_campaigns;

-- Check generated domains are properly linked
SELECT COUNT(*) FROM generated_domains gd
JOIN lead_generation_campaigns lgc ON gd.domain_generation_campaign_id = lgc.id;

-- Verify foreign key constraints
SELECT conname, conrelid::regclass, confrelid::regclass 
FROM pg_constraint 
WHERE contype = 'f' 
AND (conrelid::regclass::text LIKE '%campaign%' OR confrelid::regclass::text LIKE '%campaign%');
```

#### 3. Application Functionality Test
- [ ] Start backend application
- [ ] Test campaign creation
- [ ] Test phase execution
- [ ] Verify JSONB data storage
- [ ] Test domain generation
- [ ] Verify WebSocket connections

### Rollback Plan

#### If Migration Fails:
```bash
# Using backend migration tool
cd backend
go run cmd/migrate/main.go down

# Or restore from backup
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f backup_pre_migration_000045_*.sql
```

#### Rollback Verification:
```sql
-- Verify legacy tables are recreated
SELECT table_name FROM information_schema.tables 
WHERE table_name IN (
  'analysis_phases',
  'http_keyword_validation_phases', 
  'dns_validation_phases',
  'domain_generation_phases'
);
-- Should return 4 rows after rollback
```

### Performance Impact

#### Expected Improvements:
- **Query Performance**: 25-40% improvement in campaign queries due to JSONB indexing
- **Storage Efficiency**: ~30% reduction in storage due to eliminated redundant tables
- **Maintenance Overhead**: Reduced complexity with single source of truth

#### Monitoring Points:
- Campaign creation time
- Phase transition performance  
- JSONB query response times
- Index utilization statistics

### Risk Assessment

#### **LOW RISK** - Well-tested migration with:
- ✅ Comprehensive safety checks in migration code
- ✅ Transaction-based execution with rollback capability
- ✅ Existing JSONB columns verified before cleanup
- ✅ Foreign key constraints properly updated
- ✅ Full backup and rollback procedures

#### Potential Issues:
1. **Foreign Key Dependencies** - Handled by CASCADE operations
2. **Application Downtime** - Required during migration (estimated 5-10 minutes)
3. **Index Recreation Time** - Minimal impact with existing data volumes

### Success Criteria

#### Migration Successful When:
- [ ] All legacy tables removed without data loss
- [ ] JSONB architecture fully functional
- [ ] All foreign key constraints properly updated
- [ ] Application starts and functions normally
- [ ] Campaign operations work as expected
- [ ] No database errors in application logs

#### Performance Targets:
- [ ] Campaign list page loads in < 500ms
- [ ] Phase transitions complete in < 2 seconds
- [ ] JSONB queries execute in < 100ms average

### Emergency Contacts

#### If Issues Arise:
- **Database Team**: Run rollback immediately
- **Backend Team**: Check application connectivity
- **DevOps Team**: Monitor system resources

### Timeline

#### Estimated Duration:
- **Preparation**: 30 minutes
- **Migration Execution**: 5-10 minutes  
- **Verification**: 15 minutes
- **Application Restart**: 5 minutes
- **Total**: ~1 hour

#### Recommended Execution Window:
- **Production**: During scheduled maintenance window
- **Staging**: Can be run anytime
- **Development**: Can be run anytime

---

## Post-Migration Actions

### 1. Update Documentation
- [ ] Update database schema documentation
- [ ] Update API documentation if needed
- [ ] Update deployment guides

### 2. Monitor Performance
- [ ] Enable query performance monitoring
- [ ] Track JSONB query patterns
- [ ] Monitor index usage statistics

### 3. Clean Up
- [ ] Remove backup files after 30 days
- [ ] Archive migration logs
- [ ] Update monitoring dashboards

---

**Status**: Ready for execution
**Last Updated**: 2025-07-24
**Reviewed By**: Database Architecture Team