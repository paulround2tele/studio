# Frontend Type Alignment Plan

> Objective: Remove `any` / unsafe casts across the frontend and replace with precise generated or domain model types. No widening to `unknown` as a substitute—always land on concrete or well-bounded generic types.

---
## Guiding Principles
- **Source of Truth**: Generated OpenAPI client types (in `src/lib/api-client`) and stable domain model interfaces we introduce under `src/types/`.
- **No Blind Casting**: Eliminate `as any` / chained `as unknown as T` patterns; prefer inference or explicit structural types.
- **Incremental, Safe Commits**: Refactor highest-value surfaces first (domain lists, streaming tables, phase config forms, SSE events).
- **Keep Build Green**: After each phase run `npm run typecheck` & minimal smoke tests.
- **Enforce Regression Guard**: Add lint rule / script to fail on new `: any` outside approved test helpers.

---
## Current Inventory (Snapshot)
(Collected via grep on Oct 2 2025)

### High-Value Hotspots
- `DomainsList.tsx` – metrics, scoringProfiles lookup, aggregates, domain items (multiple `any` usages)
- `DomainStreamingTable.tsx` – status classification & counters (`d:any`)
- Config / form components: `DNSValidationConfigForm.tsx`, `HTTPValidationConfigForm.tsx`, `DiscoveryConfigForm.tsx`, `AnalysisConfigForm.tsx`
- Campaign overview / workspace: `CampaignOverviewCard.tsx`, `PipelineWorkspace.tsx`
- SSE consumption: `hooks/useCampaignSSE.ts` (casts to phase events)

### Cross-Cutting Utility / Infra
- UI primitives (`data-table.tsx`, `chart.tsx`, `toaster.tsx`)
- Generic fetch / transform utils (`fetchWithPolicy.ts`, `case-transformations.ts`)
- API client `@ts-ignore` lines (likely generation mismatch)

### Other Patterns
- Status mapping returns like `'validated' as any`
- Union shaping needed for domain life-cycle states & SSE event kinds

---
## Target Type Modules To Introduce
Create `src/types/domain/` with exports:
- `DomainRow` – lightweight subset for list / streaming table
- `DomainFull` – complete domain object (mirrors backend response)
- `ScoringProfileLite` – id + name + scalar weights (whatever exposed)
- `CampaignPhase` – union of `'discovery' | 'validation' | 'extraction' | 'analysis' | ...`
- `PhaseStatus` – shape returned by `getPhaseStatusStandalone`
- `LifecycleState` – UI derived classification for a domain row (replaces opaque string anys)
- `SsePhaseEvent`, `SseProgressEvent`, `SseFailureEvent`, `SseDomainScoredEvent` – discriminated union on `eventType`

Add `src/types/forms/`:
- `DiscoveryConfigFormValues`
- `DNSValidationConfigFormValues`
- `HTTPValidationConfigFormValues`
- `AnalysisConfigFormValues`

Each form interface matches the request DTO for corresponding backend endpoint (derive from generated request type; narrow optionality where controlled by form logic).

---
## Phased Execution Roadmap

### Phase 1 – Domain List Core
1. Add domain & scoring profile types file.
2. Refactor `DomainsList.tsx`:
   - Replace `(d:any)` with `(d: DomainRow)`
   - Type `metricValue`, `getDomainWarnings` input param.
   - Replace aggregates `(enriched as any)` with a strongly typed object or optional chain + fallback typed const.
3. Refactor `CampaignOverviewCard.tsx` scoring profile lookups & averages.
4. Introduce `LifecycleState` enum or string union and replace `'validated' as any` patterns in `DomainStreamingTable.tsx`.
5. Run `npm run typecheck` & adjust.

### Phase 2 – Phase Config Forms
1. Define form value interfaces.
2. Update each form component to use them; remove configuration casts (`values as any`).
3. Type RTK updateQueryData callbacks: `(draft: PhaseStatus | undefined) => PhaseStatus`.
4. Replace `as any` on `getPhaseStatusStandalone.initiate` by providing properly typed argument object.

### Phase 3 – SSE Event Typing
1. Add SSE event union types.
2. Refactor `useCampaignSSE.ts` to parse payloads into discriminated union.
3. Update event handlers `(events.onPhaseStarted?.(...))` arguments to precise types.
4. Remove `as unknown as PhaseEvent` chain.

### Phase 4 – UI Primitives Generics
1. `data-table.tsx`: Introduce generic `<T extends Record<string, unknown>>`; type `cell`, `filterFn`, `filtering` entries.
2. `chart.tsx`: Narrow `format`, `formatter`, `payload` generics.
3. `toaster.tsx`: Define `ToastPayload` interface; remove `props: any`.

### Phase 5 – Utility Layer Tightening
1. `fetchWithPolicy.ts`: Provide overloads for expected body types (`json`, `text`, `arrayBuffer`) instead of casting.
2. Key transformation utils: Replace `unknown as T` with constrained generics + intermediate typed arrays.
3. Remove redundant double casts (`as unknown as` patterns) where structural satisfaction suffices.

### Phase 6 – API Client Hygiene
1. Inspect `@ts-ignore` occurrences in `apis/campaigns-api.ts`.
2. Cross-check OpenAPI spec vs generated output; regenerate if needed.
3. Remove ignores; adjust custom code if spec drift requires schema correction.

### Phase 7 – Redux & Derived State
1. Identify slices still using implicit anys (grep for `createSlice({` near `any`).
2. Introduce slice-level state interfaces.
3. Ensure thunks / RTK query hook results are properly typed (leverage generated API types).

### Phase 8 – Tests & Safety Nets
1. Update tests using `as any` only where mocking incomplete domain objects; introduce typed factory helpers (`makeDomainRow(overrides)`).
2. Add a compile-time type test file `typesafety.d.ts` using `// $ExpectType` style (or TS 5.5 satisfaction assertions) for critical shapes.
3. Add script `scripts/enforce-no-any.mjs` to scan for new forbidden patterns.

### Phase 9 – Documentation & Enforcement
1. Extend `TYPE_SAFETY_PHASE_NEXT.md` with achieved delta metrics (counts before/after for `: any`, ` as any`).
2. Add ESLint rule: enable `@typescript-eslint/no-explicit-any` with override for `**/__tests__/**` and explicit allowlist comments (`// eslint-disable-next-line` only with justification).
3. Add CI step invoking `npm run type-safety:scan`.

---
## Acceptance Criteria
- Zero `as any` in production code (non-test) directories except explicitly documented exemptions.
- Zero `: any` in production code; replaced by concrete or generic types.
- All SSE and domain lifecycle strings replaced by union types or enums.
- No remaining `@ts-ignore` in generated client unless tied to an upstream spec bug with tracking issue reference.
- TypeScript build passes with `strict` settings (confirm `tsconfig` includes `strict: true`).
- Added automated guard preventing reintroduction of raw `any`.

---
## Metrics & Tracking
| Metric | Baseline (Oct 2 2025) | Target |
|--------|-----------------------|--------|
| Occurrences `: any` (src) | (captured via grep – count to be computed) | 0 (prod) |
| Occurrences ` as any` | (captured via grep – count to be computed) | 0 (prod) |
| `@ts-ignore` in api client | ~90 lines | 0 or documented exceptions |
| SSE cast chains (`as unknown as`) | Multiple | 0 |

Add a running section at bottom to log reductions per phase.

---
## Work Log (Populate During Execution)
| Phase | Date | Change Summary | Remaining Risk |
|-------|------|----------------|----------------|
| 1 | TBD |  |  |
| 2 | TBD |  |  |
| 3 | TBD |  |  |
| 4 | TBD |  |  |
| 5 | TBD |  |  |
| 6 | TBD |  |  |
| 7 | TBD |  |  |
| 8 | TBD |  |  |
| 9 | TBD |  |  |

---
## Execution Notes
- If a generated type is overly broad (e.g., optional fields always present), create a *refined* interface with `Omit<>` + required members instead of using `any`.
- Prefer `satisfies` operator to assert shape without widening inference when building constant objects.
- For dynamic key maps, use `Record<SpecificKeyUnion, ValueType>` rather than `Record<string, unknown>` when feasible.

---
## Next Immediate Step
Proceed with Phase 1: introduce `src/types/domain` module and refactor `DomainsList.tsx` + `CampaignOverviewCard.tsx`.

---
## Open Questions / To Validate
- Confirm exact generated type names for domains & scoring profiles (inspect `api-client` folder before Phase 1 commit).
- Determine if SSE payload structure is documented (if not, codify via runtime narrowing + type guards).

---
*End of Plan.*
