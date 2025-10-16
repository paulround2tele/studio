# Dual-Length Pattern Support Execution Plan

## Goals
- Allow the **`both`** pattern to declare independent prefix and suffix variable lengths instead of a single shared `variableLength`.
- Clarify terminology so **pattern type** and **variable length** are distinct concepts across schema, services, and APIs.
- Keep the rollout simple for a dev-only environment (no legacy data) while retaining room for production safeguards later.
- Validate large-scale generation and DNS validation (≥1M domains) with heap profiling to confirm memory behaviour.

## Terminology Alignment
- **Pattern Type:** continue using `prefix_variable`, `suffix_variable`, `both_variable` in storage and APIs for now (optional clean-up later) while documenting them as pattern descriptors.
- **Variable Lengths:** numeric counts of random characters. Introduce: `prefixVariableLength` and `suffixVariableLength` (nullable, ≥0). For `prefix`/`suffix`, only the relevant side is populated; for `both`, both must be set.
- Maintain existing `batchSize`, `offsetStart`, and persona-driven parameters unchanged.

## Implementation Steps

### 1. Database Schema Migration
1. Add nullable integer columns `prefix_variable_length` and `suffix_variable_length` to `domain_generation_campaign_params` with `CHECK (value >= 0)`.
2. Since there is no legacy data in dev, default both columns to NULL initially; application code will explicitly set only the active side, keeping the inactive side as NULL.
3. Update constraints so at least one side is non-null per pattern, and both populated for `both_variable` (enforced via application validation or optional database CHECKs that accept NULL on the inactive side).
4. Plan a follow-up migration to drop the single `variable_length` column once the codebase no longer references it.

### 2. Enumerations & Constants
1. Ensure domain pattern enums in Go/TypeScript continue supporting `prefix_variable`, `suffix_variable`, `both_variable`, but document the intended semantics for each.
2. Optionally stage a later cleanup ticket to alias these to shorter names once the dual-length work stabilises.
3. Regenerate OpenAPI specification and generated types only if field additions require it (enum strings remain unchanged).

### 3. Model & DTO Adjustments
1. Update `DomainGenerationCampaignParams` and `NormalizedDomainGenerationParams` to include `PrefixVariableLength` and `SuffixVariableLength`, deprecate single `VariableLength` field.
2. Extend validation rules: `prefix_variable` requires a non-negative prefix length (suffix NULL), `suffix_variable` requires a non-negative suffix length (prefix NULL), `both_variable` requires both > 0.
3. Update config hashing (`domainexpert/config_hasher.go`) so the normalized payload includes both lengths (treat NULL as zero only if needed for hashing stability).

### 4. Service Layer Changes
1. Modify `DomainGenerationConfig` and associated parsing in `domain_generation.go` to capture both lengths, writing NULL for the inactive side.
2. Adjust `domainexpert.NewDomainGenerator` signature to accept separate lengths; in `both_variable` mode compute total combinations using `charset^(prefixLen+suffixLen)`.
3. Update `GenerateDomainAtOffset` logic to split offsets into two variable strings based on distinct lengths, handling zero-length segments as no-ops.
4. Ensure store helpers writing `DomainGenerationPhaseConfigState` persist the new normalized values with NULLs where appropriate.

### 5. API Handlers & Validation
1. Update campaign creation/update handlers (`handlers_campaigns.go`, bulk operations) to accept the new fields and drop support for single `variableLength` payloads (since there is no legacy data).
2. Emit new fields in API responses and remove the old `variableLength` property entirely once client updates land.
3. Regenerate OpenAPI server/client after schema updates; resolve TypeScript client adjustments and update UI selectors that display pattern info.

### 6. Rollout Coordination (Dev-Only Baseline)
1. Execute schema migration and code updates in a single PR since no production data exists.
2. Update frontend/API consumers immediately after backend changes and run end-to-end smoke tests.
3. Once validated, write a brief checklist for future production rollout where data backfill would be required.

### 7. Testing
- Unit tests for `DomainGenerator` verifying:
  - Prefix-only, suffix-only, and both patterns produce expected domains.
  - Total combination counts follow `charset^length` (two lengths for both).
- Integration tests covering campaign creation, generation execution, and DNS validation using `both` pattern with asymmetric lengths.
- Regression tests ensuring existing prefix/suffix campaigns remain unchanged.
- Update hash golden tests to include new normalized structure.

### 8. Large-Scale Validation & Profiling
1. Build a reusable Go benchmark/integration harness to:
   - Generate 1,000,000 domains for each pattern (including asymmetric both).
   - Run DNS validation using existing personas.
2. Use `go test -run TestMillionDomainFlow -memprofile=profiles/dns.mem` (or similar) to capture heap profile.
3. Analyse heap profile (pprof) to confirm memory footprint aligns with expectations (batch + validation slices only).
4. Capture persistence metrics: number of rows in `generated_domains`, offset updates, and DNS result counts.
5. Document findings and remedial actions if memory exceeds target thresholds.

### 9. Documentation & Communication
- Update developer docs (`architecture.md`, relevant runbooks) to describe new pattern nomenclature.
- Communicate API changes to frontend/backend consumers, including deprecation timeline for `variableLength`.

## Open Questions
- Should unused side lengths default to NULL or 0 for `prefix_variable`/`suffix_variable` patterns?
- Do any downstream analytics (present or planned) expect a single `variableLength` field?
- Confirm whether domainexpert generator requires further optimization once asymmetric lengths land.
