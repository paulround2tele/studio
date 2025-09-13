package services

import (
	"context"
	"encoding/json"
	"regexp"
	"testing"
	"time"

	sqlmock "github.com/DATA-DOG/go-sqlmock"
	"github.com/google/uuid"
)

// Test that a parked domain with slightly stronger raw features is demoted below a non-parked domain
// once the parked_penalty_factor is applied (<0.9 confidence path) and that the rounded scores
// written in the bulk UPDATE reflect the penalty.
func TestScoreDomains_ParkedPenaltyOrdering(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock: %v", err)
	}
	defer db.Close()

	campaignID := uuid.New()
	weights := map[string]float64{
		"keyword_density_weight":         0.3,
		"unique_keyword_coverage_weight": 0.3,
		"non_parked_weight":              0.1,
		"content_length_quality_weight":  0.1,
		"title_keyword_weight":           0.1,
		"freshness_weight":               0.1,
	}
	wraw, _ := json.Marshal(weights)
	penalty := 0.5
	mock.ExpectQuery(regexp.QuoteMeta(`SELECT sp.weights, sp.parked_penalty_factor FROM campaign_scoring_profile csp JOIN scoring_profiles sp ON sp.id = csp.scoring_profile_id WHERE csp.campaign_id = $1`)).
		WithArgs(campaignID).WillReturnRows(sqlmock.NewRows([]string{"weights", "parked_penalty_factor"}).AddRow(wraw, penalty))

	// Pre-count
	mock.ExpectQuery(regexp.QuoteMeta(`SELECT COUNT(*) FROM generated_domains WHERE campaign_id = $1 AND feature_vector IS NOT NULL`)).
		WithArgs(campaignID).WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(2))

	// Feature vectors:
	// a.com (parked, low confidence) raw relevance before penalty ~0.6168 -> after penalty ~0.308 (rounded 0.308)
	// b.com (non-parked) relevance ~0.72133 -> 0.721 (rounded to 3 decimals).
	fvA := map[string]any{"kw_unique": 5.0, "kw_hits_total": 15.0, "content_bytes": 20000.0, "title_has_keyword": true}
	fvB := map[string]any{"kw_unique": 5.0, "kw_hits_total": 15.0, "content_bytes": 18000.0, "title_has_keyword": true}
	rawA, _ := json.Marshal(fvA)
	rawB, _ := json.Marshal(fvB)
	now := time.Now().Add(-1 * time.Hour)
	rows := sqlmock.NewRows([]string{"domain_name", "feature_vector", "last_http_fetched_at", "is_parked", "parked_confidence"}).
		AddRow("a.com", rawA, now, true, 0.5). // parked => penalty applies
		AddRow("b.com", rawB, now, false, nil)
	mock.ExpectQuery(regexp.QuoteMeta(`SELECT domain_name, feature_vector, last_http_fetched_at, is_parked, parked_confidence FROM generated_domains WHERE campaign_id = $1 AND feature_vector IS NOT NULL`)).
		WithArgs(campaignID).WillReturnRows(rows)

	// Expect bulk update. Args pattern: campaignID, a.com, 0.308, 0.308, b.com, 0.821, 0.821 (ordering preserved)
	mock.ExpectExec(regexp.QuoteMeta(`WITH incoming(domain_name,relevance_score,domain_score) AS (VALUES ($2,$3,$4),($5,$6,$7))
UPDATE generated_domains gd
SET relevance_score = incoming.relevance_score,
	domain_score = incoming.domain_score
FROM incoming
WHERE gd.campaign_id = $1 AND gd.domain_name = incoming.domain_name`)).
		WithArgs(campaignID, "a.com", 0.308, 0.308, "b.com", 0.721, 0.721).
		WillReturnResult(sqlmock.NewResult(0, 2))

	svc := &analysisService{deps: Dependencies{DB: db}}
	if _, err := svc.scoreDomains(context.Background(), campaignID); err != nil {
		t.Fatalf("scoreDomains: %v", err)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet expectations: %v", err)
	}
}
