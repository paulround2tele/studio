# Full Sequence Mode Cutover Plan

## Plain Language Summary
We will let a user set up *all* the campaign steps (phases) first, then press one start button. The system will then run each phase by itself in order. If a phase is missing its setup, the chain stops and clearly tells the user what is missing. We are **not** keeping old leftover fields, and we are **not** inventing any configuration automatically. Either the user provided the needed config or the phase does **not** run.

## Goals
1. Single clear mode switch: `step_by_step` (manual) vs `full_sequence` (automatic chaining).
2. No legacy flags (`is_full_sequence_mode`, `auto_advance_phases`) kept.
3. Strict requirement: every later phase must already have valid config before the chain can start in full sequence.
4. Auto advance only if: previous phase finished successfully *and* next phase config exists.
5. Transparent pause state if config missing: chain stops without error and reports which phase needs configuration.

## User Flow (Full Sequence)
1. User creates campaign.
2. User opens configuration UI and sets:
   - Domain Generation config (pattern, charset, etc.)
   - DNS Validation config (persona selection + optional proxy)
   - HTTP Validation config (persona selection + optional proxy)
   - Analysis config (keyword)
3. User switches campaign mode to `full_sequence`.
4. User clicks Start (on the first phase: Domain Generation).
5. System runs Domain Generation → DNS Validation → HTTP Validation → Analysis.
6. If a required config is missing at any transition, system halts and marks `WAITING_FOR_CONFIGURATION` (or similar) until user supplies it.
7. After final phase completes, campaign marked fully done.

## Phases & Minimal Config Required
| Phase | Purpose | Minimal Required Config |
|-------|---------|-------------------------|
| Domain Generation | Produce candidate domains | pattern_type, variable_length, character_set, tld, num_domains (plus optional constant_string, batch_size, offset_start) |
| DNS Validation | Resolve domains via selected personas/proxies | personaIds[] (>=1), proxyId optional |
| HTTP Validation | Fetch + inspect domains via personas/proxies | personaIds[] (>=1), proxyId optional |
| Analysis | Aggregate results | keyword (string, non-empty) |

## Scope Breakdown
### Database
- Create new table: `phase_configurations` to store config JSON per (campaign_id, phase).
- Add / ensure `campaign_state.mode` enum (`step_by_step`, `full_sequence`) with default `step_by_step`.
- Remove legacy columns from `lead_generation_campaigns`: `is_full_sequence_mode`, `auto_advance_phases`.
- (Optional) Add a lightweight state column (or reuse existing state) to reflect chain status if paused for missing config.

### Backend
- Add store methods for saving & retrieving phase configs (`UpsertPhaseConfig`, `GetPhaseConfig`).
- Extend orchestrator to:
  1. On phase completion (COMPLETED), if mode = `full_sequence`, locate next phase.
  2. Check config exists; if missing under strict model A this situation should not occur (validated pre-start); if encountered log WARN and stop auto advance silently.
- Add readiness checks before starting *first* phase in full sequence: ensure *all* downstream configs exist; otherwise reject start with 409 + list.
- Add mode update handler: PATCH `/campaigns/{id}/mode` body `{ "mode": "full_sequence" | "step_by_step" }`.
- Emit SSE events: `mode_changed`, `phase_auto_started`.
- Update existing phase configure endpoint to write into `phase_configurations` instead of only memory/metadata.
- Update phase start logic to require config present.

### Frontend
- UI: allow user to configure each phase *before* starting.
- Mode switch control (radio or toggle) to set `step_by_step` or `full_sequence` (sends PATCH).
- Disable switching to `full_sequence` if any required config missing (pre-validation request or cached knowledge) OR allow but fail gracefully when starting domain generation—(we choose: allow mode switch; enforce at start for simplicity now).
- Show chain status; if blocked: highlight missing phase config with direct "Configure Now" button.
- Hide manual start buttons for phases after the first when in full sequence (except when chain is blocked and that phase is next + ready to start once previous completed).

## Detailed Implementation Steps
### 1. Database Migration
- Create migration file adding `phase_configurations`:
  ```sql
  CREATE TABLE phase_configurations (
    campaign_id UUID NOT NULL REFERENCES lead_generation_campaigns(id) ON DELETE CASCADE,
    phase TEXT NOT NULL,
    config JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (campaign_id, phase)
  );
  ```
- Ensure `campaign_state` table has `mode` enum column; if not, add:
  ```sql
  CREATE TYPE campaign_mode_enum AS ENUM ('step_by_step','full_sequence');
  ALTER TABLE campaign_state ADD COLUMN mode campaign_mode_enum NOT NULL DEFAULT 'step_by_step';
  ```
- Drop legacy columns:
  ```sql
  ALTER TABLE lead_generation_campaigns DROP COLUMN IF EXISTS is_full_sequence_mode;
  ALTER TABLE lead_generation_campaigns DROP COLUMN IF EXISTS auto_advance_phases;
  ```

### 2. Store Layer
- Add methods:
  - `UpsertPhaseConfig(ctx, campaignID, phase, rawJSON)`
  - `GetPhaseConfig(ctx, campaignID, phase)`
  - `ListPhaseConfigs(ctx, campaignID)` (for readiness check / enrichment response)
- Update `ConfigurePhase` handler to call `UpsertPhaseConfig` after validating minimal fields per phase.
- Update enrichment fetch to include (optional) config presence flags.

### 3. Validation Rules (Server)
- Domain Generation: already validated (variable_length >0, charset, tld, num_domains >0).
- DNS / HTTP: reject if personaIds empty or missing.
- Analysis: reject if keyword missing/empty.
- Return 400 with explicit field messages.

### 4. Mode Endpoint
- Handler: PATCH `/campaigns/{id}/mode`:
  - Parse body, ensure mode is one of allowed values.
  - Update `campaign_state.mode` (insert row if absent).
  - Emit `mode_changed` SSE event.
  - Return new mode in response.

### 5. Start Phase Enforcement
- When starting first phase and mode = `full_sequence`:
  - Determine remaining phases list.
  - For each, confirm config exists (query `phase_configurations`).
  - If missing any: respond 409 (JSON body with `missingPhases` array) and do not start.
- When auto-advancing:
  - Just ensure next phase config exists; if missing (unexpected) log warning and stop chain (no event).

### 6. Auto-Advance Logic
- Hook into phase completion event inside orchestrator.
- If mode != `full_sequence`, do nothing extra.
- If phase COMPLETED and not last:
  - Acquire small lock (map key `campaignID-nextPhase`).
  - Re-check config exists.
  - Call existing StartPhase method.
  - Emit `phase_auto_started`.

### 7. Phase Status / Blocked State
- Introduce logical status `WAITING_FOR_CONFIGURATION` (no DB schema change if we store it in execution state table or campaign_state.current_state).
- When blocked: set campaign_state.current_state = `waiting_for_configuration` (or add prefix) OR add a separate flag in enrichment response; simplest is to emit event only and let UI infer.
- Decision: Under strict model A we removed dedicated blocked event; UI infers readiness before initial start only.

### 8. SSE Events (Payload Outline)
- `mode_changed`: { campaignId, mode, timestamp }
- `phase_auto_started`: { campaignId, phase, startedAt }
// Removed historical `chain_blocked` event under strict model A.

### 9. Frontend Adjustments
- Add mode toggle (calls PATCH). Cache mode in RTK Query store.
- Add readiness indicator: after user configures each phase modal, mark it "Ready".
- On start attempt in full_sequence: if backend returns 409 missing phases, show list; focus first missing config button.
- Listen for SSE events to update UI state (auto-started, blocked).

### 10. OpenAPI Spec Changes
- Remove legacy fields from `CampaignResponse` if they still show.
- Add schema `CampaignModeUpdateRequest` and `CampaignModeUpdateResponse`.
- Document 409 response for start when missing configs.
- Regenerate server + client artifacts (scripts already exist).

### 11. Testing Strategy
- Unit tests:
  - Config validation per phase.
  - Mode change handler success/failure.
  - StartPhase readiness check (full sequence vs manual).
- Integration tests:
  - Full chain success path (all configs present) auto runs all phases.
  - Missing config -> 409 on initial start.
  - Mid-chain removal (simulate deleting a config) -> next auto start blocked.
  - Failure in middle phase -> no auto advance.
- Concurrency test: simulate duplicate completion events; ensure only one next phase start.

### 12. Logging
- On mode change: INFO with campaignId, new mode.
- On auto start: INFO with fromPhase, toPhase.
- On blocked: WARN with missing phase.
- On start rejection (409): INFO with missing phases array.

### 13. Rollout Steps
1. Apply migration.
2. Regenerate OpenAPI + backend code if needed.
3. Implement store & handlers.
4. Implement orchestrator auto-advance hook.
5. Add SSE emissions.
6. Write tests & run.
7. Update frontend minimal UI (toggle + blocked prompt).
8. Manual smoke test.
9. Commit & push.

### 14. Non-Goals / Out of Scope
- Historical execution versioning.
- Multi-run chain history.
- Advanced retry policies.
- Partial phase skipping logic.

### 15. Risks & Mitigations
| Risk | Mitigation |
|------|------------|
| Starting chain without all configs | Pre-flight check + 409 response |
| Duplicate auto start | In-memory lock + idempotent StartPhase |
| Confusing UI when blocked | Pre-start validation prevents mid-chain block |
| Schema mismatch after removal of legacy fields | Single migration + test build before deploy |

### 16. Future Enhancements (Optional Later)
- Bulk "Plan All Phases" wizard endpoint.
- Retry policy per phase.
- Skipping phases intentionally.
- Execution history with run numbers.

## Rationale (Why Each Major Change)
- New `phase_configurations` table: clean, explicit storage of user intent per phase (no guessing from mixed metadata JSON).
- Remove legacy flags immediately: reduces mental overhead and code paths.
- Pre-flight check for full sequence: prevents half-configured chains that stall mid-way unpredictably.
- Auto advance only when safe: ensures we never start a phase lacking its required inputs.
- SSE events: real-time UX clarity without polling.

## Glossary
- **Full Sequence**: Automatic sequential execution of all phases after the first starts, provided configs exist.
- **Step by Step**: Manual start required for each phase.
- **Blocked (Missing Config)**: Chain paused because the next phase has no stored configuration.

---
**Ready for implementation.**
