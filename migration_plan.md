# Service Migration Plan (Enhanced)

This document defines a concrete, code-first plan to migrate ALL legacy features into the phase-centric services, verify parity, and safely delete the legacy directory without breaking the build.

Guiding principles:
- Code-first, no user-facing concerns at this stage.
- Keep the apiserver compiling and runnable at every step.
- Prefer smallest safe steps, with tests and quality gates at each milestone.

## 1. Service Mapping & Gap Analysis

### Service Mapping

| Legacy Service (`/backend/internal/services`) | New Service (`/backend/internal/domain/services`) | Notes |
| --------------------------------------------- | ------------------------------------------------- | ----- |
| `analysis_service.go` | `analysis.go` | Direct mapping. New service follows the `PhaseService` interface. |
| `domain_generation_service.go` | `domain_generation.go` | Not a direct mapping yet. Phase service lacks: config-hash/global offset management, per-batch transactions, audit logs, metrics, worker-pool I/O, optional cache. All must be ported. |
| `DNSCampaignService` (in `interfaces.go`) | `dns_validation.go` | `DNSCampaignService` is a legacy interface. The new `DNSValidationService` in `dns_validation.go` provides equivalent functionality. |
| `HTTPKeywordCampaignService` (in `interfaces.go`) | `http_validation.go` | `HTTPKeywordCampaignService` is a legacy interface. The new `HTTPValidationService` in `http_validation.go` provides equivalent functionality. |
| `stealth_integration_service.go` | `stealth_aware_dns_validation.go`, `stealth_aware_http_validation.go` | The new implementation splits the stealth-aware logic into separate services for DNS and HTTP validation. |

### Deprecated or Merged Services (with caveats)

The following legacy services do not have a direct one-to-one mapping in the new service layer and are considered deprecated or have had their functionality merged into other services:

*   `api_key_service.go`: Likely handled by a more generic authentication/authorization service or middleware.
*   `architecture_integration.go`: Appears to be for integration testing or a specific architectural spike; not a core service.
*   `cached_session_service.go`: Caching is likely now a cross-cutting concern handled by a dedicated caching layer or repository decorators.
*   `campaign_state_machine.go`: State management is now orchestrated by the `PhaseService` implementations and the application layer.
*   `campaign_worker_service.go`: The new architecture appears to favor a more event-driven or orchestrated approach, removing the need for a dedicated worker service.
*   `db_monitor.go`: Monitoring is likely handled by a dedicated observability layer (e.g., Prometheus, OpenTelemetry).
*   `domain_stealth_service.go`: Merged into `stealth_aware_dns_validation.go` and `stealth_aware_http_validation.go`.
*   `encryption_service.go`: Security-related functionality is likely centralized in a shared library or package.
*   `feature_flag_service.go`: Feature flagging is likely handled by a dedicated library or external service.
*   `keyword_set_service.go`: This is likely now part of the core application logic or handled by a repository.
*   `mfa_service.go`: See `api_key_service.go`.
*   `phase_status_derivation.go`: Merged into the `PhaseService` implementations.
*   `rule_loader_service.go`: This is likely now part of the configuration management or application startup process.
*   `service_factory.go`: Replace with direct DI; remove after phase services achieve feature parity.
*   `services.go`: A generic container for services; remove after rewiring.
*   `sse_service.go` and `stealth_integration_service.go`: Currently used by the apiserver. Must be re-homed under a new infra package (see Section 4) before deleting the legacy directory.
*   `session_service.go`: See `cached_session_service.go`.
*   `sse_service.go`: Server-Sent Events are likely handled by a dedicated package or library.
*   `stealth_example.go`: Example code, not a production service.
*   `stealth_safety_documentation.go`: Documentation, not a production service.

## 2. Dependency Analysis

### Gap Analysis: `AnalysisService`

| Feature | Legacy `AnalysisService` | New `AnalysisService` | Gap/Notes |
| --- | --- | --- | --- |
| **Public Method** | `ProcessAnalysisCampaignBatch` | `Configure`, `Execute`, `GetStatus`, `Cancel` | The new service follows the `PhaseService` interface, which provides a more granular and explicit control over the phase lifecycle. This is a significant improvement in the design. |
| **Configuration** | Implicitly configured via the campaign model. | Explicitly configured via the `Configure` method and an `AnalysisConfig` struct. | The new approach is more robust and allows for better validation and testing. |
| **Execution** | A single, monolithic `ProcessAnalysisCampaignBatch` method that handles everything from starting the phase to storing the results. | The `Execute` method starts the analysis, which runs asynchronously in a goroutine. Progress is reported via a channel. | The new approach is more scalable and provides better real-time progress tracking. |
| **Dependencies** | Tightly coupled to `sqlx`, `cache.RedisCache`, and `store.CampaignStore`. | Dependencies are provided via a `Dependencies` struct, which promotes loose coupling and easier testing. | The new approach is a significant improvement in terms of testability and maintainability. |
| **Error Handling** | Relies on returning errors and rolling back transactions. | The `Cancel` method provides a way to gracefully stop the analysis. Errors are reported via the progress channel. | The new approach provides more control over error handling and cancellation. |
| **Functionality** | The core logic for performing content analysis and calculating lead scores is embedded within the service. | The new service orchestrates the `contentfetcher` and `keywordextractor` engines, which contain the core business logic. | This separation of concerns makes the new service more of a coordinator, which is a better design. |

**Conclusion:** The new `AnalysisService` is modular and testable. Observability and infra (audit, metrics, optional caching, worker tuning) should be standardized across phase services via a unified Dependencies and infra adapters (see Section 4) to match legacy operational depth.

### Gap Analysis: `DomainGenerationService`

| Feature | Legacy `DomainGenerationService` | New `DomainGenerationService` | Gap/Notes |
| --- | --- | --- | --- |
| **Public Method** | `ProcessGenerationCampaignBatch`, `CreateCampaign`, `GetCampaignDetails` | `Configure`, `Execute`, `GetStatus`, `Cancel` | The new service follows the `PhaseService` interface, providing a more consistent and controllable API. The `CreateCampaign` and `GetCampaignDetails` logic is now expected to be handled by the application layer or a dedicated campaign management service. |
| **Configuration** | Implicitly configured via the campaign model and a complex `CreateCampaign` request. | Explicitly configured via the `Configure` method and a `DomainGenerationConfig` struct. | The new approach is cleaner and separates configuration from execution. |
| **Execution** | A single `ProcessGenerationCampaignBatch` method that generates and stores domains in a single transaction. | The `Execute` method starts an asynchronous generation process. | The new approach is better for long-running generation tasks. |
| **Dependencies** | Tightly coupled to `sqlx` and various stores. | Dependencies are injected via the `Dependencies` struct. | The new service is more testable and loosely coupled. |
| **Functionality** | Contains a significant amount of logic for worker coordination, memory management, and CPU optimization. | The new service is a pure orchestrator, delegating the core generation logic to the `domainexpert` engine. | This is a major improvement in design, as the core business logic is now encapsulated in a dedicated engine. The new service is much simpler and easier to understand. |

**Conclusion:** The new `DomainGenerationService` is simpler, but it currently misses critical features present in legacy:
- Authoritative pattern-hash computation and global offset selection/advancement
- Per-batch transactional persistence (domains + JSONB + global offset updated atomically)
- Audit logging, DB metrics, optional Redis caching hooks
- Worker-pool integration for safe I/O parallelism (while keeping generator offset consumption sequential)

These must be ported before legacy deletion.

The dependency analysis is complete. The key dependencies have been identified, and a high-level migration plan has been outlined. No external client dependencies were identified during the analysis.

### Legacy Service Dependencies

The legacy services have dependencies on:

*   **Data Models:** `backend/internal/models`
*   **Repositories/Stores:** `backend/internal/store`
*   **External Clients:** (To be determined)

Additional note:
- Some apiserver wiring still imports legacy helpers: `sse_service.go`, `stealth_integration_service.go`. Plan includes creating equivalents in an infra subpackage and rewiring before deletion.

### Migration Plan (High-level)

The overall plan for updating call sites is as follows:

1.  **Introduce the New Services:** Use dependency injection to provide instances of the new `PhaseService` implementations to the application layer.
2.  **Create Adapters (if necessary):** If a complete, one-time switch is not feasible, create adapter services that implement the legacy service interfaces but delegate calls to the new services. This will allow for a more gradual migration.
3.  **Update Call Sites:** Systematically update all code that currently calls the legacy services to use the new services instead. This will involve:
    *   Changing the service being injected.
    *   Updating method calls to match the new `PhaseService` interface (`Configure`, `Execute`, `GetStatus`, `Cancel`).
    *   Updating data structures to match the new DTOs and models.
4.  **Remove Legacy Services:** Once all call sites have been updated, the legacy services can be safely removed from the codebase.

## 3. Core Architecture Migration Strategy (Bulk Processing)

### Introduction

This section outlines the strategy for migrating the high-throughput bulk processing pipelines from the legacy `campaign_worker_service` model to the new `PhaseService`-based architecture. The new architecture, centered around orchestrator services and specialized engines, offers significant improvements in scalability, maintainability, and observability.

### Comparison of Legacy and New Architectures

| Feature | Legacy (`campaign_worker_service`) | New (`PhaseService` Orchestrators) |
| :--- | :--- | :--- |
| **Concurrency Model** | Manages a pool of workers that poll a job queue (`campaign_jobs` table). Concurrency is limited by the number of workers and the polling interval. | Each `PhaseService` implementation manages its own concurrency, typically by launching a dedicated goroutine for each campaign execution. This allows for more granular control and better resource utilization. |
| **Resource Management** | Relies on a shared database connection pool and manual transaction management. Resource contention can become a bottleneck under heavy load. | Dependencies, including database connections, are explicitly injected into each service. The `domainexpert` engine, used by the `DomainGenerationService`, is designed for high-performance, in-memory operations, reducing database load. |
| **Error Handling** | Implements a retry mechanism with a configurable number of attempts and delays. Failed jobs are marked in the database, and campaign status is updated accordingly. | The `PhaseService` interface includes a `Cancel` method for graceful shutdown. Errors are reported through the progress channel, allowing for real-time error handling and monitoring. |
| **State Management** | State is managed through the `campaign_jobs` table and the `campaigns` table. The `campaign_state_machine` service is responsible for transitioning campaign states. | State is managed within each `PhaseService` implementation and is exposed through the `GetStatus` method. The application layer is responsible for orchestrating the overall campaign lifecycle. |
| **Extensibility** | Adding a new processing phase requires modifying the `campaign_worker_service` and the `JobTypeEnum`. | Adding a new phase is as simple as creating a new `PhaseService` implementation. The orchestrator can then be updated to include the new phase in the processing pipeline. |

### Migration Strategy

The migration will be executed in the following phases:

1.  **Phase 1: Implement Feature Parity**
    *   Ensure that the new `PhaseService` implementations provide complete feature parity with the legacy services. This includes DNS validation, HTTP validation, and content analysis.
    *   Develop a new `CampaignOrchestrator` service that is responsible for invoking the `PhaseService` implementations in the correct order.

2.  **Phase 2: Gradual Rollout**
    *   Introduce a feature flag that allows for switching between the legacy and new bulk processing pipelines.
    *   Initially, enable the new pipeline for a small subset of campaigns to monitor its performance and stability in a production environment.
    *   Gradually increase the percentage of campaigns processed by the new pipeline as confidence in its reliability grows.

3.  **Phase 3: Decommission Legacy Components**
    *   Once the new pipeline is fully operational and has been proven to be stable and performant, the legacy `campaign_worker_service` and related components can be decommissioned.
    *   This includes removing the `campaign_jobs` table, the `campaign_state_machine` service, and any other related code.

### Conclusion

The migration to the new `PhaseService`-based architecture will provide a more scalable, resilient, and maintainable solution for bulk processing. The phased approach will minimize risk and ensure a smooth transition with no disruption to the application's functionality.


## 4. Actionable Step-by-Step Migration Plan

This section provides a detailed, sequential checklist for executing the migration.

1.  **Unify Dependencies + Add Infra Adapters:**
        - Extend `backend/internal/domain/services/interfaces.go` Dependencies to include:
            - `AuditLogger`, `MetricsRecorder`, `TxManager`, `WorkerPool`, `ConfigManager`, `Cache (RedisCache)`, and optional `FeatureFlags`/`PhaseServicesConfig`.
        - Create infra adapters under `backend/internal/domain/services/infra/`:
            - `audit.go` (adapter to `utils.AuditLogger` via `store.AuditLogStore`)
            - `metrics_sqlx.go` (DB pool and timing metrics using `sqlx.DB` statistics)
            - `tx_sqlx.go` (Begin/Commit/Rollback; exposes `store.Querier` within a tx)
            - `worker_pool.go` (interface + adapter to `EfficientWorkerPool` semantics)
            - `cache_redis.go` (thin wrapper over `cache.RedisCache`)
            - `config_manager_adapter.go` (uses existing ConfigManager if present; else, direct `CampaignStore` read/write of `domain_generation_config_states`)
            - `sse.go` (SSE/EventBus equivalent of legacy `sse_service.go`)
            - `stealth_integration.go` (move from legacy to infra; API-compatible)

2.  **Setup Dependency Injection for New Services:**
    *   In `backend/cmd/apiserver/dependencies.go`, register the new `PhaseService` implementations (`AnalysisService`, `DomainGenerationService`, `DNSValidationService`, `HTTPValidationService`, etc.) with the dependency injection container.
        *   Instantiate and inject infra adapters: AuditLogger, MetricsRecorder, TxManager, WorkerPool, ConfigManager, Cache (conditional), EventBus (new `infra/sse.go`).
        *   Replace imports of legacy `services.NewSSEService` and `services.NewStealthIntegrationService` with infra equivalents.

3.  **Port Config-Hash + Global Offset Management into Phase Domain Generation:**
        *   `backend/internal/domain/services/domain_generation.go`:
                - In `Configure`:
                    - Map request to `domainexpert.GenerateDomainGenerationPhaseConfigHashInput` and call `GenerateDomainGenerationPhaseConfigHash`.
                    - Lookup `LastOffset` via `ConfigManager` (or `CampaignStore` fallback) for the hash; set `OffsetStart` authoritatively.
                    - Store `NormalizedParams` and `ConfigHash` in execution state for later updates.
                - In `Execute` (per batch):
                    - Begin transaction via `TxManager`.
                    - Insert domains (respecting `offset_index` sequencing), append JSONB via `AppendDomainsData`.
                    - Update global config state (`CreateOrUpdateDomainGenerationPhaseConfigState`) with `LastOffset = nextOffset` and normalized details.
                    - Commit; on error, rollback and emit failure progress + audit log.
                - Keep generator consumption single-threaded; consider optional I/O sub-batching only after parity is proven.
        *   Add structured audit logs and metrics around tx begin/commit, batch sizes, and durations.

4.  **Standardize Observability & Optional Caching Across All Phase Services:**
        *   `dns_validation.go`, `http_validation.go`, `analysis.go`:
            - Inject and use `AuditLogger`, `MetricsRecorder`, `WorkerPool` knobs for task parallelism (safe for network-bound phases), and `Cache` if applicable.
            - Maintain existing functional behavior; this is instrumentation and control only.

5.  **Refactor `stealth_integration_service.go`:**
    *   Modify `backend/internal/services/stealth_integration_service.go` to use the new `DNSValidationService` and `HTTPValidationService` instead of the legacy `DNSCampaignService` and `HTTPKeywordCampaignService`.
        *   Or, better: move its implementation into `domain/services/infra/stealth_integration.go` and update usages in `dependencies.go` to import from infra.

6.  **Update API Handlers:**
    *   Identify all API handlers that currently depend on legacy services.
    *   For each handler, replace the injected legacy service with the corresponding new `PhaseService` implementation.
    *   Update the handler logic to use the new `PhaseService` interface (`Configure`, `Execute`, `GetStatus`, `Cancel`).

7.  **Replace `ServiceFactory` Usages:**
    *   Search for all usages of the `ServiceFactory` in the codebase.
    *   Replace the factory methods (e.g., `CreateOptimizedDNSCampaignService`) with direct injection of the new services.

8.  **Remove Legacy Service Interfaces:**
    *   Once all usages have been replaced, delete the legacy service interfaces from `backend/internal/services/interfaces.go`.
        *   Ensure `sse_service.go` and `stealth_integration_service.go` are replaced by infra equivalents before directory deletion (see Cleanup Order).

9.  **Cleanup Order (to keep builds green):**
        1) Land infra adapters and DI rewiring (SSE + Stealth moved).
        2) Port domain-generation parity (hash/offset/tx/audit/metrics) and tests.
        3) Instrument other phases (dns/http/analysis) minimally.
        4) Delete legacy-only files not referenced anymore.
        5) Delete the entire legacy directory only after a repo-wide search shows no imports from `backend/internal/services` remain.

## 5. Validation and Performance Testing Protocol

This section defines the testing strategy to validate the migration and ensure performance.

1.  **Unit and Integration Testing:**
    *   Develop comprehensive unit tests for each new `PhaseService` implementation and its underlying engines.
    *   Create integration tests that verify the interaction between the new services and the database, cache, and other external dependencies.
    *   Domain generation critical tests:
        - Config-hash and normalized params mapping (deterministic)
        - Global offset selection on Configure (uses current `LastOffset`)
        - Per-batch advancement of `LastOffset` to `nextOffset` (idempotent and monotonic)
        - Transaction rollback behavior (insert failure → no offset bump and no JSONB append)
        - JSONB domains_data append semantics (accumulate, no overwrite)
        - Uniqueness constraints respected: `unique(domain_name)` and `(campaign_id, offset_index)`

2.  **Load Testing:**
    *   Simulate a campaign with 2 million domains, measuring throughput, memory usage, and total completion time.
    *   Compare these benchmarks against the legacy system's performance under the same load to ensure that the new system is at least as performant.
    *   The load test should be run against a production-like environment with realistic data.

3.  **Quality Gates:**
    * Build: `go build` backend; ensure no import of legacy paths remains before deletion step
    * Lint/Typecheck: run existing linters
    * Tests: unit + integration must pass deterministically
    * Minimal smoke: configure→execute→list scenario via REST or store to ensure domains appear and offsets advance

## 6. Final Cleanup Plan

This section lists the final steps to be taken after the migration is complete and validated.

1.  **Delete Legacy Service Directory (after replacements in infra):**
    *   Delete `/home/vboxuser/studio/backend/internal/services` ONLY after:
        - `sse_service.go` is replaced by `domain/services/infra/sse.go` and wired in `dependencies.go`
        - `stealth_integration_service.go` is replaced by `domain/services/infra/stealth_integration.go`
        - `service_factory.go`, `domain_generation_service.go`, legacy `interfaces.go`, `campaign_worker_service.go`, etc., have zero references

2.  **Remove Legacy Configurations:**
    *   Remove any legacy service container bindings from `backend/cmd/apiserver/dependencies.go`.
    *   Remove any feature flags used during the migration.

3.  **Update Documentation:**
    *   Update any documentation that refers to the legacy services.

## 7. Concrete File Work Items (checklist)

- Domain services interfaces
    - [ ] Update `backend/internal/domain/services/interfaces.go` Dependencies with AuditLogger, MetricsRecorder, TxManager, WorkerPool, ConfigManager, Cache
- Infra adapters
    - [ ] Add `backend/internal/domain/services/infra/audit.go`
    - [ ] Add `backend/internal/domain/services/infra/metrics_sqlx.go`
    - [ ] Add `backend/internal/domain/services/infra/tx_sqlx.go`
    - [ ] Add `backend/internal/domain/services/infra/worker_pool.go`
    - [ ] Add `backend/internal/domain/services/infra/cache_redis.go`
    - [ ] Add `backend/internal/domain/services/infra/config_manager_adapter.go`
    - [ ] Add `backend/internal/domain/services/infra/sse.go`
    - [ ] Add `backend/internal/domain/services/infra/stealth_integration.go`
- Port domain generation parity
    - [ ] Edit `backend/internal/domain/services/domain_generation.go`: add config-hash lookup, global offset selection/advancement, per-batch transactions, audit + metrics hooks
- Instrument other phases
    - [ ] Edit `dns_validation.go`, `http_validation.go`, `analysis.go`: adopt new Dependencies; add audit/metrics/worker hooks
- DI rewiring
    - [ ] Edit `backend/cmd/apiserver/dependencies.go`: construct and inject infra adapters; replace imports from legacy SSE/Stealth
- Tests
    - [ ] Add unit/integration tests under `backend/internal/domain/services/.../tests` (or existing test tree) for offset + tx + JSONB behavior
- Cleanup
    - [ ] Remove legacy directory after repo-wide search confirms zero imports

## 8. Risks & Mitigations

- Deleting legacy too early breaks build (SSE/Stealth still used)
    - Mitigation: move/replace SSE and Stealth first under infra; rewire imports; verify build before deletion.
- Concurrency violations with generator offsets
    - Mitigation: keep generator single-threaded initially; only parallelize DB writes if strictly ordered and transactional; add tests.
- Transaction boundaries mismatch
    - Mitigation: per-batch tx to cover domains insert + JSONB append + global offset update; fail all/rollback on error.
- Cache staleness
    - Mitigation: cache only read-through for config state; write DB first then refresh/invalidate cache.

## 9. Milestones & Execution Order

1) Infra adapters + DI wiring (SSE/Stealth moved)
2) Port domain generation parity (hash/offset/tx/audit/metrics) + tests
3) Instrument DNS/HTTP/Analysis (audit/metrics/worker) + quick tests
4) Remove legacy directory and fix stragglers
5) Final QA gates and docs update
