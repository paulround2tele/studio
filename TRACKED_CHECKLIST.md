# Migration Parity Tracker

This file summarizes the tracked work for completing the migration and parity across backend and frontend. Issues are defined in `.github/issues/backlog.json` and can be created via the script in `scripts/create_github_issues.js`.

How to create GitHub issues:

1. Ensure GitHub CLI is installed and authenticated.
2. From repo root, run:

   node scripts/create_github_issues.js --repo <owner>/<repo>

3. After creation, replace checkboxes with links to the created issues.

## Backend

- [ ] DomainGeneration: integrate transaction with store for atomic operations (#123)
- [ ] HTTP Validation: load persona & proxy from campaign configuration (#124)
- [ ] Analysis: wire analysis config + personas/proxy from store (#125)
- [x] Orchestrator: optional auto-advance to next phase (#126)
- [x] Orchestrator: persist campaign status updates via store (#127)
- [x] Orchestrator: post-completion workflows hooks (#128)
- [x] Store: implement CampaignState CRUD (#129)
- [x] Store: implement PhaseExecution CRUD + list (#130)
- [x] Store: combined retrieval CampaignState with PhaseExecutions (#131)
- [x] Monitoring: add SetCampaignLimits (#132)
- [x] Monitoring: optional history storage (#133)
- [ ] Config/Keywords: SaveKeywordSets support (future) (#134)
- [ ] Session: replace context.TODO() with proper contexts (#135)

## Frontend

- [ ] Keyword Sets: use SSE for real-time updates on listing page (#136)
- [ ] Keyword Sets: fix once proper API is available (blocked) (#137)
- [ ] Campaigns: fix enum schema mismatches in CampaignFormV2 (#138)
- [ ] Campaigns: separate UI-only state slice for campaign settings (#139)
- [ ] Campaigns: use enriched generated types on edit page (blocked) (#140)
- [ ] Cleanup: remove legacy .bak dashboard component or migrate (#141)
- [ ] Hooks: calculate failed count from domain status in useDomainData (#142)
- [ ] Types: map DomainGenerationParams to generated model (#143)
- [ ] Types: map domain calculation config to generated model (#144)
- [ ] Hooks: implement API integration in useCampaignFormData (blocked) (#145)
- [ ] Store: fix middleware integration in Phase 3 cleanup (#146)

Notes:
- Blocked items depend on future API/spec exposure. Labelled accordingly in the backlog.
- Prefer creating issues via the script so labels and descriptions are consistent.
