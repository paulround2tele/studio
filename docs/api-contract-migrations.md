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
