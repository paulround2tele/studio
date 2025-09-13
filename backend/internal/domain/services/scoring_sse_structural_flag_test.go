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

// Ensures enabling ENABLE_SSE_STRUCTURAL_DETAILS does not issue extra feature_vector SELECTs (we rely on cached fields)
func TestScoreDomains_SSEStructuralDetails_NoExtraQueries(t *testing.T) {
	os.Setenv("RESCORE_PROGRESS_INTERVAL", "1000")
	os.Setenv("ENABLE_SSE_STRUCTURAL_DETAILS", "1")
	defer os.Unsetenv("RESCORE_PROGRESS_INTERVAL")
	defer os.Unsetenv("ENABLE_SSE_STRUCTURAL_DETAILS")

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
	mock.ExpectQuery(`SELECT sp.weights, sp.parked_penalty_factor FROM campaign_scoring_profile`).
		WithArgs(campaignID).WillReturnRows(sqlmock.NewRows([]string{"weights", "parked_penalty_factor"}).AddRow(wraw, penalty))
	mock.ExpectQuery(`SELECT COUNT\(\*\) FROM generated_domains`).
		WithArgs(campaignID).WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(2))
	// Include structural fields in feature vector
	fv1 := map[string]interface{}{"kw_unique": 5.0, "kw_hits_total": 10.0, "content_bytes": 9000.0, "title_has_keyword": true, "h1_count": 2, "link_internal_ratio": 0.75, "primary_lang": "en"}
	fv2 := map[string]interface{}{"kw_unique": 2.0, "kw_hits_total": 3.0, "content_bytes": 4000.0, "title_has_keyword": false, "h1_count": 0, "link_internal_ratio": 0.40, "primary_lang": "und"}
	raw1, _ := json.Marshal(fv1)
	raw2, _ := json.Marshal(fv2)
	now := time.Now()
	rows := sqlmock.NewRows([]string{"domain_name", "feature_vector", "last_http_fetched_at", "is_parked", "parked_confidence"}).
		AddRow("a.com", raw1, now, false, nil).AddRow("b.com", raw2, now, false, nil)
	mock.ExpectQuery(`SELECT domain_name, feature_vector, last_http_fetched_at, is_parked, parked_confidence FROM generated_domains`).
		WithArgs(campaignID).WillReturnRows(rows)
	mock.ExpectExec(`WITH incoming`).WillReturnResult(sqlmock.NewResult(0, 2))

	mSSE := &mockSSE{}
	svc := &analysisService{deps: Dependencies{DB: db, SSE: mSSE}}
	if _, err := svc.scoreDomains(context.Background(), campaignID); err != nil {
		t.Fatalf("scoreDomains: %v", err)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet SQL expectations (unexpected extra query?): %v", err)
	}
	// Basic assertion: domain_scored event contains numeric structural fields (not placeholders)
	found := false
	for _, msg := range mSSE.messages {
		var payload map[string]any
		if json.Unmarshal([]byte(msg), &payload) != nil {
			continue
		}
		if payload["event"] == "domain_scored" {
			sample, _ := payload["sample"].([]interface{})
			if len(sample) == 0 {
				t.Fatalf("sample empty")
			}
			first, _ := sample[0].(map[string]interface{})
			comps, _ := first["components"].(map[string]interface{})
			if comps["h1_count"] == "structural" {
				t.Fatalf("expected numeric h1_count, got placeholder")
			}
			found = true
		}
	}
	if !found {
		t.Fatalf("domain_scored event not captured")
	}
}
