package services

import (
	"testing"

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
