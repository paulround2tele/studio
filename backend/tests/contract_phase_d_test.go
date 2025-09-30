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
// before returning.

// TestPhaseD_Simple is a simple test to verify the test file is working
func TestPhaseD_Simple(t *testing.T) {
	if 1+1 != 2 {
		t.Fatalf("math is broken")
	}
}

// TestMonitoringPerformanceSummary_DirectPayload verifies monitoring performance summary returns direct object (no envelope)
func TestMonitoringPerformanceSummary_DirectPayload_Schema(t *testing.T) {
	// Directly marshal a generated success response struct to assert encoder shape.
	sampleData := map[string]interface{}{
		"activeOperations": 5,
		"completedOperations": 100,
		"averageLatency": "150ms",
	}
	resp := gen.MonitoringPerformanceSummary200JSONResponse(sampleData)
	rr := httptest.NewRecorder()
	if err := resp.VisitMonitoringPerformanceSummaryResponse(rr); err != nil {
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
	if raw["activeOperations"] != float64(5) {
		t.Fatalf("expected direct activeOperations field got %+v", raw)
	}
}

// TestMonitoringDashboardSummary_DirectPayload verifies monitoring dashboard summary returns direct object (no envelope)
func TestMonitoringDashboardSummary_DirectPayload_Schema(t *testing.T) {
	sampleData := map[string]interface{}{
		"systemHealth": "good",
		"cpuUsage": 45.2,
		"memoryUsage": 67.8,
	}
	resp := gen.MonitoringDashboardSummary200JSONResponse(sampleData)
	rr := httptest.NewRecorder()
	if err := resp.VisitMonitoringDashboardSummaryResponse(rr); err != nil {
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
	if raw["systemHealth"] != "good" {
		t.Fatalf("expected direct systemHealth field got %+v", raw)
	}
}

// TestMonitoringPerformanceActive_DirectPayload verifies monitoring performance active returns direct object (no envelope)
func TestMonitoringPerformanceActive_DirectPayload_Schema(t *testing.T) {
	sampleData := map[string]interface{}{
		"operations": []map[string]interface{}{
			{"id": "op1", "status": "running"},
			{"id": "op2", "status": "pending"},
		},
		"count": 2,
	}
	resp := gen.MonitoringPerformanceActive200JSONResponse(sampleData)
	rr := httptest.NewRecorder()
	if err := resp.VisitMonitoringPerformanceActiveResponse(rr); err != nil {
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
	if raw["count"] != float64(2) {
		t.Fatalf("expected direct count field got %+v", raw)
	}
}

// TestMonitoringCleanupStats_DirectPayload verifies monitoring cleanup stats returns direct object (no envelope)
func TestMonitoringCleanupStats_DirectPayload_Schema(t *testing.T) {
	sampleData := map[string]interface{}{
		"cleanedFiles": 25,
		"totalSize": "1.2GB",
		"lastCleanup": "2024-09-29T10:30:00Z",
	}
	resp := gen.MonitoringCleanupStats200JSONResponse(sampleData)
	rr := httptest.NewRecorder()
	if err := resp.VisitMonitoringCleanupStatsResponse(rr); err != nil {
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
	if raw["cleanedFiles"] != float64(25) {
		t.Fatalf("expected direct cleanedFiles field got %+v", raw)
	}
}

// TestKeywordSetsList_DirectArray verifies keyword sets list returns a direct array (no envelope)
func TestKeywordSetsList_DirectArray(t *testing.T) {
	sampleData := []gen.KeywordSetResponse{
		{
			Id:          uuid.MustParse("01020304-0506-0708-090a-0b0c0d0e0f10"),
			Name:        "Test Set 1",
			Description: nil,
			IsEnabled:   true,
			RuleCount:   3,
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		},
		{
			Id:          uuid.MustParse("02030405-0607-0809-0a0b-0c0d0e0f1011"),
			Name:        "Test Set 2",
			Description: nil,
			IsEnabled:   false,
			RuleCount:   0,
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		},
	}
	resp := gen.KeywordSetsList200JSONResponse(sampleData)
	rr := httptest.NewRecorder()
	if err := resp.VisitKeywordSetsListResponse(rr); err != nil {
		t.Fatalf("encode: %v", err)
	}
	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200 got %d", rr.Code)
	}
	var raw []map[string]any
	if err := json.Unmarshal(rr.Body.Bytes(), &raw); err != nil {
		t.Fatalf("json decode: %v", err)
	}
	if len(raw) != 2 {
		t.Fatalf("expected array of 2 items, got %d", len(raw))
	}
	// Check that individual items don't have envelope fields
	for i, item := range raw {
		if _, ok := item["success"]; ok {
			t.Fatalf("found legacy success key in item %d", i)
		}
		if _, ok := item["data"]; ok {
			t.Fatalf("found legacy data key in item %d", i)
		}
		if item["name"] == "" {
			t.Fatalf("expected direct name field in item %d got %+v", i, item)
		}
	}
}

// TestKeywordSetsCreate_DirectObject verifies keyword sets create returns direct object (no envelope)
func TestKeywordSetsCreate_DirectObject(t *testing.T) {
	sampleData := gen.KeywordSetResponse{
		Id:          uuid.MustParse("01020304-0506-0708-090a-0b0c0d0e0f10"),
		Name:        "New Test Set",
		Description: nil,
		IsEnabled:   true,
		RuleCount:   0,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}
	resp := gen.KeywordSetsCreate201JSONResponse(sampleData)
	rr := httptest.NewRecorder()
	if err := resp.VisitKeywordSetsCreateResponse(rr); err != nil {
		t.Fatalf("encode: %v", err)
	}
	if rr.Code != http.StatusCreated {
		t.Fatalf("expected 201 got %d", rr.Code)
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
	if raw["name"] != "New Test Set" {
		t.Fatalf("expected direct name field got %+v", raw)
	}
}

// TestErrorResponse_StillHasEnvelope verifies that error responses still use envelope structure
func TestErrorResponse_StillHasEnvelope(t *testing.T) {
	resp := gen.KeywordSetsList500JSONResponse{
		InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{
			Error: gen.ApiError{
				Message: "test error",
				Code:    gen.INTERNALSERVERERROR,
			},
			RequestId: "test-req-123",
			Success:   func() *bool { b := false; return &b }(),
		},
	}
	rr := httptest.NewRecorder()
	if err := resp.VisitKeywordSetsListResponse(rr); err != nil {
		t.Fatalf("encode: %v", err)
	}
	if rr.Code != http.StatusInternalServerError {
		t.Fatalf("expected 500 got %d", rr.Code)
	}
	var raw map[string]any
	if err := json.Unmarshal(rr.Body.Bytes(), &raw); err != nil {
		t.Fatalf("json decode: %v", err)
	}
	// Error responses should still have envelope structure
	if _, ok := raw["success"]; !ok {
		t.Fatalf("error response should still have success key")
	}
	if _, ok := raw["error"]; !ok {
		t.Fatalf("error response should have error key")
	}
	if _, ok := raw["requestId"]; !ok {
		t.Fatalf("error response should have requestId key")
	}
}