## API Contract Migrations

This manifest tracks phased removal of legacy SuccessEnvelope (`success/data/metadata`) from 2xx responses per Option B strategy.

### Phase A (Previously Merged)
- Personas domain (list, get, create, update) -> direct schemas
- Guardrails introduced: `scripts/ci/check-response-aliases.cjs`, `scripts/ci/check-success-key-2xx.cjs`

### Phase B (Current PR)
Date: 2025-09-26
Scope: Core campaign read & status surfaces

Migrated endpoints (now return direct JSON payloads):
1. `GET /campaigns` -> `CampaignResponse[]`
2. `GET /campaigns/{campaignId}` -> `CampaignResponse`
3. `PATCH /campaigns/{campaignId}` -> `CampaignResponse` (updated alongside GET for parity)
4. `POST /campaigns` -> `CampaignResponse` (creation path adjusted due to type regeneration)
5. `GET /campaigns/{campaignId}/metrics` -> `CampaignMetricsResponse`
6. `GET /campaigns/bulk/operations/{operationId}/status` -> inline object `{ operationId, type, status, progress }`

Headers Added:
- X-Request-Id on campaign list/create/get where envelope previously carried requestId.

Contract Tests Added:
- `backend/tests/contract_phase_b_campaigns_test.go` asserts absence of `success` and `data` keys and correct direct JSON shape for migrated responses.

Guardrail Metrics (approximate):
- SuccessEnvelope alias count reduced for campaign domain responses referenced above.

### Next Planned Phase (Not in this PR)
- Remaining campaign auxiliary endpoints (status, progress, momentum, recommendations, classifications, funnel) and bulk operation listing.

---
Generated on: 2025-09-26

### Phase C (Current PR)
Date: 2025-09-29
Scope: Campaign auxiliary read endpoints & bulk operations list

Migrated endpoints (now direct payloads, no `success`/`data` envelope on 2xx):
1. `GET /campaigns/{campaignId}/funnel` -> `CampaignFunnelResponse`
2. `GET /campaigns/{campaignId}/classifications` -> `CampaignClassificationsResponse`
3. `GET /campaigns/{campaignId}/momentum` -> `CampaignMomentumResponse`
4. `GET /campaigns/{campaignId}/insights/recommendations` -> `CampaignRecommendationsResponse`
5. `GET /campaigns/{campaignId}/status` -> `CampaignPhasesStatusResponse`
6. `GET /campaigns/{campaignId}/progress` -> `CampaignProgressResponse`
7. `GET /campaigns/bulk/operations` -> array of `{ operationId, type, status }`

Implementation Notes:
- Backend handlers refactored to return alias/object types directly (see `handlers_campaigns.go`, `handlers_bulk_operations_list.go`).
- Bulk operations list path spec updated (`openapi/paths/campaigns/bulk.yaml`) removing SuccessEnvelope `allOf` usage.
- Regenerated Go & TypeScript clients after spec changes.
- Health & persona handlers adjusted to new response type shapes (Health direct body; persona config union helpers patched).

Testing:
- Added `backend/tests/contract_phase_c_campaigns_test.go` mirroring Phase B style (direct struct encoding) asserting absence of legacy envelope keys.
- Phase C tests cover: funnel, classifications, momentum, recommendations, status, progress, bulk operations list, and a negative 404 case (still envelope for errors).

Guardrail Snapshot (qualitative):
- All targeted endpoints emit direct JSON; remaining `Success:` occurrences now isolated to non-migrated or error envelope contexts (monitoring, SSE, personas test placeholders, and error responses).

Follow-ups:
- Migrate remaining domains (monitoring, SSE) if included in future phases.
- Reintroduce updated persona tests aligned with union config contract.

Generated on: 2025-09-29

### Phase D (Current PR)
Date: 2025-09-29
Scope: Monitoring performance & dashboard summary, performance-active, cleanup-stats, and keyword set endpoints

Migrated endpoints (now return direct JSON payloads):
1. `GET /monitoring/performance/summary` -> direct object (envelope removed)
2. `GET /monitoring/dashboard/summary` -> direct object (envelope removed)
3. `GET /monitoring/performance/active` -> direct object (envelope removed)
4. `GET /monitoring/cleanup/stats` -> direct object (envelope removed)
5. `GET /keyword-sets` -> `KeywordSetResponse[]` (direct array)
6. `POST /keyword-sets` -> `KeywordSetResponse` (direct object)

Implementation Notes:
- Backend handlers refactored in `handlers_monitoring.go` and `handlers_keywords.go` to return direct types (removed envelope fields).
- OpenAPI specs updated to return direct payloads for monitoring endpoints (already updated) and keyword-sets endpoints.
- Regenerated Go & TypeScript clients after spec changes.
- TypeScript API client now returns direct types: `AxiosPromise<KeywordSetResponse>`, `AxiosPromise<Array<KeywordSetResponse>>`, etc.

Testing:
- Added `backend/tests/contract_phase_d_test.go` following Phase B/C contract test patterns.
- Phase D tests cover all migrated endpoints with direct payload assertions (no `success`/`data` keys).
- Error responses maintain envelope structure as expected.

Guardrail Status:
- All targeted endpoints emit direct JSON without legacy envelope keys.
- Generated TypeScript client reflects direct payload types.
- Frontend RTK Query endpoints that match migrated paths would require transformation updates (none currently active).

Follow-ups:
- Monitor any frontend integration that may directly use the migrated endpoints.
- Complete remaining endpoint migrations in future phases (SSE, remaining personas endpoints).

Generated on: 2025-09-29
