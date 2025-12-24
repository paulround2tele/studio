package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/fntelecomllc/studio/backend/internal/domain/services"
	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/google/uuid"
)

// full mock implementing services.AnalysisService minimally
type mockAnalysisService struct {
	breakdown map[string]float64
	err       error
}

func (m mockAnalysisService) Configure(context.Context, uuid.UUID, interface{}) error { return nil }
func (m mockAnalysisService) Execute(context.Context, uuid.UUID) (<-chan services.PhaseProgress, error) {
	return nil, nil
}
func (m mockAnalysisService) GetStatus(context.Context, uuid.UUID) (*services.PhaseStatus, error) {
	return &services.PhaseStatus{Status: models.PhaseStatusNotStarted, ProgressPct: 0}, nil
}
func (m mockAnalysisService) Cancel(context.Context, uuid.UUID) error          { return nil }
func (m mockAnalysisService) Validate(context.Context, interface{}) error      { return nil }
func (m mockAnalysisService) GetPhaseType() models.PhaseTypeEnum               { return models.PhaseTypeAnalysis }
func (m mockAnalysisService) ScoreDomains(context.Context, uuid.UUID) error    { return nil }
func (m mockAnalysisService) RescoreCampaign(context.Context, uuid.UUID) error { return nil }

// extension method
func (m mockAnalysisService) ScoreBreakdown(ctx context.Context, cID uuid.UUID, domain string) (map[string]float64, error) {
	return m.breakdown, m.err
}
func (m mockAnalysisService) ScoreBreakdownFull(ctx context.Context, cID uuid.UUID, domain string) (*services.ScoreBreakdownResult, error) {
	if m.err != nil {
		return nil, m.err
	}
	return &services.ScoreBreakdownResult{
		Components:          m.breakdown,
		Final:               m.breakdown["final"],
		Weights:             map[string]float64{},
		ParkedPenaltyFactor: 0.5,
	}, nil
}

// Satisfy minimal interface marker
func TestHandleScoreBreakdown_OK(t *testing.T) {
	bd := map[string]float64{"density": 0.3, "coverage": 0.5, "non_parked": 1, "content_length": 0.7, "title_keyword": 1, "freshness": 0.4, "tf_lite": 0.2, "final": 0.82}
	h := &ScoringProfileHandler{Analysis: mockAnalysisService{breakdown: bd}}
	req := httptest.NewRequest(http.MethodGet, "/api/score-breakdown?campaignId="+uuid.New().String()+"&domain=example.com", nil)
	w := httptest.NewRecorder()
	h.HandleScoreBreakdown(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 got %d", w.Code)
	}
	var resp struct {
		Success bool `json:"success"`
		Data    struct {
			Components map[string]float64 `json:"components"`
			Final      float64            `json:"final"`
		} `json:"data"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if !resp.Success {
		t.Fatalf("success false")
	}
	if resp.Data.Components["density"] != 0.3 || resp.Data.Final == 0 {
		t.Fatalf("unexpected payload %+v", resp.Data)
	}
}

func TestHandleScoreBreakdown_MissingParams(t *testing.T) {
	h := &ScoringProfileHandler{Analysis: mockAnalysisService{}}
	req := httptest.NewRequest(http.MethodGet, "/api/score-breakdown", nil)
	w := httptest.NewRecorder()
	h.HandleScoreBreakdown(w, req)
	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 got %d", w.Code)
	}
}
