# DomainFlow Studio

DomainFlow Studio orchestrates end-to-end domain discovery, validation, and lead enrichment campaigns with a Next.js frontend and a Go/Chi backend. The system streams real-time progress over SSE, persists detailed per-domain telemetry, and exposes a tightly typed OpenAPI contract for both the UI and external tooling.

## 📚 Contents

1. [System Overview](#system-overview)
2. [Technology Stack](#technology-stack)
3. [Prerequisites](#prerequisites)
4. [Local Setup](#local-setup)
5. [Campaign Lifecycle](#campaign-lifecycle)
6. [Keyword Detection & Data Flow](#keyword-detection--data-flow)
7. [Observability & Troubleshooting](#observability--troubleshooting)
8. [Documentation Map](#documentation-map)

## System Overview

### Frontend (Next.js 15)
- Next.js 15 App Router with TypeScript strict mode
- Tailwind CSS + shadcn/ui for layout and theming
- Redux Toolkit + RTK Query for API state, cache invalidation, and mutation orchestration
- Generated OpenAPI client (RTK Query aware) under `src/lib/api-client`
- SSE bridge for live campaign updates (phase transitions, counter deltas)

### Backend (Go + PostgreSQL)
- Go 1.24+ with Chi HTTP router generated through `oapi-codegen`
- PostgreSQL 16+ with sqlx access layer and timestamped migrations
- Campaign orchestrator that sequences phases in full-sequence or manual mode
- Keyword scanner + enrichment service that emits structured feature vectors (`feature_vector` JSONB)
- SSE publisher + event bus for UI/state-sync and Prometheus metrics for every phase

## Technology Stack

| Area      | Tooling |
|-----------|---------|
| Frontend  | Next.js 15, React 18, TypeScript, Tailwind, shadcn/ui, Redux Toolkit, RTK Query |
| Backend   | Go 1.24+, Chi, sqlx, PostgreSQL 16+, oapi-codegen, SSE |
| Tooling   | Node.js 20.19+, npm 10+, Air (Go hot reload), Jest, Playwright |
| Observability | Prometheus metrics, SSE logs, campaign domain counters |

## Prerequisites

Ensure the versions below before attempting to build or run any part of the stack:

| Dependency | Version |
|------------|---------|
| Node.js    | 20.19+ |
| npm        | 10+ |
| Go         | 1.24+ |
| PostgreSQL | 16+ |
| Git        | latest |

> **Tip:** The devcontainer already ships with the required toolchain. Local bare-metal setups should follow the same versions to avoid subtle dependency mismatches.

## Local Setup

1. **Install npm dependencies**
   ```bash
   npm install
   ```

2. **Bootstrap PostgreSQL**
   ```bash
   sudo service postgresql start
   sudo -u postgres psql <<'EOS'
   CREATE DATABASE domainflow_production;
   CREATE USER domainflow WITH PASSWORD 'pNpTHxEWr2SmY270p1IjGn3dP';
   GRANT ALL PRIVILEGES ON DATABASE domainflow_production TO domainflow;
   ALTER USER domainflow CREATEDB;
   \q
   EOS
   cd backend && sudo -u postgres psql -d domainflow_production < database/schema.sql
   ```

3. **Backend build + tests**
   ```bash
   cd backend
   go mod download
   make build
   make test
   ```

4. **Frontend codegen + build**
   ```bash
   npm run gen:all
   npm run lint
   npm run typecheck
   npm run build
   ```

5. **Run services**
   ```bash
   # Backend :8080
   cd backend && ./bin/apiserver

   # Frontend :3000
   npm run dev
   ```

6. **Smoke test** (requires backend running on :8080)
   ```bash
   scripts/smoke-e2e-campaign.sh
   ```

## Campaign Lifecycle

Campaigns advance through ordered phases. In full-sequence mode the orchestrator auto-starts each phase after the previous completes; step-by-step mode lets operators trigger phases manually.

| Order | Phase | Description | Key Outputs |
|-------|-------|-------------|-------------|
| 1 | Domain Generation | Pattern-driven domain synthesis seeded by campaign config | `generated_domains` rows with `offset_index` |
| 2 | DNS Validation | Persona + proxy-driven DNS sweeps (Chi service) | `dns_status`, `dns_ip`, DNS counters |
| 3 | HTTP Keyword Validation | Persona/proxy selection, keyword scanning, enrichment/micro-crawl | `http_status`, `feature_vector` JSON, keyword hits |
| 4 | Analysis & Scoring | Reuses HTTP feature vectors to compute lead relevance | `relevance_score`, `domain_score`, aggregate counters |

**Counters & SSE:** Each phase writes to `campaign_domain_counters` ensuring UI funnels stay synchronized. SSE events (`phase_started`, `phase_completed`, `domain_status_delta`, etc.) feed the dashboard.

## Keyword Detection & Data Flow

The HTTP Keyword Validation phase consumes the phase configuration stored under `campaign_phases.configuration` (type `HTTPPhaseConfigRequest`). When the phase executes:

1. **Configuration Load:** Persona IDs, keyword set IDs, and ad-hoc keywords are pulled from the phase configuration before each batch. Missing configuration now halts the phase before execution, preventing silent "no keyword" runs.
2. **Validation + Enrichment:** Successful fetches build `feature_vector` entries that contain structure counts, micro-crawl metadata, and keyword metrics (e.g., `kw_top3`, `kw_unique`, `kw_hits_total`).
3. **Persistence:**
   - `generated_domains.http_status` (enum) and `http_reason` capture transport outcomes.
   - `generated_domains.http_keywords` is legacy text; the UI instead reads from `feature_vector->'kw_top3'`.
   - `generated_domains.feature_vector` stores JSONB with keyword arrays, signals, parked flags, etc.
4. **Frontend Rendering:** `LeadResultsPanel` maps `DomainListItem.features.keywords.top3` to the "Found keywords" pill. If `kw_top3` is empty, the UI surfaces "No keywords detected" even though the HTTP phase succeeded.

For deeper details (DB schemas, validator behaviour, and verification queries) see [`docs/KEYWORD_DATA_FLOW.md`](docs/KEYWORD_DATA_FLOW.md).

## Observability & Troubleshooting

| Scenario | Checks |
|----------|--------|
| HTTP phase reports "No keywords detected" | Run `SELECT domain_name, http_status, feature_vector->'kw_top3' FROM generated_domains WHERE campaign_id = '<id>' AND http_status='ok';`. Empty arrays mean the validator either had no keyword config or the page content lacked matches. Verify the `campaign_phases.configuration` JSON includes `keywordSetIds`/`adHocKeywords`. |
| Analysis fails immediately | Listen for the `analysis_failed` SSE event with `errorCode=E_ANALYSIS_MISSING_FEATURES` and confirm `SELECT COUNT(*) FROM generated_domains WHERE feature_vector IS NOT NULL` > 0 before retrying. |
| DNS phase stalls | Inspect `backend/logs/apiserver.log` for `DNS validation cancelled` or persona/proxy errors. Counters remain in `dns_pending`. |
| SSE not updating UI | Ensure backend SSE service is running (`deps.SSE`) and no reverse proxy is buffering responses. Browser devtools should show the `/events` stream alive. |
| Micro-crawl ROI concerns | Scrape Prometheus metrics `http_microcrawl_*` to inspect triggers, added keywords, and growth ratios before tuning heuristics. |

## Documentation Map

| Doc | Purpose |
|-----|---------|
| `README.md` (this file) | High-level system overview & setup |
| `architecture.md` | Current backend/frontend architecture plus orchestration notes |
| `docs/PIPELINE_DATAFLOW_FULL.md` | Authoritative reference for per-phase flows, SSE events, and data contracts |
| `docs/KEYWORD_DATA_FLOW.md` | Deep dive into HTTP keyword configuration, storage, and verification |
| `docs/DOMAIN_LIST_API.md` | Domain listing API contract, filtering, and server-side sorting semantics |
| `PIPELINE_CHANGELOG.md` | Historical changes to the orchestrator + pipeline semantics |
| `CAMPAIGN_WORKFLOW_ANALYSIS.md` | Detailed walkthrough of campaign states and counters |
| `TESTING_PLAN.md` | Strategy for unit, integration, and E2E test coverage |
| `.github/copilot-instructions.md` | Workspace-specific bootstrap, build, and validation requirements |

If you discover stale guidance, update the relevant doc and cross-link it here so future teams can locate the canonical source quickly.
