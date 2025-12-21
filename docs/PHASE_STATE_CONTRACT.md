# Phase State Contract

> This document defines the authoritative semantics for phase state management in DomainFlow.
> All implementations (backend, frontend, SSE) must conform to this contract.

---

## 1. Phase States

A campaign phase exists in exactly one of these states:

| State | Description |
|-------|-------------|
| `not_started` | Phase has not begun execution |
| `in_progress` | Phase is actively executing |
| `paused` | Phase is suspended, can be resumed |
| `completed` | Phase finished successfully |
| `failed` | Phase terminated with error |

---

## 2. Valid State Transitions

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

---

## 3. State Authority Hierarchy

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

---

## 4. SSE Event Semantics

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

## 5. Control Signal Semantics

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
| Phase not found | `404 Not Found` | - |

### Idempotency Guarantee

Clients may safely retry control signals. The same request sent N times has the same effect as sending it once.

---

## 6. Reconnection Protocol

When SSE connection is re-established:

1. **Fetch fresh snapshot** immediately (`GET /campaigns/{id}/status`)
2. **Apply snapshot** to Redux cache (overwrites all)
3. **Reset sequence tracker** to snapshot's sequence
4. **Resume SSE processing** with new baseline

**Invariant**: No SSE events are applied between disconnect and snapshot fetch.

---

## 7. Frontend State Machine

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

## 8. Invariants Summary

1. **Single source of truth**: Backend database is authoritative.
2. **No refetch on pause/resume**: SSE + optimistic updates handle sync.
3. **Snapshot required after reconnect**: Always fetch before processing SSE.
4. **Sequence ordering**: Stale events (sequence ≤ last) are discarded.
5. **Progress ≠ Status**: `campaign_progress` never changes lifecycle state.
6. **State machine enforced**: All transitions validated, invalid rejected.
7. **Idempotent controls**: Duplicate signals are safe.

---

## 9. Debugging Checklist

When investigating state issues:

1. Check backend logs for transition validation errors
2. Verify SSE sequence numbers are monotonically increasing
3. Confirm `campaign_progress` is not touching status
4. Verify snapshot was fetched after any reconnect
5. Check for `invalidatesTags` triggering unwanted refetches

---

## Changelog

| Date | Change |
|------|--------|
| 2025-12-21 | Initial contract created (P2 hardening) |
