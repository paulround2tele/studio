# Campaign Phase Control Simplification Plan

## Goals
- Provide a single, reliable runtime control path for `pause`, `resume`, `stop`, and `restart` interactions.
- Eliminate duplicate validation/storage logic spread across handlers, orchestrator, and individual phase services.
- Make campaign/phase status transitions deterministic so the UI immediately reflects user commands.
- Reduce operational complexity when diagnosing stuck or conflicting phase executions.

## Current Pain Points
1. **Redundant validation and state checks**
   - Every handler (`handlers_campaigns.go`, lines 1853-2022) re-validates campaign existence, allowed phases, and execution state.
   - Orchestrator repeats lookups (e.g., `StartPhaseInternal` fetching campaign + configs) and services perform their own gating, leading to triple DB hits per action.
2. **Divergent runtime control implementations**
   - `dns_validation`/`http_validation` rely on hand-rolled `pauseAck` channels with timeouts; `analysis` owns mutex/cond-vars; `enrichment` toggles a custom control struct.
   - Absence of uniform acknowledgement semantics means handlers guess whether a pause succeeded based on service-specific errors.
3. **Inconsistent persistence**
   - Only enrichment calls `campaignStore.PausePhase`; other services modify in-memory flags and hope progress events update `campaign_phases` eventually.
   - Result: API responses claim "paused" while DB still shows `in_progress`, confusing UI and restarts.
4. **Restart races**
   - `RestartCampaign` simply replays `StartPhaseInternal` without ensuring earlier phases stopped. Multiple workers can run concurrently, corrupting state.
5. **Scattered observability**
   - Control attempts are not logged centrally; debugging requires grepping through per-phase logs.

## Guiding Principles
- **Single Source of Truth**: The orchestrator owns phase state transitions and persistence; services no longer talk directly to `campaign_store` for pause/resume updates.
- **Control Bus**: Runtime controls are signals flowing through a central manager. Phases just listen and react.
- **Deterministic Acknowledgement**: Every control request must either acknowledge within a timeout or return a structured timeout error.
- **Progressive Migration**: Introduce the bus alongside existing plumbing, then remove legacy hooks once phases subscribe to the new path.

## Proposed Architecture
### 1. PhaseControlManager (new component)
- Maintains a `controlCh` per `(campaignID, phase)`.
- API surface:
  ```go
  type ControlSignal string
  const (
     ControlPause ControlSignal = "pause"
     ControlResume ControlSignal = "resume"
     ControlStop   ControlSignal = "stop"
  )

  type PhaseControlManager interface {
     Broadcast(ctx context.Context, campaignID uuid.UUID, phase models.PhaseTypeEnum, signal ControlSignal) error
     Subscribe(ctx context.Context, campaignID uuid.UUID, phase models.PhaseTypeEnum) (<-chan ControlSignal, error)
     Close(campaignID uuid.UUID, phase models.PhaseTypeEnum)
  }
  ```
- Orchestrator uses `Request` to send commands and wait for `ControlAck` or timeout.
- Services call `RegisterPhase` when `Execute` starts, then select on the returned channel to honor pause/resume/stop commands.

### 2. Centralized Persistence
- Add `SetPhaseControlState(ctx, campaignID, phase, status, reason)` in `campaignStore` that updates both `campaign_phases` and `phase_executions` in one transaction.
- Orchestrator updates persistence immediately when issuing a control request and again upon acknowledgement, ensuring API responses reflect the desired state even before workers fully halt.

### 3. Simplified Handler Layer
- Extract shared helper `withCampaignAndPhase(ctx, campaignID, phase, disallowedPhases, func() (Response, error))` to de-duplicate existence + discovery checks.
- Handlers delegate to orchestrator methods (`PausePhase`, `ResumePhase`, etc.) that now only talk to the control manager.

### 4. Phase Service Integration
- Wrap long-running loops with `select { case signal := <-controlCh: ... }` to handle pause/resume/stop uniformly.
- Remove bespoke `pauseAck` channels, mutex/cond-var combos, and per-service calls to `campaignStore.PausePhase` or `UpdatePhaseStatus`.
- Ensure services notify the control manager when they actually transition (send `ControlAck`).

### 5. Restart Semantics
- Define stop as: `Request(ControlStop)` → orchestrator marks phase failed with reason `stopped_by_user` → service drains and signals ack.
- Restart steps:
  1. Issue stop for all restartable phases (best-effort, ignore already terminal ones).
  2. Clear phase execution state (new helper `campaignStore.ResetPhaseExecution`).
  3. Sequentially call `StartPhaseInternal`.

### 6. Observability
- Emit structured logs/events for every control request/ack/timeout via `Logger.Info/Warn` and SSE events (`phase_control_requested`, `phase_control_acknowledged`).
- Add counters to `metrics` (`IncPhasePauses`, `IncPhaseStops`, etc.).

## Implementation Milestones
1. **Scaffolding (current PR)**
   - Add `PhaseControlManager` interface + default implementation.
   - Wire manager into `CampaignOrchestrator` and expose channels to services.
   - Update handlers to call orchestrator methods that use the manager.
2. **Service Adoption**
   - Migrate DNS, HTTP, Enrichment, Analysis services to listen for control signals.
   - Remove legacy pause/resume plumbing and per-service DB writes.
3. **Persistence + Observability**
   - Implement consolidated `SetPhaseControlState` + metrics + SSE events.
4. **Restart Hardening**
   - Refactor `RestartCampaign` to leverage stop semantics and ensure no concurrent executions.
5. **Cleanup & Tests**
   - Delete unused helper structs, update unit/integ tests, document new behavior in README/architecture notes.

## Risks & Mitigations
- **Existing executions not registered**: Ensure `StartPhaseInternal` registers every phase before launching worker goroutines; add guard to refuse control requests without a registered channel.
- **Timeouts causing false negatives**: Make control timeouts configurable and surface actionable error messages to UI.
- **Service deadlocks**: Keep control channel handling non-blocking by acknowledging before doing heavy work (e.g., flush partial results post-ack).

## Next Steps
- Build manager scaffolding and begin migrating the orchestrator to use it (tracked in this PR).
- Follow-up PRs handle service rewrites and legacy cleanup to keep diffs reviewable.
