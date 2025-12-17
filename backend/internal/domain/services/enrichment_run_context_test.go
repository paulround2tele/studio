package services

import (
	"context"
	"testing"

	"github.com/google/uuid"

	"github.com/fntelecomllc/studio/backend/internal/models"
)

func TestEnrichmentService_RunContextMismatchStopsImmediately(t *testing.T) {
	campaignID := uuid.New()
	svc := &enrichmentService{
		store:           &stubCampaignStore{},
		deps:            Dependencies{Logger: &minimalLogger{}},
		statuses:        make(map[uuid.UUID]*PhaseStatus),
		executions:      make(map[uuid.UUID]*enrichmentExecution),
		controlWatchers: make(map[uuid.UUID]enrichmentControlWatcher),
	}
	execution := &enrichmentExecution{
		campaignID: campaignID,
		runID:      uuid.New(),
	}
	svc.executions[campaignID] = execution

	ctx := WithPhaseRun(context.Background(), PhaseRunContext{CampaignID: campaignID, Phase: models.PhaseTypeEnrichment, RunID: uuid.New()})
	progressCh := make(chan PhaseProgress, 1)
	svc.runEnrichment(ctx, campaignID, nil, defaultEnrichmentConfig(), 0, progressCh, execution)
	for range progressCh {
	}

	st, ok := svc.statuses[campaignID]
	if !ok {
		t.Fatalf("expected status entry for campaign")
	}
	if st.Status != models.PhaseStatusFailed {
		t.Fatalf("expected failed status, got %s", st.Status)
	}
	if st.LastError != staleExecutionMessage {
		t.Fatalf("expected stale execution error, got %s", st.LastError)
	}
}
