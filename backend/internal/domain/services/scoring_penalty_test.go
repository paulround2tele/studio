package services

import (
	"context"
	"encoding/json"
	"testing"
	"time"

	sqlmock "github.com/DATA-DOG/go-sqlmock"
	"github.com/google/uuid"
)

// Test that parked penalty factor (when <1) reduces relevance score for parked domains with low confidence.
func TestScoreDomains_ParkedPenaltyApplied(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock new: %v", err)
	}
	defer db.Close()

	campaignID := uuid.New()

	// Mock weights lookup query (campaign_scoring_profile join)
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
	mock.ExpectQuery(`SELECT sp.weights, sp.parked_penalty_factor FROM campaign_scoring_profile`).
		WithArgs(campaignID).WillReturnRows(sqlmock.NewRows([]string{"weights", "parked_penalty_factor"}).
		AddRow(wraw, penalty))

	// Count query
	mock.ExpectQuery(`SELECT COUNT\(\*\) FROM generated_domains`).
		WithArgs(campaignID).WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(1))

	// Feature vector row - parked domain with low confidence triggers penalty
	fv := map[string]interface{}{
		"kw_unique":         5.0, // coverage saturates
		"kw_hits_total":     15.0,
		"content_bytes":     10000.0,
		"title_has_keyword": true,
	}
	fvRaw, _ := json.Marshal(fv)
	now := time.Now().Add(-2 * time.Hour) // freshness full 1
	mock.ExpectQuery(`SELECT domain_name, feature_vector, last_http_fetched_at, is_parked, parked_confidence FROM generated_domains`).
		WithArgs(campaignID).WillReturnRows(sqlmock.NewRows([]string{"domain_name", "feature_vector", "last_http_fetched_at", "is_parked", "parked_confidence"}).
		AddRow("example.com", fvRaw, now, true, 0.5))

	// Bulk update expectation
	mock.ExpectExec(`WITH incoming`).
		WillReturnResult(sqlmock.NewResult(0, 1))

	svc := &analysisService{deps: Dependencies{DB: db}}
	corr, err := svc.scoreDomains(context.Background(), campaignID)
	if err != nil {
		t.Fatalf("scoreDomains error: %v", err)
	}
	if corr == "" {
		t.Errorf("expected correlation id")
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet expectations: %v", err)
	}
}
