package main

import (
	"context"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	gen "github.com/fntelecomllc/studio/backend/internal/api/gen"
	"github.com/fntelecomllc/studio/backend/internal/application"
	domainservices "github.com/fntelecomllc/studio/backend/internal/domain/services"
	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/fntelecomllc/studio/backend/internal/store"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	openapi_types "github.com/oapi-codegen/runtime/types"
)

// stubAnalysisForRestart implements AnalysisService for testing
type stubAnalysisForRestart struct{}

func (s *stubAnalysisForRestart) Configure(ctx context.Context, cID uuid.UUID, cfg interface{}) error {
	return nil
}
func (s *stubAnalysisForRestart) Execute(ctx context.Context, cID uuid.UUID) (<-chan domainservices.PhaseProgress, error) {
	ch := make(chan domainservices.PhaseProgress)
	close(ch)
	return ch, nil
}
func (s *stubAnalysisForRestart) GetStatus(ctx context.Context, cID uuid.UUID) (*domainservices.PhaseStatus, error) {
	return &domainservices.PhaseStatus{Status: models.PhaseStatusNotStarted}, nil
}
func (s *stubAnalysisForRestart) Cancel(ctx context.Context, cID uuid.UUID) error     { return nil }
func (s *stubAnalysisForRestart) Validate(ctx context.Context, cfg interface{}) error { return nil }
func (s *stubAnalysisForRestart) GetPhaseType() models.PhaseTypeEnum {
	return models.PhaseTypeAnalysis
}
func (s *stubAnalysisForRestart) ScoreDomains(ctx context.Context, cID uuid.UUID) error { return nil }
func (s *stubAnalysisForRestart) RescoreCampaign(ctx context.Context, cID uuid.UUID) error {
	return nil
}
func (s *stubAnalysisForRestart) ScoreBreakdown(ctx context.Context, cID uuid.UUID, domain string) (map[string]float64, error) {
	return nil, nil
}

// stubHTTPServiceForRestart is a stub HTTP service for testing
type stubHTTPServiceForRestart struct {
	status models.PhaseStatusEnum
}

func (s *stubHTTPServiceForRestart) Configure(ctx context.Context, cID uuid.UUID, cfg interface{}) error {
	return nil
}
func (s *stubHTTPServiceForRestart) Execute(ctx context.Context, cID uuid.UUID) (<-chan domainservices.PhaseProgress, error) {
	ch := make(chan domainservices.PhaseProgress)
	close(ch)
	return ch, nil
}
func (s *stubHTTPServiceForRestart) GetStatus(ctx context.Context, cID uuid.UUID) (*domainservices.PhaseStatus, error) {
	return &domainservices.PhaseStatus{Status: s.status}, nil
}
func (s *stubHTTPServiceForRestart) Cancel(ctx context.Context, cID uuid.UUID) error     { return nil }
func (s *stubHTTPServiceForRestart) Validate(ctx context.Context, cfg interface{}) error { return nil }
func (s *stubHTTPServiceForRestart) GetPhaseType() models.PhaseTypeEnum {
	return models.PhaseTypeHTTPKeywordValidation
}

// noopLoggerRestart is a no-op logger for tests
type noopLoggerRestart struct{}

func (n *noopLoggerRestart) Debug(ctx context.Context, msg string, fields map[string]interface{}) {}
func (n *noopLoggerRestart) Info(ctx context.Context, msg string, fields map[string]interface{})  {}
func (n *noopLoggerRestart) Warn(ctx context.Context, msg string, fields map[string]interface{})  {}
func (n *noopLoggerRestart) Error(ctx context.Context, msg string, err error, fields map[string]interface{}) {
}

// fakeStoreForAnalysisRestart wraps fakeCampaignStoreForDomains with phase tracking
type fakeStoreForAnalysisRestart struct {
	fakeCampaignStoreForDomains
	httpPhaseStatus     models.PhaseStatusEnum
	analysisPhaseStatus models.PhaseStatusEnum
}

func newFakeStoreForAnalysisRestart() *fakeStoreForAnalysisRestart {
	base := newFakeCampaignStoreForDomains()
	return &fakeStoreForAnalysisRestart{
		fakeCampaignStoreForDomains: *base,
		httpPhaseStatus:             models.PhaseStatusCompleted,
		analysisPhaseStatus:         models.PhaseStatusCompleted,
	}
}

func (f *fakeStoreForAnalysisRestart) GetCampaignPhase(ctx context.Context, exec store.Querier, campaignID uuid.UUID, phase models.PhaseTypeEnum) (*models.CampaignPhase, error) {
	switch phase {
	case models.PhaseTypeHTTPKeywordValidation:
		return &models.CampaignPhase{
			CampaignID: campaignID,
			PhaseType:  phase,
			Status:     f.httpPhaseStatus,
		}, nil
	case models.PhaseTypeAnalysis:
		return &models.CampaignPhase{
			CampaignID: campaignID,
			PhaseType:  phase,
			Status:     f.analysisPhaseStatus,
		}, nil
	case models.PhaseTypeDomainGeneration, models.PhaseTypeDNSValidation, models.PhaseTypeExtraction, models.PhaseTypeEnrichment:
		// All upstream phases are completed for analysis restart tests
		return &models.CampaignPhase{
			CampaignID: campaignID,
			PhaseType:  phase,
			Status:     models.PhaseStatusCompleted,
		}, nil
	default:
		return &models.CampaignPhase{
			CampaignID: campaignID,
			PhaseType:  phase,
			Status:     models.PhaseStatusNotStarted,
		}, nil
	}
}

func (f *fakeStoreForAnalysisRestart) UpdateCampaignPhaseFields(ctx context.Context, exec store.Querier, id uuid.UUID, currentPhase *models.PhaseTypeEnum, phaseStatus *models.PhaseStatusEnum) error {
	if currentPhase != nil && *currentPhase == models.PhaseTypeAnalysis && phaseStatus != nil {
		f.analysisPhaseStatus = *phaseStatus
	}
	return nil
}

// createTestDBWithMock creates a mock database that returns the sqlmock for setting expectations
func createTestDBWithMock(t *testing.T) (*sqlx.DB, sqlmock.Sqlmock) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("failed to create sqlmock: %v", err)
	}
	t.Cleanup(func() { db.Close() })
	return sqlx.NewDb(db, "sqlmock"), mock
}

// createTestDB creates a mock database for testing (ignores the mock)
func createTestDB(t *testing.T) *sqlx.DB {
	db, _ := createTestDBWithMock(t)
	return db
}

// TestAnalysisRestart_HappyPath tests successful analysis restart
func TestAnalysisRestart_HappyPath(t *testing.T) {
	campaignID := uuid.New()
	fakeStore := newFakeStoreForAnalysisRestart()
	fakeStore.httpPhaseStatus = models.PhaseStatusCompleted
	fakeStore.analysisPhaseStatus = models.PhaseStatusCompleted

	sqlxDB := createTestDB(t)
	httpSvc := &stubHTTPServiceForRestart{status: models.PhaseStatusCompleted}
	analysisSvc := &stubAnalysisForRestart{}
	deps := domainservices.Dependencies{Logger: &noopLoggerRestart{}, DB: sqlxDB}
	orchestrator := application.NewCampaignOrchestrator(fakeStore, deps, nil, nil, httpSvc, nil, nil, analysisSvc, nil, nil)

	appDeps := &AppDeps{Orchestrator: orchestrator, DB: sqlxDB}
	appDeps.Stores.Campaign = fakeStore
	h := &strictHandlers{deps: appDeps}

	req := gen.CampaignsAnalysisRestartRequestObject{
		CampaignId: openapi_types.UUID(campaignID),
		Params:     gen.CampaignsAnalysisRestartParams{},
	}

	resp, err := h.CampaignsAnalysisRestart(context.Background(), req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	okResp, ok := resp.(gen.CampaignsAnalysisRestart200JSONResponse)
	if !ok {
		if errResp, isErr := resp.(gen.CampaignsAnalysisRestart500JSONResponse); isErr {
			t.Fatalf("expected 200 response, got 500: %s", errResp.Error.Message)
		}
		t.Fatalf("expected 200 response, got %T", resp)
	}

	// Verify response fields
	if okResp.Message == "" {
		t.Error("expected non-empty message")
	}
	if okResp.CurrentState != gen.AnalysisRestartResponseCurrentState("running") {
		t.Errorf("expected current state 'running', got '%s'", okResp.CurrentState)
	}
	if okResp.PreviousState == nil || *okResp.PreviousState != gen.AnalysisRestartResponsePreviousState("completed") {
		t.Errorf("expected previous state 'completed', got %v", okResp.PreviousState)
	}
	if okResp.Idempotent == nil || *okResp.Idempotent != false {
		t.Error("expected idempotent=false for first request")
	}
}

// TestAnalysisRestart_InvalidState_Running tests that restart fails when analysis is running
func TestAnalysisRestart_InvalidState_Running(t *testing.T) {
	campaignID := uuid.New()
	fakeStore := newFakeStoreForAnalysisRestart()
	fakeStore.httpPhaseStatus = models.PhaseStatusCompleted
	fakeStore.analysisPhaseStatus = models.PhaseStatusInProgress // Running!

	sqlxDB := createTestDB(t)
	httpSvc := &stubHTTPServiceForRestart{status: models.PhaseStatusCompleted}
	analysisSvc := &stubAnalysisForRestart{}
	deps := domainservices.Dependencies{Logger: &noopLoggerRestart{}, DB: sqlxDB}
	orchestrator := application.NewCampaignOrchestrator(fakeStore, deps, nil, nil, httpSvc, nil, nil, analysisSvc, nil, nil)

	appDeps := &AppDeps{Orchestrator: orchestrator, DB: sqlxDB}
	appDeps.Stores.Campaign = fakeStore
	h := &strictHandlers{deps: appDeps}

	req := gen.CampaignsAnalysisRestartRequestObject{
		CampaignId: openapi_types.UUID(campaignID),
		Params:     gen.CampaignsAnalysisRestartParams{},
	}

	resp, err := h.CampaignsAnalysisRestart(context.Background(), req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Should return 409 Conflict
	conflictResp, ok := resp.(gen.CampaignsAnalysisRestart409JSONResponse)
	if !ok {
		t.Fatalf("expected 409 response, got %T", resp)
	}

	// Verify conflict response
	if conflictResp.Error.Message == "" {
		t.Error("expected non-empty error message")
	}
	if conflictResp.CurrentState == nil || *conflictResp.CurrentState != "running" {
		t.Errorf("expected current state 'running', got %v", conflictResp.CurrentState)
	}
}

// TestAnalysisRestart_InvalidState_HTTPNotCompleted tests that restart fails when HTTP is not completed
func TestAnalysisRestart_InvalidState_HTTPNotCompleted(t *testing.T) {
	campaignID := uuid.New()
	fakeStore := newFakeStoreForAnalysisRestart()
	fakeStore.httpPhaseStatus = models.PhaseStatusInProgress // HTTP not complete
	fakeStore.analysisPhaseStatus = models.PhaseStatusCompleted

	sqlxDB := createTestDB(t)
	httpSvc := &stubHTTPServiceForRestart{status: models.PhaseStatusInProgress} // HTTP running
	analysisSvc := &stubAnalysisForRestart{}
	deps := domainservices.Dependencies{Logger: &noopLoggerRestart{}, DB: sqlxDB}
	orchestrator := application.NewCampaignOrchestrator(fakeStore, deps, nil, nil, httpSvc, nil, nil, analysisSvc, nil, nil)

	appDeps := &AppDeps{Orchestrator: orchestrator, DB: sqlxDB}
	appDeps.Stores.Campaign = fakeStore
	h := &strictHandlers{deps: appDeps}

	req := gen.CampaignsAnalysisRestartRequestObject{
		CampaignId: openapi_types.UUID(campaignID),
		Params:     gen.CampaignsAnalysisRestartParams{},
	}

	resp, err := h.CampaignsAnalysisRestart(context.Background(), req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Should return 409 Conflict
	conflictResp, ok := resp.(gen.CampaignsAnalysisRestart409JSONResponse)
	if !ok {
		t.Fatalf("expected 409 response, got %T", resp)
	}

	// Verify conflict response mentions HTTP
	if conflictResp.Error.Message == "" {
		t.Error("expected non-empty error message")
	}
	if conflictResp.RequiredState == nil || *conflictResp.RequiredState != "http_validation must be completed" {
		t.Errorf("expected required state about HTTP validation, got %v", conflictResp.RequiredState)
	}
}

// TestAnalysisRestart_Idempotency tests idempotent behavior with X-Idempotency-Key
func TestAnalysisRestart_Idempotency(t *testing.T) {
	campaignID := uuid.New()
	fakeStore := newFakeStoreForAnalysisRestart()
	fakeStore.httpPhaseStatus = models.PhaseStatusCompleted
	fakeStore.analysisPhaseStatus = models.PhaseStatusCompleted

	sqlxDB := createTestDB(t)
	httpSvc := &stubHTTPServiceForRestart{status: models.PhaseStatusCompleted}
	analysisSvc := &stubAnalysisForRestart{}
	deps := domainservices.Dependencies{Logger: &noopLoggerRestart{}, DB: sqlxDB}
	orchestrator := application.NewCampaignOrchestrator(fakeStore, deps, nil, nil, httpSvc, nil, nil, analysisSvc, nil, nil)

	appDeps := &AppDeps{Orchestrator: orchestrator, DB: sqlxDB}
	appDeps.Stores.Campaign = fakeStore
	h := &strictHandlers{deps: appDeps}

	idempotencyKey := "test-idempotency-key-" + uuid.New().String()

	// First request
	req1 := gen.CampaignsAnalysisRestartRequestObject{
		CampaignId: openapi_types.UUID(campaignID),
		Params:     gen.CampaignsAnalysisRestartParams{XIdempotencyKey: &idempotencyKey},
	}

	resp1, err := h.CampaignsAnalysisRestart(context.Background(), req1)
	if err != nil {
		t.Fatalf("unexpected error on first request: %v", err)
	}

	okResp1, ok := resp1.(gen.CampaignsAnalysisRestart200JSONResponse)
	if !ok {
		t.Fatalf("expected 200 response on first request, got %T", resp1)
	}

	// First request should not be idempotent
	if okResp1.Idempotent != nil && *okResp1.Idempotent {
		t.Error("expected first request to not be idempotent")
	}

	// Second request with same key
	req2 := gen.CampaignsAnalysisRestartRequestObject{
		CampaignId: openapi_types.UUID(campaignID),
		Params:     gen.CampaignsAnalysisRestartParams{XIdempotencyKey: &idempotencyKey},
	}

	resp2, err := h.CampaignsAnalysisRestart(context.Background(), req2)
	if err != nil {
		t.Fatalf("unexpected error on second request: %v", err)
	}

	okResp2, ok := resp2.(gen.CampaignsAnalysisRestart200JSONResponse)
	if !ok {
		t.Fatalf("expected 200 response on second request, got %T", resp2)
	}

	// Second request should be idempotent
	if okResp2.Idempotent == nil || !*okResp2.Idempotent {
		t.Error("expected second request to be idempotent")
	}
	if okResp2.Message != "Analysis restart already processed (idempotent)" {
		t.Errorf("expected idempotent message, got '%s'", okResp2.Message)
	}
}

// TestAnalysisRestart_CampaignNotFound tests 404 when campaign doesn't exist
func TestAnalysisRestart_CampaignNotFound(t *testing.T) {
	campaignID := uuid.New()
	fakeStore := &campaignNotFoundStore{}

	sqlxDB := createTestDB(t)
	httpSvc := &stubHTTPServiceForRestart{status: models.PhaseStatusCompleted}
	analysisSvc := &stubAnalysisForRestart{}
	deps := domainservices.Dependencies{Logger: &noopLoggerRestart{}, DB: sqlxDB}
	orchestrator := application.NewCampaignOrchestrator(fakeStore, deps, nil, nil, httpSvc, nil, nil, analysisSvc, nil, nil)

	appDeps := &AppDeps{Orchestrator: orchestrator, DB: sqlxDB}
	appDeps.Stores.Campaign = fakeStore
	h := &strictHandlers{deps: appDeps}

	req := gen.CampaignsAnalysisRestartRequestObject{
		CampaignId: openapi_types.UUID(campaignID),
		Params:     gen.CampaignsAnalysisRestartParams{},
	}

	resp, err := h.CampaignsAnalysisRestart(context.Background(), req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Should return 404
	_, ok := resp.(gen.CampaignsAnalysisRestart404JSONResponse)
	if !ok {
		t.Fatalf("expected 404 response, got %T", resp)
	}
}
