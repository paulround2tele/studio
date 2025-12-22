# Phase State Contract

> This document defines the authoritative semantics for phase state management in DomainFlow.
> All implementations (backend, frontend, SSE) must conform to this contract.

---

## 1. Control Phase Definition

### The `controlPhase` Concept

At any moment, a campaign has exactly one **controlPhase** — the phase that pause/resume/stop operations target.

```
controlPhase = pausedPhase ?? inProgressPhase ?? null
```

**Resolution Order**:
1. If any phase is `paused` → that phase is `controlPhase`
2. Else if any phase is `in_progress` → that phase is `controlPhase`
3. Else → `controlPhase` is `null` (no active work)

### Rules

| Rule | Description |
|------|-------------|
| **Control targets controlPhase** | All pause/resume/start controls MUST target `controlPhase`, never a UI-selected/inspect phase |
| **Snapshot exposes controlPhase** | `GET /campaigns/{id}/status` response includes `controlPhase` field |
| **UI selection ≠ control target** | User may inspect any phase, but controls always operate on `controlPhase` |
| **Null handling** | If `controlPhase` is null, pause/resume return `409 Conflict` |

### Snapshot Response Shape

```json
{
  "campaignId": "uuid",
  "controlPhase": "dns_validation",
  "phases": { ... },
  "lastSequence": 42
}
```

**Invariant**: Frontend must never send pause/resume to a phase other than `controlPhase`. This prevents regressions where UI attempts to control the wrong phase.

---

## 2. Phase States

A campaign phase exists in exactly one of these states:

| State | Description |
|-------|-------------|
| `not_started` | Phase has not begun execution |
| `in_progress` | Phase is actively executing |
| `paused` | Phase is suspended, can be resumed |
| `completed` | Phase finished successfully |
| `failed` | Phase terminated with error |

---

## 3. Valid State Transitions

```
                    ┌─────────────┐
                    │ not_started │
                    └──────┬──────┘
                           │ start
                           ▼
        ┌─────────────────────────────────────┐
        │             in_progress             │◄──────────┐
        └───┬─────────────┬─────────────┬─────┘           │
            │             │             │                 │
      pause │    complete │       fail  │                 │ resume
            ▼             ▼             ▼                 │
       ┌────────┐   ┌───────────┐   ┌────────┐           │
       │ paused │───┤ completed │   │ failed │           │
       └────────┘   └─────┬─────┘   └────┬───┘           │
            │             │              │               │
            │             │ rerun        │ retry         │
            │             └──────────────┴───────────────┘
            │                            │
            └────────────────────────────┘
```

### Transition Table

| From | To | Trigger | Valid |
|------|----|---------|-------|
| `not_started` | `in_progress` | start | ✅ |
| `in_progress` | `paused` | pause | ✅ |
| `in_progress` | `completed` | completion | ✅ |
| `in_progress` | `failed` | error | ✅ |
| `paused` | `in_progress` | resume | ✅ |
| `completed` | `in_progress` | rerun | ✅ |
| `failed` | `in_progress` | retry | ✅ |
| `not_started` | `paused` | - | ❌ |
| `not_started` | `completed` | - | ❌ |
| `paused` | `completed` | - | ❌ |
| `paused` | `failed` | - | ❌ |
| `completed` | `paused` | - | ❌ |
| `failed` | `paused` | - | ❌ |

**Invariant**: All state changes MUST go through the state machine validator. No bypass paths.

### Rerun/Retry Preconditions

Transitions from `completed` or `failed` back to `in_progress` have additional preconditions:

| Precondition | Description |
|--------------|-------------|
| **No concurrent execution** | No other phase may be `in_progress` at the time of rerun/retry |
| **Predecessor outputs exist** | Required outputs from prior phases must still be available |

If preconditions are not met, return `409 Conflict` with reason.

```json
{
  "error": {
    "code": "RERUN_PRECONDITION_FAILED",
    "reason": "another_phase_in_progress",
    "blocking_phase": "http_validation"
  }
}
```

---

## 4. State Authority Hierarchy

```
Snapshot (GET /status) > SSE Events > Optimistic Updates
```

| Layer | Authority | Scope |
|-------|-----------|-------|
| **Snapshot** | Authoritative ground truth | Full state |
| **SSE Events** | Incremental updates (sequence-ordered) | Deltas only |
| **Optimistic Updates** | UI feedback only | Ephemeral |

### Rules

1. **Snapshot always wins**: When fetched, snapshot overwrites all cached state.
2. **SSE respects sequence**: Events with `sequence ≤ lastApplied` are discarded.
3. **Optimistic is temporary**: Overwritten by next SSE event or snapshot.
4. **SSE guards never block snapshot**: Snapshot application bypasses sequence checks.

### Snapshot Carries Sequence

The snapshot response MUST include `lastSequence`:

```json
{
  "campaignId": "uuid",
  "controlPhase": "dns_validation",
  "lastSequence": 42,
  "phases": { ... }
}
```

On SSE reconnect:
1. Fetch snapshot
2. Set `lastAppliedSequence = snapshot.lastSequence`
3. Discard any SSE events with `sequence ≤ lastAppliedSequence`

This ensures snapshot and SSE cannot diverge.

---

## 5. Sequence Generation

### Source of Truth

Sequence numbers are generated and managed exclusively by the backend:

| Rule | Description |
|------|-------------|
| **Generated in orchestrator** | Sequence is assigned at the moment a lifecycle transition is persisted to DB |
| **Stored in DB** | Sequence is stored or derivable from campaign state |
| **SSE emits, never invents** | SSE service reads sequence from DB; never generates its own |
| **Monotonically increasing** | Per campaign, sequence always increases |

### Sequence Flow

```
1. Orchestrator persists state change → assigns sequence N
2. SSE service reads from DB → emits event with sequence N
3. Frontend receives event → checks N > lastApplied
4. Snapshot fetched → returns lastSequence = current max
```

**Invariant**: Because sequence originates from DB and both snapshot and SSE read from DB, they cannot diverge.

---

## 6. SSE Event Semantics

### Lifecycle Events (Full Authority)

These events update phase status:

| Event | Effect | Status Set To |
|-------|--------|---------------|
| `phase_started` | Phase began execution | `in_progress` |
| `phase_paused` | Phase suspended | `paused` |
| `phase_resumed` | Phase resumed execution | `in_progress` |
| `phase_completed` | Phase finished | `completed` |
| `phase_failed` | Phase errored | `failed` |

### Progress Events (Partial Authority)

| Event | Effect | Status |
|-------|--------|--------|
| `campaign_progress` | Updates `progressPercentage` only | **NEVER touches status** |

**Invariant**: `campaign_progress` events must not modify lifecycle state. They report progress within the current state only.

### Progress Event Guards

Progress events MUST be ignored when the phase is in a terminal or suspended state:

| Phase State | Progress Event Handling |
|-------------|------------------------|
| `in_progress` | ✅ Apply progress update |
| `paused` | ❌ Ignore (log warning) |
| `completed` | ❌ Ignore (log warning) |
| `failed` | ❌ Ignore (log warning) |
| `not_started` | ❌ Ignore (log warning) |

**Invariant**: Progress events must never downgrade lifecycle state. A progress event arriving after `phase_paused` cannot flip state back to `in_progress`.

### Event Envelope

All SSE events include:

```json
{
  "type": "phase_paused",
  "campaignId": "uuid",
  "phase": "dns_validation",
  "sequence": 42,
  "timestamp": "2025-12-21T04:38:21Z",
  "payload": { ... }
}
```

- `sequence`: Monotonically increasing per campaign. Primary ordering key.
- `timestamp`: Server time when state changed. Secondary guard.

---

## 7. Control Signal Semantics

### Idempotency

Control endpoints accept optional `expected_state`:

```http
POST /api/v2/campaigns/{id}/phases/{phase}/pause
Content-Type: application/json

{
  "expected_state": "in_progress"
}
```

### Response Codes

| Scenario | Response | Action |
|----------|----------|--------|
| Transition valid, executed | `200 OK` | State changed |
| Already in target state | `200 OK` | No-op (idempotent success) |
| Transition invalid | `409 Conflict` | Rejected with current state |
| Expected state mismatch | `409 Conflict` | Precondition failed (P3.2) |
| Phase not found | `404 Not Found` | - |
| Invalid expected_state value | `400 Bad Request` | - |

### 409 Conflict Error Envelope

All invalid transition responses use a standardized error shape:

```json
{
  "error": {
    "code": "INVALID_PHASE_TRANSITION",
    "current_state": "paused",
    "attempted_action": "complete",
    "message": "Cannot transition from 'paused' to 'completed'"
  }
}
```

| Field | Description |
|-------|-------------|
| `code` | Machine-readable error code |
| `current_state` | Actual phase state at time of request |
| `attempted_action` | The action that was attempted |
| `message` | Human-readable explanation |

### P3.2: expected_state Precondition

Control endpoints accept an optional `expected_state` query parameter:

```http
POST /api/v2/campaigns/{id}/phases/{phase}/pause?expected_state=in_progress
```

Behavior:
- If `expected_state` matches current state → proceed with transition
- If `expected_state` doesn't match → return 409 with `EXPECTED_STATE_MISMATCH`
- If `expected_state` is omitted → backward-compatible (no precondition check)
- If `expected_state` is invalid → return 400

**Expected State Mismatch Response**:
```json
{
  "error": {
    "code": "EXPECTED_STATE_MISMATCH",
    "current_state": "paused",
    "expected_state": "in_progress",
    "attempted_action": "pause",
    "message": "Expected state 'in_progress' but current state is 'paused'; cannot pause"
  },
  "requestId": "uuid",
  "success": false
}
```

### P3.3: X-Idempotency-Key Header

Control endpoints accept an optional `X-Idempotency-Key` header:

```http
POST /api/v2/campaigns/{id}/phases/{phase}/pause
POST /api/v2/campaigns/{id}/phases/{phase}/resume
POST /api/v2/campaigns/{id}/phases/{phase}/start
POST /api/v2/campaigns/{id}/phases/{phase}/stop
POST /api/v2/campaigns/{id}/stop
X-Idempotency-Key: client-generated-uuid-or-timestamp
```

Behavior:
- First request with a key → executes operation, caches result, emits SSE
- Subsequent requests with same key (within 5 min TTL) → returns cached result, NO new SSE
- Different key → executes as new operation
- No key → backward-compatible (no caching)

**Supported Operations**:
| Operation | Endpoint | Supports Idempotency |
|-----------|----------|---------------------|
| Pause | `POST /phases/{phase}/pause` | ✓ |
| Resume | `POST /phases/{phase}/resume` | ✓ |
| Start | `POST /phases/{phase}/start` | ✓ |
| Stop (phase) | `POST /phases/{phase}/stop` | ✓ |
| Stop (campaign) | `POST /campaigns/{id}/stop` | ✓ |

**Purpose**: Prevents duplicate SSE emissions from rapid double-clicks or network retries.

**Key Format**: Any unique string (e.g., UUID, timestamp, request fingerprint).

**TTL**: Keys expire after 5 minutes. After expiration, the same key will execute a new operation.

**Error Caching**: If the first request fails (e.g., 409), the error is also cached. Retries with the same key return the cached error without re-executing.

Frontend handles 409 by:
1. Reading `current_state` from response
2. Updating cache to match actual state
3. Not showing error toast (user sees corrected UI)

### Idempotency Guarantee

Clients may safely retry control signals. The same request sent N times has the same effect as sending it once.

---

## 8. Reconnection Protocol

When SSE connection is re-established:

1. **Fetch fresh snapshot** immediately (`GET /campaigns/{id}/status`)
2. **Apply snapshot** to Redux cache (overwrites all)
3. **Reset sequence tracker** to snapshot's sequence
4. **Resume SSE processing** with new baseline

**Invariant**: No SSE events are applied between disconnect and snapshot fetch.

---

## 9. Frontend State Machine

The frontend maintains a **mirror** of the backend state machine for UX purposes:

- Determines which control buttons are enabled/disabled
- Validates before sending mutations
- **Never overrides** snapshot or SSE state

```typescript
// Example: Button enablement
const canPause = phaseStateMachine.canTransition(currentState, 'paused');
const canResume = phaseStateMachine.canTransition(currentState, 'in_progress');
```

---

## 10. Invariants Summary

1. **Single source of truth**: Backend database is authoritative.
2. **No refetch on pause/resume**: SSE + optimistic updates handle sync.
3. **Snapshot required after reconnect**: Always fetch before processing SSE.
4. **Sequence ordering**: Stale events (sequence ≤ last) are discarded.
5. **Progress ≠ Status**: `campaign_progress` never changes lifecycle state.
6. **State machine enforced**: All transitions validated, invalid rejected.
7. **Idempotent controls**: Duplicate signals are safe.
8. **controlPhase is canonical**: All controls target controlPhase, never UI-selected phase.
9. **Progress ignores terminal states**: Progress events for paused/completed/failed phases are discarded.

---

## 11. Required Validation Scenarios

These scenarios are **contract-level invariants**, not just tests. Any implementation must pass all of them.

### Scenario 1: Pause Survives Refresh
```
1. Phase is in_progress
2. User clicks Pause → UI shows paused
3. User refreshes browser
4. UI still shows paused (from snapshot)
```
**Validates**: Snapshot authority, optimistic update not lost

### Scenario 2: Pause Survives Backend Restart
```
1. Phase is paused
2. Backend restarts
3. SSE reconnects, fetches snapshot
4. UI still shows paused
```
**Validates**: DB persistence, reconnection protocol

### Scenario 3: Resume Continues Progress
```
1. Phase is paused at 50%
2. User clicks Resume
3. Progress continues from 50%, no reset to 0%
4. No duplicate phase_started events
```
**Validates**: Resume semantics, progress preservation

### Scenario 4: Out-of-Order SSE Ignored
```
1. Snapshot fetched with sequence=10
2. SSE event arrives with sequence=8
3. Event is discarded (not applied)
4. UI state unchanged
```
**Validates**: Sequence guards, stale event rejection

### Scenario 5: Duplicate Pause Idempotent
```
1. Phase is in_progress
2. Pause sent twice (network retry)
3. Both return 200 OK
4. Phase is paused (not errored)
```
**Validates**: Idempotency, no error on duplicate

### Scenario 6: Invalid Transition Rejected
```
1. Phase is paused
2. Attempt to complete (invalid)
3. Returns 409 with current_state: paused
4. Phase remains paused
```
**Validates**: State machine enforcement, 409 envelope

### Scenario 7: Progress After Pause Ignored
```
1. Phase is paused
2. Stale campaign_progress event arrives
3. Event is ignored
4. Phase remains paused, no flip to in_progress
```
**Validates**: Progress guards, flip-flop prevention

### Scenario 8: expected_state Precondition (P3.2)
```
1. Phase is paused
2. Pause request with expected_state=in_progress
3. Returns 409 with EXPECTED_STATE_MISMATCH
4. Phase remains paused (no state change)
```
**Validates**: Precondition enforcement, stale client detection

### Scenario 9: Idempotency Key Deduplication (P3.3)
```
1. Phase is in_progress
2. Two rapid pause requests with same X-Idempotency-Key
3. First request pauses, second returns cached result
4. Only ONE SSE phase_paused event emitted
```
**Validates**: Duplicate prevention, no double SSE sequences

### Scenario 10: Idempotency Key Expiration (P3.3)
```
1. Pause with key "abc" succeeds
2. Wait > 5 minutes (TTL)
3. Resume phase
4. Pause with key "abc" again
5. New SSE event emitted (key expired)
```
**Validates**: TTL expiration, fresh execution after timeout

### Scenario 11: Bypass Audit Detection (P3.4)
```
1. Server restarts while phase is running
2. RestoreInFlightPhases uses transitionPhaseDirect
3. P3.4 audit log emitted: "Transition bypass detected"
4. Metric transition_bypass_total increments
5. Dashboard shows bypass count for migration tracking
```
**Validates**: Observability of legacy bypass paths

---

## 12. Debugging Checklist

When investigating state issues:

1. Check backend logs for transition validation errors
2. Verify SSE sequence numbers are monotonically increasing
3. Confirm `campaign_progress` is not touching status
4. Verify snapshot was fetched after any reconnect
5. Check for `invalidatesTags` triggering unwanted refetches
6. **P3.4**: Check for "Transition bypass detected" logs - these indicate legacy paths

---

## 13. P3.4: Transition Guard Unification

### Current Architecture

All status mutations SHOULD flow through `transitionPhase()`:

```
┌────────────────┐     ┌──────────────────┐     ┌────────────────┐
│  HTTP Handler  │────▶│ transitionPhase()│────▶│   Database     │
└────────────────┘     │  (state machine) │     └────────────────┘
                       └────────┬─────────┘
                                │
                       ┌────────▼─────────┐
                       │   SSE Emission   │
                       │  (with sequence) │
                       └──────────────────┘
```

### Known Bypass Points (P3.4 Tracked)

| Caller | Reason | Status |
|--------|--------|--------|
| `transitionPhaseDirect` | Legacy bypass | **DEPRECATED** - no callers remain |
| `recordCampaignStop` | Campaign stop flow | **MIGRATED** - now uses transitionPhase() |
| `PausePhaseWithOpts` | Runtime coordination | Uses ValidateTransition + RecordLifecycleEvent (correct pattern) |
| `ResumePhaseWithOpts` | Runtime coordination | Uses ValidateTransition + RecordLifecycleEvent (correct pattern) |

### P3 Final: Migration Complete

As of P3 Final, all lifecycle mutations either:
1. Go through `transitionPhase()` (canonical path)
2. Use `ValidateTransition()` + `RecordLifecycleEvent()` + SSE emission (specialized but correct)

The `transitionPhaseDirect()` function is now **DEPRECATED** with zero callers.

### Audit Logging

All bypasses are logged with:
- **Log**: `P3.4: Transition bypass detected`
- **Metric**: `transition_bypass_total`
- **Fields**: campaign_id, phase, from_status, to_status, caller, reason

### Multi-Instance Idempotency (Redis)

For multi-instance deployments, replace in-memory cache with Redis:

```go
// Interface for pluggable store
type IdempotencyStore interface {
    Get(key string) (*IdempotencyEntry, error)
    Set(key string, result interface{}, err error, ttl time.Duration) error
}

// Redis implementation
// SETNX <key> <json> EX 300
// GET <key>
```

See: `backend/internal/services/idempotency_cache.go` for implementation notes.

---

## Changelog

| Date | Change |
|------|--------|
| 2025-12-21 | **P3 FINAL**: Unified control plane - all lifecycle mutations validated, transitionPhaseDirect deprecated |
| 2025-12-21 | P3 Final: OpenAPI updated with expected_state + X-Idempotency-Key on pause/resume/start/stop |
| 2025-12-21 | P3 Final: Frontend uses idempotency keys and expected_state preconditions |
| 2025-12-21 | P3.4: Transition guard unification - added TransitionBypassAudit, IncTransitionBypass metric, Redis migration docs |
| 2025-12-21 | P3.3: Extended X-Idempotency-Key to Start, Stop, StopCampaign operations |
