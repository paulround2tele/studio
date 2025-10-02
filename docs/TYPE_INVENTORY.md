# Type Inventory & Usage Governance

Authoritative catalog of generated API types and application-side domain helpers. Goal: eliminate ad‑hoc `any`/`unknown` wrappers and enforce direct use of generated models.

## Principles
1. Always prefer the generated OpenAPI type. No parallel hand-written interface with the same shape.
2. If a field is optional server-side, keep it optional client-side; never broaden to `any`.
3. A wrapper type is only allowed when composing multiple generated shapes (union/intersection) AND must be suffixed `Composite`.
4. Forbidden patterns (lint-enforced):
   - `as any` on values originating from API calls.
   - Custom interfaces whose property set is a strict superset/subset of a single generated model.
   - Casting to `unknown` immediately followed by object spreads into state.
5. Changes to generated models require regenerating the client (`npm run gen:all`) before adding local patches.

## Key Namespaces
| Domain | Generated Core Types | Typical Usage |
|--------|----------------------|---------------|
| Campaign | `CampaignResponse`, `CampaignStateWithExecutions`, `PhaseExecution`, `PhaseProgressSummary` | Redux store (`campaignSlice`), phase orchestration, dashboards |
| Bulk Ops | `BulkDnsvalidationRequest`, `BulkHttpvalidationRequest`, `BulkAnalyticsResponse`, `BulkResourceAllocationRequest`, `BulkResourceAllocationResponseAllocation` | Bulk operation initiation & progress views |
| Proxies | `Proxy`, `ProxyTestResponse`, `ProxiesBulkTestRequest`, `ProxiesHealthCheckAllRequest`, `ProxyPool`, `ProxyPoolDeleteResponse` | Proxy CRUD, health, pool management |
| Personas | `CreatePersonaRequest`, `PersonaConfigDetails`, `PersonaTestResponse` | Persona forms and validation |
| Scoring | `ScoringProfile`, `CreateScoringProfileRequest`, `DomainScoreBreakdownResponse` | Scoring configuration & results |
| Monitoring | `MonitoringCampaignLimitsRequest`, `PatternOffsetResponse` | Limit dashboards, pattern pagination |
| Security/Hardening | `RecommendationSeverity`, (plus feature-flag derived) | Recommendation & hardening services |

> NOTE: Full raw list resides in `src/lib/api-client/models/`. Use grep or your IDE symbol search.

## Mapping: Slice Fields -> Generated Types
| Slice Field | Type | Source |
|-------------|------|--------|
| `campaign.currentCampaign` | `CampaignResponse` | Generated |
| `bulkOperations.activeOperations[op].result` | Domain-specific JSON (DO NOT WRAP). Parse into discriminated union if/when stabilized. | API responses (varies) |
| `proxyApi` endpoints return | `Proxy`, `BulkProxyOperationResponse`, `BulkProxyTestResponse`, `ProxyTestResponse` | Generated |
| `pipelineExec.byCampaign[cid][phase]` | `PhaseExecRuntime` (local) containing `PipelinePhaseKey` | Local composite |

## Allowed Local Helper Types
| Name | Kind | Justification |
|------|------|---------------|
| `PhaseExecRuntime` | Narrow runtime state | Adds timestamps & status not present server-side |
| `BulkOperationResultSummary` | Minimal normalization facade | Temporary normalization until backend unifies result fields |

Any new helper must be added here or will be flagged by CI.

## Procedure: Replacing a Remaining `any`
1. Locate with ESLint (`@typescript-eslint/no-explicit-any`).
2. Determine data origin:
   - API response: import correct generated model.
   - Redux internal shape: define / reuse a local strongly typed interface.
3. If multiple alternative response variants: create discriminated union using existing generated types (no free-form catch‑all object).
4. Remove cast; rely on the return type of the client method. If client method returns `AxiosPromise<Model>`, use `response.data` directly.
5. Run `npm run typecheck` and `npm run lint`.

## Enforcement
Add (or keep) the following lint rules:
```jsonc
// eslint.config.js (conceptual snippet)
{
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",
    "no-restricted-syntax": ["error", {
      "selector": "TSAsExpression[typeAnnotation.typeName.name='any']",
      "message": "Do not cast to any; use generated type."
    }]
  }
}
```

CI script (pseudo):
```bash
#!/usr/bin/env bash
set -euo pipefail
grep -R "as any" src | grep -v "legacy" && { echo 'Found forbidden any cast'; exit 1; }
```

## Decision Log
| Date | Change | Rationale |
|------|--------|-----------|
| 2025-10-02 | Introduced inventory & governance doc | Prevent regression into ad-hoc wrapper types |

## Future Actions
- Generate a union `BulkOperationResult` once backend stabilizes field names (`processedCount` vs `domainsProcessed`).
- Add codegen post-hook that emits a JSON catalog consumed by a validation script.

---
This document is the single source of truth for model usage; deviations require an explicit PR note citing why the generated model is insufficient.
