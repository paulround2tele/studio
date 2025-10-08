# Type Inventory & Usage Governance

Authoritative catalog of generated API types and application-side domain helpers. Goal: eliminate ad‑hoc `any`/`unknown` wrappers and enforce direct use of generated models; reach and maintain 0 unapproved `any`.

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
Implemented tooling (Phase 1):

| Layer | Mechanism | Status |
|-------|-----------|--------|
| Lint  | `@typescript-eslint/no-explicit-any` = error (production code) | Active |
| Lint  | `no-restricted-syntax` ban on casts/annotations to `any` | Active |
| Audit | `scripts/type-audit/scan-any.ts` produces `docs/allAnyUsages.json` | Active |
| CI    | `npm run ci:check:any` (fails if total > 0) | Pending integration |

Run audit:
```
npm run audit:any
```

Raw baseline (initial snapshot during remediation):
```
grep -R -n -E "(: any|as any)" src > docs/any-baseline.txt
```

`any` usage categories in JSON report: annotation vs cast; grouped by location (app/components/services/store/api/other).

Guidance for remaining edge cases: prefer `unknown` + schema (e.g., Zod) for truly dynamic external payloads.

## Exemptions (Should Remain Empty)
| File | Line | Justification | Tracking Issue |
|------|------|---------------|----------------|
| *(none)* |  |  |  |

Any proposed exemption must include a narrowing plan & link to an issue; update this table in the PR.

## Decision Log
| Date | Change | Rationale |
|------|--------|-----------|
| 2025-10-02 | Introduced inventory & governance doc | Prevent regression into ad-hoc wrapper types |
| 2025-10-03 | Elevated any enforcement; added scan-any audit & CI scripts | Begin formal remediation (Phase 1) |
| 2025-10-07 | Phase 4 low-severity remediation: 237→156 instances (34% reduction) | Major cleanup of catch clauses, window casting, form data, component props, service parameters |

## Future Actions
- Generate a union `BulkOperationResult` once backend stabilizes field names (`processedCount` vs `domainsProcessed`).
- Add codegen post-hook that emits a JSON catalog consumed by a validation script.

---
This document is the single source of truth for model usage; deviations require an explicit PR note citing why the generated model is insufficient.
