package services

import (
	"context"
	"testing"

	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/google/uuid"
)

// TestHTTPValidationPhase_StallCancellation ensures Cancel transitions an in-progress execution to Failed.
func TestHTTPValidationPhase_StallCancellation(t *testing.T) {
	campaignID := uuid.New()
	svc := &httpValidationService{executions: make(map[uuid.UUID]*httpValidationExecution)}
	// Seed an in-progress execution (simulate a started phase that has stalled)
	svc.executions[campaignID] = &httpValidationExecution{
		CampaignID:     campaignID,
		Status:         models.PhaseStatusInProgress,
		ItemsTotal:     10,
		ItemsProcessed: 2,
		CancelChan:     make(chan struct{}),
		ProgressChan:   make(chan PhaseProgress, 1),
	}
	// Invoke cancel
	if err := svc.Cancel(context.Background(), campaignID); err != nil {
		t.Fatalf("Cancel returned error: %v", err)
	}
	st, err := svc.GetStatus(context.Background(), campaignID)
	if err != nil {
		t.Fatalf("GetStatus error: %v", err)
	}
	if st.Status != models.PhaseStatusFailed { // cancellation uses Failed semantics
		t.Fatalf("expected Failed status after cancellation, got %s", st.Status)
	}
	if st.ItemsProcessed != 2 || st.ItemsTotal != 10 {
		t.Fatalf("expected counters preserved (2/10), got %d/%d", st.ItemsProcessed, st.ItemsTotal)
	}
}
