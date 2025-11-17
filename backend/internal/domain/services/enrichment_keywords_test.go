package services

import (
	"database/sql"
	"encoding/json"
	"testing"

	"github.com/fntelecomllc/studio/backend/internal/models"
)

func TestEvaluateCandidateDemotesWithoutKeywordHits(t *testing.T) {
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
		t.Fatalf("expected no_match, got %s", result.status)
	}
	if result.leadScore == nil || *result.leadScore != 0.35 {
		t.Fatalf("expected lead score pointer to 0.35, got %v", result.leadScore)
	}
}

func TestEvaluateCandidateAllowsKeywordHits(t *testing.T) {
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
			Float64: 0.35,
			Valid:   true,
		},
		FeatureVector: models.NullJSONRaw{
			Raw:   raw,
			Valid: true,
		},
	}

	result := svc.evaluateCandidate(cfg, candidate)
	if result.status != models.DomainLeadStatusMatch {
		t.Fatalf("expected match, got %s", result.status)
	}
}

func TestEvaluateCandidateSkipsKeywordGateWhenSignalsMissing(t *testing.T) {
	svc := &enrichmentService{}
	cfg := defaultEnrichmentConfig()

	fv := map[string]interface{}{
		"has_structural_signals": true,
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
	if result.status != models.DomainLeadStatusMatch {
		t.Fatalf("expected match, got %s", result.status)
	}
}
