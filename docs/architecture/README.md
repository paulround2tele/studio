# Architecture Documentation

This directory contains comprehensive architecture documentation for the DomainFlow system.

## Core Architecture Documents

### System Redesigns

- **[EXTRACTION_ANALYSIS_REDESIGN_PLAN.md](./EXTRACTION_ANALYSIS_REDESIGN_PLAN.md)** - Comprehensive plan for modularizing extraction and analysis phases with new database tables and feature flags for gradual rollout

### Feature Management

- **[feature_flags.md](./feature_flags.md)** - Complete documentation of all feature flags, including the new Extraction → Analysis redesign flags and existing system flags

## Related Documentation

### API and System Design
- **[../API_SYSTEM_DOCUMENTATION.md](../API_SYSTEM_DOCUMENTATION.md)** - Complete API architecture and client integration patterns
- **[../../architecture.md](../../architecture.md)** - High-level system architecture and dependency diagrams

### Migration and Operations
- **[../../migration_plan.md](../../migration_plan.md)** - Service migration strategy and implementation plan
- **[../OPERATIONAL_RUNBOOK.md](../OPERATIONAL_RUNBOOK.md)** - Production operations and monitoring guide

## Current Implementation Status

### Extraction → Analysis Redesign
**Phase P0: Foundation** ✅ Complete
- [x] Comprehensive architecture plan created
- [x] Database migration for new tables (domain_extraction_features, domain_extracted_keywords)
- [x] Feature flag documentation and Go constants
- [x] Integration documentation completed

**Phase P1: Feature Extraction Table Integration** 🔄 Next
- [ ] Implement FeatureExtractionService writing to domain_extraction_features
- [ ] Add dual-write mode with feature flag control
- [ ] Wire EXTRACTION_FEATURE_TABLE_ENABLED into extraction flow

**Phase P2+: Future Phases** ⏳ Planned
- See [EXTRACTION_ANALYSIS_REDESIGN_PLAN.md](./EXTRACTION_ANALYSIS_REDESIGN_PLAN.md) for complete roadmap

## Architecture Principles

### Modularity
- Clear separation between extraction and analysis phases
- Independent scaling and optimization of each component
- Pluggable algorithms and strategies

### Safety and Reliability  
- Feature flags for gradual rollout and instant rollback
- Dual-write modes during migration phases
- Comprehensive fallback mechanisms

### Performance and Observability
- Strategic database indexing for common query patterns
- Processing state tracking and monitoring
- Detailed metrics and alerting for each phase

### Data Integrity
- Foreign key constraints ensure referential integrity
- Processing state enums provide clear workflow tracking
- Audit fields for troubleshooting and analysis

## Getting Started

1. **Understanding the System**: Start with [../API_SYSTEM_DOCUMENTATION.md](../API_SYSTEM_DOCUMENTATION.md) for overall system architecture
2. **Current Redesign**: Review [EXTRACTION_ANALYSIS_REDESIGN_PLAN.md](./EXTRACTION_ANALYSIS_REDESIGN_PLAN.md) for the ongoing modularization effort
3. **Feature Control**: Check [feature_flags.md](./feature_flags.md) for feature flag management and rollout strategies
4. **Implementation**: Follow the phase-by-phase implementation plan in the redesign document

## Contributing to Architecture

When adding new architecture documentation:

1. **Planning Documents**: Include comprehensive motivation, scope, and implementation phases
2. **Migration Strategies**: Document rollback procedures and safety measures
3. **Feature Flags**: Define feature flags for gradual rollout of new functionality
4. **Dependencies**: Clearly document dependencies between components and phases
5. **Success Metrics**: Define measurable success criteria for architecture changes

---

**Last Updated**: 2025-09-16  
**Next Review**: After Phase P1 completion