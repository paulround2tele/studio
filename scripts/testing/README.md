# Enterprise-Scale Testing Infrastructure

## Overview

This comprehensive testing infrastructure provides enterprise-scale validation capabilities for the campaign processing system migration from campaign-type to phases-based architecture. The system supports tiered testing at multiple scales with automated execution, performance monitoring, and comprehensive reporting.

## 🎯 Performance Targets

- **99.5% SSE session reliability**
- **40% database query performance improvement** 
- **25% memory usage reduction**

## 📁 Component Architecture

```
scripts/testing/
├── 🏭 Data Generation
│   ├── synthetic-domain-factory.js     # Scalable synthetic domain generation
│   └── test-data-setup.sql            # Database schema and test data setup
├── 📊 Performance Testing
│   ├── performance-benchmarks.js      # Performance benchmarking framework
│   ├── memory-monitor.js              # Memory usage monitoring and leak detection
│   └── db-performance-test.sql        # Database performance testing procedures
├── 🔧 Environment Management
│   ├── test-environment-setup.sh      # Complete environment configuration
│   ├── test-environment-reset.sh      # Environment reset and provisioning
│   └── run-performance-tests.sh       # Automated test execution pipeline
├── 🧹 Cleanup & Maintenance
│   ├── test-cleanup.sh               # Comprehensive cleanup procedures
│   ├── data-retention-manager.js     # Automated data lifecycle management
│   └── cleanup-orchestrator.sh       # Unified cleanup interface
├── 📈 Reporting & Analysis
│   └── test-report-generator.js      # Comprehensive test reporting system
├── 🚀 CI/CD Integration
│   └── ../.github/workflows/migration-testing.yml  # GitHub Actions workflow
└── 📖 Documentation
    └── README.md                     # This comprehensive guide
```

## 🚀 Quick Start

### 1. Environment Setup
```bash
# Set up complete testing environment
./scripts/testing/test-environment-setup.sh

# Verify environment health
./scripts/testing/test-environment-setup.sh --health-check
```

### 2. Run Performance Tests
```bash
# Unit testing (1K domains)
./scripts/testing/run-performance-tests.sh --mode unit

# Integration testing (100K domains)  
./scripts/testing/run-performance-tests.sh --mode integration

# Stress testing (1M+ domains)
./scripts/testing/run-performance-tests.sh --mode stress
```

### 3. Generate Reports
```bash
# Generate comprehensive test report
node scripts/testing/test-report-generator.js \
  --input test-results/ \
  --output test-reports/ \
  --format all
```

### 4. Cleanup
```bash
# Quick daily cleanup
./scripts/testing/cleanup-orchestrator.sh daily

# Complete environment reset
./scripts/testing/cleanup-orchestrator.sh reset --force
```

## 📋 Testing Scales

### Unit Testing (1K domains)
- **Purpose**: Fast feedback during development
- **Duration**: ~2 minutes
- **Resources**: Minimal (< 100MB RAM)
- **Use Cases**: Pull request validation, local development

### Integration Testing (100K domains)
- **Purpose**: Realistic load simulation
- **Duration**: ~15 minutes  
- **Resources**: Moderate (< 1GB RAM)
- **Use Cases**: Pre-merge validation, staging deployment

### Stress Testing (1M+ domains)
- **Purpose**: Enterprise-scale validation
- **Duration**: ~60 minutes
- **Resources**: High (2-4GB RAM)
- **Use Cases**: Production readiness, performance baseline

## 🔧 Configuration

### Environment Variables
```bash
# Database Configuration
export DB_HOST=localhost
export DB_PORT=3306
export DB_USER=testuser
export DB_PASSWORD=testpass
export DB_NAME=studio

# Test Configuration
export TEST_SCALE=unit|integration|stress
export TEST_RETENTION_DAYS=7
export PERFORMANCE_BASELINE_FILE=baseline.json

# Resource Limits
export MAX_MEMORY_MB=2048
export MAX_CONCURRENT_CONNECTIONS=1000
export TEST_TIMEOUT_SECONDS=3600
```

### Test Data Patterns
```bash
# Enterprise pattern: realistic corporate domains
node scripts/testing/synthetic-domain-factory.js --pattern enterprise --count 1000

# Mixed pattern: diverse domain types
node scripts/testing/synthetic-domain-factory.js --pattern mixed --count 10000

# Performance pattern: optimized for load testing
node scripts/testing/synthetic-domain-factory.js --pattern performance --count 100000
```

## 🧪 Component Usage

### Synthetic Domain Factory
```bash
# Generate test domains with specific patterns
node scripts/testing/synthetic-domain-factory.js \
  --count 10000 \
  --pattern enterprise \
  --output domains.json \
  --batch-size 1000 \
  --include-metadata
```

### Performance Benchmarks
```bash
# Run comprehensive performance benchmarks
node scripts/testing/performance-benchmarks.js \
  --baseline baseline.json \
  --output results.json \
  --targets sse_reliability:99.5,database:40,memory:25
```

### Memory Monitor
```bash
# Real-time memory monitoring with leak detection
node scripts/testing/memory-monitor.js \
  --duration 600 \
  --interval 5 \
  --leak-detection \
  --output memory-report.json
```

### SSE Reliability Audit
```bash
# Validate SSE delivery stability and reconnection resilience
node scripts/testing/performance-benchmarks.js \
  --baseline baseline.json \
  --output sse-reliability.json \
  --targets sse_reliability:99.5 \
  --focus realtime
```

### Database Performance Testing
```bash
# Execute database performance test suite
mysql -u testuser -p < scripts/testing/db-performance-test.sql
```

## 🧹 Cleanup & Maintenance

### Cleanup Orchestrator
```bash
# Quick cleanup (temp files, recent data)
./scripts/testing/cleanup-orchestrator.sh quick

# Daily maintenance (7-day retention)
./scripts/testing/cleanup-orchestrator.sh daily

# Weekly deep cleanup (30-day retention)
./scripts/testing/cleanup-orchestrator.sh weekly

# Emergency resource recovery
./scripts/testing/cleanup-orchestrator.sh emergency

# Pre-test environment preparation
./scripts/testing/cleanup-orchestrator.sh pre-test

# Post-test cleanup and archival
./scripts/testing/cleanup-orchestrator.sh post-test

# Complete environment reset
./scripts/testing/cleanup-orchestrator.sh reset --force
```

### Data Retention Manager
```bash
# Automated data lifecycle management
node scripts/testing/data-retention-manager.js \
  --policies test_data,performance_data,log_files \
  --retention 7 \
  --dry-run

# Schedule automated cleanup
node scripts/testing/data-retention-manager.js \
  --schedule "0 2 * * *"
```

### Environment Reset
```bash
# Quick reset (preserve base images)
./scripts/testing/test-environment-reset.sh --quick

# Complete reset (rebuild everything)
./scripts/testing/test-environment-reset.sh --full-reset --force

# Database-only reset
./scripts/testing/test-environment-reset.sh --database-only

# Containers-only reset
./scripts/testing/test-environment-reset.sh --containers-only
```

## 📊 Reporting & Analysis

### Test Report Generator
```bash
# Generate comprehensive HTML report
node scripts/testing/test-report-generator.js \
  --input test-results/ \
  --output test-reports/ \
  --format html \
  --include-trends \
  --compare-baseline

# Generate JSON data for dashboards
node scripts/testing/test-report-generator.js \
  --input test-results/ \
  --output dashboard-data.json \
  --format json \
  --targets sse_reliability:99.5,database:40,memory:25

# Generate Markdown summary
node scripts/testing/test-report-generator.js \
  --input test-results/ \
  --output TESTING_SUMMARY.md \
  --format markdown \
  --include-recommendations
```

### Report Types
- **HTML Reports**: Comprehensive interactive dashboards
- **JSON Reports**: Machine-readable data for integration
- **Markdown Reports**: Human-readable summaries for documentation
- **CSV Exports**: Raw data for external analysis

## 🚀 CI/CD Integration

### GitHub Actions Workflow
The testing infrastructure integrates with GitHub Actions for automated validation:

```yaml
# Trigger on pull requests and pushes
on: [push, pull_request, schedule]

# Multi-stage pipeline
stages:
  - Environment Setup
  - Unit Testing (1K domains)
  - Integration Testing (100K domains)  
  - Stress Testing (1M+ domains)
  - Performance Validation
  - Report Generation
  - Cleanup
```

### Automated Go/No-Go Decisions
- **Unit Tests**: Must pass with 0 errors
- **Performance Targets**: Must meet 99.5%/40%/25% improvements
- **Resource Usage**: Must stay within defined limits
- **Error Rate**: Must be < 0.1%

## 🔍 Monitoring & Alerting

### Performance Metrics
- **SSE Reliability**: Stream continuity, reconnection latency
- **Database Performance**: Query execution time, index usage
- **Memory Usage**: Heap size, garbage collection, leak detection
- **System Resources**: CPU, disk, network utilization

### Alerting Thresholds
- **Memory Usage**: > 80% of allocated limit
- **Test Duration**: > 150% of expected time
- **Error Rate**: > 0.1% of operations
- **Disk Space**: < 10% available

## 🔧 Troubleshooting

### Common Issues

#### Environment Setup Failures
```bash
# Check Docker daemon
docker info

# Verify database connectivity
mysql -u testuser -p -h localhost -e "SELECT 1;"

# Check disk space
df -h
```

#### Performance Test Failures
```bash
# Check resource usage
free -h
top -p $(pgrep -f "node.*performance")

# Verify test data
ls -la test-data/
wc -l test-data/*.json
```

#### Memory Issues
```bash
# Monitor memory usage
node scripts/testing/memory-monitor.js --duration 60

# Check for memory leaks
node --inspect scripts/testing/performance-benchmarks.js
```

### Log Files
- **Main Logs**: `logs/test-execution-*.log`
- **Performance Logs**: `logs/performance-*.log`
- **Error Logs**: `logs/error-*.log`
- **Cleanup Logs**: `logs/cleanup-*.log`

## 📈 Performance Optimization

### Database Optimization
```sql
-- Monitor slow queries
SELECT * FROM performance_schema.events_statements_summary_by_digest 
WHERE AVG_TIMER_WAIT > 1000000000 
ORDER BY AVG_TIMER_WAIT DESC;

-- Index optimization
ANALYZE TABLE domains, campaigns, campaign_phases;
OPTIMIZE TABLE domains, campaigns, campaign_phases;
```

### Memory Optimization
```bash
# Node.js memory tuning
export NODE_OPTIONS="--max-old-space-size=2048"

# Garbage collection optimization
export NODE_OPTIONS="--gc-interval=100"
```

### Parallel Execution
```bash
# Enable parallel cleanup
./scripts/testing/cleanup-orchestrator.sh weekly --parallel

# Parallel test execution
./scripts/testing/run-performance-tests.sh --mode integration --parallel
```

## 🔒 Security Considerations

### Test Data Security
- All test data uses synthetic domains
- No production data is used in testing
- Test credentials are isolated from production
- Automated cleanup removes sensitive test artifacts

### Access Control
- Test environments are isolated from production
- Database users have minimal required privileges
- Test data retention policies enforce automatic cleanup

## 📚 API Reference

### Command Line Interfaces

#### Test Environment Setup
```bash
./scripts/testing/test-environment-setup.sh [OPTIONS]
  --health-check          Verify environment health
  --force                 Force setup without prompts
  --database-only         Setup only database components
  --docker-only           Setup only Docker components
```

#### Performance Test Runner
```bash
./scripts/testing/run-performance-tests.sh [OPTIONS]
  --mode SCALE           Testing scale: unit|integration|stress
  --targets TARGETS      Performance targets (sse_reliability:99.5,database:40,memory:25)
  --baseline FILE        Baseline performance data file
  --output DIR           Results output directory
  --parallel             Enable parallel execution
  --no-cleanup           Skip post-test cleanup
```

#### Cleanup Orchestrator
```bash
./scripts/testing/cleanup-orchestrator.sh [SCENARIO] [OPTIONS]
  SCENARIOS: quick|daily|weekly|pre-test|post-test|emergency|migration|reset|custom
  --dry-run              Preview changes without executing
  --force                Force operations without confirmation
  --retention DAYS       Override default retention period
  --parallel             Enable parallel cleanup operations
  --report               Generate detailed cleanup report
```

### Node.js APIs

#### Synthetic Domain Factory
```javascript
const DomainFactory = require('./synthetic-domain-factory.js');

const factory = new DomainFactory({
  pattern: 'enterprise',
  batchSize: 1000,
  includeMetadata: true
});

const domains = await factory.generateDomains(10000);
```

#### Performance Benchmarks
```javascript
const Benchmarks = require('./performance-benchmarks.js');

const benchmarks = new Benchmarks({
  baseline: 'baseline.json',
  targets: { sse_reliability: 99.5, database: 40, memory: 25 }
});

const results = await benchmarks.runBenchmarks();
```

## 🎯 Migration Validation

### Pre-Migration Baseline
```bash
# Establish performance baseline
./scripts/testing/run-performance-tests.sh --mode integration --baseline-mode

# Generate baseline report
node scripts/testing/test-report-generator.js \
  --baseline-only \
  --output baseline-report.html
```

### Post-Migration Validation
```bash
# Validate migration improvements
./scripts/testing/run-performance-tests.sh \
  --mode integration \
  --compare-baseline baseline.json

# Generate comparison report
node scripts/testing/test-report-generator.js \
  --compare-baseline \
  --targets sse_reliability:99.5,database:40,memory:25
```

### Success Criteria
- ✅ **SSE Reliability**: 99.5% session continuity confirmed
- ✅ **Database Performance**: 40% improvement verified
- ✅ **Memory Usage**: 25% reduction validated
- ✅ **System Stability**: No regression in error rates
- ✅ **Migration Completeness**: All legacy code paths removed

## 🔄 Continuous Improvement

### Automated Optimization
- Performance baselines are automatically updated after successful migrations
- Test data patterns evolve based on production workload analysis
- Resource allocation adjusts based on historical test execution times

### Feedback Loop
- Test results feed back into development planning
- Performance trends guide optimization priorities
- Resource usage patterns inform infrastructure scaling decisions

## 📞 Support & Maintenance

### Regular Maintenance Tasks
1. **Daily**: Automated cleanup via scheduled orchestrator
2. **Weekly**: Deep cleanup and baseline updates
3. **Monthly**: Performance trend analysis and optimization
4. **Quarterly**: Infrastructure capacity planning review

### Contact Information
- **Test Infrastructure Issues**: Check logs in `logs/` directory
- **Performance Questions**: Review reports in `test-reports/` directory
- **Environment Problems**: Run health check diagnostics

---

*This testing infrastructure provides comprehensive enterprise-scale validation capabilities ensuring reliable migration from campaign-type to phases-based architecture while meeting ambitious performance improvement targets.*