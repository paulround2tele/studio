# Discovery Lineage & Restart Semantics

## Overview

Discovery (domain generation) is **immutable** once executed. This document describes the transparency features and restart contract.

## Restart Contract

**"Re-run Validations"** restarts all phases **except** discovery:
- DNS Validation → re-runs
- HTTP Validation → re-runs  
- Keyword Matching → re-runs
- Analysis/Scoring → re-runs

**Discovery is preserved.** Generated domains are never deleted or regenerated.

## Preview Semantics

The `POST /api/v2/discovery/preview` endpoint returns:

| Field | Description |
|-------|-------------|
| `configHash` | SHA-256 hash of normalized pattern configuration |
| `totalCombinations` | Total possible domain combinations for this pattern |
| `nextOffset` | Next available offset (`last_offset + 1`). Generation starts here. |
| `exhaustionWarning` | `true` if `nextOffset + 10000 > totalCombinations` |
| `priorCampaigns[]` | Prior campaigns using the same pattern (auth-scoped to user) |

### Offset Contract

```
next_offset = last_offset + 1
```

The offset is stored in `domain_generation_config_states.last_offset` and is **global** across all campaigns using the same config hash.

## Lineage Tracking

Each campaign stores:
- `discovery_config_hash` - Links to global config state
- `discovery_offset_start` - First offset generated for this campaign
- `discovery_offset_end` - Last offset generated for this campaign

### Auth Scope

Lineage queries only return campaigns the authenticated user can access. This is enforced via `user_id` filter in SQL.

## Immutability Guard

If a campaign already has domains (`COUNT(generated_domains) > 0`), the discovery phase will reject re-execution with:

```
discovery phase is immutable: campaign {id} already has {count} domains generated
```

## Exhaustion Warning

The UI shows a warning when the pattern space is nearly exhausted. This helps operators understand when to switch to a new pattern.

Calculation:
```
exhaustionWarning = (nextOffset + typicalBatch) > totalCombinations
```

Where `typicalBatch = 10000` (configurable).

## Database Schema

```sql
-- Campaign lineage columns
ALTER TABLE lead_generation_campaigns ADD COLUMN discovery_config_hash VARCHAR(64);
ALTER TABLE lead_generation_campaigns ADD COLUMN discovery_offset_start BIGINT;
ALTER TABLE lead_generation_campaigns ADD COLUMN discovery_offset_end BIGINT;

-- Performance index
CREATE INDEX idx_lgc_discovery_config_hash ON lead_generation_campaigns(discovery_config_hash);
```

## Monitoring

Key metrics to monitor:
1. **Preview latency** - `POST /discovery/preview` response time
2. **Lineage query time** - LATERAL join can be slow with many domains
3. **Exhaustion rate** - How often patterns are exhausted

Query to check lineage performance:
```sql
EXPLAIN ANALYZE
SELECT c.id, c.name, ... 
FROM lead_generation_campaigns c
LEFT JOIN LATERAL (...) stats ON true
WHERE c.discovery_config_hash = 'abc123'
LIMIT 10;
```

## Rollback

To rollback discovery lineage features:

```sql
-- Down migration
ALTER TABLE lead_generation_campaigns DROP COLUMN IF EXISTS discovery_config_hash;
ALTER TABLE lead_generation_campaigns DROP COLUMN IF EXISTS discovery_offset_start;
ALTER TABLE lead_generation_campaigns DROP COLUMN IF EXISTS discovery_offset_end;
DROP INDEX IF EXISTS idx_lgc_discovery_config_hash;
```

Note: This removes lineage tracking but does not affect existing domains or restart behavior.
