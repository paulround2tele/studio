# Migration Parity Tracker

This file summarizes the tracked work for completing the migration and parity across backend and frontend. Issues are defined in `.github/issues/backlog.json` and can be created via the script in `scripts/create_github_issues.js`.

How to create GitHub issues:

1. Ensure GitHub CLI is installed and authenticated.
2. From repo root, run:

   node scripts/create_github_issues.js --repo <owner>/<repo>

3. After creation, replace checkboxes with links to the created issues.

## Backend

- [x] DomainGeneration: integrate transaction with store for atomic operations (#123)
- [x] HTTP Validation: load persona & proxy from campaign configuration (#124)
- [x] Analysis: wire analysis config + personas/proxy from store (#125)
- [x] Orchestrator: optional auto-advance to next phase (#126)
- [x] Orchestrator: persist campaign status updates via store (#127)
- [x] Orchestrator: post-completion workflows hooks (#128)
- [x] Store: implement CampaignState CRUD (#129)
- [x] Store: implement PhaseExecution CRUD + list (#130)
- [x] Store: combined retrieval CampaignState with PhaseExecutions (#131)
- [x] Monitoring: add SetCampaignLimits (#132)
- [x] Monitoring: optional history storage (#133)
- [x] Config/Keywords: SaveKeywordSets support (future) (#134) — implemented SaveKeywordSets in backend/internal/config/keywords.go with validation and atomic write; added tests.
- [x] Session: replace context.TODO() with proper contexts (#135)

## Frontend

- [x] Keyword Sets: use SSE for real-time updates on listing page (#136)
- [x] Keyword Sets: fix once proper API is available (blocked) (#137)
- [x] Campaigns: fix enum schema mismatches in CampaignFormV2 (#138)
- [x] Campaigns: separate UI-only state slice for campaign settings (#139)
- [x] Campaigns: use enriched generated types on edit page (#140)
 - [x] Cleanup: remove legacy .bak dashboard component or migrate (#141)
- [x] Hooks: calculate failed count from domain status in useDomainData (#142)
 - [x] Types: map DomainGenerationParams to generated model (#143)
 - [x] Types: map domain calculation config to generated model (#144)
- [x] Hooks: implement API integration in useCampaignFormData (#145) — implemented Personas/Proxies/Campaigns fetch using generated clients; filtered personas via PersonaType enum; refactored configuration PersonaAssignmentSection to accept props; wired PhaseConfiguration and ModernPhaseConfiguration to pass data; typecheck and tests pass.
- [x] Store: fix middleware integration in Phase 3 cleanup (#146) — refactored campaignStateSyncMiddleware to remove circular type dependency, re-enabled in store middleware chain; typecheck and tests pass.

- [x] Campaigns: campaign detail page uses enriched and wires state/phaseExecutions to UI (header/progress)

Notes:
- Blocked items depend on future API/spec exposure. Labelled accordingly in the backlog.
- Prefer creating issues via the script so labels and descriptions are consistent.
