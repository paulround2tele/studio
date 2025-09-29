package tests

import (
	"encoding/json"
	"net/http/httptest"
	"testing"
	"time"

	gen "github.com/fntelecomllc/studio/backend/internal/api/gen"
	"github.com/google/uuid"
)

// TestPhaseC_Funnel_Direct verifies funnel response encodes without legacy envelope
func TestPhaseC_Funnel_Direct(t *testing.T) {
	sample := gen.CampaignFunnelResponse{Generated: 10, Leads: 2}
	resp := gen.CampaignsFunnelGet200JSONResponse(sample)
	rr := httptest.NewRecorder()
	if err := resp.VisitCampaignsFunnelGetResponse(rr); err != nil {
		t.Fatalf("encode: %v", err)
	}
	assertNoEnvelopeObject(t, rr.Body.Bytes(), "funnel")
}

// TestPhaseC_Classifications_Direct
func TestPhaseC_Classifications_Direct(t *testing.T) {
	sample := gen.CampaignClassificationsResponse{Counts: struct {
		AtRisk        int "json:\"atRisk\""
		Emerging      int "json:\"emerging\""
		HighPotential int "json:\"highPotential\""
		LeadCandidate int "json:\"leadCandidate\""
		LowValue      int "json:\"lowValue\""
		Other         int "json:\"other\""
	}{HighPotential: 1}}
	resp := gen.CampaignsClassificationsGet200JSONResponse(sample)
	rr := httptest.NewRecorder()
	if err := resp.VisitCampaignsClassificationsGetResponse(rr); err != nil {
		t.Fatalf("encode: %v", err)
	}
	assertNoEnvelopeObject(t, rr.Body.Bytes(), "classifications")
}

// TestPhaseC_Momentum_Direct
func TestPhaseC_Momentum_Direct(t *testing.T) {
	sample := gen.CampaignMomentumResponse{Histogram: []int{1, 2, 3}}
	resp := gen.CampaignsMomentumGet200JSONResponse(sample)
	rr := httptest.NewRecorder()
	if err := resp.VisitCampaignsMomentumGetResponse(rr); err != nil {
		t.Fatalf("encode: %v", err)
	}
	assertNoEnvelopeObject(t, rr.Body.Bytes(), "momentum")
}

// TestPhaseC_Recommendations_Direct
func TestPhaseC_Recommendations_Direct(t *testing.T) {
	sample := gen.CampaignRecommendationsResponse{Recommendations: []gen.CampaignRecommendation{{Id: uuid.New().String(), Message: "do X"}}}
	resp := gen.CampaignsRecommendationsGet200JSONResponse(sample)
	rr := httptest.NewRecorder()
	if err := resp.VisitCampaignsRecommendationsGetResponse(rr); err != nil {
		t.Fatalf("encode: %v", err)
	}
	assertNoEnvelopeObject(t, rr.Body.Bytes(), "recommendations")
}

// TestPhaseC_Status_Direct
func TestPhaseC_Status_Direct(t *testing.T) {
	sample := gen.CampaignPhasesStatusResponse{CampaignId: uuid.New(), OverallProgressPercentage: 55.5}
	resp := gen.CampaignsStatusGet200JSONResponse(sample)
	rr := httptest.NewRecorder()
	if err := resp.VisitCampaignsStatusGetResponse(rr); err != nil {
		t.Fatalf("encode: %v", err)
	}
	assertNoEnvelopeObject(t, rr.Body.Bytes(), "status")
}

// TestPhaseC_Progress_Direct
func TestPhaseC_Progress_Direct(t *testing.T) {
	sample := gen.CampaignProgressResponse{CampaignId: uuid.New()}
	// leave nested structs zero-valued intentionally
	resp := gen.CampaignsProgress200JSONResponse(sample)
	rr := httptest.NewRecorder()
	if err := resp.VisitCampaignsProgressResponse(rr); err != nil {
		t.Fatalf("encode: %v", err)
	}
	assertNoEnvelopeObject(t, rr.Body.Bytes(), "progress")
}

// TestPhaseC_BulkOperationsList_DirectArray
func TestPhaseC_BulkOperationsList_DirectArray(t *testing.T) {
	sample := gen.CampaignsBulkOperationsList200JSONResponse{{}}
	rr := httptest.NewRecorder()
	if err := sample.VisitCampaignsBulkOperationsListResponse(rr); err != nil {
		t.Fatalf("encode: %v", err)
	}
	// Expect JSON array
	if rr.Body.Len() == 0 || rr.Body.Bytes()[0] != '[' {
		t.Fatalf("expected JSON array body, got %q", rr.Body.Bytes())
	}
}

// Negative envelope still for errors: simulate not found for Status (404 response type still envelope)
func TestPhaseC_Status_NotFound_StillErrorEnvelope(t *testing.T) {
	fals := false
	nf := gen.CampaignsStatusGet404JSONResponse{NotFoundJSONResponse: gen.NotFoundJSONResponse{Error: gen.ApiError{Message: "campaign not found", Code: gen.NOTFOUND, Timestamp: time.Now()}, RequestId: "rid", Success: &fals}}
	rr := httptest.NewRecorder()
	if err := nf.VisitCampaignsStatusGetResponse(rr); err != nil {
		t.Fatalf("encode: %v", err)
	}
	var raw map[string]any
	if err := json.Unmarshal(rr.Body.Bytes(), &raw); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if _, ok := raw["error"]; !ok {
		t.Fatalf("expected error key in envelope: %+v", raw)
	}
	if v, ok := raw["success"]; !ok || v.(bool) != false {
		t.Fatalf("expected success=false envelope: %+v", raw)
	}
}

// Shared assertion helper
func assertNoEnvelopeObject(t *testing.T, body []byte, label string) {
	t.Helper()
	if len(body) == 0 {
		t.Fatalf("empty body for %s", label)
	}
	if body[0] == '{' {
		// decode map and ensure legacy keys absent
		var m map[string]any
		if err := json.Unmarshal(body, &m); err != nil {
			t.Fatalf("json decode %s: %v", label, err)
		}
		if _, ok := m["success"]; ok {
			t.Fatalf("found legacy success key in %s", label)
		}
		if _, ok := m["data"]; ok {
			t.Fatalf("found legacy data key in %s", label)
		}
	}
}
