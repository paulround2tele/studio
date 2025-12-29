package services

import (
	"database/sql"
	"encoding/json"
	"testing"

	"github.com/fntelecomllc/studio/backend/internal/models"
)

// P0-3: Tests for deterministic rejection_reason mapping in evaluateCandidate

func TestRejectionReason_HTTPTimeout(t *testing.T) {
	svc := &enrichmentService{}
	cfg := defaultEnrichmentConfig()

	candidate := enrichmentCandidate{
		HTTPStatus: models.DomainHTTPStatusTimeout,
	}

	result := svc.evaluateCandidate(cfg, candidate)
	if result.status != models.DomainLeadStatusTimeout {
		t.Errorf("expected timeout status, got %s", result.status)
	}
	if result.rejectionReason != models.DomainRejectionReasonHTTPTimeout {
		t.Errorf("expected http_timeout rejection reason, got %s", result.rejectionReason)
	}
}

func TestRejectionReason_HTTPError(t *testing.T) {
	svc := &enrichmentService{}
	cfg := defaultEnrichmentConfig()

	candidate := enrichmentCandidate{
		HTTPStatus: models.DomainHTTPStatusError,
	}

	result := svc.evaluateCandidate(cfg, candidate)
	if result.status != models.DomainLeadStatusError {
		t.Errorf("expected error status, got %s", result.status)
	}
	if result.rejectionReason != models.DomainRejectionReasonHTTPError {
		t.Errorf("expected http_error rejection reason, got %s", result.rejectionReason)
	}
}

func TestRejectionReason_Pending(t *testing.T) {
	svc := &enrichmentService{}
	cfg := defaultEnrichmentConfig()

	candidate := enrichmentCandidate{
		HTTPStatus: models.DomainHTTPStatusPending,
	}

	result := svc.evaluateCandidate(cfg, candidate)
	if result.status != models.DomainLeadStatusPending {
		t.Errorf("expected pending status, got %s", result.status)
	}
	if result.rejectionReason != models.DomainRejectionReasonPending {
		t.Errorf("expected pending rejection reason, got %s", result.rejectionReason)
	}
}

func TestRejectionReason_Parked(t *testing.T) {
	svc := &enrichmentService{}
	cfg := defaultEnrichmentConfig()

	candidate := enrichmentCandidate{
		HTTPStatus: models.DomainHTTPStatusOK,
		IsParked: sql.NullBool{
			Bool:  true,
			Valid: true,
		},
	}

	result := svc.evaluateCandidate(cfg, candidate)
	if result.status != models.DomainLeadStatusNoMatch {
		t.Errorf("expected no_match status, got %s", result.status)
	}
	if result.rejectionReason != models.DomainRejectionReasonParked {
		t.Errorf("expected parked rejection reason, got %s", result.rejectionReason)
	}
}

func TestRejectionReason_NoStructuralSignals(t *testing.T) {
	svc := &enrichmentService{}
	cfg := defaultEnrichmentConfig()

	fv := map[string]interface{}{
		"has_structural_signals": false,
		"content_bytes":          4096,
	}
	raw, _ := json.Marshal(fv)
	candidate := enrichmentCandidate{
		HTTPStatus: models.DomainHTTPStatusOK,
		DomainScore: sql.NullFloat64{
			Float64: 0.35,
			Valid:   true,
		},
		FeatureVector: models.NullJSONRaw{
			Raw:   raw,
			Valid: true,
		},
	}

	result := svc.evaluateCandidate(cfg, candidate)
	if result.status != models.DomainLeadStatusNoMatch {
		t.Errorf("expected no_match status, got %s", result.status)
	}
	if result.rejectionReason != models.DomainRejectionReasonNoKeywords {
		t.Errorf("expected no_keywords rejection reason, got %s", result.rejectionReason)
	}
}

func TestRejectionReason_NoKeywordHits(t *testing.T) {
	svc := &enrichmentService{}
	cfg := defaultEnrichmentConfig()

	fv := map[string]interface{}{
		"has_structural_signals": true,
		"kw_unique":              0,
		"kw_hits_total":          0,
		"content_bytes":          4096,
	}
	raw, _ := json.Marshal(fv)
	candidate := enrichmentCandidate{
		HTTPStatus: models.DomainHTTPStatusOK,
		DomainScore: sql.NullFloat64{
			Float64: 0.35,
			Valid:   true,
		},
		FeatureVector: models.NullJSONRaw{
			Raw:   raw,
			Valid: true,
		},
	}

	result := svc.evaluateCandidate(cfg, candidate)
	if result.status != models.DomainLeadStatusNoMatch {
		t.Errorf("expected no_match status, got %s", result.status)
	}
	if result.rejectionReason != models.DomainRejectionReasonNoKeywords {
		t.Errorf("expected no_keywords rejection reason, got %s", result.rejectionReason)
	}
}

func TestRejectionReason_NoScore(t *testing.T) {
	svc := &enrichmentService{}
	cfg := defaultEnrichmentConfig()

	fv := map[string]interface{}{
		"has_structural_signals": true,
		"kw_unique":              2,
		"kw_hits_total":          4,
		"content_bytes":          4096,
	}
	raw, _ := json.Marshal(fv)
	candidate := enrichmentCandidate{
		HTTPStatus: models.DomainHTTPStatusOK,
		DomainScore: sql.NullFloat64{
			Valid: false, // No score
		},
		FeatureVector: models.NullJSONRaw{
			Raw:   raw,
			Valid: true,
		},
	}

	result := svc.evaluateCandidate(cfg, candidate)
	if result.status != models.DomainLeadStatusNoMatch {
		t.Errorf("expected no_match status, got %s", result.status)
	}
	if result.rejectionReason != models.DomainRejectionReasonNoKeywords {
		t.Errorf("expected no_keywords rejection reason (for missing score), got %s", result.rejectionReason)
	}
}

func TestRejectionReason_LowScore(t *testing.T) {
	svc := &enrichmentService{}
	cfg := defaultEnrichmentConfig()

	fv := map[string]interface{}{
		"has_structural_signals": true,
		"kw_unique":              2,
		"kw_hits_total":          4,
		"content_bytes":          4096,
	}
	raw, _ := json.Marshal(fv)
	candidate := enrichmentCandidate{
		HTTPStatus: models.DomainHTTPStatusOK,
		DomainScore: sql.NullFloat64{
			Float64: 0.05, // Very low score (below grace threshold of 0.15)
			Valid:   true,
		},
		FeatureVector: models.NullJSONRaw{
			Raw:   raw,
			Valid: true,
		},
	}

	result := svc.evaluateCandidate(cfg, candidate)
	if result.status != models.DomainLeadStatusNoMatch {
		t.Errorf("expected no_match status, got %s", result.status)
	}
	if result.rejectionReason != models.DomainRejectionReasonLowScore {
		t.Errorf("expected low_score rejection reason, got %s", result.rejectionReason)
	}
}

func TestRejectionReason_QualifiedMatchThreshold(t *testing.T) {
	svc := &enrichmentService{}
	cfg := defaultEnrichmentConfig()

	fv := map[string]interface{}{
		"has_structural_signals": true,
		"kw_unique":              2,
		"kw_hits_total":          4,
		"content_bytes":          4096,
	}
	raw, _ := json.Marshal(fv)
	candidate := enrichmentCandidate{
		HTTPStatus: models.DomainHTTPStatusOK,
		DomainScore: sql.NullFloat64{
			Float64: 0.50, // Above match threshold (0.25)
			Valid:   true,
		},
		FeatureVector: models.NullJSONRaw{
			Raw:   raw,
			Valid: true,
		},
	}

	result := svc.evaluateCandidate(cfg, candidate)
	if result.status != models.DomainLeadStatusMatch {
		t.Errorf("expected match status, got %s", result.status)
	}
	if result.rejectionReason != models.DomainRejectionReasonQualified {
		t.Errorf("expected qualified rejection reason, got %s", result.rejectionReason)
	}
}

func TestRejectionReason_QualifiedGraceThreshold(t *testing.T) {
	svc := &enrichmentService{}
	cfg := defaultEnrichmentConfig()

	fv := map[string]interface{}{
		"has_structural_signals": true,
		"kw_unique":              2,
		"kw_hits_total":          4,
		"content_bytes":          4096, // Above min content bytes (1024)
	}
	raw, _ := json.Marshal(fv)
	candidate := enrichmentCandidate{
		HTTPStatus: models.DomainHTTPStatusOK,
		DomainScore: sql.NullFloat64{
			Float64: 0.24, // Between grace (0.24) and match (0.25) threshold
			Valid:   true,
		},
		FeatureVector: models.NullJSONRaw{
			Raw:   raw,
			Valid: true,
		},
	}

	result := svc.evaluateCandidate(cfg, candidate)
	if result.status != models.DomainLeadStatusMatch {
		t.Errorf("expected match status for grace threshold, got %s", result.status)
	}
	if result.rejectionReason != models.DomainRejectionReasonQualified {
		t.Errorf("expected qualified rejection reason, got %s", result.rejectionReason)
	}
}

func TestRejectionReason_ParkedByConfidence(t *testing.T) {
	svc := &enrichmentService{}
	cfg := defaultEnrichmentConfig()

	// Parked confidence above threshold triggers parked rejection
	candidate := enrichmentCandidate{
		HTTPStatus: models.DomainHTTPStatusOK,
		ParkedConfidence: sql.NullFloat64{
			Float64: 0.90, // Above default 0.75 threshold
			Valid:   true,
		},
		DomainScore: sql.NullFloat64{
			Float64: 0.50,
			Valid:   true,
		},
	}

	result := svc.evaluateCandidate(cfg, candidate)
	if result.status != models.DomainLeadStatusNoMatch {
		t.Errorf("expected no_match status for parked by confidence, got %s", result.status)
	}
	if result.rejectionReason != models.DomainRejectionReasonParked {
		t.Errorf("expected parked rejection reason, got %s", result.rejectionReason)
	}
}
