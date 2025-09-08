# Pipeline Retry & Failure Handling Guide

This guide explains how failures and retries behave in the unified full sequence campaign pipeline.

## Failure Model
A phase can fail during manual or auto start. When a failure occurs:
- Auto-advance halts.
- `phase_failed` SSE event is emitted.
- Metrics: `phaseFailures` increments.
- UI derives `lastFailedPhase` and computes `retryEligiblePhases` (the failed phase onward).

## Retrying a Failed Phase
1. User triggers a retry (API call or UI action mapped to `StartPhase`).
2. Orchestrator executes the failed phase again.
3. On success (`phase_completed`), auto-advance resumes for remaining phases if still in `full_sequence` mode.

## SSE Events Sequence (Failure → Retry → Success)
```
phase_started (domain_generation)
phase_completed (domain_generation)
phase_auto_started (dns_validation)
phase_failed (dns_validation)   <-- auto chain pauses
phase_started (dns_validation)  <-- manual retry
phase_completed (dns_validation)
phase_auto_started (http_keyword_validation)
phase_completed (http_keyword_validation)
phase_auto_started (analysis)
phase_completed (analysis)
campaign_completed
```

## Selector Guarantees
| Selector | Description |
|----------|-------------|
| `lastFailedPhase` | The most recent failed phase key. |
| `retryEligiblePhases` | Ordered array from failed phase to end. |
| `nextUserAction` | `retry_phase` when a retry is pending; otherwise next start or `none`. |

## Edge Cases
| Case | Handling |
|------|----------|
| Multiple rapid failures | `lastFailedPhase` updates to latest; earlier incomplete retries ignored. |
| Retry while still processing previous failure (shouldn't happen) | Backend start returns 409/409-like error; UI surfaces toast. |
| Mode switched to step_by_step before retry | Auto-advance will not resume after retry; user must start remaining phases manually. |
| Attempt to start downstream phase while failed phase unresolved | Gating error returned; UI should prompt retry of failed phase first. |

## Metrics Interpretation
| Metric | Increment Trigger |
|--------|-------------------|
| phaseFailures | Any failed start or execution error per phase attempt. |
| phaseStarts | Successful phase execution start (manual). |
| phaseAutoStarts | Successful auto-chained start. |
| phaseCompletions | Phase successfully completes. |
| campaignCompletions | Final phase completes. |

## Testing References
- Backend: `orchestrator_integration_test.go::TestFailureThenRetryChainContinues`
- Backend: `orchestrator_sse_test.go::TestSSEEventEmissionFailureThenRetry`
- Frontend: `failureRetryFlow.test.ts`

## Operational Guidance
- Always inspect `phase_failures` metric trend for early regression detection.
- Frontend should visually differentiate a paused pipeline (post-failure) from an idle pipeline before first start.
- Consider adding a toast or banner summarizing recovery steps after repeated failures.

---
*End of guide.*
