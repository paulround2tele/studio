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

func TestScoreBreakdown_WithTFLite(t *testing.T) {
	os.Setenv("ENABLE_TF_LITE", "1")
	defer os.Unsetenv("ENABLE_TF_LITE")
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock: %v", err)
	}
	defer db.Close()
	campaignID := uuid.New()
	weights := map[string]float64{
		"keyword_density_weight":         0.3,
		"unique_keyword_coverage_weight": 0.2,
		"non_parked_weight":              0.1,
		"content_length_quality_weight":  0.1,
		"title_keyword_weight":           0.1,
		"freshness_weight":               0.1,
		"tf_lite_weight":                 0.1,
	}
	wraw, _ := json.Marshal(weights)
	penalty := 0.5
	mock.ExpectQuery(`SELECT sp.weights, sp.parked_penalty_factor FROM campaign_scoring_profile`).
		WithArgs(campaignID).WillReturnRows(sqlmock.NewRows([]string{"weights", "parked_penalty_factor"}).AddRow(wraw, penalty))
	fv := map[string]interface{}{"kw_unique": 6.0, "kw_hits_total": 24.0, "content_bytes": 12000.0, "title_has_keyword": true}
	rawFV, _ := json.Marshal(fv)
	now := time.Now()
	mock.ExpectQuery(`SELECT feature_vector, last_http_fetched_at, is_parked, parked_confidence FROM generated_domains`).
		WithArgs(campaignID, "test.com").WillReturnRows(sqlmock.NewRows([]string{"feature_vector", "last_http_fetched_at", "is_parked", "parked_confidence"}).AddRow(rawFV, now, false, nil))

	svc := &analysisService{deps: Dependencies{DB: db}}
	bd, err := svc.ScoreBreakdown(context.Background(), campaignID, "test.com")
	if err != nil {
		t.Fatalf("ScoreBreakdown error: %v", err)
	}
	if bd["tf_lite"] <= 0 {
		t.Fatalf("expected tf_lite >0, got %v", bd["tf_lite"])
	}
	if bd["final"] <= 0 {
		t.Fatalf("expected final >0")
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet expectations: %v", err)
	}
}
