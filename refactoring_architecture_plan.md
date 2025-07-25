# Campaign Service Refactoring Architecture Plan

## Current Architecture Problems

### 🔴 Three-Layer Service Mess
1. **CampaignOrchestratorService** (2688 lines) - Massive monolith with:
   - JobTypeEnum routing (lines 1078-1092)
   - Complex transaction logic
   - Business rules and phase transitions
   - CRUD operations
   - Dependency management

2. **LeadGenerationCampaignService** - Has correct phase architecture:
   - `StartPhase()` method with phase switching
   - Delegates to standalone services
   - Progress aggregation

3. **CampaignWorkerService** - Has JobTypeEnum routing that duplicates orchestrator

### 🔴 Dependency Web
- **Handlers** → CampaignOrchestratorService
- **WorkerService** → CampaignOrchestratorService 
- **Main.go** → Creates orchestrator and injects everywhere

## Target Architecture

```
[Handler/Job Queue] 
       ↓
[PhaseExecutionService.StartPhase()] 
       ↓
[Engine: DomainGenerator/DNSValidator/HTTPValidator]
       ↓  
[DB/WebSocket/Status Updates]
```

### 🎯 Final Service Structure
- **PhaseExecutionService** (renamed from LeadGenerationCampaignService)
  - Universal `StartPhase(campaignID, phaseType)` 
  - Direct engine integration (no service intermediaries)
  - Transaction management and status updates
  - Phase lifecycle and transitions

- **CampaignWorkerService** (simplified)
  - Thin async job router
  - Only calls `PhaseExecutionService.StartPhase()`
  - No business logic

## Migration Plan

### Phase 1: Preparation
1. Create new `PhaseExecutionService` interface
2. Expand `LeadGenerationCampaignService` functionality
3. Migrate essential methods from orchestrator

### Phase 2: Engine Integration  
4. Update `StartPhase()` to call engines directly
5. Remove service layer intermediaries
6. Add proper transaction management

### Phase 3: Dependency Updates
7. Update handlers to use `PhaseExecutionService`
8. Update worker service routing
9. Update main.go dependency injection

### Phase 4: Cleanup
10. Remove `CampaignOrchestratorService` entirely
11. Remove JobTypeEnum routing
12. Test unified flow

## Risk Mitigation
- Keep orchestrator temporarily during migration
- Test each phase independently  
- Gradual dependency updates
- Rollback plan via git branches