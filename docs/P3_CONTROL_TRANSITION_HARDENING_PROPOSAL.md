# P3 – Control & Transition Hardening

**Proposal Draft** – Design alignment before implementation  
**Author**: Copilot (automated)  
**Status**: DRAFT – awaiting approval  
**Date**: 2025-01-XX

---

## Executive Summary

P3 hardens the control API surface and state machine to prevent race conditions, duplicate lifecycle events, and stale-state operations during concurrent or retried requests. Building on P2's sequence-gated SSE and controlPhase contract, P3 ensures **idempotent semantics** across all control endpoints and formalizes transition deduplication.

---

## 1. Idempotent Control API Semantics

### 1.1 Current State

The orchestrator already implements **basic idempotency** for pause/resume:

```go
// orchestrator.go:1573 (pause)
if currentStatus == models.PhaseStatusPaused {
    return nil  // idempotent success
}

// orchestrator.go:1726 (resume)  
if currentStatus == models.PhaseStatusInProgress {
    return nil  // idempotent success
}
```

**Gap**: No `expected_state` parameter exists – clients cannot assert preconditions.

### 1.2 Proposed: `expected_state` Optional Parameter

Add an **optional** `expected_state` query parameter to control endpoints:

| Endpoint | New Parameter |
|----------|---------------|
| `POST /campaigns/{id}/phases/{phase}/pause` | `?expected_state=in_progress` |
| `POST /campaigns/{id}/phases/{phase}/resume` | `?expected_state=paused` |
| `POST /campaigns/{id}/phases/{phase}/start` | `?expected_state=ready,configured,not_started` |
| `POST /campaigns/{id}/phases/{phase}/rerun` | `?expected_state=completed` |

**Behavior Matrix**:

| Scenario | `expected_state` | Current State | Result |
|----------|------------------|---------------|--------|
| Pause in_progress phase | omitted | `in_progress` | ✅ 200 OK |
| Pause already-paused phase | omitted | `paused` | ✅ 200 OK (idempotent) |
| Pause in_progress phase | `in_progress` | `in_progress` | ✅ 200 OK |
| Pause already-paused phase | `in_progress` | `paused` | ❌ 409 Conflict (precondition failed) |
| Pause already-paused phase | `paused` | `paused` | ✅ 200 OK (idempotent, matches expected) |

**409 Response (enhanced)**:

```json
{
  "error": {
    "code": "STATE_PRECONDITION_FAILED",
    "current_state": "paused",
    "expected_state": "in_progress",
    "attempted_action": "pause",
    "message": "Phase is already 'paused', expected 'in_progress'"
  }
}
```

### 1.3 Retry Safety

With `expected_state`:
- **Safe retry**: Client sends `pause?expected_state=in_progress` – if already paused, gets 409 (can check if own action succeeded)
- **Unconditional retry**: Client sends `pause` (no expected_state) – gets 200 OK whether newly paused or already paused

**Recommendation**: UI components should use `expected_state` for optimistic updates; background retries should omit it.

---

## 2. Transition Deduplication

### 2.1 Problem Statement

On backend restart or SSE reconnect, duplicate lifecycle events can be emitted:
- Phase completes → SSE emits `phase:completed`
- Backend restarts → `RestoreInFlightPhases()` runs
- If phase was mid-transition, duplicate event may fire

### 2.2 Current Mitigations

- **P2 Sequence Numbers**: Each event has monotonic sequence; frontend ignores `seq ≤ lastSequence`
- **phaseStartInProgress Map**: Guards against concurrent `StartPhase()` calls
- **Database as Source of Truth**: Status persisted before SSE emission

### 2.3 Proposed: Transition Idempotency Key

Add a **deduplication token** to control requests:

```http
POST /campaigns/{id}/phases/dns/pause
X-Idempotency-Key: pause-dns-1737123456789
```

**Backend Behavior**:
1. On first request with key: Execute transition, store key → result mapping (TTL: 5 min)
2. On duplicate request with same key: Return cached result (no re-execution)
3. On request without key: Execute normally (current behavior)

**Storage**: Redis or in-memory cache with TTL cleanup

**Why This Helps**:
- Network retries (load balancer, timeout) get same response
- Client-side retry storms don't cause duplicate state events
- Matches industry patterns (Stripe, AWS)

### 2.4 Alternative: Database-Level Deduplication

Use `campaign_state_events` table:

```sql
-- Add unique constraint on (campaign_id, event_type, source_state, target_state) per minute
CREATE UNIQUE INDEX idx_dedupe_transitions 
ON campaign_state_events (campaign_id, event_type, source_state, target_state, date_trunc('minute', occurred_at));
```

**Trade-off**: Simpler but coarser granularity (1-minute window).

---

## 3. State Machine Coverage

### 3.1 Current Implementation

[phase_state.go](../backend/internal/services/phase_state.go) defines 15+ valid transitions:

```
not_started → in_progress (start)
not_started → ready (configure)
not_started → configured (configure)
ready → in_progress (start)
ready → configured (configure)
configured → in_progress (start)
in_progress → paused (pause)
in_progress → completed (complete)
in_progress → failed (fail)
paused → in_progress (resume)
paused → failed (fail)
completed → in_progress (rerun)
failed → in_progress (retry)
not_started/ready/configured → skipped (skip)
```

### 3.2 Audit: Ad-Hoc Transitions in Orchestrator

**Identified Gaps**:

| Location | Issue | Proposed Fix |
|----------|-------|--------------|
| `orchestrator.go:1293` (`resumePhaseAfterRestore`) | Bypasses ValidateTransition() | Add validation call |
| `orchestrator.go` campaign-level `StopCampaign` | Directly sets failed without transition check | Use fail trigger properly |
| Phase service completion callbacks | May complete without ValidateTransition | Enforce at orchestrator boundary |

**Action Items**:
1. Audit all `UpdateCampaignPhase()` call sites
2. Ensure every status change flows through `ValidateTransition()`
3. Add logging for any bypass (for debugging/alerting)

### 3.3 Proposed: Transition Guard Function

```go
// TransitionGuard wraps all status updates with validation
func (o *CampaignOrchestrator) transitionPhase(
    ctx context.Context,
    campaignID uuid.UUID,
    phase models.PhaseTypeEnum,
    from, to models.PhaseStatusEnum,
) error {
    if err := services.ValidateTransition(from, to, phase); err != nil {
        o.deps.Logger.Error(ctx, "Invalid transition blocked", map[string]interface{}{
            "campaign_id": campaignID,
            "phase": phase,
            "from": from,
            "to": to,
        })
        return err
    }
    // Persist + emit SSE
    return o.persistAndEmit(ctx, campaignID, phase, to)
}
```

All phase status updates must go through `transitionPhase()` – no direct DB writes.

---

## 4. Test Plan

### 4.1 Unit Tests (Go)

| Test | Description | File |
|------|-------------|------|
| `TestExpectedStatePreconditionPass` | Pause with matching expected_state succeeds | `handlers_campaigns_test.go` |
| `TestExpectedStatePreconditionFail` | Pause with mismatched expected_state returns 409 | `handlers_campaigns_test.go` |
| `TestIdempotencyKeyDeduplication` | Same key returns cached result | `handlers_campaigns_test.go` |
| `TestTransitionGuardRejectsInvalid` | Direct invalid transition is blocked | `orchestrator_test.go` |
| `TestRestoreDoesNotEmitDuplicate` | RestoreInFlightPhases with completed phase emits nothing | `orchestrator_restore_test.go` |

### 4.2 Integration Tests (Go)

| Test | Description |
|------|-------------|
| `TestConcurrentPauseRequests` | Two simultaneous pause requests – only one transition emitted |
| `TestRetryAfterTimeout` | Client retries pause after timeout – no duplicate event |
| `TestRestartMidTransition` | Backend restart during pause – state consistent after recovery |

### 4.3 E2E Tests (Playwright)

| Test | Description |
|------|-------------|
| `pause-with-expected-state.spec.ts` | UI sends expected_state, verifies 409 on mismatch |
| `network-retry-idempotency.spec.ts` | Simulate network retry, verify single state change in UI |
| `concurrent-control-clicks.spec.ts` | Rapid pause/resume clicks, verify consistent final state |

### 4.4 Smoke Test Updates

Extend `scripts/smoke-e2e-campaign.sh`:

```bash
# Test expected_state precondition
curl -X POST "$BASE_URL/campaigns/$CAMPAIGN_ID/phases/dns/pause?expected_state=in_progress" \
  -H "Authorization: Bearer $TOKEN"
# Should succeed if dns is in_progress

curl -X POST "$BASE_URL/campaigns/$CAMPAIGN_ID/phases/dns/pause?expected_state=in_progress" \
  -H "Authorization: Bearer $TOKEN"  
# Should return 409 if already paused
```

---

## 5. Implementation Phases

### Phase 3.1: Idempotent API Enhancement (2-3 days)
- Add `expected_state` query parameter to OpenAPI spec
- Regenerate Go server types
- Implement precondition checking in handlers
- Update 409 error envelope with new fields

### Phase 3.2: Transition Deduplication (2-3 days)
- Implement `X-Idempotency-Key` header support
- Add in-memory/Redis cache for idempotency keys
- Wire into control endpoints

### Phase 3.3: State Machine Hardening (1-2 days)
- Audit orchestrator for direct status writes
- Implement `transitionPhase()` guard function
- Add logging/metrics for blocked transitions

### Phase 3.4: Test Suite Expansion (2-3 days)
- Unit tests for new behaviors
- Integration tests for concurrency scenarios
- E2E tests for UI resilience

---

## 6. Open Questions

1. **Idempotency Key Storage**: In-memory (loses on restart) vs Redis (external dependency)?
2. **TTL Duration**: 5 minutes reasonable? Too short for long operations?
3. **expected_state Array**: Allow multiple values (`?expected_state=ready,configured`)?
4. **Backward Compatibility**: Should missing `expected_state` default to current behavior forever?

---

## 7. Success Criteria

- [ ] All control endpoints support optional `expected_state`
- [ ] 409 responses include `expected_state` in error envelope when applicable
- [ ] Duplicate requests with same idempotency key return cached response
- [ ] No ad-hoc transitions bypass `ValidateTransition()`
- [ ] Test coverage ≥ 80% for new code paths
- [ ] E2E smoke test passes with new assertions

---

## References

- [P2 Phase State Stability Contract](./PHASE_STATE_CONTRACT.md)
- [phase_state.go](../backend/internal/services/phase_state.go) – State machine implementation
- [orchestrator.go](../backend/internal/application/orchestrator.go) – Campaign orchestration
- [handlers_campaigns.go](../backend/cmd/apiserver/handlers_campaigns.go) – HTTP handlers
