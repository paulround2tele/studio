# Documentation Directory

The planning documents that previously lived in this folder have been retired. Everything listed below reflects the current, implemented state of the platform.

## Primary References

| file | Why it matters |
|------|----------------|
| `../README.md` | High-level overview, setup, and troubleshooting entry points |
| `../architecture.md` | System architecture, campaign orchestrator, and infra notes |
| `../PIPELINE_CHANGELOG.md` | Chronological pipeline + API contract changes |
| `./PIPELINE_DATAFLOW_FULL.md` | Authoritative phase-by-phase lifecycle, SSE events, and datastore shape |
| `./KEYWORD_DATA_FLOW.md` | HTTP keyword configuration, persistence, and verification recipes |
| `./DOMAIN_LIST_API.md` | Contract for `/campaigns/{id}/domains`, including filtering + server sorting |
| `./API_SYSTEM_DOCUMENTATION.md` | API architecture, client usage, and RTK Query integration |
| `./API_AUTOGEN.md` | How the OpenAPI bundle + client generation pipeline works |
| `../CAMPAIGN_WORKFLOW_ANALYSIS.md` | UX-focused explanation of campaign state transitions |
| `../TESTING_PLAN.md` | Unit, integration, and E2E coverage targets |

## Generated + Spec Artifacts

- `../backend/openapi/dist/openapi.yaml` – Bundled OpenAPI 3.1 spec consumed by codegen
- `../backend/openapi/dist/openapi.json` – Same bundle in JSON form for tooling
- `../src/lib/api-client/docs/` – Auto-generated TypeScript client docs (kept in sync via `npm run gen:all`)

## How to Navigate

1. **Understanding the pipeline** – Start with `PIPELINE_DATAFLOW_FULL.md`, then drill into `KEYWORD_DATA_FLOW.md` for HTTP-specific behavior.
2. **Investigating API questions** – Use `API_SYSTEM_DOCUMENTATION.md` alongside the generated docs; fall back to the OpenAPI bundle for schema trivia.
3. **Tracking regressions or refactors** – `PIPELINE_CHANGELOG.md` captures why a behavior changed and which flags/configs disappeared.
4. **Keeping docs current** – When code paths change, update the relevant markdown and add the file to the table above so discoverability stays high.

Everything else in this directory is either auto-generated or legacy and slated for deletion; do not resurrect the deprecated WebSocket/dual-read guidance.
