# SSE Events Reference

Event | Description | Data Fields
----- | ----------- | ----------
mode_changed | Campaign execution mode changed | campaign_id, mode, message
phase_started | Phase manually started | campaign_id, phase, message
phase_auto_started | Phase auto-chained start (full_sequence) | campaign_id, phase, message
phase_completed | Phase finished successfully | campaign_id, phase, results{status,progress_pct,...}, message
phase_failed | Phase failed | campaign_id, phase, error, message
campaign_progress | Periodic aggregated progress update | campaign_id, progress{...}
campaign_completed | All phases complete | campaign_id, duration_ms, overall_status, message
error | Generic stream/server error | error, message
keep_alive | Heartbeat to keep connection alive | ts

## Notes
- Clients should treat unknown events as no-ops for forward compatibility.
- `phase_auto_started` always precedes the corresponding `phase_started` event for the same phase.
// Strict Model A: former `chain_blocked` event removed; clients rely on 409 start response for missing configs prior to initial start.
