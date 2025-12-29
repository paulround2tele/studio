package main

import (
	"context"
	"errors"
	"testing"

	"github.com/fntelecomllc/studio/backend/internal/application"
	gen "github.com/fntelecomllc/studio/backend/internal/api/gen"
	domainservices "github.com/fntelecomllc/studio/backend/internal/domain/services"
	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/fntelecomllc/studio/backend/internal/store"
	"github.com/google/uuid"
	openapi_types "github.com/oapi-codegen/runtime/types"
)

// stubAnalysisForScoreBreakdown implements only ScoreBreakdown for testing
type stubAnalysisForScoreBreakdown struct {
	breakdown map[string]float64
	err       error
}

func (s *stubAnalysisForScoreBreakdown) Configure(ctx context.Context, cID uuid.UUID, cfg interface{}) error {
	return nil
}
func (s *stubAnalysisForScoreBreakdown) Execute(ctx context.Context, cID uuid.UUID) (<-chan domainservices.PhaseProgress, error) {
	return nil, nil
}
func (s *stubAnalysisForScoreBreakdown) GetStatus(ctx context.Context, cID uuid.UUID) (*domainservices.PhaseStatus, error) {
	return &domainservices.PhaseStatus{Status: models.PhaseStatusNotStarted}, nil
}
func (s *stubAnalysisForScoreBreakdown) Cancel(ctx context.Context, cID uuid.UUID) error     { return nil }
func (s *stubAnalysisForScoreBreakdown) Validate(ctx context.Context, cfg interface{}) error { return nil }
func (s *stubAnalysisForScoreBreakdown) GetPhaseType() models.PhaseTypeEnum {
	return models.PhaseTypeAnalysis
}
func (s *stubAnalysisForScoreBreakdown) ScoreDomains(ctx context.Context, cID uuid.UUID) error    { return nil }
func (s *stubAnalysisForScoreBreakdown) RescoreCampaign(ctx context.Context, cID uuid.UUID) error { return nil }
func (s *stubAnalysisForScoreBreakdown) ScoreBreakdown(ctx context.Context, cID uuid.UUID, domain string) (map[string]float64, error) {
	return s.breakdown, s.err
}

// noopDomainLoggerScoreBreakdown is a no-op logger for tests
type noopDomainLoggerScoreBreakdown struct{}

func (n *noopDomainLoggerScoreBreakdown) Debug(ctx context.Context, msg string, fields map[string]interface{}) {
}
func (n *noopDomainLoggerScoreBreakdown) Info(ctx context.Context, msg string, fields map[string]interface{}) {
}
func (n *noopDomainLoggerScoreBreakdown) Warn(ctx context.Context, msg string, fields map[string]interface{}) {
}
func (n *noopDomainLoggerScoreBreakdown) Error(ctx context.Context, msg string, err error, fields map[string]interface{}) {
}

// campaignNotFoundStore is a store stub that returns ErrNotFound for GetCampaignByID
type campaignNotFoundStore struct {
	fakeCampaignStoreForDomains
}

func (c *campaignNotFoundStore) GetCampaignByID(ctx context.Context, exec store.Querier, id uuid.UUID) (*models.LeadGenerationCampaign, error) {
	return nil, store.ErrNotFound
}

// TestScoreBreakdown_Complete tests the normal case with all components present
func TestScoreBreakdown_Complete(t *testing.T) {
	campaignID := uuid.New()
	fakeStore := newFakeCampaignStoreForDomains()

	analysisSvc := &stubAnalysisForScoreBreakdown{
		breakdown: map[string]float64{
			"density":        0.85,
			"coverage":       0.72,
			"non_parked":     1.0,
			"content_length": 0.65,
			"title_keyword":  0.90,
			"freshness":      0.80,
			"tf_lite":        0.50,
			"final":          0.875,
		},
	}
	deps := domainservices.Dependencies{Logger: &noopDomainLoggerScoreBreakdown{}}
	orchestrator := application.NewCampaignOrchestrator(fakeStore, deps, nil, nil, nil, nil, nil, analysisSvc, nil, nil)

	appDeps := &AppDeps{Orchestrator: orchestrator}
	appDeps.Stores.Campaign = fakeStore
	h := &strictHandlers{deps: appDeps}

	req := gen.CampaignsDomainScoreBreakdownRequestObject{
		CampaignId: openapi_types.UUID(campaignID),
		Domain:     "example.com",
	}

	resp, err := h.CampaignsDomainScoreBreakdown(context.Background(), req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	okResp, ok := resp.(gen.CampaignsDomainScoreBreakdown200JSONResponse)
	if !ok {
		t.Fatalf("expected 200 response, got %T", resp)
	}

	// Verify state is complete
	if okResp.State != gen.DomainScoreBreakdownResponseState("complete") {
		t.Errorf("expected state 'complete', got '%s'", okResp.State)
	}

	// Verify reason is nil for complete state
	if okResp.Reason != nil {
		t.Errorf("expected nil reason for complete state, got %v", *okResp.Reason)
	}

	// Verify overall score is present and scaled to 0-100
	if okResp.OverallScore == nil {
		t.Error("expected overall score to be present")
	} else if *okResp.OverallScore < 87 || *okResp.OverallScore > 88 {
		t.Errorf("expected overall score ~87.5, got %f", *okResp.OverallScore)
	}

	// Verify component states are all 'ok'
	if okResp.Components.Density.State != gen.ScoreComponentState("ok") {
		t.Errorf("expected density state 'ok', got '%s'", okResp.Components.Density.State)
	}
	if okResp.Components.Density.Value == nil || *okResp.Components.Density.Value < 0.84 {
		t.Errorf("expected density value ~0.85, got %v", okResp.Components.Density.Value)
	}

	// Verify evidence is present
	if okResp.Evidence == nil {
		t.Error("expected evidence to be present")
	} else {
		if okResp.Evidence.ParkedPenaltyApplied == nil || *okResp.Evidence.ParkedPenaltyApplied != false {
			t.Errorf("expected parked penalty not applied, got %v", okResp.Evidence.ParkedPenaltyApplied)
		}
	}

	// Verify weights are present
	if okResp.Weights == nil {
		t.Error("expected weights to be present")
	}
}

// TestScoreBreakdown_Partial tests when some components are missing
func TestScoreBreakdown_Partial(t *testing.T) {
	campaignID := uuid.New()
	fakeStore := newFakeCampaignStoreForDomains()

	analysisSvc := &stubAnalysisForScoreBreakdown{
		breakdown: map[string]float64{
			"density":    0.85,
			"coverage":   0.72,
			"non_parked": 1.0,
			// Missing: content_length, title_keyword, freshness
			"tf_lite": 0.50,
			"final":   0.60,
		},
	}
	deps := domainservices.Dependencies{Logger: &noopDomainLoggerScoreBreakdown{}}
	orchestrator := application.NewCampaignOrchestrator(fakeStore, deps, nil, nil, nil, nil, nil, analysisSvc, nil, nil)

	appDeps := &AppDeps{Orchestrator: orchestrator}
	appDeps.Stores.Campaign = fakeStore
	h := &strictHandlers{deps: appDeps}

	req := gen.CampaignsDomainScoreBreakdownRequestObject{
		CampaignId: openapi_types.UUID(campaignID),
		Domain:     "partial-domain.com",
	}

	resp, err := h.CampaignsDomainScoreBreakdown(context.Background(), req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	okResp, ok := resp.(gen.CampaignsDomainScoreBreakdown200JSONResponse)
	if !ok {
		t.Fatalf("expected 200 response, got %T", resp)
	}

	// Verify state is partial
	if okResp.State != gen.DomainScoreBreakdownResponseState("partial") {
		t.Errorf("expected state 'partial', got '%s'", okResp.State)
	}

	// Verify reason indicates feature vector missing
	if okResp.Reason == nil {
		t.Error("expected reason to be present for partial state")
	} else if *okResp.Reason != gen.DomainScoreBreakdownResponseReason("feature_vector_missing") {
		t.Errorf("expected reason 'feature_vector_missing', got '%s'", *okResp.Reason)
	}

	// Verify overall score is still present (best effort)
	if okResp.OverallScore == nil {
		t.Error("expected overall score to be present even in partial state")
	}

	// Verify missing components have unavailable state
	if okResp.Components.ContentLength.State != gen.ScoreComponentState("unavailable") {
		t.Errorf("expected content_length state 'unavailable', got '%s'", okResp.Components.ContentLength.State)
	}
	if okResp.Components.ContentLength.Value != nil {
		t.Errorf("expected content_length value to be nil, got %v", *okResp.Components.ContentLength.Value)
	}

	// Verify present components have ok state
	if okResp.Components.Density.State != gen.ScoreComponentState("ok") {
		t.Errorf("expected density state 'ok', got '%s'", okResp.Components.Density.State)
	}
}

// TestScoreBreakdown_Degraded_DomainNotFound tests domain not found returns degraded state
func TestScoreBreakdown_Degraded_DomainNotFound(t *testing.T) {
	campaignID := uuid.New()
	fakeStore := newFakeCampaignStoreForDomains()

	analysisSvc := &stubAnalysisForScoreBreakdown{
		err: errors.New("sql: no rows in result set"),
	}
	deps := domainservices.Dependencies{Logger: &noopDomainLoggerScoreBreakdown{}}
	orchestrator := application.NewCampaignOrchestrator(fakeStore, deps, nil, nil, nil, nil, nil, analysisSvc, nil, nil)

	appDeps := &AppDeps{Orchestrator: orchestrator}
	appDeps.Stores.Campaign = fakeStore
	h := &strictHandlers{deps: appDeps}

	req := gen.CampaignsDomainScoreBreakdownRequestObject{
		CampaignId: openapi_types.UUID(campaignID),
		Domain:     "notfound.com",
	}

	resp, err := h.CampaignsDomainScoreBreakdown(context.Background(), req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Should return 200 with degraded state, not 404
	okResp, ok := resp.(gen.CampaignsDomainScoreBreakdown200JSONResponse)
	if !ok {
		t.Fatalf("expected 200 response with degraded state, got %T", resp)
	}

	// Verify state is degraded
	if okResp.State != gen.DomainScoreBreakdownResponseState("degraded") {
		t.Errorf("expected state 'degraded', got '%s'", okResp.State)
	}

	// Verify reason indicates domain not found
	if okResp.Reason == nil {
		t.Error("expected reason to be present for degraded state")
	} else if *okResp.Reason != gen.DomainScoreBreakdownResponseReason("domain_not_found") {
		t.Errorf("expected reason 'domain_not_found', got '%s'", *okResp.Reason)
	}

	// Verify overall score is nil
	if okResp.OverallScore != nil {
		t.Errorf("expected overall score to be nil for degraded state, got %v", *okResp.OverallScore)
	}

	// Verify all components have unavailable state
	if okResp.Components.Density.State != gen.ScoreComponentState("unavailable") {
		t.Errorf("expected density state 'unavailable', got '%s'", okResp.Components.Density.State)
	}
}

// TestScoreBreakdown_Degraded_InternalError tests internal error returns degraded state
func TestScoreBreakdown_Degraded_InternalError(t *testing.T) {
	campaignID := uuid.New()
	fakeStore := newFakeCampaignStoreForDomains()

	analysisSvc := &stubAnalysisForScoreBreakdown{
		err: errors.New("database connection failed"),
	}
	deps := domainservices.Dependencies{Logger: &noopDomainLoggerScoreBreakdown{}}
	orchestrator := application.NewCampaignOrchestrator(fakeStore, deps, nil, nil, nil, nil, nil, analysisSvc, nil, nil)

	appDeps := &AppDeps{Orchestrator: orchestrator}
	appDeps.Stores.Campaign = fakeStore
	h := &strictHandlers{deps: appDeps}

	req := gen.CampaignsDomainScoreBreakdownRequestObject{
		CampaignId: openapi_types.UUID(campaignID),
		Domain:     "error.com",
	}

	resp, err := h.CampaignsDomainScoreBreakdown(context.Background(), req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	okResp, ok := resp.(gen.CampaignsDomainScoreBreakdown200JSONResponse)
	if !ok {
		t.Fatalf("expected 200 response with degraded state, got %T", resp)
	}

	// Verify state is degraded
	if okResp.State != gen.DomainScoreBreakdownResponseState("degraded") {
		t.Errorf("expected state 'degraded', got '%s'", okResp.State)
	}

	// Verify reason indicates internal error
	if okResp.Reason == nil {
		t.Error("expected reason to be present for degraded state")
	} else if *okResp.Reason != gen.DomainScoreBreakdownResponseReason("internal_error") {
		t.Errorf("expected reason 'internal_error', got '%s'", *okResp.Reason)
	}

	// Verify all components have error state
	if okResp.Components.Density.State != gen.ScoreComponentState("error") {
		t.Errorf("expected density state 'error', got '%s'", okResp.Components.Density.State)
	}
	if okResp.Components.Density.Reason == nil {
		t.Error("expected density reason to be present")
	} else if *okResp.Components.Density.Reason != gen.ScoreComponentReason("computation_failed") {
		t.Errorf("expected density reason 'computation_failed', got '%s'", *okResp.Components.Density.Reason)
	}
}

// TestScoreBreakdown_CampaignNotFound tests campaign not found returns 404
func TestScoreBreakdown_CampaignNotFound(t *testing.T) {
	campaignID := uuid.New()
	fakeStore := &campaignNotFoundStore{}

	analysisSvc := &stubAnalysisForScoreBreakdown{}
	deps := domainservices.Dependencies{Logger: &noopDomainLoggerScoreBreakdown{}}
	orchestrator := application.NewCampaignOrchestrator(fakeStore, deps, nil, nil, nil, nil, nil, analysisSvc, nil, nil)

	appDeps := &AppDeps{Orchestrator: orchestrator}
	appDeps.Stores.Campaign = fakeStore
	h := &strictHandlers{deps: appDeps}

	req := gen.CampaignsDomainScoreBreakdownRequestObject{
		CampaignId: openapi_types.UUID(campaignID),
		Domain:     "example.com",
	}

	resp, err := h.CampaignsDomainScoreBreakdown(context.Background(), req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Should return 404 for campaign not found
	_, ok := resp.(gen.CampaignsDomainScoreBreakdown404JSONResponse)
	if !ok {
		t.Fatalf("expected 404 response, got %T", resp)
	}
}

// TestScoreBreakdown_ParkedPenaltyEvidence tests parked penalty evidence
func TestScoreBreakdown_ParkedPenaltyEvidence(t *testing.T) {
	campaignID := uuid.New()
	fakeStore := newFakeCampaignStoreForDomains()

	analysisSvc := &stubAnalysisForScoreBreakdown{
		breakdown: map[string]float64{
			"density":        0.85,
			"coverage":       0.72,
			"non_parked":     0.5, // Penalty applied
			"content_length": 0.65,
			"title_keyword":  0.90,
			"freshness":      0.80,
			"tf_lite":        0.50,
			"final":          0.5,
		},
	}
	deps := domainservices.Dependencies{Logger: &noopDomainLoggerScoreBreakdown{}}
	orchestrator := application.NewCampaignOrchestrator(fakeStore, deps, nil, nil, nil, nil, nil, analysisSvc, nil, nil)

	appDeps := &AppDeps{Orchestrator: orchestrator}
	appDeps.Stores.Campaign = fakeStore
	h := &strictHandlers{deps: appDeps}

	req := gen.CampaignsDomainScoreBreakdownRequestObject{
		CampaignId: openapi_types.UUID(campaignID),
		Domain:     "parked-site.com",
	}

	resp, err := h.CampaignsDomainScoreBreakdown(context.Background(), req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	okResp, ok := resp.(gen.CampaignsDomainScoreBreakdown200JSONResponse)
	if !ok {
		t.Fatalf("expected 200 response, got %T", resp)
	}

	// Verify evidence shows parked penalty applied
	if okResp.Evidence == nil {
		t.Fatal("expected evidence to be present")
	}
	if okResp.Evidence.ParkedPenaltyApplied == nil || *okResp.Evidence.ParkedPenaltyApplied != true {
		t.Errorf("expected parked penalty applied = true, got %v", okResp.Evidence.ParkedPenaltyApplied)
	}
	if okResp.Evidence.ParkedPenaltyFactor == nil || *okResp.Evidence.ParkedPenaltyFactor != 0.5 {
		t.Errorf("expected parked penalty factor = 0.5, got %v", okResp.Evidence.ParkedPenaltyFactor)
	}
}
