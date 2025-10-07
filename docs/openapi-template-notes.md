# OpenAPI Generator Template Customization

## Goal
Enforce zero `any` usage in generated TypeScript Axios client models by mapping all free‑form objects and map/inline schemas to `Record<string, unknown>` (and arrays thereof) while retaining enum safety and readable property names.

## Problem Statement
The stock `typescript-axios` generator emits `any` for:
- `additionalProperties: true`
- Inline object schemas used as array `items` with `additionalProperties: true`
- Free‑form object schemas without explicit properties

Manual post‑generation cleanups were previously required, risking drift and human error.

## Implemented Strategy
Custom override of `modelGeneric.mustache` located at `openapi-templates/ts-axios/modelGeneric.mustache` with these behaviors:

1. Property Names: Use `'{{baseName}}'` to preserve original OpenAPI field names.
2. Enums: Inline union literal type (e.g. `'A' | 'B'`) to simplify template logic and avoid nested Mustache sections that previously caused parser errors.
3. Maps & Free‑Form Objects:
   - `isMap` or `isFreeFormObject` => `Record<string, unknown>`
   - Arrays whose `items` are free‑form objects => `Array<Record<string, unknown>>`
4. `additionalProperties` at object level always emits `[key: string]: Record<string, unknown>;` index signature.
5. Nullable support preserved via `| null` suffix.

## Known Trade‑offs
- Enum JSDoc descriptions from the upstream template are not emitted (simplification to ensure stability). If needed later, we can reintroduce a safe enum partial.
- Inline union literal types for enums increase diff noise if upstream spec adds many values, but improves clarity and removes extra exported symbol churn.

## Regeneration Workflow
```
npm run api:bundle      # ensure spec bundle is current
npm run gen:clients:typed
```
This runs the generator with `--template-dir openapi-templates/ts-axios`.

## CI Guard
A new script `ci:guard:generated` (see `package.json`) fails the build if any forbidden `any` appears in `src/lib/api-client/models`.

Invoke in pipelines after regeneration:
```
npm run ci:guard:generated
```
(Integrate into existing CI composite step with other type safety gates.)

## Extension Options (Future)
- Reintroduce richer enum exports (object + type) by customizing `modelEnum.mustache` instead of inlining.
- Emit a shared `FlexibleValue` union if backend spec formalizes it (once added to schemas to remain spec‑driven).
- Add formatting post‑processing via `TS_POST_PROCESS_FILE` (e.g. Prettier) if diffs become noisy.

## Validation Checklist
- `npm run gen:clients:typed` succeeds with no Mustache parse errors.
- `grep -R "\bany\b" src/lib/api-client/models` returns no matches.
- `npm run ci:guard:generated` exits 0.

## Maintenance Notes
If upstream OpenAPI adds new patterns resulting in reintroduced `any`, identify the responsible template variables by temporarily enabling `--global-property debugModels=true` (generator supports debug output) and adjust logic similarly.

---
_Last updated: 2025-10-06_
