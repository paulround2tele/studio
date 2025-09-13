package services

import (
	"context"
	"encoding/json"
	"fmt"
	"testing"
	"time"

	sqlmock "github.com/DATA-DOG/go-sqlmock"
	"github.com/google/uuid"
)

// BenchmarkScoreDomains_Synthetic measures scoring overhead for N synthetic domains.
func BenchmarkScoreDomains_Synthetic(b *testing.B) {
	for _, n := range []int{50, 200} {
		b.Run("N="+fmt.Sprint(n), func(b *testing.B) {
			for i := 0; i < b.N; i++ {
				db, mock, err := sqlmock.New()
				if err != nil {
					b.Fatalf("sqlmock: %v", err)
				}
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
					WithArgs(campaignID).WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(n))
				rows := sqlmock.NewRows([]string{"domain_name", "feature_vector", "last_http_fetched_at", "is_parked", "parked_confidence"})
				now := time.Now()
				for d := 0; d < n; d++ {
					fv := map[string]interface{}{"kw_unique": 3.0 + float64(d%5), "kw_hits_total": 5.0 + float64(d%11), "content_bytes": 8000.0 + float64(d%2000), "title_has_keyword": d%2 == 0}
					raw, _ := json.Marshal(fv)
					rows.AddRow(fmt.Sprintf("d%d.com", d), raw, now, false, nil)
				}
				mock.ExpectQuery(`SELECT domain_name, feature_vector, last_http_fetched_at, is_parked, parked_confidence FROM generated_domains`).
					WithArgs(campaignID).WillReturnRows(rows)
				mock.ExpectExec(`WITH incoming`).WillReturnResult(sqlmock.NewResult(0, int64(n)))
				svc := &analysisService{deps: Dependencies{DB: db}}
				if _, err := svc.scoreDomains(context.Background(), campaignID); err != nil {
					b.Fatalf("scoreDomains: %v", err)
				}
				if err := mock.ExpectationsWereMet(); err != nil {
					b.Fatalf("expectations: %v", err)
				}
				_ = db.Close()
			}
		})
	}
}
