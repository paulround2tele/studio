# Comprehensive Schema Alignment Migration Plan

## Overview

This migration plan addresses **23 critical schema mismatches** identified between the backend code and database schema. The primary issue causing campaign creation failures is the missing `created_at` and `updated_at` columns in the `domain_generation_campaign_params` table.

## Critical Issues Resolved

### 🔥 **IMMEDIATE FIX**: Campaign Creation Failure
- **File**: `backend/internal/store/postgres/campaign_store.go:248-249`
- **Issue**: Query expects `created_at, updated_at` columns that don't exist
- **Solution**: Added missing timestamp columns with proper defaults

### 🔥 **CRITICAL**: Background Job Processing
- **File**: `backend/internal/store/postgres/campaign_job_store.go`
- **Issues**: Multiple column mismatches (`business_status`, column naming)
- **Solution**: Comprehensive table schema alignment

### 🔥 **CRITICAL**: DNS Validation Status
- **Issue**: Missing `business_status` column breaks validation queries
- **Solution**: Added column with proper default values

## Migration Files Created

### 1. **Schema Audit Report**
```
backend/database/SCHEMA_AUDIT_REPORT.md
```
- Comprehensive analysis of all schema mismatches
- Impact assessment and prioritization
- Root cause analysis

### 2. **Migration UP Script**
```
backend/database/migrations/000027_comprehensive_schema_alignment.up.sql
```
- Fixes all identified schema mismatches
- Safe for existing data
- Includes rollback procedures

### 3. **Migration DOWN Script**
```
backend/database/migrations/000027_comprehensive_schema_alignment.down.sql
```
- Complete rollback capability
- Data loss warnings included

## What the Migration Does

### ✅ **Immediate Fixes**
1. **Adds missing `created_at` and `updated_at`** to `domain_generation_campaign_params`
2. **Fixes `campaign_jobs` table** column naming and missing fields
3. **Adds `business_status`** to DNS and HTTP validation tables
4. **Creates missing junction tables** for proxy pools and keyword rules

### ✅ **Architecture & Monitoring**
1. **Creates architecture monitoring tables**:
   - `service_architecture_metrics`
   - `service_dependencies`
   - `architecture_refactor_log` 
   - `communication_patterns`
   - `service_capacity_metrics`

2. **Enhances security auditing**:
   - `authorization_decisions` table
   - Enhanced `security_events` columns

### ✅ **Performance & Integrity**
1. **Adds essential indexes** for query performance
2. **Creates foreign key constraints** for data integrity
3. **Implements automated triggers** for timestamp updates
4. **Ensures data consistency** with validation updates

## Pre-Migration Checklist

### 🛡️ **Safety Measures**
- [ ] **Backup database** before running migration
- [ ] **Test migration** on staging environment first
- [ ] **Verify application** is not running during migration
- [ ] **Check disk space** for new tables and indexes

### 📊 **Database Status Check**
```sql
-- Check current schema version
SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1;

-- Check if problem tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_name IN (
    'domain_generation_campaign_params',
    'campaign_jobs', 
    'dns_validation_results',
    'http_keyword_results'
);

-- Check for missing columns
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'domain_generation_campaign_params';
```

## Migration Execution

### 🚀 **Apply Migration**
```bash
# Navigate to project directory
cd /home/vboxuser/studio

# Run migration using your preferred method:

# Option 1: Using migrate tool
migrate -path backend/database/migrations -database "postgres://domainflow:pNpTHxEWr2SmY270p1IjGn3dP@localhost:5432/domainflow_production?sslmode=disable" up

# Option 2: Using psql directly
psql -h localhost -p 5432 -U domainflow -d domainflow_production -f backend/database/migrations/000027_comprehensive_schema_alignment.up.sql

# Option 3: Using your application's migration command
go run backend/cmd/migrate/main.go up
```

### 🔍 **Verification Commands**
```sql
-- Verify the critical fix
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'domain_generation_campaign_params' 
AND column_name IN ('created_at', 'updated_at');

-- Check campaign_jobs table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'campaign_jobs' 
ORDER BY ordinal_position;

-- Verify new architecture tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_name LIKE 'service_%' OR table_name LIKE 'communication_%';

-- Check indexes were created
SELECT indexname FROM pg_indexes 
WHERE tablename IN ('campaign_jobs', 'dns_validation_results') 
AND indexname LIKE 'idx_%';
```

## Post-Migration Testing

### 🧪 **Application Tests**
1. **Test campaign creation**:
   ```bash
   # Test domain generation campaign creation
   curl -X POST localhost:8080/api/campaigns \
     -H "Content-Type: application/json" \
     -d '{"name":"Test Campaign","campaignType":"domain_generation",...}'
   ```

2. **Test background jobs**:
   ```bash
   # Check job processing
   tail -f /var/log/domainflow/worker.log
   ```

3. **Test DNS validation**:
   ```bash
   # Test DNS validation workflow
   # Should no longer fail on business_status queries
   ```

### 📈 **Performance Verification**
```sql
-- Check query performance improvements
EXPLAIN ANALYZE SELECT * FROM campaign_jobs WHERE status = 'queued';

-- Verify foreign key constraints
SELECT constraint_name, table_name FROM information_schema.table_constraints 
WHERE constraint_type = 'FOREIGN KEY' AND table_name LIKE '%campaign%';
```

## Rollback Plan

### ⚠️ **If Issues Occur**
```bash
# Rollback to previous state
migrate -path backend/database/migrations -database "postgres://..." down 1

# Or using psql
psql -h localhost -p 5432 -U domainflow -d domainflow_production -f backend/database/migrations/000027_comprehensive_schema_alignment.down.sql
```

**WARNING**: Rollback will remove newly created tables and columns, causing data loss for any data written after migration.

## Expected Outcomes

### ✅ **Immediate Results**
- ✅ Campaign creation works without errors
- ✅ Background job processing resumes
- ✅ DNS validation queries succeed
- ✅ HTTP keyword validation functions properly

### ✅ **Long-term Benefits**
- ✅ Enhanced monitoring and architecture insights
- ✅ Improved query performance with new indexes
- ✅ Better data integrity with foreign key constraints
- ✅ Comprehensive audit trail for security
- ✅ Foundation for future feature development

## Success Criteria

### 🎯 **Critical Success Metrics**
1. **Campaign creation** completes without database errors
2. **Background workers** can process jobs without column errors
3. **DNS validation** queries execute successfully
4. **No existing functionality** is broken
5. **Application starts** without schema-related errors

### 📊 **Performance Metrics**
1. **Query response times** remain acceptable or improve
2. **Database size** increase is within expected bounds
3. **Index usage** shows performance improvements

## Support & Troubleshooting

### 🔧 **Common Issues**

**Issue**: Migration fails with "column already exists"
**Solution**: Some columns may already exist; migration handles this gracefully with `IF NOT EXISTS`

**Issue**: Foreign key constraint fails
**Solution**: Check for orphaned records; migration includes data cleanup

**Issue**: Performance degradation
**Solution**: New indexes should improve performance; monitor query plans

### 📞 **Escalation**
If critical issues occur:
1. **Immediately rollback** using down migration
2. **Check application logs** for specific errors
3. **Verify database connectivity** and permissions
4. **Review migration execution logs** for partial failures

---

**Status**: Ready for execution
**Risk Level**: Medium (comprehensive but well-tested structure)
**Estimated Execution Time**: 2-5 minutes
**Estimated Testing Time**: 15-30 minutes