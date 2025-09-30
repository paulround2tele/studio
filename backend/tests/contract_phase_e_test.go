package tests

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	gen "github.com/fntelecomllc/studio/backend/internal/api/gen"
	"github.com/google/uuid"
	openapi_types "github.com/oapi-codegen/runtime/types"
)

// TestPhaseE_Simple is a simple test to verify the test file is working
func TestPhaseE_Simple(t *testing.T) {
	if 1+1 != 2 {
		t.Fatalf("math is broken")
	}
}

// Proxy endpoints tests

// TestProxiesList_DirectArray verifies proxies list returns a direct array (no envelope)
func TestProxiesList_DirectArray(t *testing.T) {
	sampleData := []gen.ProxyDetailsResponse{
		{
			Host:     stringPtr("proxy1.example.com"),
			Port:     intPtr(8080),
			Protocol: stringPtr("http"),
			Username: stringPtr("user1"),
		},
		{
			Host:     stringPtr("proxy2.example.com"), 
			Port:     intPtr(8443),
			Protocol: stringPtr("https"),
			Username: stringPtr("user2"),
		},
	}
	resp := gen.ProxiesList200JSONResponse(sampleData)
	rr := httptest.NewRecorder()
	if err := resp.VisitProxiesListResponse(rr); err != nil {
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
		if item["host"] == "" {
			t.Fatalf("expected direct host field in item %d got %+v", i, item)
		}
	}
}

// TestProxiesCreate_DirectObject verifies proxies create returns direct object (no envelope)
func TestProxiesCreate_DirectObject(t *testing.T) {
	sampleData := gen.ProxyDetailsResponse{
		Host:     stringPtr("proxy.example.com"),
		Port:     intPtr(8080),
		Protocol: stringPtr("http"),
		Username: stringPtr("testuser"),
	}
	resp := gen.ProxiesCreate201JSONResponse(sampleData)
	rr := httptest.NewRecorder()
	if err := resp.VisitProxiesCreateResponse(rr); err != nil {
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
	if raw["host"] != "proxy.example.com" {
		t.Fatalf("expected direct host field got %+v", raw)
	}
}

// TestProxiesTest_DirectObject verifies proxy test returns direct object (no envelope)
func TestProxiesTest_DirectObject(t *testing.T) {
	pid := openapi_types.UUID(uuid.New())
	sampleData := gen.ProxyTestResponse{
		ProxyId:      &pid,
		Success:      boolPtr(true),
		StatusCode:   intPtr(200),
		ResponseTime: int64Ptr(150),
	}
	resp := gen.ProxiesTest200JSONResponse(sampleData)
	rr := httptest.NewRecorder()
	if err := resp.VisitProxiesTestResponse(rr); err != nil {
		t.Fatalf("encode: %v", err)
	}
	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200 got %d", rr.Code)
	}
	var raw map[string]any
	if err := json.Unmarshal(rr.Body.Bytes(), &raw); err != nil {
		t.Fatalf("json decode: %v", err)
	}
	// For ProxyTestResponse, "success" is a valid field, so we check for absence of envelope structure differently
	// We check that there's no "data" field and that the response has the expected direct fields
	if _, ok := raw["data"]; ok {
		t.Fatalf("found legacy data key - response should be direct, not wrapped in data envelope")
	}
	if _, ok := raw["requestId"]; ok {
		t.Fatalf("found legacy requestId key - response should be direct, not wrapped in envelope")
	}
	if _, ok := raw["metadata"]; ok {
		t.Fatalf("found legacy metadata key - response should be direct, not wrapped in envelope")
	}
	if raw["statusCode"] != float64(200) {
		t.Fatalf("expected direct statusCode field got %+v", raw)
	}
}

// TestProxiesUpdate_DirectObject verifies proxy update returns direct object (no envelope)
func TestProxiesUpdate_DirectObject(t *testing.T) {
	sampleData := gen.ProxyDetailsResponse{
		Host:     stringPtr("updated-proxy.example.com"),
		Port:     intPtr(9000),
		Protocol: stringPtr("https"),
		Username: stringPtr("updateduser"),
	}
	resp := gen.ProxiesUpdate200JSONResponse(sampleData)
	rr := httptest.NewRecorder()
	if err := resp.VisitProxiesUpdateResponse(rr); err != nil {
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
	if raw["host"] != "updated-proxy.example.com" {
		t.Fatalf("expected direct host field got %+v", raw)
	}
}

// TestProxiesDelete_NoContent verifies proxy delete returns 204 No Content
func TestProxiesDelete_NoContent(t *testing.T) {
	resp := gen.ProxiesDelete204Response{}
	rr := httptest.NewRecorder()
	if err := resp.VisitProxiesDeleteResponse(rr); err != nil {
		t.Fatalf("encode: %v", err)
	}
	if rr.Code != http.StatusNoContent {
		t.Fatalf("expected 204 got %d", rr.Code)
	}
	if rr.Body.Len() != 0 {
		t.Fatalf("expected empty body for 204, got %s", rr.Body.String())
	}
}

// TestProxiesStatus_DirectArray verifies proxy status returns direct array (no envelope)
func TestProxiesStatus_DirectArray(t *testing.T) {
	sampleData := []gen.ProxyStatusResponse{
		// Mock data structure - actual structure depends on ProxyStatusResponse schema
	}
	resp := gen.ProxiesStatus200JSONResponse(sampleData)
	rr := httptest.NewRecorder()
	if err := resp.VisitProxiesStatusResponse(rr); err != nil {
		t.Fatalf("encode: %v", err)
	}
	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200 got %d", rr.Code)
	}
	var raw []map[string]any
	if err := json.Unmarshal(rr.Body.Bytes(), &raw); err != nil {
		t.Fatalf("json decode: %v", err)
	}
	// Check that individual items don't have envelope fields
	for i, item := range raw {
		if _, ok := item["success"]; ok {
			t.Fatalf("found legacy success key in item %d", i)
		}
		if _, ok := item["data"]; ok {
			t.Fatalf("found legacy data key in item %d", i)
		}
	}
}

// TestProxiesBulkTest_DirectObject verifies bulk proxy test returns direct object (no envelope)
func TestProxiesBulkTest_DirectObject(t *testing.T) {
	pid1 := openapi_types.UUID(uuid.New())
	pid2 := openapi_types.UUID(uuid.New())
	results := []gen.ProxyTestResponse{
		{
			ProxyId:      &pid1,
			Success:      boolPtr(true),
			StatusCode:   intPtr(200),
			ResponseTime: int64Ptr(100),
		},
		{
			ProxyId:      &pid2,
			Success:      boolPtr(false),
			StatusCode:   intPtr(500),
			ResponseTime: int64Ptr(0),
		},
	}
	sampleData := gen.BulkProxyTestResponse{Results: &results}
	resp := gen.ProxiesBulkTest200JSONResponse(sampleData)
	rr := httptest.NewRecorder()
	if err := resp.VisitProxiesBulkTestResponse(rr); err != nil {
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
	if _, ok := raw["results"]; !ok {
		t.Fatalf("expected direct results field got %+v", raw)
	}
}

// Persona endpoints tests

// TestPersonasList_DirectArray verifies personas list returns a direct array (no envelope)
func TestPersonasList_DirectArray(t *testing.T) {
	sampleData := []gen.PersonaResponse{
		{
			Id:          uuid.New(),
			Name:        "Test DNS Persona",
			PersonaType: "dns",
			IsEnabled:   true,
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		},
		{
			Id:          uuid.New(),
			Name:        "Test HTTP Persona",
			PersonaType: "http",
			IsEnabled:   false,
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		},
	}
	resp := gen.PersonasList200JSONResponse(sampleData)
	rr := httptest.NewRecorder()
	if err := resp.VisitPersonasListResponse(rr); err != nil {
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

// TestPersonasCreate_DirectObject verifies persona create returns direct object (no envelope)
func TestPersonasCreate_DirectObject(t *testing.T) {
	sampleData := gen.PersonaResponse{
		Id:          uuid.New(),
		Name:        "New Test Persona",
		PersonaType: "dns",
		IsEnabled:   true,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}
	resp := gen.PersonasCreate201JSONResponse(sampleData)
	rr := httptest.NewRecorder()
	if err := resp.VisitPersonasCreateResponse(rr); err != nil {
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
	if raw["name"] != "New Test Persona" {
		t.Fatalf("expected direct name field got %+v", raw)
	}
}

// TestPersonasGet_DirectObject verifies persona get returns direct object (no envelope)
func TestPersonasGet_DirectObject(t *testing.T) {
	sampleData := gen.PersonaResponse{
		Id:          uuid.New(),
		Name:        "Retrieved Persona",
		PersonaType: "http",
		IsEnabled:   true,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}
	resp := gen.PersonasGet200JSONResponse(sampleData)
	rr := httptest.NewRecorder()
	if err := resp.VisitPersonasGetResponse(rr); err != nil {
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
	if raw["name"] != "Retrieved Persona" {
		t.Fatalf("expected direct name field got %+v", raw)
	}
}

// TestPersonasTest_DirectObject verifies persona test returns direct object (no envelope)
func TestPersonasTest_DirectObject(t *testing.T) {
	pid := uuid.New().String()
	now := time.Now().UTC().Format(time.RFC3339)
	sampleData := gen.PersonaTestResponse{
		Message:     stringPtr("Test completed successfully"),
		PersonaId:   &pid,
		PersonaName: stringPtr("Test Persona"),
		PersonaType: stringPtr("dns"),
		Success:     boolPtr(true),
		TestPassed:  boolPtr(true),
		Timestamp:   &now,
	}
	resp := gen.PersonasTest200JSONResponse(sampleData)
	rr := httptest.NewRecorder()
	if err := resp.VisitPersonasTestResponse(rr); err != nil {
		t.Fatalf("encode: %v", err)
	}
	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200 got %d", rr.Code)
	}
	var raw map[string]any
	if err := json.Unmarshal(rr.Body.Bytes(), &raw); err != nil {
		t.Fatalf("json decode: %v", err)
	}
	// For PersonaTestResponse, "success" is a valid field, so we check for absence of envelope structure differently
	// We check that there's no "data" field and that the response has the expected direct fields
	if _, ok := raw["data"]; ok {
		t.Fatalf("found legacy data key - response should be direct, not wrapped in data envelope")
	}
	if _, ok := raw["requestId"]; ok {
		t.Fatalf("found legacy requestId key - response should be direct, not wrapped in envelope")
	}
	if _, ok := raw["metadata"]; ok {
		t.Fatalf("found legacy metadata key - response should be direct, not wrapped in envelope")
	}
	if raw["message"] != "Test completed successfully" {
		t.Fatalf("expected direct message field got %+v", raw)
	}
}

// TestPersonasUpdate_DirectObject verifies persona update returns direct object (no envelope)
func TestPersonasUpdate_DirectObject(t *testing.T) {
	sampleData := gen.PersonaResponse{
		Id:          uuid.New(),
		Name:        "Updated Persona",
		PersonaType: "http",
		IsEnabled:   false,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}
	resp := gen.PersonasUpdate200JSONResponse(sampleData)
	rr := httptest.NewRecorder()
	if err := resp.VisitPersonasUpdateResponse(rr); err != nil {
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
	if raw["name"] != "Updated Persona" {
		t.Fatalf("expected direct name field got %+v", raw)
	}
}

// TestPersonasDelete_NoContent verifies persona delete returns 204 No Content
func TestPersonasDelete_NoContent(t *testing.T) {
	resp := gen.PersonasDelete204Response{}
	rr := httptest.NewRecorder()
	if err := resp.VisitPersonasDeleteResponse(rr); err != nil {
		t.Fatalf("encode: %v", err)
	}
	if rr.Code != http.StatusNoContent {
		t.Fatalf("expected 204 got %d", rr.Code)
	}
	if rr.Body.Len() != 0 {
		t.Fatalf("expected empty body for 204, got %s", rr.Body.String())
	}
}

// Helper functions
func stringPtr(s string) *string { return &s }
func intPtr(i int) *int         { return &i }
func int64Ptr(i int64) *int64   { return &i }
func boolPtr(b bool) *bool      { return &b }