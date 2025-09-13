package services

import (
	"context"
	"encoding/json"
	"net/http"
	"os"
	"sync"
	"testing"
	"time"

	sqlmock "github.com/DATA-DOG/go-sqlmock"
	"github.com/google/uuid"
)

// mockSSE captures SSE messages for assertions.
type mockSSE struct {
	mu       sync.Mutex
	messages []string
}

func (m *mockSSE) HandleSSE(w http.ResponseWriter, r *http.Request) {} // unused in tests
func (m *mockSSE) Send(event string) {
	m.mu.Lock()
	m.messages = append(m.messages, event)
	m.mu.Unlock()
}

// Test that scoring emits domain_scored with components map and rescore_progress events share correlationId.
func TestScoreDomains_SSEComponentsAndProgress(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock new: %v", err)
	}
	defer db.Close()

	// Force progress every row
	os.Setenv("RESCORE_PROGRESS_INTERVAL", "1")
	defer os.Unsetenv("RESCORE_PROGRESS_INTERVAL")

	campaignID := uuid.New()
	// Weights + penalty
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
	// Count query (2 domains)
	mock.ExpectQuery(`SELECT COUNT\(\*\) FROM generated_domains`).
		WithArgs(campaignID).WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(2))

	// Feature vectors rows
	fv1 := map[string]interface{}{"kw_unique": 5.0, "kw_hits_total": 10.0, "content_bytes": 8000.0, "title_has_keyword": true}
	fv2 := map[string]interface{}{"kw_unique": 3.0, "kw_hits_total": 6.0, "content_bytes": 4000.0, "title_has_keyword": false}
	fvRaw1, _ := json.Marshal(fv1)
	fvRaw2, _ := json.Marshal(fv2)
	now := time.Now().Add(-1 * time.Hour)
	rows := sqlmock.NewRows([]string{"domain_name", "feature_vector", "last_http_fetched_at", "is_parked", "parked_confidence"}).
		AddRow("a.com", fvRaw1, now, false, nil).AddRow("b.com", fvRaw2, now, false, nil)
	mock.ExpectQuery(`SELECT domain_name, feature_vector, last_http_fetched_at, is_parked, parked_confidence FROM generated_domains`).
		WithArgs(campaignID).WillReturnRows(rows)

	mock.ExpectExec(`WITH incoming`).WillReturnResult(sqlmock.NewResult(0, 2))

	mSSE := &mockSSE{}
	svc := &analysisService{deps: Dependencies{DB: db, SSE: mSSE}}
	corr, err := svc.scoreDomains(context.Background(), campaignID)
	if err != nil {
		t.Fatalf("scoreDomains error: %v", err)
	}
	if corr == "" {
		t.Fatalf("expected correlation id")
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet SQL expectations: %v", err)
	}

	// Analyze captured SSE messages
	if len(mSSE.messages) == 0 {
		t.Fatalf("expected SSE messages, got none")
	}
	var foundDomainScored bool
	var foundProgress int
	for _, msg := range mSSE.messages {
		var payload map[string]interface{}
		if json.Unmarshal([]byte(msg), &payload) != nil {
			continue
		}
		evt, _ := payload["event"].(string)
		if evt == "domain_scored" {
			foundDomainScored = true
			// verify correlation
			if payload["correlationId"] != corr {
				t.Errorf("correlationId mismatch in domain_scored")
			}
			// sample
			sample, _ := payload["sample"].([]interface{})
			if len(sample) == 0 {
				t.Errorf("domain_scored sample empty")
			}
			first, _ := sample[0].(map[string]interface{})
			comps, _ := first["components"].(map[string]interface{})
			expectedKeys := []string{"density", "coverage", "non_parked", "content_length", "title_keyword", "freshness"}
			for _, k := range expectedKeys {
				if _, ok := comps[k]; !ok {
					t.Errorf("missing component key %s", k)
				}
			}
			// structural markers presence (inside components map per implementation)
			structKeys := []string{"h1_count", "link_internal_ratio", "primary_lang"}
			for _, k := range structKeys {
				if _, ok := comps[k]; !ok {
					t.Errorf("missing structural key %s in domain_scored components", k)
				}
			}
		}
		if evt == "rescore_progress" {
			foundProgress++
			if payload["correlationId"] != corr {
				t.Errorf("correlationId mismatch in progress event")
			}
		}
	}
	if !foundDomainScored {
		t.Errorf("domain_scored event not captured")
	}
	if foundProgress < 2 {
		t.Errorf("expected >=2 progress events (interval=1), got %d", foundProgress)
	}
}
