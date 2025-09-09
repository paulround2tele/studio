# Baseline Phase Status Snapshots

This directory contains raw baseline JSON captures for phase configure + status responses.

Files:
- discovery.configure.json
- discovery.status.json
- validation.configure.json
- validation.status.json
- extraction.configure.json
- extraction.status.json
- analysis.configure.json
- analysis.status.json

Generation Procedure:
1. Start backend: `npm run backend:build && npm run backend:start` (requires prior build placing binary at `backend/bin/apiserver`).
2. Start frontend (optional for manual UI triggers): `npm run dev`.
3. Use HTTP client (curl or REST client) to create campaign, then POST configure endpoints for each phase, capture responses and a follow-up GET status.

NOTE: Placeholders currently; replace with real captured payloads.
