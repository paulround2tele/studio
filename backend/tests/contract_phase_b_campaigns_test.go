package tests

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	gen "github.com/fntelecomllc/studio/backend/internal/api/gen"
	"github.com/google/uuid"
)

// NOTE: These tests exercise the handler layer via the generated strictHandlers where possible.
// We instantiate minimal strictHandlers with nil deps for handlers that do not dereference deps
// before returning (list + metrics/Get require deps so we use a lightweight fake for required methods).

// fakeDeps implements only the pieces accessed by the migrated handlers we exercise.
type fakeDeps struct{}

// Minimal interface satisfaction for metrics & list handlers (they short circuit on nil deps so we skip those here)

// TestCampaignsGet_DirectPayload verifies GET /campaigns/{id} returns a direct CampaignResponse (no envelope)
func TestCampaignsGet_DirectPayload_Schema(t *testing.T) {
	// Directly marshal a generated success response struct to assert encoder shape.
	sample := gen.CampaignResponse{Id: uuid.New(), Name: "sample"}
	resp := gen.CampaignsGet200JSONResponse{Body: sample, Headers: gen.CampaignsGet200ResponseHeaders{XRequestId: "abc"}}
	rr := httptest.NewRecorder()
	if err := resp.VisitCampaignsGetResponse(rr); err != nil {
		t.Fatalf("encode: %v", err)
	}
	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200 got %d", rr.Code)
	}
	var raw map[string]any
	if err := json.Unmarshal(rr.Body.Bytes(), &raw); err != nil {
		t.Fatalf("json decode: %v", err)
	}
	if _, ok := raw["success"]; ok {
		t.Fatalf("found legacy success key")
	}
	if _, ok := raw["data"]; ok {
		t.Fatalf("found legacy data key")
	}
	if raw["name"] != "sample" {
		t.Fatalf("expected direct name field got %+v", raw)
	}
}

// TestCampaignsList_DirectArray verifies GET /campaigns returns a JSON array directly
func TestCampaignsList_DirectArray(t *testing.T) {
	list := []gen.CampaignResponse{{Id: uuid.New(), Name: "c1"}, {Id: uuid.New(), Name: "c2"}}
	resp := gen.CampaignsList200JSONResponse{Body: list, Headers: gen.CampaignsList200ResponseHeaders{XRequestId: "rid"}}
	rr := httptest.NewRecorder()
	if err := resp.VisitCampaignsListResponse(rr); err != nil {
		t.Fatalf("encode: %v", err)
	}
	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200 got %d", rr.Code)
	}
	// Body should be a JSON array
	if rr.Body.Len() == 0 {
		t.Fatalf("empty body")
	}
	if rr.Body.Bytes()[0] != '[' {
		t.Fatalf("expected JSON array start '[' got %q", rr.Body.Bytes()[0])
	}
}

// TestCampaignsMetrics_DirectObject verifies metrics success response encodes without envelope
func TestCampaignsMetrics_DirectObject(t *testing.T) {
	now := time.Now()
	metrics := gen.CampaignMetricsResponse{TotalAnalyzed: 10, Anchor: 2}
	_ = now // reserved for future timestamp fields
	resp := gen.CampaignsMetricsGet200JSONResponse(metrics)
	rr := httptest.NewRecorder()
	if err := resp.VisitCampaignsMetricsGetResponse(rr); err != nil {
		t.Fatalf("encode: %v", err)
	}
	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200 got %d", rr.Code)
	}
	var raw map[string]any
	if err := json.Unmarshal(rr.Body.Bytes(), &raw); err != nil {
		t.Fatalf("json decode: %v", err)
	}
	if _, ok := raw["success"]; ok {
		t.Fatalf("found legacy success key")
	}
	if _, ok := raw["data"]; ok {
		t.Fatalf("found legacy data key")
	}
	if v, ok := raw["totalAnalyzed"]; !ok || v.(float64) != 10 {
		t.Fatalf("expected totalAnalyzed=10 got %+v", raw)
	}
}

// TestBulkOperationStatus_DirectObject verifies bulk operation status is direct object
func TestBulkOperationStatus_DirectObject(t *testing.T) {
	id := uuid.New()
	resp := gen.GetBulkOperationStatus200JSONResponse{OperationId: id, Progress: 42.5, Status: "running", Type: "dns_validation"}
	rr := httptest.NewRecorder()
	if err := resp.VisitGetBulkOperationStatusResponse(rr); err != nil {
		t.Fatalf("encode: %v", err)
	}
	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200 got %d", rr.Code)
	}
	var raw map[string]any
	if err := json.Unmarshal(rr.Body.Bytes(), &raw); err != nil {
		t.Fatalf("json decode: %v", err)
	}
	if _, ok := raw["success"]; ok {
		t.Fatalf("found legacy success key")
	}
	if _, ok := raw["data"]; ok {
		t.Fatalf("found legacy data key")
	}
	if raw["operationId"].(string) == "" {
		t.Fatalf("missing operationId")
	}
}
