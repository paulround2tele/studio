# Campaign Restart State Machine

The campaign orchestrator rebuilds in-flight work after a process restart without relying on
process-local memory. This note documents the state machine that drives restart recovery and the
points where operators can influence the flow.

## Objectives

- Reclaim ownership of phases that were `in_progress` or `paused` when the process stopped.
- Ensure every restarted phase pulls configuration from PostgreSQL before emitting any work.
- Provide deterministic behavior whether auto-resume is enabled or not.
- Surface restart failures with structured `OrchestratorError` kinds so callers can react.

## Lifecycle Overview

1. **Candidate discovery** – `restoreInFlightPhases()` scans campaigns with phase status
   `in_progress` or `paused`, deduplicates by ID, and sorts newest-first to bound concurrent
   resumptions.
2. **Rehydration** – For each candidate, `rehydrateCampaignPhase()` determines the active phase,
   cancels any stale execution handle, hydrates the phase configuration, and re-attaches runtime
   control channels so stop/pause signals will operate immediately after recovery.
3. **Deferred restart** – Recovery always calls `deferPhaseRestart()` to mark the phase/campaign as
   `paused`, persist the paused status, and store the updated campaign state row. This step ensures
   we never double-run a phase if multiple orchestrators are restoring simultaneously.
4. **Auto-resume gating** – If `SetAutoResumeOnRestart(true)` was called (the default),
   `resumePhaseAfterRestore()` validates that required configs exist, records resume metrics, and
   delegates to `StartPhaseInternal()` to actually run the phase again. When auto-resume is off or
   the prior status was already `paused`, we stop after state deferral and wait for a manual resume.

## Error Semantics

- Every restart step wraps failures via `wrapPhaseError()` so callers receive
  `OrchestratorError{Kind: PhaseFatal|Recoverable}` instead of opaque `error` values.
- Configuration hydration failures (missing rows, decode errors, service reconfigure issues)
  now bubble up as `phase_fatal` errors, which are logged and counted in the resume metrics.
- Storage update failures during `deferPhaseRestart()` propagate as `phase_fatal` errors to signal
  that the campaign may be left in an inconsistent state and should be inspected manually.

## Operational Tips

- Toggle auto-resume at runtime with `SetAutoResumeOnRestart(false)` when performing controlled
  maintenance; campaigns will remain paused until operators explicitly resume them.
- Watch the `campaign.rehydrate.*` log events and the `IncPhaseResume*` metrics to confirm resumes
  are occurring; persistent failures indicate configuration drift or service-level problems.
- Because restart mutations always funnel through centralized persistence plus the state guards in
  `allowPhaseMutation()`, manual SQL fixes should update both `campaign_phases` and `campaigns` to
  keep the orchestrator’s runtime cache consistent on the next restart.
