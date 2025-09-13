# SSE Events Reference

Event | Description | Data Fields
----- | ----------- | ----------
mode_changed | Campaign execution mode changed | campaign_id, mode, message, correlationId?
phase_started | Phase manually started | campaign_id, phase, message, correlationId?
phase_auto_started | Phase auto-chained start (full_sequence) | campaign_id, phase, message, correlationId?
phase_completed | Phase finished successfully | campaign_id, phase, results{status,progress_pct,...}, message, correlationId?
phase_failed | Phase failed | campaign_id, phase, error, message, correlationId?
campaign_progress | Periodic aggregated progress update | campaign_id, progress{...}, correlationId?
campaign_completed | All phases complete | campaign_id, duration_ms, overall_status, message, correlationId?
http_enrichment | Batch enrichment sample emitted | campaignId, count, sample[], microcrawl, microMaxPages, microByteBudget, correlationId
domain_scored | Sample of scored domains | campaignId, count, sample[], correlationId
rescore_completed | Rescore cycle finished | campaignId, timestamp, correlationId
error | Generic stream/server error | error, message, correlationId?
keep_alive | Heartbeat to keep connection alive | ts

## Notes
Correlation IDs:
- `correlationId` is a best-effort UUID to let clients stitch related events in logs; optional for legacy events (hence the `?`).
- New enrichment/scoring events always include it.

Forward Compatibility:
- Clients should treat unknown events as no-ops.
- `phase_auto_started` always precedes `phase_started` for same phase.

Removed Events:
- Former `chain_blocked` removed; rely on 409 start response.
