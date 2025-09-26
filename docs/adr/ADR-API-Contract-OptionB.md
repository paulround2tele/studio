# ADR: API Contract Strategy (Option B – Hybrid Optimized)

Status: Draft
Date: 2025-09-26
Decision Drivers:
- Reduce FE complexity (remove envelope unwrapping)
- Eliminate success/data redundancy
- Preserve consistent ErrorEnvelope for non-2xx
- Enable simpler caching & RTK Query usage

## Context
Legacy API returned envelopes for all responses: `{ success, data, error, requestId }`.
This caused brittle unwrapping code, type casting, and double-wrapped edge cases.

## Decision
Adopt Option B:
- 2xx -> direct resource body (object / array / pagination wrapper)
- 4xx/5xx -> ErrorEnvelope with error+requestId
- RequestId only in header for 2xx

## Consequences
Positive:
- Less FE boilerplate
- Stronger typing
- Smaller payloads
- Simpler contract tests
Negative:
- Mixed modes during migration window (mitigated by adapter + manifest)
- Need careful error normalization early

## Alternatives Considered
A. Keep envelopes (rejected: continued complexity)  
C. Full hypermedia (overkill)  
D. GraphQL pivot (out of scope)  

## Status & Follow-up
- Phase A pilot migrated (Personas + Health + Campaign CRUD)
- Central middleware + error unification scheduled Phase B
- Adapter removal Phase D

## Metrics of Success
- Zero 2xx envelopes after Phase C
- Envelope helpers deleted by Day 15
- Error taxonomy stable (<1% UNKNOWN)

## References
- `docs/API_CONTRACT_ALIGNEMENT_PLAN.md`
- `docs/api_endpoint_manifest.json`
