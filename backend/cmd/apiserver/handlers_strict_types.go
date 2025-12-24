package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
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
// It delegates to the analysis service ScoreBreakdownFull method and returns component scores.
func (h *strictHandlers) CampaignsDomainScoreBreakdown(ctx context.Context, r gen.CampaignsDomainScoreBreakdownRequestObject) (gen.CampaignsDomainScoreBreakdownResponseObject, error) {
	if h.deps == nil || h.deps.AnalysisSvc == nil || h.deps.Stores.Campaign == nil {
		return gen.CampaignsDomainScoreBreakdown500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "dependencies not initialized", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	if strings.TrimSpace(r.Domain) == "" {
		return gen.CampaignsDomainScoreBreakdown400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "domain required", Code: gen.BADREQUEST, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	// Ensure campaign exists (avoid leaking store errors)
	campaignID := uuid.UUID(r.CampaignId)
	if _, err := h.deps.Stores.Campaign.GetCampaignByID(ctx, h.deps.DB, campaignID); err != nil {
		return gen.CampaignsDomainScoreBreakdown404JSONResponse{NotFoundJSONResponse: gen.NotFoundJSONResponse{Error: gen.ApiError{Message: "campaign not found", Code: gen.NOTFOUND, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}

	// Call the analysis service for score breakdown
	result, err := h.deps.AnalysisSvc.ScoreBreakdownFull(ctx, campaignID, r.Domain)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return gen.CampaignsDomainScoreBreakdown404JSONResponse{NotFoundJSONResponse: gen.NotFoundJSONResponse{Error: gen.ApiError{Message: "domain not found or not yet analyzed", Code: gen.NOTFOUND, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
		}
		return gen.CampaignsDomainScoreBreakdown500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: err.Error(), Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}

	// Map to OpenAPI response shape
	finalScore := float32(result.Final)
	parkedPenalty := float32(result.ParkedPenaltyFactor)

	// Convert weights map to float32
	weightsF32 := make(map[string]float32, len(result.Weights))
	for k, v := range result.Weights {
		weightsF32[k] = float32(v)
	}

	resp := gen.CampaignsDomainScoreBreakdown200JSONResponse{
		CampaignId:          r.CampaignId,
		Domain:              r.Domain,
		Final:               finalScore,
		Weights:             &weightsF32,
		ParkedPenaltyFactor: &parkedPenalty,
	}
	resp.Components.Density = float32(result.Components["density"])
	resp.Components.Coverage = float32(result.Components["coverage"])
	resp.Components.NonParked = float32(result.Components["non_parked"])
	resp.Components.ContentLength = float32(result.Components["content_length"])
	resp.Components.TitleKeyword = float32(result.Components["title_keyword"])
	resp.Components.Freshness = float32(result.Components["freshness"])
	resp.Components.TfLite = float32(result.Components["tf_lite"])

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
