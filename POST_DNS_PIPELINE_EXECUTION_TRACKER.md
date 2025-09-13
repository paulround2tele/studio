# Post-DNS Pipeline Execution Guide (Action-Oriented)

Read this top-to-bottom one time. After that, live in the "Active Sprint Board" and "Task Catalog" sections only.

## 0. Legend
Status: ☐ not started · ◐ in progress · ⚑ blocked · ✔ done
Priority: P0 critical path · P1 core delivery · P2 defer OK
ID Format: ORC (orchestration), EX (extraction), EN (enrichment), MC (micro‑crawl), SP (scoring profile), SC (scoring engine/rescore), FL (filtering), OBS (observability), T (tests), DOC (docs/flags), RO (rollout)

## 1. Mission Snapshot
Goal: Enable post‑DNS pipeline to fetch + enrich + (optionally micro‑crawl) domains, compute scores using selectable scoring profiles, expose filtered domain lists, emit metrics/SSE, and roll out safely behind flags.
Success = Feature flags fully ON in prod, rescore < SLA (TBD: 5m for 50k domains), false parked rate <5%, filters perform <300ms P95, metrics visible.

## 2. Single Flow (End-to-End)
1. DNS phase completed (precondition)
2. HTTP Validation executes root fetch & base parse
3. (Flag) Enrichment builds feature_vector + parked detection
4. (Flag) Micro‑crawl augments signals for a subset of domains
5. Scoring (uses active scoring profile weights)
6. Rescore (on-demand) reuses persisted feature_vector (no refetch)
7. Filtering queries view scored domains
8. Metrics/SSE inform progress and health
9. Flags gradually enabled → prod adoption

## 3. Execution Protocol
Definition of Ready (DoR): Clear inputs, no upstream dependency unresolved, acceptance tests enumerated.
Definition of Done (DoD): Code + tests merged, feature behind flag if risky, docs updated if user-visible, metrics/logs added where applicable.
Work in Progress Limit: Keep ≤5 active engineering tasks (reduces thrash).

## 4. Active Sprint Board (Rolling Top 10)
Update this list daily. Remove items when ✔ and pull next from Catalog.
1. ORC-01 DNS completion gate verification (logs + screenshot) (P0) ◐ (logic exists; need evidence artifact)
2. EX-01 Integrate existing httpvalidator (wrap + instrumentation) (P0) ◐ (ValidateDomainsBulk already invoked; metrics missing)
3. EX-02 Content parser (title, text, links) (P0) ◐ (title done; link parse used only in micro-crawl; decide if root link persistence needed)
4. EN-01 Feature vector builder initial (size, keyword counts) (P1) ✔ (implemented: content_bytes, kw_* fields; rename/expand later)
5. SP-01 OpenAPI spec for scoring profiles + handlers (P1) ☐
6. SC-03 Rescore endpoint + SSE progress (P1) ☐
7. FL-01 Add filtering OpenAPI params (P1) ☐
8. OBS-01 Prom counters (fetch outcomes) (P1) ◐ (fetch outcomes + microcrawl trigger counters added; histograms & others pending)
9. T-05 Extraction happy-path integration test (P0) ☐
10. DOC-01 SSE_EVENTS.md update (P2) ☐

## 5. Milestones & Exit Criteria
| Milestone | Exit Criteria (All must be true) | IDs Contributing |
|-----------|----------------------------------|------------------|
| M1 Core Extraction | 90%+ domains fetched; feature_vector NULL (expected); no stalls | ORC-01, EX-01..EX-03, T-05 |
| M2 Enrichment + Parked | feature_vector populated; parked+confidence columns set; false parked test passes | EN-01..EN-04, T-07 |
| M3 Micro‑Crawl | <20% domains micro‑crawled; budget caps enforced; metrics show counts | MC-01..MC-05, OBS-02 |
| M4 Scoring Profiles & Engine | CRUD works; scores persisted; domain_scored SSE | SP-01..SP-05, SC-01, SC-02 |
| M5 Rescore & Filtering | Rescore endpoint emits progress + summary; filters return correct subsets | SC-03..SC-05, FL-01..FL-04, T-10 |
| M6 Observability | Prom + logs + SSE cover key transitions | OBS-01..OBS-05 |
| M7 Tests & Docs | All critical tests green; docs updated | T-* (critical), DOC-* |
| M8 Rollout | Flags enabled prod; monitoring stable window complete | RO-* |

## 6. Task Catalog (Authoritative)
Each line: ID | Title | Priority | Depends On | Acceptance (condensed)

ORC-01 | DNS completion gate verification | P0 | none | Log snippet proving gate blocks if DNS incomplete
ORC-02 | Phase failure SSE path | P0 | ORC-01 | phase_failed SSE on simulated error

EX-01 | Integrate existing httpvalidator (no rewrite) | P0 | ORC-01 | EXISTING PARTIAL: ValidateDomainsBulk call present (http_validation.go ~528); add metrics counters & no extra fetch layer
EX-02 | Content parser (title,text,links) | P0 | EX-01 | PARTIAL: title extraction exists (httpvalidator.go); link parsing exists for micro-crawl only; clarify if root link storage needed
EX-03 | Persistence of base fields | P0 | EX-02 | ✔ EXISTING: storeHTTPResults updates http_status/http_reason (http_validation.go ~900+) 

EN-01 | Feature vector builder v1 | P1 | EX-03 | ✔ EXISTING: fv map (status_code, content_bytes, kw_* metrics) lines ~560–640
EN-02 | Keyword rule batch compile | P1 | EN-01 | PARTIAL: scanning via kwScanner already; explicit precompile step TBD (decide if needed)
EN-03 | Parked heuristic implementation | P1 | EN-01 | ✔ EXISTING: parkedHeuristic closure lines ~500–530; tune threshold later
EN-04 | Batch enrichment DB update | P1 | EN-03 | ✔ EXISTING: persistFeatureVectors bulk + fallback (http_validation.go ~1080–1160)

MC-01 | Link candidate extractor | P1 | EN-01 | ✔ EXISTING: HTML parse & link collection (microCrawlEnhance ~1260+)
MC-02 | Crawl controller (budget) | P1 | MC-01 | ✔ EXISTING: maxPages & byteBudget enforcement
MC-03 | Secondary fetch + merge | P1 | MC-02 | ✔ EXISTING: keyword pattern aggregation merging into fv
MC-04 | Guard conditions (skip parked/high conf) | P1 | MC-02 | ✔ EXISTING: conf <0.5 & !isParked gating (~600s)
MC-05 | Micro-crawl trigger metric | P1 | MC-02 | ✔ EXISTING: http_validation_microcrawl_triggers_total counter increments when micro-crawl executes

SP-01 | OpenAPI spec additions | P1 | none | Spec diff includes /scoring-profiles
SP-02 | Handlers create/get/list | P1 | SP-01 | 200 responses match spec; tests
SP-03 | Association PATCH | P1 | SP-02 | Campaign updated; DB row present
SP-04 | Weights validation logic | P1 | SP-02 | Reject invalid keys / ranges
SP-05 | Authz reuse (ownership) | P1 | SP-02 | Forbidden on foreign campaign

SC-01 | Weight normalization helpers (DONE) | P1 | SP-04 | ✔ already present
SC-02 | Engine assembly baseline (PARTIAL) | P1 | SP-04 | ✔ base scoring occurs
SC-03 | Rescore endpoint | P1 | SC-02 | SSE progress + summary event
SC-04 | Parked penalty application | P1 | EN-03 | Score delta shown in test
SC-05 | domain_scored SSE enriched payload | P1 | SC-02 | Payload includes domain_id, scores

FL-01 | Filtering OpenAPI params | P1 | SC-02 | Spec lists params
FL-02 | Query builder extension | P1 | FL-01 | All filters functional
FL-03 | Indices (post profiling) | P2 | FL-02 | EXPLAIN shows index usage
FL-04 | Filter logic unit tests | P1 | FL-02 | All pass (green)

OBS-01 | Prom counters (fetch outcomes) | P1 | EX-01 | PARTIAL: http_validation_fetch_outcomes_total present (need histograms & other families)
OBS-02 | Micro-crawl trigger counter | P1 | MC-02 | Counter increments in test
OBS-3 | Histograms (fetch time, enrichment secs) | P2 | EX-01, EN-04 | Buckets present
OBS-04 | Score distribution histogram | P2 | SC-02 | Recorded samples
OBS-05 | Structured phase transition logs | P1 | ORC-02 | Log pattern validated

T-01 | Phase transition tests (DONE) | P0 | ORC-01 | ✔
T-02 | Parked heuristic edge cases | P1 | EN-03 | Low FP rate assertion
T-03 | Weight validation tests (DONE) | P1 | SP-04 | ✔
T-04 | Feature vector normalization test | P1 | EN-01 | Verified shape
T-05 | Extraction happy-path integration | P0 | EX-03 | Persisted fields asserted
T-06 | Micro-crawl trigger scenario | P1 | MC-05 | Trigger count >0
T-07 | Scoring profile association + scoring | P1 | SP-03, SC-02 | Score stored
T-08 | Rescore end-to-end | P1 | SC-03 | Score changes if weights changed
T-09 | Filter logic tests | P1 | FL-02 | All filter cases covered
T-10 | Performance rescore timing | P2 | SC-03 | < SLA time recorded

DOC-01 | SSE_EVENTS.md update | P2 | SC-05 | New events documented
DOC-02 | architecture.md delta diagram | P2 | MC-05, SC-05 | Diagram updated
DOC-03 | README scoring + flags | P2 | SP-05, SC-05 | Section added
DOC-04 | Feature flags documented | P2 | DOC-03 | All flags listed

RO-01 | Staging dry run | P2 | M5 complete | Run log artifact
RO-02 | Metrics & logs monitoring window | P2 | RO-01 | No critical alerts
RO-03 | Adjust weights / threshold | P2 | RO-02 | Change log recorded
RO-04 | Enable scoring in prod | P2 | RO-02 | Flag flipped
RO-05 | Enable filters after stable scoring | P2 | RO-04 | Filters public
RO-06 | Remove unused flags | P2 | RO-05 | Code diff removing flags

## 6A. Implementation Audit (Snapshot)
Legend additions: ✔ EXISTING (meets acceptance or close), PARTIAL (exists but gaps), MISSING (no implementation). Line refs approximate.

Covered as EXISTING:
- EX-01 core call: `http_validation.go` ~528 (`ValidateDomainsBulk`)
- EX-03 persistence: `storeHTTPResults` ~900–1050
- EN-01/03/04: feature vector assembly + parked heuristic + bulk update ~500–650, ~1080–1160
- MC-01..04: microCrawlEnhance & guards ~1260–1410

PARTIAL items:
- EX-02 (links for root not persisted; only secondary pages scanned)
- EN-02 (no explicit precompile caching artifact beyond kwScanner usage)
- SC-02 (engine baseline only; penalties & profile weighting advanced logic TBD)

MISSING items (still to build):
- ORC-01 evidence artifact (log snippet file)
- SP-01..05 (spec + handlers + association wiring at API layer)
- SC-03 rescore endpoint, SC-04 parked penalty, SC-05 enriched SSE
- FL-* filtering spec & query extension
- OBS-* additional metrics (histograms, score distribution, phase logs wiring)
- Remaining tests T-02, T-04..T-10
- Docs & rollout tasks DOC-*, RO-*

Delta Metrics Update:
- Added counters: http_validation_fetch_outcomes_total, http_fetch_result_total (alias), http_validation_microcrawl_triggers_total (legacy), microcrawl_trigger_total{reason}, parked_detection_total{result}, http_enrichment_batches_total, rescore_runs_total{profile}, http_enrichment_dropped_total{cause}, http_microcrawl_pages_total{result}
- Added histograms: http_enrichment_batch_seconds{status}, domain_relevance_score (auto _bucket series), http_validation_phase_seconds, analysis_phase_seconds, http_validation_batch_seconds, http_microcrawl_pages_per_domain, campaign_phase_duration_seconds{phase}
- Added phase duration generic vector + correlationId field to enrichment, domain_scored, rescore_completed SSE events.
- Deprecation Plan: http_validation_microcrawl_triggers_total removed after 2 releases post dashboard migration to microcrawl_trigger_total; alias counter maintained for fetch outcomes.
- Remaining Phase 1 Gaps CLOSED. Progress SSE for rescore remains Phase 3 scope.

Delta Guidance:
- Do NOT rebuild existing fetch/enrichment/micro-crawl layers. Focus next on: metrics (MC-05, OBS-01), spec + handlers (SP-01/02), and rescore endpoint (SC-03).

## 7. Implementation Playbooks (Copy/Paste Steps)
Example format followed for first critical tasks.

ORC-01 Playbook
Input: Running system with a campaign having DNS incomplete.
Steps: (1) Attempt HTTP validation execute (2) Capture log line with gate failure (3) Complete DNS, re-run, capture success log.
Acceptance: Log snippet PR comment + saved under /docs/snippets/ORC-01.txt.

EX-01 Playbook
Input: List of domains from campaign.
Steps: (1) Call existing hv.ValidateDomainsBulk in controlled batches (2) Add phase-level metrics counters (success/fail/time) (3) Ensure no new fetcher struct introduced (4) Unit test injecting 2 failing domains ensures counters.
Acceptance: ValidateDomainsBulk used directly; metrics exposed; no new fetcher abstraction added.

EN-01 Playbook
Input: HTML body.
Steps: count bytes, extract title length, keyword frequencies (top N), store map.
Acceptance: feature_vector JSON has keys: size_bytes, title_len, kw_total.

SC-03 Playbook
Steps: Add /campaigns/{id}/rescore endpoint; spawn scoring job reusing scoreDomains; SSE progress every N domains; final summary.
Acceptance: Rescore run emits ≥2 progress events + final summary; scores updated when weights changed.

## 8. Immediate Engineer On‑Ramp (First 2 Hours)
1. Finish ORC-01 (prove gate) → commit snippet.
2. Implement EX-01 skeleton (no enrichment) → commit & test.
3. Start EX-02 parser (focus title + links only) → PR.
Only after those: pull EN-01.

## 9. Daily Update Template
Done: IDs
Next: IDs (max 3)
Risk/Blockers: ID + note
Metric Drift: any anomaly

## 10. Risks (Active Only)
| Risk | Owner | Mitigation | Trigger to Escalate |
|------|-------|-----------|----------------------|
| Crawl budget blowup | BE | Hard caps + early stop | Avg pages/domain > target |
| Parked false positives | BE | Add signals & tune threshold | FP >5% sample |
| Rescore slow | BE | Batch size tune + index domain_score | >SLA twice |

## 11. Completion Definition
All Milestones M1–M8 exited; flags removed or justified; performance & accuracy SLAs met; docs reflect final behavior.

---
(End Guide)
