package services

import (
	"context"
	"strings"
	"testing"
	"time"

	sqlmock "github.com/DATA-DOG/go-sqlmock"
	"github.com/google/uuid"

	"github.com/fntelecomllc/studio/backend/internal/models"
)

func TestAnalysisService_RunContextMismatchAbortsExecute(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock: %v", err)
	}
	defer db.Close()

	campaignID := uuid.New()
	phase := &models.CampaignPhase{PhaseType: models.PhaseTypeAnalysis, Status: models.PhaseStatusConfigured}
	st := &stubCampaignStore{phase: phase}
	svc := &analysisService{
		store:      st,
		deps:       Dependencies{DB: db, Logger: &minimalLogger{}},
		executions: map[uuid.UUID]*analysisExecution{},
	}

	execution := &analysisExecution{
		CampaignID:   campaignID,
		Status:       models.PhaseStatusInProgress,
		StartedAt:    time.Now(),
		ProgressChan: make(chan PhaseProgress, 1),
		CancelChan:   make(chan struct{}),
		runID:        uuid.New(),
	}
	svc.executions[campaignID] = execution

	ctx := WithPhaseRun(context.Background(), PhaseRunContext{CampaignID: campaignID, Phase: models.PhaseTypeAnalysis, RunID: uuid.New()})
	svc.executeAnalysis(ctx, campaignID, []string{"one.test"})

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unexpected queries: %v", err)
	}
	if execution.Status != models.PhaseStatusFailed {
		t.Fatalf("expected failed status, got %s", execution.Status)
	}
	if execution.ErrorMessage != staleExecutionMessage {
		t.Fatalf("expected stale execution error, got %s", execution.ErrorMessage)
	}
}

func TestAnalysisService_ScoreDomainsRunContextMismatch(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock: %v", err)
	}
	defer db.Close()

	campaignID := uuid.New()
	svc := &analysisService{
		deps:       Dependencies{DB: db, Logger: &minimalLogger{}},
		executions: map[uuid.UUID]*analysisExecution{},
	}
	execution := &analysisExecution{
		CampaignID: campaignID,
		Status:     models.PhaseStatusInProgress,
		CancelChan: make(chan struct{}),
		runID:      uuid.New(),
	}
	svc.executions[campaignID] = execution

	ctx := WithPhaseRun(context.Background(), PhaseRunContext{CampaignID: campaignID, Phase: models.PhaseTypeAnalysis, RunID: uuid.New()})
	if _, err := svc.scoreDomains(ctx, campaignID); err == nil || !strings.Contains(err.Error(), staleExecutionMessage) {
		t.Fatalf("expected stale execution error, got %v", err)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unexpected queries: %v", err)
	}
}
