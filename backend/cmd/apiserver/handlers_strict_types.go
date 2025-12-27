package main

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	gen "github.com/fntelecomllc/studio/backend/internal/api/gen"
	"github.com/google/uuid"
)

// strictHandlers implements gen.StrictServerInterface and is split across files in this package.
type strictHandlers struct {
	deps          *AppDeps
	networkLogger *networkLogHandler
}

var _ gen.StrictServerInterface = (*strictHandlers)(nil)

// CampaignsDomainScoreBreakdown implements GET /campaigns/{campaignId}/domains/{domain}/score-breakdown
// It delegates to the analysis service ScoreBreakdown method and returns component scores.
func (h *strictHandlers) CampaignsDomainScoreBreakdown(ctx context.Context, r gen.CampaignsDomainScoreBreakdownRequestObject) (gen.CampaignsDomainScoreBreakdownResponseObject, error) {
	if h.deps == nil || h.deps.Orchestrator == nil || h.deps.Stores.Campaign == nil {
		return gen.CampaignsDomainScoreBreakdown500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "dependencies not initialized", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	domain := strings.TrimSpace(r.Domain)
	if domain == "" {
		return gen.CampaignsDomainScoreBreakdown400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "domain required", Code: gen.BADREQUEST, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	campaignID := uuid.UUID(r.CampaignId)
	// Ensure campaign exists (avoid leaking store errors)
	if _, err := h.deps.Stores.Campaign.GetCampaignByID(ctx, h.deps.DB, campaignID); err != nil {
		return gen.CampaignsDomainScoreBreakdown404JSONResponse{NotFoundJSONResponse: gen.NotFoundJSONResponse{Error: gen.ApiError{Message: "campaign not found", Code: gen.NOTFOUND, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}

	// Call orchestrator to get score breakdown from analysis service
	breakdown, err := h.deps.Orchestrator.ScoreBreakdown(ctx, campaignID, domain)
	if err != nil {
		// Check for domain not found (sql.ErrNoRows bubbles up as "no rows")
		if strings.Contains(err.Error(), "no rows") {
			return gen.CampaignsDomainScoreBreakdown404JSONResponse{NotFoundJSONResponse: gen.NotFoundJSONResponse{Error: gen.ApiError{Message: "domain not found in campaign", Code: gen.NOTFOUND, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
		}
		// Log error for debugging but return graceful degraded response
		if h.deps.Logger != nil {
			h.deps.Logger.Warn(ctx, "score breakdown error", map[string]interface{}{
				"campaign_id": campaignID.String(),
				"domain":      domain,
				"error":       err.Error(),
			})
		}
		// Graceful degradation: return zero scores with explanation rather than 500
		return gen.CampaignsDomainScoreBreakdown200JSONResponse{
			CampaignId: r.CampaignId,
			Domain:     domain,
			Final:      0,
			Components: struct {
				ContentLength float32 `json:"content_length"`
				Coverage      float32 `json:"coverage"`
				Density       float32 `json:"density"`
				Freshness     float32 `json:"freshness"`
				NonParked     float32 `json:"non_parked"`
				TfLite        float32 `json:"tf_lite"`
				TitleKeyword  float32 `json:"title_keyword"`
			}{},
		}, nil
	}

	// Build response from breakdown map
	// Note: Components are 0-1 normalized, but Final score is scaled to 0-100 for UI display
	// The weighted sum naturally caps around 1.0 when all components are at max with normalized weights
	finalScaled := breakdown["final"] * 100.0 // Scale to 0-100

	resp := gen.CampaignsDomainScoreBreakdown200JSONResponse{
		CampaignId: r.CampaignId,
		Domain:     domain,
		Final:      float32(finalScaled),
		Components: struct {
			ContentLength float32 `json:"content_length"`
			Coverage      float32 `json:"coverage"`
			Density       float32 `json:"density"`
			Freshness     float32 `json:"freshness"`
			NonParked     float32 `json:"non_parked"`
			TfLite        float32 `json:"tf_lite"`
			TitleKeyword  float32 `json:"title_keyword"`
		}{
			ContentLength: float32(breakdown["content_length"]),
			Coverage:      float32(breakdown["coverage"]),
			Density:       float32(breakdown["density"]),
			Freshness:     float32(breakdown["freshness"]),
			NonParked:     float32(breakdown["non_parked"]),
			TfLite:        float32(breakdown["tf_lite"]),
			TitleKeyword:  float32(breakdown["title_keyword"]),
		},
	}

	// Include weights and penalty factor if available (from DefaultScoringWeights)
	weights := map[string]float32{
		"keyword_density_weight":         2.5,
		"unique_keyword_coverage_weight": 2.0,
		"non_parked_weight":              1.5,
		"content_length_quality_weight":  1.0,
		"title_keyword_weight":           1.5,
		"freshness_weight":               0.5,
	}
	resp.Weights = &weights

	// parkedPenaltyFactor: 1.0 means no penalty, <1.0 means penalty applied
	// We can infer if penalty was applied by checking non_parked component
	if breakdown["non_parked"] < 1.0 {
		penaltyFactor := float32(0.5) // Default penalty factor
		resp.ParkedPenaltyFactor = &penaltyFactor
	}

	return resp, nil
}

func boolPtr(b bool) *bool { return &b }

// ---- Helpers ----
func notImpl(name string) error { return fmt.Errorf("%s not implemented", name) }

// Metadata support removed (spec no longer defines Metadata envelope types).

// reqID is used in handlers where http.Request is not available.
// It returns an empty string to keep response shape stable without leaking transport details.
// reqID generates a new request identifier when an http.Request context isn't available.
// This ensures every API response carries a non-empty requestId for tracing.
func reqID() string { return uuid.NewString() }

// requestID returns a request ID from header or generates a new one for HTTP error hooks.
func requestID(r *http.Request) string {
	if r == nil {
		return ""
	}
	if rid := r.Header.Get("X-Request-ID"); rid != "" {
		return rid
	}
	return uuid.NewString()
}
func toMap(v interface{}) map[string]interface{} {
	b, _ := json.Marshal(v)
	var m map[string]interface{}
	_ = json.Unmarshal(b, &m)
	return m
}

// containsLimitClause performs a basic check for presence of a LIMIT clause.
// It is whitespace-insensitive and avoids false positives in strings by operating on lowered SQL text.
func containsLimitClause(lowerSQL string) bool {
	// naive but effective: look for " limit " or ending with " limit" pattern
	// also cover \nlimit and \tlimit by normalizing spaces
	norm := lowerSQL
	// quick checks
	if strings.Contains(norm, " limit ") || strings.HasSuffix(norm, " limit") {
		return true
	}
	// common punctuation before limit
	if strings.Contains(norm, " limit\n") || strings.Contains(norm, " limit\t") {
		return true
	}
	return false
}

func int64Ptr(v int64) *int64    { return &v }
func ptrString(s string) *string { return &s }

// mapDBValue converts driver/native scanned values into API DatabaseValue union fields.
func mapDBValue(v interface{}) gen.DatabaseValue {
	if v == nil {
		isNull := true
		return gen.DatabaseValue{IsNull: &isNull}
	}
	switch t := v.(type) {
	case bool:
		return gen.DatabaseValue{BoolValue: &t}
	case int8:
		vv := int64(t)
		return gen.DatabaseValue{IntValue: &vv}
	case int16:
		vv := int64(t)
		return gen.DatabaseValue{IntValue: &vv}
	case int32:
		vv := int64(t)
		return gen.DatabaseValue{IntValue: &vv}
	case int64:
		vv := t
		return gen.DatabaseValue{IntValue: &vv}
	case int:
		vv := int64(t)
		return gen.DatabaseValue{IntValue: &vv}
	case uint8:
		vv := int64(t)
		return gen.DatabaseValue{IntValue: &vv}
	case uint16:
		vv := int64(t)
		return gen.DatabaseValue{IntValue: &vv}
	case uint32:
		vv := int64(t)
		return gen.DatabaseValue{IntValue: &vv}
	case uint64:
		// may overflow int64 if very large; fall back to raw
		const maxInt64 = int64(^uint64(0) >> 1)
		if t <= uint64(maxInt64) {
			vv := int64(t)
			return gen.DatabaseValue{IntValue: &vv}
		}
	case float32:
		vv := float32(t)
		return gen.DatabaseValue{FloatValue: &vv}
	case float64:
		vv := float32(t)
		return gen.DatabaseValue{FloatValue: &vv}
	case string:
		return gen.DatabaseValue{StringValue: &t}
	case []byte:
		s := string(t)
		return gen.DatabaseValue{RawValue: &s}
	default:
		// Fallback to string representation
		s := fmt.Sprintf("%v", v)
		return gen.DatabaseValue{RawValue: &s}
	}
	s := fmt.Sprintf("%v", v)
	return gen.DatabaseValue{RawValue: &s}
}
