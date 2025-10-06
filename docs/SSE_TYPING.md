# SSE Typing Strategy

This project uses Server-Sent Events for campaign phase progress and domain lifecycle updates.

## Why OpenAPI Didn’t Generate Strong SSE Types
OpenAPI 3.x (and current generator tooling) treats `text/event-stream` responses as opaque `string` payloads. The generator:
- Does not parse the event framing (`event:` / `data:` lines)
- Ignores schemas unless they are directly referenced by a JSON media type
- Will not materialize discriminated unions defined only for a streaming text media type

Attempts made:
1. Added `CampaignSseEventPayload` and wrapper union `CampaignSseEvent` with discriminator.
2. Added a JSON sample endpoint referencing the union.
3. Generator still skipped emitting the union models (limitation with aggregated schema file + indirect reference pattern).

## Runtime Approach (Current)
We parse raw SSE messages using a lightweight handler inside `useCampaignPhaseEvents`:
1. Rely on the browser EventSource delivering `event` name and `data` string.
2. `JSON.parse` the `data` into a generic `Record<string, unknown>`.
3. Switch on `event` field to narrow the shape and update RTK Query caches / show toasts.
4. Use minimal, inline narrowing instead of local TypeScript union declarations (policy: only generated types).

## Why Not Hand-Rolled Union Types?
Policy constraint: "Use the generated types, don’t introduce new types." Creating local discriminated unions would violate this; instead we keep logic-based guards.

## Options for Future Strong Typing
| Option | Description | Trade-offs |
|--------|-------------|------------|
| A | Add official JSON mirror endpoint returning `CampaignSseEvent[]` and adjust generator invocation or upgrade generator | Extra endpoint maintenance; keeps policy intact |
| B | Move to WebSocket / GraphQL where schema tooling natively supports subscriptions | Larger infra change |
| C | Adopt local `.d.ts` ambient declarations for SSE events (still technically local types) | Policy exception required |
| D | Keep current pragmatic guard-based narrowing | No spec change; still some `as any` casts |

## Recommended Path
Implement Option A fully: ensure a JSON (non-array) endpoint returns a single `CampaignSseEvent` root `$ref` (not wrapped in array) so generator MUST traverse the union. If still skipped, consider upgrading OpenAPI Generator or splitting schemas so the union sits directly under `components.schemas` in its own file.

## Guard Patterns Used
```ts
// Example narrowing snippet concept (not yet replacing code):
function isAnalysisFailed(p: any): p is { error: string; errorCode?: string } {
  return p && typeof p.error === 'string' && 'error' in p;
}
```

## Audit Impact
Current explicit `any` count: 484. SSE refactors did not reduce this because casts are still needed without generated discriminators.

## Next Steps if Strong Typing Becomes Critical
1. Create `/sse/campaigns/{campaignId}/events/latest` returning a single `CampaignSseEvent` (JSON) with `$ref` root.
2. Regenerate and verify union emission.
3. Replace switch payload casts with discriminated TypeScript `switch (evt.type)` narrowing.
4. Remove residual `as any` inside the hook.

---
Maintainer Note: This document clarifies intentional acceptance of limited static typing for SSE until generator or spec adjustments succeed.
