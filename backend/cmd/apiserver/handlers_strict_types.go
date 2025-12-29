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
// Returns structured state with graceful degradation - never returns 500 for missing data.
// P0-6: Refactored to return structured payload with state, components, and evidence.
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

	// Helper to build a component with state
	buildComponent := func(val float64, hasData bool) gen.ScoreComponent {
		if !hasData {
			reason := gen.ScoreComponentReason("field_missing")
			return gen.ScoreComponent{
				State:  gen.ScoreComponentState("unavailable"),
				Value:  nil,
				Reason: &reason,
			}
		}
		v := float32(val)
		return gen.ScoreComponent{
			State:  gen.ScoreComponentState("ok"),
			Value:  &v,
			Reason: nil,
		}
	}

	// Call orchestrator to get score breakdown from analysis service
	breakdown, err := h.deps.Orchestrator.ScoreBreakdown(ctx, campaignID, domain)
	if err != nil {
		// Check for domain not found (sql.ErrNoRows bubbles up as "no rows")
		if strings.Contains(err.Error(), "no rows") {
			// Return structured degraded state for domain not found
			reason := gen.DomainScoreBreakdownResponseReason("domain_not_found")
			unavailableReason := gen.ScoreComponentReason("field_missing")
			return gen.CampaignsDomainScoreBreakdown200JSONResponse{
				CampaignId:   r.CampaignId,
				Domain:       domain,
				State:        gen.DomainScoreBreakdownResponseState("degraded"),
				Reason:       &reason,
				OverallScore: nil,
				Components: struct {
					ContentLength gen.ScoreComponent `json:"contentLength"`
					Coverage      gen.ScoreComponent `json:"coverage"`
					Density       gen.ScoreComponent `json:"density"`
					Freshness     gen.ScoreComponent `json:"freshness"`
					NonParked     gen.ScoreComponent `json:"nonParked"`
					TfLite        gen.ScoreComponent `json:"tfLite"`
					TitleKeyword  gen.ScoreComponent `json:"titleKeyword"`
				}{
					Density:       gen.ScoreComponent{State: gen.ScoreComponentState("unavailable"), Reason: &unavailableReason},
					Coverage:      gen.ScoreComponent{State: gen.ScoreComponentState("unavailable"), Reason: &unavailableReason},
					NonParked:     gen.ScoreComponent{State: gen.ScoreComponentState("unavailable"), Reason: &unavailableReason},
					ContentLength: gen.ScoreComponent{State: gen.ScoreComponentState("unavailable"), Reason: &unavailableReason},
					TitleKeyword:  gen.ScoreComponent{State: gen.ScoreComponentState("unavailable"), Reason: &unavailableReason},
					Freshness:     gen.ScoreComponent{State: gen.ScoreComponentState("unavailable"), Reason: &unavailableReason},
					TfLite:        gen.ScoreComponent{State: gen.ScoreComponentState("unavailable"), Reason: &unavailableReason},
				},
				Evidence: nil,
			}, nil
		}

		// Log error for debugging but return graceful degraded response
		if h.deps.Logger != nil {
			h.deps.Logger.Warn(ctx, "score breakdown error", map[string]interface{}{
				"campaign_id": campaignID.String(),
				"domain":      domain,
				"error":       err.Error(),
			})
		}

		// Graceful degradation: return degraded state with explanation
		reason := gen.DomainScoreBreakdownResponseReason("internal_error")
		unavailableReason := gen.ScoreComponentReason("computation_failed")
		return gen.CampaignsDomainScoreBreakdown200JSONResponse{
			CampaignId:   r.CampaignId,
			Domain:       domain,
			State:        gen.DomainScoreBreakdownResponseState("degraded"),
			Reason:       &reason,
			OverallScore: nil,
			Components: struct {
				ContentLength gen.ScoreComponent `json:"contentLength"`
				Coverage      gen.ScoreComponent `json:"coverage"`
				Density       gen.ScoreComponent `json:"density"`
				Freshness     gen.ScoreComponent `json:"freshness"`
				NonParked     gen.ScoreComponent `json:"nonParked"`
				TfLite        gen.ScoreComponent `json:"tfLite"`
				TitleKeyword  gen.ScoreComponent `json:"titleKeyword"`
			}{
				Density:       gen.ScoreComponent{State: gen.ScoreComponentState("error"), Reason: &unavailableReason},
				Coverage:      gen.ScoreComponent{State: gen.ScoreComponentState("error"), Reason: &unavailableReason},
				NonParked:     gen.ScoreComponent{State: gen.ScoreComponentState("error"), Reason: &unavailableReason},
				ContentLength: gen.ScoreComponent{State: gen.ScoreComponentState("error"), Reason: &unavailableReason},
				TitleKeyword:  gen.ScoreComponent{State: gen.ScoreComponentState("error"), Reason: &unavailableReason},
				Freshness:     gen.ScoreComponent{State: gen.ScoreComponentState("error"), Reason: &unavailableReason},
				TfLite:        gen.ScoreComponent{State: gen.ScoreComponentState("error"), Reason: &unavailableReason},
			},
			Evidence: nil,
		}, nil
	}

	// Determine state based on component availability
	hasAllComponents := true
	for _, key := range []string{"density", "coverage", "non_parked", "content_length", "title_keyword", "freshness"} {
		if _, exists := breakdown[key]; !exists {
			hasAllComponents = false
			break
		}
	}

	state := gen.DomainScoreBreakdownResponseState("complete")
	var stateReason *gen.DomainScoreBreakdownResponseReason
	if !hasAllComponents {
		state = gen.DomainScoreBreakdownResponseState("partial")
		reason := gen.DomainScoreBreakdownResponseReason("feature_vector_missing")
		stateReason = &reason
	}

	// Build component scores - check if each one exists in breakdown
	componentExists := func(key string) bool {
		_, ok := breakdown[key]
		return ok
	}

	// Build response with structured components
	finalScore := float32(breakdown["final"] * 100.0) // Scale to 0-100
	resp := gen.CampaignsDomainScoreBreakdown200JSONResponse{
		CampaignId:   r.CampaignId,
		Domain:       domain,
		State:        state,
		Reason:       stateReason,
		OverallScore: &finalScore,
		Components: struct {
			ContentLength gen.ScoreComponent `json:"contentLength"`
			Coverage      gen.ScoreComponent `json:"coverage"`
			Density       gen.ScoreComponent `json:"density"`
			Freshness     gen.ScoreComponent `json:"freshness"`
			NonParked     gen.ScoreComponent `json:"nonParked"`
			TfLite        gen.ScoreComponent `json:"tfLite"`
			TitleKeyword  gen.ScoreComponent `json:"titleKeyword"`
		}{
			Density:       buildComponent(breakdown["density"], componentExists("density")),
			Coverage:      buildComponent(breakdown["coverage"], componentExists("coverage")),
			NonParked:     buildComponent(breakdown["non_parked"], componentExists("non_parked")),
			ContentLength: buildComponent(breakdown["content_length"], componentExists("content_length")),
			TitleKeyword:  buildComponent(breakdown["title_keyword"], componentExists("title_keyword")),
			Freshness:     buildComponent(breakdown["freshness"], componentExists("freshness")),
			TfLite:        buildComponent(breakdown["tf_lite"], componentExists("tf_lite")),
		},
	}

	// Include weights (from DefaultScoringWeights)
	weights := map[string]float32{
		"keyword_density_weight":         2.5,
		"unique_keyword_coverage_weight": 2.0,
		"non_parked_weight":              1.5,
		"content_length_quality_weight":  1.0,
		"title_keyword_weight":           1.5,
		"freshness_weight":               0.5,
	}
	resp.Weights = &weights

	// Build evidence section
	parkedPenaltyApplied := breakdown["non_parked"] < 1.0
	var parkedPenaltyFactor *float32
	if parkedPenaltyApplied {
		factor := float32(0.5)
		parkedPenaltyFactor = &factor
	}

	resp.Evidence = &struct {
		ContentLengthBytes   *int      `json:"contentLengthBytes"`
		FreshnessDaysOld     *int      `json:"freshnessDaysOld"`
		KeywordHits          *[]string `json:"keywordHits,omitempty"`
		ParkedPenaltyApplied *bool     `json:"parkedPenaltyApplied,omitempty"`
		ParkedPenaltyFactor  *float32  `json:"parkedPenaltyFactor"`
	}{
		ParkedPenaltyApplied: &parkedPenaltyApplied,
		ParkedPenaltyFactor:  parkedPenaltyFactor,
		// ContentLengthBytes and FreshnessDaysOld would come from domain data if available
		// KeywordHits would come from analysis results
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
