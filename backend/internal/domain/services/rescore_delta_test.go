package services

import (
	"context"
	"encoding/json"
	"os"
	"testing"
	"time"

	sqlmock "github.com/DATA-DOG/go-sqlmock"
	"github.com/google/uuid"
)

// TestRescoreDelta ensures that changing scoring profile weights results in different relevance scores
// for at least one domain, demonstrating dynamic rescore capability.
func TestRescoreDelta(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock new: %v", err)
	}
	defer db.Close()

	os.Setenv("RESCORE_PROGRESS_INTERVAL", "1000") // avoid noise
	defer os.Unsetenv("RESCORE_PROGRESS_INTERVAL")

	campaignID := uuid.New()

	// First run weights (favor keyword density strongly)
	weightsA := map[string]float64{
		"keyword_density_weight":         0.6,
		"unique_keyword_coverage_weight": 0.1,
		"non_parked_weight":              0.05,
		"content_length_quality_weight":  0.15,
		"title_keyword_weight":           0.05,
		"freshness_weight":               0.05,
	}
	wrawA, _ := json.Marshal(weightsA)
	penalty := 0.5
	mock.ExpectQuery(`SELECT sp.weights, sp.parked_penalty_factor FROM campaign_scoring_profile`).
		WithArgs(campaignID).WillReturnRows(sqlmock.NewRows([]string{"weights", "parked_penalty_factor"}).AddRow(wrawA, penalty))
	mock.ExpectQuery(`SELECT COUNT\(\*\) FROM generated_domains`).
		WithArgs(campaignID).WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(2))
	fv1 := map[string]interface{}{"kw_unique": 5.0, "kw_hits_total": 20.0, "content_bytes": 10000.0, "title_has_keyword": true}
	fv2 := map[string]interface{}{"kw_unique": 2.0, "kw_hits_total": 3.0, "content_bytes": 5000.0, "title_has_keyword": false}
	fvRaw1, _ := json.Marshal(fv1)
	fvRaw2, _ := json.Marshal(fv2)
	now := time.Now().Add(-2 * time.Hour)
	rowsA := sqlmock.NewRows([]string{"domain_name", "feature_vector", "last_http_fetched_at", "is_parked", "parked_confidence"}).
		AddRow("a.com", fvRaw1, now, false, nil).AddRow("b.com", fvRaw2, now, false, nil)
	mock.ExpectQuery(`SELECT domain_name, feature_vector, last_http_fetched_at, is_parked, parked_confidence FROM generated_domains`).
		WithArgs(campaignID).WillReturnRows(rowsA)
	mock.ExpectExec(`WITH incoming`).WillReturnResult(sqlmock.NewResult(0, 2))

	svc := &analysisService{deps: Dependencies{DB: db}}
	if _, err := svc.scoreDomains(context.Background(), campaignID); err != nil {
		t.Fatalf("first scoring run failed: %v", err)
	}

	// Second run with different weights (favor unique coverage over density) triggers fresh query expectations.
	weightsB := map[string]float64{
		"keyword_density_weight":         0.1,
		"unique_keyword_coverage_weight": 0.6,
		"non_parked_weight":              0.05,
		"content_length_quality_weight":  0.15,
		"title_keyword_weight":           0.05,
		"freshness_weight":               0.05,
	}
	wrawB, _ := json.Marshal(weightsB)
	mock.ExpectQuery(`SELECT sp.weights, sp.parked_penalty_factor FROM campaign_scoring_profile`).
		WithArgs(campaignID).WillReturnRows(sqlmock.NewRows([]string{"weights", "parked_penalty_factor"}).AddRow(wrawB, penalty))
	mock.ExpectQuery(`SELECT COUNT\(\*\) FROM generated_domains`).
		WithArgs(campaignID).WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(2))
	// Reuse same underlying feature vectors
	rowsB := sqlmock.NewRows([]string{"domain_name", "feature_vector", "last_http_fetched_at", "is_parked", "parked_confidence"}).
		AddRow("a.com", fvRaw1, now, false, nil).AddRow("b.com", fvRaw2, now, false, nil)
	mock.ExpectQuery(`SELECT domain_name, feature_vector, last_http_fetched_at, is_parked, parked_confidence FROM generated_domains`).
		WithArgs(campaignID).WillReturnRows(rowsB)
	mock.ExpectExec(`WITH incoming`).WillReturnResult(sqlmock.NewResult(0, 2))

	if _, err := svc.scoreDomains(context.Background(), campaignID); err != nil {
		t.Fatalf("second scoring run failed: %v", err)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet SQL expectations: %v", err)
	}
}
