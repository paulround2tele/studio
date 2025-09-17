package services

import (
	"context"
	"regexp"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/testutil"
)

// minimal logger stub
type noopLogger struct{}

func (n noopLogger) Debug(context.Context, string, map[string]interface{})        {}
func (n noopLogger) Info(context.Context, string, map[string]interface{})         {}
func (n noopLogger) Warn(context.Context, string, map[string]interface{})         {}
func (n noopLogger) Error(context.Context, string, error, map[string]interface{}) {}

// stub stores (only methods used in test - none)

type noopCampaignStore struct{}

var _ storeCampaignSubset = (*noopCampaignStore)(nil)

type storeCampaignSubset interface{}

// TestFeatureCacheMetrics verifies first call misses (DB path) then second call hits (cache)
func TestFeatureCacheMetrics(t *testing.T) {
	// Setup sqlmock
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock new: %v", err)
	}
	defer db.Close()
	// Expect one query for first fetch only
	rows := sqlmock.NewRows([]string{"domain_id", "domain_name", "kw_unique_count", "kw_hits_total", "kw_weight_sum", "content_richness_score", "microcrawl_gain_ratio", "feature_vector"}).
		AddRow("111", "example.com", 5, 9, 12.3, 0.8, 0.25, []byte(`{"kw_top3":["a","b","c"],"kw_signal_distribution":{"a":3,"b":2},"richness_weights_version":2,"prominence_norm":0.4,"diversity_effective_unique":0.5,"diversity_norm":0.6,"enrichment_norm":0.7,"applied_bonus":0.1,"applied_deductions_total":0.05,"stuffing_penalty":0.0,"repetition_index":0.02,"anchor_share":0.15}`))
	mock.ExpectQuery(regexp.QuoteMeta("SELECT def.domain_id, gd.domain_name")).
		WithArgs(sqlmock.AnyArg()).
		WillReturnRows(rows)

	// Build sqlx wrapper
	sqlxDB := sqlx.NewDb(db, "sqlmock")

	deps := Dependencies{DB: sqlxDB, Logger: noopLogger{}}
	// Custom registry to isolate metrics (prometheus default registry already used globally)
	reg := prometheus.NewRegistry()
	prometheus.DefaultRegisterer = reg

	svc := NewAnalysisService(nil, deps, nil, nil, nil).(*analysisService)
	campaignID := uuid.New()

	// First call -> miss
	if _, err := svc.FetchAnalysisReadyFeatures(context.Background(), campaignID); err != nil {
		t.Fatalf("first fetch error: %v", err)
	}
	// Second call -> hit (no new expectations, query would fail test if executed)
	if _, err := svc.FetchAnalysisReadyFeatures(context.Background(), campaignID); err != nil {
		t.Fatalf("second fetch error: %v", err)
	}

	// Gather metrics
	misses := testutil.ToFloat64(svc.mtx.featureCacheMisses)
	hits := testutil.ToFloat64(svc.mtx.featureCacheHits)
	if misses != 1 {
		t.Fatalf("expected 1 miss, got %v", misses)
	}
	if hits < 1 { // could be >1 if TTL reuse counts
		t.Fatalf("expected >=1 hit, got %v", hits)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet sql expectations: %v", err)
	}
	// TTL window default 30s; ensure cache entry exists
	if _, ok := svc._featureCacheTTL[campaignID]; !ok {
		t.Fatalf("expected ttl cache entry present")
	}
	// Confirm cache invalidation increments invalidations counter
	svc.InvalidateFeatureCache(campaignID)
	inv := testutil.ToFloat64(svc.mtx.featureCacheInvalidations)
	if inv != 1 {
		t.Fatalf("expected 1 invalidation, got %v", inv)
	}
	// Ensure subsequent miss after invalidation triggers new query expectation
	// Add new expectation
	rows2 := sqlmock.NewRows([]string{"domain_id", "domain_name", "kw_unique_count", "kw_hits_total", "kw_weight_sum", "content_richness_score", "microcrawl_gain_ratio", "feature_vector"}).
		AddRow("111", "example.com", 5, 9, 12.3, 0.81, 0.26, []byte(`{"kw_top3":["a","b","c"],"kw_signal_distribution":{"a":3,"b":2},"richness_weights_version":2,"prominence_norm":0.4,"diversity_effective_unique":0.5,"diversity_norm":0.6,"enrichment_norm":0.7,"applied_bonus":0.1,"applied_deductions_total":0.05,"stuffing_penalty":0.0,"repetition_index":0.02,"anchor_share":0.15}`))
	mock.ExpectQuery(regexp.QuoteMeta("SELECT def.domain_id, gd.domain_name")).
		WithArgs(sqlmock.AnyArg()).
		WillReturnRows(rows2)
	if _, err := svc.FetchAnalysisReadyFeatures(context.Background(), campaignID); err != nil {
		t.Fatalf("post-invalidation fetch error: %v", err)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet expectations after invalidation: %v", err)
	}
	if testutil.ToFloat64(svc.mtx.featureCacheMisses) != 2 {
		t.Fatalf("expected 2 misses after invalidation")
	}
}
