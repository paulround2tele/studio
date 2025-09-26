# API Contract Migration Plan (Hybrid Optimized – Option B)

Status: Draft (Ready for Team Review)  
Owner: (Assign)  
Created: 2025-01-25  
Last Updated: (Set on commit)  
Decision Reference: Option B (Resource Bodies for 2xx, Error Envelope for non‑2xx)

---

## 1. Executive Summary

We are eliminating legacy “success/data” envelopes for successful responses and standardizing:
- 2xx → direct resource (object or array) with no `success` or `data` wrapper.
- 4xx/5xx → consistent `ErrorEnvelope`:
  ```json
  {
    "error": { "code": "VALIDATION", "message": "Field X invalid", "details": {...} },
    "requestId": "req-12345"
  }
  ```
- `requestId` provided as header `X-Request-Id` (not in 2xx body).
- No transitional multi-week flag sprawl; minimize dual-mode windows.
- CI + runtime drift guardrails prevent regression (ban `SuccessEnvelope` for 2xx).
- Fast, domain-sliced rollout with early deletion of compatibility layer.

---

## 2. Goals / Non-Goals

Goals:
1. All success responses are resource bodies, strongly typed.
2. Eliminate `extractResponseData`, double wrapping logic, and `as any` casts in RTK layers.
3. Introduce hardened OpenAPI spec with no `SuccessEnvelope` referencing any 200-level schema.
4. Unified error code taxonomy and base error translator in frontend.
5. Pagination contract decided and enforced early.
6. Drift detection via CI scripts + (dev-only) runtime warning + optional metric.
7. Endpoint manifest ensuring visibility & sequencing.
8. Removal timeline for transitional artifacts (adapter, flags) enforced.

Non-Goals:
- Refactor unrelated business logic.
- Introduce GraphQL or protocol changes.
- Performance optimization beyond removing unnecessary transforms.

---

## 3. Canonical Contracts

### 3.1 Success (Examples)
```
GET /api/v2/personas             -> PersonaResponse[]
GET /api/v2/campaigns            -> CampaignSummary[]
GET /api/v2/campaigns/{id}       -> CampaignDetail
GET /api/v2/campaigns/{id}/metrics -> CampaignMetrics
GET /api/v2/bulk/{id}/status     -> BulkOpStatus
POST /api/v2/auth/login          -> AuthSession
GET /api/v2/auth/me              -> AuthSession
GET /api/v2/health               -> { "status": "ok", "version": "x.y.z" }
```

### 3.2 Errors
```json
{
  "error": {
    "code": "VALIDATION",
    "message": "Invalid campaign id",
    "details": { "id": "Must be a UUID" }
  },
  "requestId": "req-7b12d..."
}
```

### 3.3 Error Code Enum (Finalize in Phase A)
`AUTH`, `UNAUTHORIZED`, `FORBIDDEN`, `VALIDATION`, `NOT_FOUND`, `CONFLICT`, `RATE_LIMIT`, `TIMEOUT`, `UPSTREAM`, `UNAVAILABLE`, `INTERNAL`, `UNKNOWN`

### 3.4 Pagination (Decision: Pattern B Selected)
- [ ] Pattern A: Link headers (+ `X-Total-Count`)
- [x] Pattern B (Recommended): Body wrapper:
  ```
  { "items": T[], "page": 1, "pageSize": 25, "total": 137 }
  ```
  (No envelope; only this minimal structural wrapper.)

---

## 4. Endpoint Manifest (Source of Truth)

Create file: `docs/api_endpoint_manifest.json` (tracked & updated each PR).

Structure:
```json
{
  "personas.list":        { "path": "/api/v2/personas", "method": "GET", "status": "pending", "notes": "" },
  "campaigns.list":       { "path": "/api/v2/campaigns", "method": "GET", "status": "pending", "notes": "" },
  "campaigns.detail":     { "path": "/api/v2/campaigns/{id}", "method": "GET", "status": "pending", "notes": "" },
  "campaigns.metrics":    { "path": "/api/v2/campaigns/{id}/metrics", "method": "GET", "status": "pending", "notes": "" },
  "bulk.status":          { "path": "/api/v2/bulk/{id}/status", "method": "GET", "status": "pending", "notes": "" },
  "auth.login":           { "path": "/api/v2/auth/login", "method": "POST", "status": "pending", "notes": "" },
  "auth.me":              { "path": "/api/v2/auth/me", "method": "GET", "status": "pending", "notes": "" },
  "proxies.pools":        { "path": "/api/v2/proxies/pools", "method": "GET", "status": "pending", "notes": "" },
  "health":               { "path": "/api/v2/health", "method": "GET", "status": "pending", "notes": "" }
}
```

Statuses: `pending | in_progress | migrated | verified | deprecated`.

---

## 5. Phased Rollout (Compressed & Enforced)

| Phase | Days | Scope | Key Outputs | Dual-Mode Window |
|-------|------|-------|-------------|------------------|
| A | 1–3 | Open questions + Pilot domain + ErrorEnvelope infra | Updated spec, manifest, pilot slice migrated | Only pilot slice |
| B | 4–8 | Core read domains (campaigns list/detail, metrics, bulk) | Spec & handlers updated; FE slices migrated | ≤ 5 days |
| C | 9–12 | Auth (login, me), proxies, health | AuthSession stable; legacy casing removed | ≤ 3 days |
| D | 13–15 | Remove adapter & envelope helpers | Delete transitional code | 0 after Day 15 |
| E | 16–18 | Contract tests + metrics stabilization | Drift = 0; alias CI green | N/A |
| F | 19–20 | Docs + ADR + freeze + retro | ADR merged; docs updated | None |

Hard Stop: After Day 15, any PR introducing envelope logic rejected.

---

## 6. Phase A (Detailed)

### Objectives
- Lock decisions: pagination, error codes, AuthSession structure.
- Update spec for pilot domain (choose: Personas or Campaigns).
- Implement ErrorEnvelope + requestId header middleware.
- Add dev-only response shape logger.

### Tasks
- [ ] A.1 Approve pagination & error code enum.
- [ ] A.2 Add `ErrorEnvelope` schema to OpenAPI.
- [ ] A.3 Replace `SuccessEnvelope` for pilot domain 200 responses with real schemas.
- [ ] A.4 Implement `RequestIdMiddleware` (if missing).
- [ ] A.5 Implement `ErrorHandlingMiddleware`.
- [ ] A.6 Create `scripts/ci/check-response-aliases.js`.
- [ ] A.7 Create `scripts/ci/check-success-key-2xx.js`.
- [ ] A.8 Regenerate client.
- [ ] A.9 Migrate pilot RTK slice (remove `extractResponseData`).
- [ ] A.10 Add transitional `normalizeResponse.ts` (used only by next slice if needed).
- [ ] A.11 Update manifest (pilot status = migrated).
- [ ] A.12 Add contract checklist to PR template.

Exit Criteria:
- Pilot endpoint working with direct resource response.
- No remaining `SuccessEnvelope` alias for pilot in generated types.
- CI alias check passing.

---

## 7. Transitional Adapter (Short-Lived)

Create `src/api/normalizeResponse.ts` (delete in Phase D):
```typescript
/**
 * Temporary normalizer – remove by Phase D.
 */
export function normalizeResponse<T>(raw: unknown): T {
  if (raw == null) throw new Error('Empty response');
  const r: any = raw;
  if (Array.isArray(r) || (typeof r === 'object' && !('success' in r) && !('error' in r))) {
    return r as T;
  }
  if (r.success === true && 'data' in r) {
    if (r.data && r.data.success === true && 'data' in r.data) {
      if (process.env.NODE_ENV !== 'production') console.warn('[contract] double-wrapped response detected – unwrapping');
      return r.data.data as T;
    }
    return r.data as T;
  }
  // Legacy success without data (e.g. health pre-migration)
  if (r.success === true && !('data' in r)) {
    return {} as T;
  }
  throw new Error('[contract] Unexpected response shape');
}
```

Deletion Checklist (Phase D):
- [ ] Grep returns zero for `normalizeResponse(`.
- [ ] File removed.

---

## 8. Backend Middleware Snippets

Error envelope (Gin example):

```go
func ErrorMiddleware() gin.HandlerFunc {
  return func(c *gin.Context) {
    c.Next()
    if len(c.Errors) == 0 {
      return
    }
    // Simplify: first error
    e := c.Errors[0].Err
    code := http.StatusInternalServerError
    apiCode := "INTERNAL"
    var details any
    if ae, ok := e.(AppError); ok {
      code = ae.Status
      apiCode = ae.Code
      details = ae.Details
    }
    reqID := c.GetString("requestId")
    c.Header("X-Request-Id", reqID)
    c.JSON(code, gin.H{
      "error": gin.H{
        "code":    apiCode,
        "message": e.Error(),
        "details": details,
      },
      "requestId": reqID,
    })
  }
}
```

Dev drift warning:

```go
// Wrap writer to capture body (skip large / streaming)
```

(Implementation detail: only sample first 32KB to avoid overhead.)

---

## 9. CI Guardrails

### `scripts/ci/check-response-aliases.js`
```javascript
const fs = require('fs');
const path = 'src/api/generated/types.ts';
if (!fs.existsSync(path)) process.exit(0);
const content = fs.readFileSync(path,'utf-8');
const offenders = [...content.matchAll(/(\w+200Response)\s*=\s*SuccessEnvelope/g)].map(m=>m[1]);
if (offenders.length) {
  console.error('ERROR: 200Response types alias SuccessEnvelope:', offenders);
  process.exit(1);
}
```

### `scripts/ci/check-success-key-2xx.js`
(Static detection of `success:` in handler JSON for 2xx)
```javascript
const { execSync } = require('child_process');
const out = execSync(`grep -R "success" backend/internal || true`).toString();
const suspicious = out.split('\n').filter(l =>
  l.includes('success') && !l.match(/test|deprecated|error/i)
);
if (suspicious.length) {
  console.error('WARNING: Potential success field usage in backend 2xx responses:\n', suspicious.join('\n'));
  // Not failing build yet; can escalate after Phase C
}
```

CI Job addition:
```yaml
- name: API Contract Checks
  run: |
    node scripts/ci/check-response-aliases.js
    node scripts/ci/check-success-key-2xx.js
```

---

## 10. Frontend Refactor Guidelines

Golden Rules (document in `src/store/api/README.md`):
1. No `transformResponse` unless:
   - Pagination wrapper adaptation
   - Pre-caching normalization (rare)
2. No `any` – use generated types.
3. No re-wrapping responses into `{ success, data }`.
4. Errors handled centrally (baseQuery error transform).
5. Remove transitional adapter usage ASAP (Phase D).

---

## 11. Base Error Transform (RTK)

```typescript
export const baseQuery = fetchBaseQuery({ baseUrl: '/api/v2' });

export const baseQueryWithErrors: typeof baseQuery = async (args, api, extra) => {
  const res = await baseQuery(args, api, extra);
  if ('error' in res && res.error && (res.error as any).data) {
    const data: any = (res.error as any).data;
    if (data.error) {
      return {
        error: {
          status: (res.error as any).status,
          data: {
            code: data.error.code || 'UNKNOWN',
            message: data.error.message || 'Unknown error',
            requestId: data.requestId,
            details: data.error.details
          }
        }
      };
    }
  }
  return res;
};
```

---

## 12. Metrics & Observability

| Metric | Purpose | Target |
|--------|---------|--------|
| api_contract_drift_total | Count of 2xx bodies containing forbidden `success` key | 0 post-Phase C |
| responses_shape_total{shape="legacy|new"} | Transition progress | Legacy → 0 by Day 12 |
| api_error_code_total{code} | Error distribution | Monitor spikes |
| api_response_time_ms | Ensure no regression | No deterioration |

(Optional: simple increment in middleware when legacy shape used.)

---

## 13. Risk Register & Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| BE & FE deploy skew causes break | Med | High | Avoid per-endpoint flags; coordinate domain release; use temporary adapter |
| Pagination added late re-introduces envelope | High (if undecided) | Med | Decide in Phase A; codify schema early |
| Auth shape drift (user casing) persists | Med | Med | Enforce canonical AuthSession schema; fail PR if fallback logic added |
| CI guard not strict enough early | Med | Med | Phase B convert success-key check to failure if not cleared |
| Engineers rely on adapter past Day 15 | Med | Med | Calendar removal date + PR check: grep for file |
| Error taxonomy fragmentation | Low | Med | Freeze enum text + doc snippet |
| Overhead of body capture for drift logging | Low | Low | Dev-only sampling; disable on large responses |

---

## 14. Acceptance Criteria (Migration Complete)

Category | Criterion
---------|----------
Spec | No 2xx response references `SuccessEnvelope`; all resource schemas explicit
Types | All generated 200 response types are concrete (contain fields or arrays)
Frontend | Zero `extractResponseData` or `normalizeResponse` imports
Backend | No JSON success wrappers in 2xx
Errors | All non-2xx produce ErrorEnvelope; UI references single error interface
Any Usage | `grep -R "as any" src/store/api` returns 0 (documented exceptions allowed outside)
CI | Alias & success-key checks pass; contract test suite green
Metrics | responses_shape_total{shape="legacy"} = 0; drift counter stable
Docs | ADR + onboarding referencing Option B + pagination pattern
Cleanup | Legacy helper & flags removed before release tag
Testing | Contract test ensures absence of top-level success; error mapping verified

---

## 15. Contract Test (Add Phase E)

`src/tests/api/contract.spec.ts`
```typescript
import { describe, it, expect } from 'vitest';
import spec from '../../openapi.yaml';

describe('API Contract', () => {
  it('no 2xx responses reference SuccessEnvelope', () => {
    const paths = (spec as any).paths || {};
    for (const [p, methods] of Object.entries(paths)) {
      for (const [m, op] of Object.entries<any>(methods)) {
        const responses = op.responses || {};
        Object.entries(responses).forEach(([code, resp]: any) => {
          if (code.startsWith('2')) {
            const schema = resp?.content?.['application/json']?.schema;
            if (schema && schema.$ref && schema.$ref.includes('SuccessEnvelope')) {
              throw new Error(`2xx response still references SuccessEnvelope at ${m.toUpperCase()} ${p}`);
            }
          }
        });
      }
    }
  });

  it('no top-level success property in 2xx object schemas', () => {
    const schemas = (spec as any).components?.schemas || {};
    for (const [name, schema]: any of Object.entries(schemas)) {
      if (schema.type === 'object' && schema.properties?.success) {
        // allow if explicitly documented as deprecated & only for error envelope? Not needed.
        throw new Error(`Schema ${name} still has top-level 'success' property`);
      }
    }
  });
});
```

---

## 16. Developer PR Checklist (Put in `.github/PULL_REQUEST_TEMPLATE.md`)

```
- [ ] Endpoint manifest updated (status advanced)
- [ ] Spec updated (no SuccessEnvelope for 2xx)
- [ ] Client regenerated
- [ ] No transformResponse unless justified
- [ ] No envelope unwrap logic introduced
- [ ] Contract & unit tests updated
- [ ] Adapter NOT reintroduced
```

---

## 17. File Changes Overview (Expected Across Phases)

Path | Action
-----|-------
`openapi.yaml` | Remove SuccessEnvelope 200 refs; add ErrorEnvelope; add pagination wrapper
`docs/api_endpoint_manifest.json` | Update statuses per PR
`src/api/normalizeResponse.ts` | Add (Phase A), remove (Phase D)
`src/store/api/*` | Remove unwraps/legacy transforms
`src/api/baseQuery.ts` (or equivalent) | Add error mapping
`scripts/ci/check-response-aliases.js` | Add
`scripts/ci/check-success-key-2xx.js` | Add
`src/tests/api/contract.spec.ts` | Add Phase E
`docs/adr/ADR-API-Contract-OptionB.md` | Add Phase F
`src/store/api/README.md` | Add Golden Rules

---

## 18. Removal Timeline (Enforced)

Artifact | Removal Deadline | Enforced By
---------|------------------|------------
normalizeResponse.ts | Day 15 | CI fails on presence
SuccessEnvelope schema (if kept commented) | Day 18 | Spec review gate
Any legacy `success:` 2xx usage | Day 12 | CI failure escalation
Feature flag / adapter env variable (if added) | Day 15 | Manual review

---

## 19. Rollback Strategy (Scoped)

Scenario | Action | Max Exposure Window
---------|--------|--------------------
Single endpoint regression | Revert that handler; FE expects resource so no FE rollback needed | < 1 hour
Global spec mismatch | Revert spec + regenerate + redeploy BE client pairing | < 2 hours
Unexpected client parse error early | Temporarily reintroduce adapter (only before Day 15) | Before Phase D only
Auth contract break | Hotfix BE to emit both old & new for one release (headers toggle) | Rare; document if used

NO reintroduction of envelope wrappers globally after Phase C; rollback invokes fix-forward.

---

## 20. Open Questions (Answer in Phase A)

| Question | Answer | Owner | Deadline |
|----------|--------|-------|----------|
| Pagination pattern (A/B)? | | | Day 2 |
| Final error code enum text? | | | Day 2 |
| AuthSession fields (token, expiresAt, refresh?) | | | Day 3 |
| BulkOpStatus required fields list? | | | Day 3 |
| Are there streaming endpoints needing exclusion? | | | Day 3 |
| Need SSE adjustments for metrics endpoints? | | | Day 5 |
| requestId always present? | | | Day 2 |

---

## 21. Next Immediate Actions (Action List)

1. Choose pilot domain (RECOMMEND: Personas if least critical / simpler shape OR Campaigns if more representative).
2. Answer open questions; commit decisions to doc.
3. Implement Phase A spec changes + pilot backend changes.
4. Regenerate client & migrate pilot slice.
5. Add CI scripts & manifest file.
6. Schedule adapter removal (calendar invite to team for Day 15).
7. Start Phase B PR queue preparation (list handlers & FE slices in order).

---

## 22. Summary TL;DR

Spec-first, small pilot, aggressive cleanup. No per-endpoint flag proliferation. CI + contract tests enforce no regression. Transitional adapter lives < two weeks. Pagination + error codes locked early to prevent envelope resurgence. Success measured by: zero legacy unwrap logic, zero envelope aliases, unified error handling, and drift metric at zero.

---

## 23. Appendix – Example Spec Snippet (Post-Migration Persona List)

```yaml
paths:
  /api/v2/personas:
    get:
      operationId: personasList
      responses:
        '200':
          description: Persona list
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/PersonaResponse'
        '400':
          $ref: '#/components/responses/ValidationError'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '500':
          $ref: '#/components/responses/InternalError'

components:
  schemas:
    ErrorEnvelope:
      type: object
      required: [error, requestId]
      properties:
        error:
          type: object
          required: [code, message]
          properties:
            code: { type: string }
            message: { type: string }
            details: { type: object, additionalProperties: true }
        requestId:
          type: string
  responses:
    ValidationError:
      description: Validation Error
      content:
        application/json:
          schema: { $ref: '#/components/schemas/ErrorEnvelope' }
    Unauthorized:
      description: Unauthorized
      content:
        application/json:
          schema: { $ref: '#/components/schemas/ErrorEnvelope' }
    InternalError:
      description: Internal Error
      content:
        application/json:
          schema: { $ref: '#/components/schemas/ErrorEnvelope' }
```

---

(End of Document)