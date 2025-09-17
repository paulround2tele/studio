# Architecture & Flows

## Updated Dependency Diagram

```mermaid
graph TD
    subgraph "API Server"
        A[apiserver]
    end

    subgraph "Phase Services"
        B[Domain Generation]
        C[DNS Validation]
        D[HTTP Validation]
        E[Analysis]
    end

    subgraph "Infrastructure Adapters"
        F[Audit Logger]
        G[Metrics Recorder]
        H[Transaction Manager]
        I[Cache]
        J[Worker Pool]
    end

    subgraph "Data Stores"
        K[PostgreSQL DB]
        L[Redis]
    end

    A --> B
    A --> C
    A --> D
    A --> E

    B --> F
    B --> G
    B --> H
    B --> I
    B --> K

    C --> F
    C --> G
    C --> H
    C --> J
    C --> K

    D --> F
    D --> G
    D --> H
    D --> I
    D --> J
    D --> K
    D --> L

    E --> F
    E --> G
    E --> H
    E --> K
```

## Extraction → Analysis Redesign (Phase P0/P1 Integration)

The new extraction feature pipeline introduces canonical, versioned feature rows decoupling HTML parsing from scoring.

### New Persistence Artifacts (Migration 000055)
- `domain_extraction_features` (one row per campaign+domain)
- `domain_extracted_keywords` (optional detail rows per keyword)
- `analysis_ready_features` view (projection used by analysis phase in future dual-read mode)

### Feature Flags / Env Vars
| Flag | Default | Purpose |
|------|---------|---------|
| `EXTRACTION_FEATURE_TABLE_ENABLED` | false | Gate writes to new feature tables (safe shadow mode) |
| `EXTRACTION_KEYWORD_DETAIL_ENABLED` | false | Persist keyword detail rows (P2 onward) |
| `ANALYSIS_DUAL_READ` | false | Future: compare legacy scoring vs new feature-table driven scoring |

Flags follow existing pattern: set to `1`, `true`, or `on` (case-insensitive) to enable.

### Package Scaffold
`internal/extraction` provides:
- Pure aggregation stub (`BuildFeatures`) returning a minimal `FeatureAggregate`.
- Upsert helpers (`UpsertFeatureRow`, `TransitionReady`, `TransitionError`).
- Flag helpers for gating.

### Next Steps (High-Level)
1. Expand `BuildFeatures` to compute full richness & microcrawl metrics.
2. Integrate extraction sub-steps (http_fetch, primary_parse, microcrawl) feeding `RawSignals`.
3. Implement batch keyword detail persistence behind detail flag.
4. Add reconciliation job for stuck `building` rows.
5. Introduce dual-read scoring path and delta instrumentation.

### Rollback
Disabling `EXTRACTION_FEATURE_TABLE_ENABLED` halts new writes; legacy path (generated_domains feature_vector) remains unaffected. Migration reversible via 000055 down script.

## Sequence Diagram for Domain Generation

```mermaid
sequenceDiagram
    participant Client
    participant API Server
    participant Domain Generation Service
    participant DomainExpert
    participant Campaign Store
    participant SSE Service

    Client->>API Server: POST /campaigns (Configure)
    API Server->>Domain Generation Service: Configure(ctx, campaignID, config)
    Domain Generation Service->>DomainExpert: NewDomainGenerator(config)
    DomainExpert-->>Domain Generation Service: generator
    Domain Generation Service->>Campaign Store: SaveConfiguration(ctx, campaignID, config)
    Campaign Store-->>Domain Generation Service: success
    Domain Generation Service-->>API Server: success
    API Server-->>Client: 201 Created

    Client->>API Server: POST /campaigns/{id}/execute
    API Server->>Domain Generation Service: Execute(ctx, campaignID)
    Domain Generation Service->>DomainExpert: GenerateBatch(offset, batchSize)
    DomainExpert-->>Domain Generation Service: domains, nextOffset
    Domain Generation Service->>Campaign Store: CreateGeneratedDomains(ctx, domains)
    Campaign Store-->>Domain Generation Service: success
    Domain Generation Service->>Campaign Store: UpdateDomainsData(ctx, domains)
    Campaign Store-->>Domain Generation Service: success
    Domain Generation Service->>SSE Service: PublishProgress(progress)
    SSE Service-->>Client: SSE Event
    Domain Generation Service-->>API Server: progress channel
    API Server-->>Client: streaming progress
