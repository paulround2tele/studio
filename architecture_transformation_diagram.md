# Architecture Transformation: Before vs After

## Current Architecture (Problems)

```mermaid
graph TD
    A[Handlers] --> B[CampaignOrchestratorService]
    C[CampaignWorkerService] --> B
    B --> D[LeadGenerationCampaignService]
    B --> E[DomainGenerationService]
    B --> F[DNSCampaignService]
    B --> G[HTTPKeywordCampaignService]
    
    D --> H[DomainGenerator Engine]
    E --> H
    F --> I[DNSValidator Engine]
    G --> J[HTTPValidator Engine]
    
    B -.->|JobTypeEnum| K[JobType Routing Logic]
    C -.->|JobTypeEnum| K
    
    style B fill:#ff9999,stroke:#333,stroke-width:4px
    style K fill:#ff9999,stroke:#333,stroke-width:2px
```

### Problems:
- **Red boxes show problematic areas**
- CampaignOrchestratorService: 2688-line monolith
- Dual JobTypeEnum routing (orchestrator + worker)
- Three service layers with unclear boundaries
- Service intermediaries between phase logic and engines

## Target Architecture (Clean)

```mermaid
graph TD
    A[Handlers] --> B[PhaseExecutionService]
    C[CampaignWorkerService] --> B
    
    B -->|StartPhase domain_generation| D[DomainGenerator Engine]
    B -->|StartPhase dns_validation| E[DNSValidator Engine]
    B -->|StartPhase http_validation| F[HTTPValidator Engine]
    B -->|StartPhase analysis| G[ContentFetcher Engine]
    B -->|StartPhase analysis| H[KeywordExtractor Engine]
    B -->|StartPhase analysis| I[KeywordScanner Engine]
    
    B --> J[Transaction Management]
    B --> K[WebSocket Broadcasting]
    B --> L[Audit Logging]
    
    style B fill:#99ff99,stroke:#333,stroke-width:4px
    style C fill:#99ff99,stroke:#333,stroke-width:2px
```

### Benefits:
- **Green boxes show clean architecture**
- Single service with clear responsibilities
- Direct engine integration (no intermediaries)
- Unified StartPhase() entry point
- No JobTypeEnum routing complexity
- Clean separation of concerns

## Migration Strategy

```mermaid
graph LR
    A[Phase 1: Enhance LeadGenerationCampaignService] --> B[Phase 2: Direct Engine Integration]
    B --> C[Phase 3: Update Dependencies] 
    C --> D[Phase 4: Remove Orchestrator]
    
    A1[Add transaction management] -.-> A
    A2[Add lifecycle methods] -.-> A
    A3[Add CRUD operations] -.-> A
    
    B1[Replace service delegation] -.-> B
    B2[Add direct engine calls] -.-> B
    B3[Add error handling] -.-> B
    
    C1[Update handlers] -.-> C
    C2[Update worker service] -.-> C
    C3[Update main.go] -.-> C
    
    D1[Remove orchestrator files] -.-> D
    D2[Remove JobTypeEnum] -.-> D
    D3[Test everything] -.-> D