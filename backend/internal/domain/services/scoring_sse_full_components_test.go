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

func TestScoreDomains_SSEFullComponents(t *testing.T) {
	os.Setenv("RESCORE_PROGRESS_INTERVAL", "1000")
	os.Setenv("ENABLE_SSE_STRUCTURAL_DETAILS", "1")
	os.Setenv("ENABLE_SSE_FULL_COMPONENTS", "1")
	defer os.Unsetenv("RESCORE_PROGRESS_INTERVAL")
	defer os.Unsetenv("ENABLE_SSE_STRUCTURAL_DETAILS")
	defer os.Unsetenv("ENABLE_SSE_FULL_COMPONENTS")

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
		WithArgs(campaignID).WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(1))
	fv := map[string]interface{}{"kw_unique": 4.0, "kw_hits_total": 12.0, "content_bytes": 6000.0, "title_has_keyword": true, "h1_count": 1, "link_internal_ratio": 0.5, "primary_lang": "en"}
	rawFV, _ := json.Marshal(fv)
	now := time.Now()
	rows := sqlmock.NewRows([]string{"domain_name", "feature_vector", "last_http_fetched_at", "is_parked", "parked_confidence"}).
		AddRow("x.com", rawFV, now, false, nil)
	mock.ExpectQuery(`SELECT domain_name, feature_vector, last_http_fetched_at, is_parked, parked_confidence FROM generated_domains`).
		WithArgs(campaignID).WillReturnRows(rows)
	mock.ExpectExec(`WITH incoming`).WillReturnResult(sqlmock.NewResult(0, 1))

	mSSE := &mockSSE{}
	svc := &analysisService{deps: Dependencies{DB: db, SSE: mSSE}}
	if _, err := svc.scoreDomains(context.Background(), campaignID); err != nil {
		t.Fatalf("scoreDomains: %v", err)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet SQL expectations: %v", err)
	}

	// Inspect SSE output
	found := false
	for _, msg := range mSSE.messages {
		var payload map[string]any
		if json.Unmarshal([]byte(msg), &payload) != nil {
			continue
		}
		if payload["event"] == "domain_scored" {
			sample, _ := payload["sample"].([]interface{})
			if len(sample) != 1 {
				t.Fatalf("expected 1 sample item")
			}
			first, _ := sample[0].(map[string]any)
			comps, _ := first["components"].(map[string]any)
			// Expect numeric values not placeholders
			keys := []string{"density", "coverage", "non_parked", "content_length", "title_keyword", "freshness", "h1_count", "link_internal_ratio", "primary_lang"}
			for _, k := range keys {
				if v, ok := comps[k]; !ok || v == "omitted" || v == "structural" {
					t.Fatalf("component %s not populated: %v", k, v)
				}
			}
			found = true
		}
	}
	if !found {
		t.Fatalf("domain_scored event not found")
	}
}
