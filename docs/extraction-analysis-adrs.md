# Extraction → Analysis Architecture Decision Records

## ADR-001: Migration from Legacy to Modular Extraction/Analysis Pipeline

**Status:** Implemented  
**Date:** 2024-01-11  
**Deciders:** Engineering Team  

### Context

The existing domain analysis system tightly coupled feature extraction with analysis logic, making it difficult to:
- Scale extraction independently from analysis
- Implement sophisticated extraction techniques (microcrawl, ML-based features)
- Maintain different scoring profiles simultaneously
- Audit and debug extraction vs analysis issues

### Decision

We decided to implement a modular extraction-analysis pipeline with:

1. **Separate Extraction Tables:**
   - `domain_extraction_features` - Core feature storage
   - `domain_extracted_keywords` - Detailed keyword storage
   - Clear processing states (pending → building → ready → error/stale)

2. **Scoring Profile Snapshots:**
   - Versioned scoring configurations
   - Stale score detection and re-scoring triggers
   - Historical tracking of scoring changes

3. **Event-Driven Architecture:**
   - Standardized phase events for extraction sub-steps
   - SSE broadcasting for real-time progress updates
   - Rate-limited event system with metrics

### Consequences

**Positive:**
- Clear separation of concerns between extraction and analysis
- Ability to re-score domains without re-extracting
- Comprehensive audit trail for both extraction and scoring
- Real-time progress visibility
- Scalable event system

**Negative:**
- Increased database storage requirements
- Additional complexity in deployment
- Need for data migration from legacy system

**Mitigations:**
- Storage optimization policies implemented
- Dual-read system for gradual migration
- Comprehensive monitoring and alerting

---

## ADR-002: Feature Vector Governance System

**Status:** Implemented  
**Date:** 2024-01-11  
**Deciders:** Engineering Team  

### Context

Feature vectors in the legacy system could contain arbitrary keys, leading to:
- Inconsistent feature schemas across domains
- Difficulty in maintaining analysis algorithms
- Risk of data leakage from experimental features

### Decision

Implemented a governance system with:

1. **Allowed Features Registry:**
   ```go
   var AllowedFeatureKeys = map[string]struct{}{
       "kw_unique":             {},
       "kw_hits_total":         {},
       "content_bytes":         {},
       "richness":              {},
       "microcrawl_gain_ratio": {},
       "parked_confidence":     {},
   }
   ```

2. **Validation Function:**
   - Strict validation of feature vector keys
   - Exception for experimental keys with `exp_` prefix
   - Clear error messages for violations

3. **Periodic Governance Scheduler:**
   - Automated scanning for violations
   - Metrics collection for compliance monitoring
   - Configurable violation thresholds and alerting

### Consequences

**Positive:**
- Consistent feature schemas across all domains
- Clear contract for analysis algorithms
- Easy detection of schema violations
- Support for controlled experimentation

**Negative:**
- Requires coordination when adding new features
- Additional validation overhead

**Mitigations:**
- Experimental key prefix for rapid prototyping
- Comprehensive documentation of allowed features
- Automated governance reporting

---

## ADR-003: Microcrawl Adaptive Strategy

**Status:** Implemented  
**Date:** 2024-01-11  
**Deciders:** Engineering Team  

### Context

Single-page domain analysis often missed important keywords and context. Previous attempts at crawling were either too aggressive (causing performance issues) or too conservative (missing valuable data).

### Decision

Implemented an adaptive microcrawl strategy:

1. **Gating Function:**
   - Content richness threshold check
   - Keyword diversity gap analysis
   - Expected marginal gain estimation
   - Composite scoring for crawl decision

2. **Budget-Limited Crawling:**
   - Maximum pages per domain (default: 3)
   - Same-domain link discovery only
   - Timeout protection and error handling
   - Diminishing returns detection

3. **Keyword Integration:**
   - Weight reduction for secondary page keywords
   - Frequency aggregation across pages
   - Source type tagging for crawled content

### Consequences

**Positive:**
- Significantly improved keyword coverage for eligible domains
- Controlled resource usage through adaptive gating
- Measurable gain ratios for optimization

**Negative:**
- Increased extraction time for crawled domains
- Additional HTTP requests and bandwidth usage
- Complexity in keyword weight attribution

**Mitigations:**
- Strict budget limits and timeouts
- Comprehensive metrics for performance monitoring
- Configurable gating thresholds via environment variables

---

## ADR-004: Storage Optimization Strategy

**Status:** Implemented  
**Date:** 2024-01-11  
**Deciders:** Engineering Team  

### Context

The new modular system stores significantly more data than the legacy system, particularly for keywords. Without optimization, storage costs would grow unsustainably.

### Decision

Implemented a multi-tier storage optimization strategy:

1. **Keyword Pruning Policies:**
   - Low-impact removal (minimal frequency/weight thresholds)
   - Aggressive cleanup (higher thresholds, age-based)
   - Archive preparation (maximum compression)

2. **Automated Scheduling:**
   - Periodic optimization runs
   - Campaign age-based policy selection
   - Configurable intervals and thresholds

3. **Metrics and Monitoring:**
   - Storage growth tracking per campaign
   - Compression ratio measurement
   - Reclaimed space reporting

### Consequences

**Positive:**
- Controlled storage growth even with detailed data
- Automatic cleanup without manual intervention
- Measurable storage optimization results

**Negative:**
- Risk of losing potentially valuable keywords
- Additional complexity in data lifecycle management
- Performance impact during optimization runs

**Mitigations:**
- Conservative pruning policies by default
- Preservation of high-value keywords (title, h1, meta)
- Comprehensive monitoring and alerting for optimization effectiveness

---

## ADR-005: Event Harmonization Architecture

**Status:** Implemented  
**Date:** 2024-01-11  
**Deciders:** Engineering Team  

### Context

The extraction pipeline involves multiple sub-steps that needed better visibility and monitoring. The existing system provided limited insight into extraction progress and bottlenecks.

### Decision

Implemented a comprehensive event system:

1. **Standardized Event Schema:**
   ```go
   type PhaseEvent struct {
       EventID        string
       CampaignID     string
       EventType      string  // phase_start, phase_progress, phase_complete
       Phase          string  // extraction, keyword_processing, microcrawl
       SubStep        string  // http_fetch, content_parse, keyword_extract
       Status         string  // pending, running, completed, failed
       Progress       *float64
       Metadata       map[string]interface{}
       Timestamp      time.Time
   }
   ```

2. **Broadcasting Infrastructure:**
   - Event handler registration system
   - Rate limiting to prevent overwhelming
   - SSE integration for real-time updates
   - Metrics collection for event volume and latency

3. **Integration Points:**
   - Extraction sub-step start/end events
   - Domain-level progress updates
   - Campaign-level phase transitions
   - Error and exception reporting

### Consequences

**Positive:**
- Complete visibility into extraction pipeline
- Real-time progress updates for users
- Detailed metrics for performance optimization
- Standardized event format for integrations

**Negative:**
- Increased event volume and processing overhead
- Risk of event flooding under high load
- Additional complexity in event handling logic

**Mitigations:**
- Rate limiting and backpressure handling
- Configurable event levels and filtering
- Asynchronous event processing to avoid blocking extraction

---

## Implementation Notes

### Migration Strategy
1. **Dual-Read Phase:** Both legacy and new systems active, results compared
2. **Gradual Cutover:** Feature flags control which system is authoritative
3. **Legacy Cleanup:** Remove legacy code after validation period

### Performance Targets
- Extraction latency: <2s per domain (non-microcrawl)
- Microcrawl latency: <10s per domain
- Event latency: <100ms end-to-end
- Storage growth: <50MB per 1000 domains

### Monitoring and Alerting
- Prometheus metrics for all major operations
- Grafana dashboards for operational visibility
- PagerDuty integration for critical failures
- Weekly optimization reports

### Configuration Management
- Environment variable based configuration
- Runtime configuration updates where safe
- Configuration validation on startup
- Documentation for all configuration options