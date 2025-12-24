package main

import (
	"context"
	"database/sql"
	"testing"

	gen "github.com/fntelecomllc/studio/backend/internal/api/gen"
	domainservices "github.com/fntelecomllc/studio/backend/internal/domain/services"
	"github.com/fntelecomllc/studio/backend/internal/models"
	openapi_types "github.com/oapi-codegen/runtime/types"

	"github.com/google/uuid"
)

// mockAnalysisSvcForBreakdown implements minimal AnalysisService for score breakdown tests
type mockAnalysisSvcForBreakdown struct {
	result *domainservices.ScoreBreakdownResult
	err    error
}

func (m *mockAnalysisSvcForBreakdown) Configure(context.Context, uuid.UUID, interface{}) error {
	return nil
}
func (m *mockAnalysisSvcForBreakdown) Execute(context.Context, uuid.UUID) (<-chan domainservices.PhaseProgress, error) {
	ch := make(chan domainservices.PhaseProgress)
	close(ch)
	return ch, nil
}
func (m *mockAnalysisSvcForBreakdown) GetStatus(context.Context, uuid.UUID) (*domainservices.PhaseStatus, error) {
	return &domainservices.PhaseStatus{Status: models.PhaseStatusNotStarted}, nil
}
func (m *mockAnalysisSvcForBreakdown) Cancel(context.Context, uuid.UUID) error     { return nil }
func (m *mockAnalysisSvcForBreakdown) Validate(context.Context, interface{}) error { return nil }
func (m *mockAnalysisSvcForBreakdown) GetPhaseType() models.PhaseTypeEnum {
	return models.PhaseTypeAnalysis
}
func (m *mockAnalysisSvcForBreakdown) ScoreDomains(context.Context, uuid.UUID) error    { return nil }
func (m *mockAnalysisSvcForBreakdown) RescoreCampaign(context.Context, uuid.UUID) error { return nil }
func (m *mockAnalysisSvcForBreakdown) ScoreBreakdownFull(ctx context.Context, campaignID uuid.UUID, domain string) (*domainservices.ScoreBreakdownResult, error) {
	return m.result, m.err
}

func TestCampaignsDomainScoreBreakdown_Success(t *testing.T) {
	campaignID := uuid.New()

	mockSvc := &mockAnalysisSvcForBreakdown{
		result: &domainservices.ScoreBreakdownResult{
			Components: map[string]float64{
				"density":        0.65,
				"coverage":       0.80,
				"non_parked":     1.0,
				"content_length": 0.45,
				"title_keyword":  1.0,
				"freshness":      0.70,
				"tf_lite":        0.0,
			},
			Final: 0.78,
			Weights: map[string]float64{
				"keyword_density_weight":         0.30,
				"unique_keyword_coverage_weight": 0.20,
				"non_parked_weight":              0.10,
				"content_length_quality_weight":  0.10,
				"title_keyword_weight":           0.10,
				"freshness_weight":               0.10,
			},
			ParkedPenaltyFactor: 0.50,
		},
	}

	// Use existing fake store from the codebase
	mockStore := newFakeCampaignStoreForDomains()

	deps := &AppDeps{
		AnalysisSvc: mockSvc,
	}
	deps.Stores.Campaign = mockStore

	h := &strictHandlers{deps: deps}

	req := gen.CampaignsDomainScoreBreakdownRequestObject{
		CampaignId: openapi_types.UUID(campaignID),
		Domain:     "example.com",
	}

	resp, err := h.CampaignsDomainScoreBreakdown(context.Background(), req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	successResp, ok := resp.(gen.CampaignsDomainScoreBreakdown200JSONResponse)
	if !ok {
		t.Fatalf("expected 200 response, got %T", resp)
	}

	if successResp.Final != 0.78 {
		t.Errorf("expected final=0.78, got %v", successResp.Final)
	}
	if successResp.Components.Density != 0.65 {
		t.Errorf("expected density=0.65, got %v", successResp.Components.Density)
	}
	if successResp.Components.Coverage != 0.80 {
		t.Errorf("expected coverage=0.80, got %v", successResp.Components.Coverage)
	}
	if successResp.Weights == nil {
		t.Fatal("expected weights to be non-nil")
	}
	if (*successResp.Weights)["keyword_density_weight"] != 0.30 {
		t.Errorf("expected keyword_density_weight=0.30, got %v", (*successResp.Weights)["keyword_density_weight"])
	}
	if successResp.ParkedPenaltyFactor == nil || *successResp.ParkedPenaltyFactor != 0.50 {
		t.Errorf("expected parkedPenaltyFactor=0.50")
	}
}

func TestCampaignsDomainScoreBreakdown_DomainNotFound(t *testing.T) {
	campaignID := uuid.New()

	mockSvc := &mockAnalysisSvcForBreakdown{
		err: sql.ErrNoRows, // Simulates domain not found
	}

	mockStore := newFakeCampaignStoreForDomains()

	deps := &AppDeps{
		AnalysisSvc: mockSvc,
	}
	deps.Stores.Campaign = mockStore

	h := &strictHandlers{deps: deps}

	req := gen.CampaignsDomainScoreBreakdownRequestObject{
		CampaignId: openapi_types.UUID(campaignID),
		Domain:     "nonexistent.com",
	}

	resp, err := h.CampaignsDomainScoreBreakdown(context.Background(), req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	_, ok := resp.(gen.CampaignsDomainScoreBreakdown404JSONResponse)
	if !ok {
		t.Fatalf("expected 404 response, got %T", resp)
	}
}

func TestCampaignsDomainScoreBreakdown_EmptyDomain(t *testing.T) {
	campaignID := uuid.New()

	mockSvc := &mockAnalysisSvcForBreakdown{}
	mockStore := newFakeCampaignStoreForDomains()

	deps := &AppDeps{
		AnalysisSvc: mockSvc,
	}
	deps.Stores.Campaign = mockStore

	h := &strictHandlers{deps: deps}

	req := gen.CampaignsDomainScoreBreakdownRequestObject{
		CampaignId: openapi_types.UUID(campaignID),
		Domain:     "  ", // Empty/whitespace domain
	}

	resp, err := h.CampaignsDomainScoreBreakdown(context.Background(), req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	_, ok := resp.(gen.CampaignsDomainScoreBreakdown400JSONResponse)
	if !ok {
		t.Fatalf("expected 400 response, got %T", resp)
	}
}
