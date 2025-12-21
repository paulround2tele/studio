package services

import (
	"testing"
	"time"

	"github.com/google/uuid"
)

func TestCreateCampaignProgressEventNormalizesPayload(t *testing.T) {
	campaignID := uuid.New()
	userID := uuid.New()

	evt := CreateCampaignProgressEvent(campaignID, userID, map[string]interface{}{
		"progress_pct":    42.5,
		"items_processed": int64(25),
	})

	progress, ok := evt.Data["progress"].(map[string]interface{})
	if !ok {
		t.Fatalf("expected progress payload map, got %T", evt.Data["progress"])
	}

	if _, ok := progress["status"]; !ok {
		t.Fatalf("expected status field to be present")
	}

	if got := progress["items_total"]; got != int64(0) {
		t.Fatalf("expected default items_total 0, got %v", got)
	}

	if progress["itemsProcessed"] != progress["items_processed"] {
		t.Fatalf("expected camelCase itemsProcessed mirror")
	}

	if progress["progressPct"] != progress["progress_pct"] {
		t.Fatalf("expected camelCase progressPct mirror")
	}
}

func TestNormalizeProgressPayloadUsesExistingCamelValues(t *testing.T) {
	payload := map[string]interface{}{
		"itemsProcessed": float64(10),
		"itemsTotal":     float64(50),
		"progressPct":    float64(20),
		"status":         "in_progress",
	}

	normalized := normalizeProgressPayload(payload)

	if normalized["items_processed"] != payload["itemsProcessed"] {
		t.Fatalf("expected snake_case items_processed to mirror camelCase value")
	}

	if normalized["items_total"] != payload["itemsTotal"] {
		t.Fatalf("expected snake_case items_total to mirror camelCase value")
	}

	if normalized["progress_pct"] != payload["progressPct"] {
		t.Fatalf("expected snake_case progress_pct to mirror camelCase value")
	}
}

func TestBuildCanonicalEnvelopeWithFinalProgressEvent(t *testing.T) {
	svc := NewSSEService()
	campaignID := uuid.New()
	userID := uuid.New()
	timestamp := time.Now().UTC().Format(time.RFC3339Nano)
	finalPayload := map[string]interface{}{
		"status":          "completed",
		"progress_pct":    100.0,
		"items_processed": int64(50),
		"items_total":     int64(50),
		"current_phase":   "domain_generation",
		"message":         "Domain generation finished",
		"timestamp":       timestamp,
	}

	event := CreateCampaignProgressEvent(campaignID, userID, finalPayload)
	envelope, err := svc.buildCanonicalEnvelope(event)
	if err != nil {
		t.Fatalf("expected canonical envelope, got error: %v", err)
	}

	if envelope.Type != string(SSEEventCampaignProgress) {
		t.Fatalf("expected campaign_progress type, got %s", envelope.Type)
	}

	overall, ok := envelope.Payload["overall"].(map[string]interface{})
	if !ok {
		t.Fatalf("expected overall payload map, got %T", envelope.Payload["overall"])
	}
	if overall["status"] != "completed" {
		t.Fatalf("expected status completed, got %v", overall["status"])
	}
	if pct, ok := overall["percentComplete"].(float64); !ok || pct != 100 {
		t.Fatalf("expected percentComplete 100, got %v", overall["percentComplete"])
	}
	if processed, ok := overall["processedDomains"].(int64); !ok || processed != 50 {
		t.Fatalf("expected processedDomains 50, got %v", overall["processedDomains"])
	}
	if total, ok := overall["totalDomains"].(int64); !ok || total != 50 {
		t.Fatalf("expected totalDomains 50, got %v", overall["totalDomains"])
	}

	if phase, ok := envelope.Payload["currentPhase"].(string); !ok || phase != "domain_generation" {
		t.Fatalf("expected currentPhase domain_generation, got %v", envelope.Payload["currentPhase"])
	}
	if msg, ok := envelope.Payload["message"].(string); !ok || msg == "" {
		t.Fatalf("expected non-empty message, got %v", envelope.Payload["message"])
	}
}

// ====================================================================
// P2 Contract: SSE Lifecycle Events with Sequence Tests (§6 of PHASE_STATE_CONTRACT.md)
// ====================================================================

func TestCreatePhaseStartedEventWithSequence(t *testing.T) {
	campaignID := uuid.New()
	userID := uuid.New()

	evt := CreatePhaseStartedEventWithSequence(campaignID, userID, "dns_validation", 42)

	if evt.Event != SSEEventPhaseStarted {
		t.Fatalf("expected phase_started event, got %s", evt.Event)
	}
	if evt.Data["sequence"] != int64(42) {
		t.Fatalf("expected sequence 42, got %v", evt.Data["sequence"])
	}
	if evt.Data["phase"] != "dns_validation" {
		t.Fatalf("expected phase dns_validation, got %v", evt.Data["phase"])
	}
}

func TestCreatePhasePausedEventWithSequence(t *testing.T) {
	campaignID := uuid.New()
	userID := uuid.New()

	evt := CreatePhasePausedEventWithSequence(campaignID, userID, "dns_validation", 43)

	if evt.Event != SSEEventPhasePaused {
		t.Fatalf("expected phase_paused event, got %s", evt.Event)
	}
	if evt.Data["sequence"] != int64(43) {
		t.Fatalf("expected sequence 43, got %v", evt.Data["sequence"])
	}
}

func TestCreatePhaseResumedEventWithSequence(t *testing.T) {
	campaignID := uuid.New()
	userID := uuid.New()

	evt := CreatePhaseResumedEventWithSequence(campaignID, userID, "dns_validation", 44)

	if evt.Event != SSEEventPhaseResumed {
		t.Fatalf("expected phase_resumed event, got %s", evt.Event)
	}
	if evt.Data["sequence"] != int64(44) {
		t.Fatalf("expected sequence 44, got %v", evt.Data["sequence"])
	}
}

func TestCreatePhaseCompletedEventWithSequence(t *testing.T) {
	campaignID := uuid.New()
	userID := uuid.New()
	results := map[string]interface{}{"domains_validated": 100}

	evt := CreatePhaseCompletedEventWithSequence(campaignID, userID, "dns_validation", 45, results)

	if evt.Event != SSEEventPhaseCompleted {
		t.Fatalf("expected phase_completed event, got %s", evt.Event)
	}
	if evt.Data["sequence"] != int64(45) {
		t.Fatalf("expected sequence 45, got %v", evt.Data["sequence"])
	}
	if evt.Data["results"] == nil {
		t.Fatalf("expected results to be set")
	}
}

func TestCreatePhaseFailedEventWithSequence(t *testing.T) {
	campaignID := uuid.New()
	userID := uuid.New()

	evt := CreatePhaseFailedEventWithSequence(campaignID, userID, "dns_validation", 46, "DNS timeout")

	if evt.Event != SSEEventPhaseFailed {
		t.Fatalf("expected phase_failed event, got %s", evt.Event)
	}
	if evt.Data["sequence"] != int64(46) {
		t.Fatalf("expected sequence 46, got %v", evt.Data["sequence"])
	}
	if evt.Data["error"] != "DNS timeout" {
		t.Fatalf("expected error 'DNS timeout', got %v", evt.Data["error"])
	}
}
