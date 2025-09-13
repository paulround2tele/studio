package services

import (
	"testing"

	"github.com/prometheus/client_golang/prometheus"
	promtest "github.com/prometheus/client_golang/prometheus/testutil"
)

// TestEnsureMetricsRegistered verifies that calling ensureMetricsRegistered registers
// the expected micro-crawl ROI metrics. We only check for descriptor existence / ability
// to gather without panic; detailed value assertions are covered by functional tests elsewhere.
func TestEnsureMetricsRegistered(t *testing.T) {
	svc := &httpValidationService{}
	// Use method to register metrics
	svc.ensureMetricsRegistered()

	// List of metric names we expect (subset focusing on new ROI metrics + zero-success)
	expected := []string{
		"http_microcrawl_successes_total",
		"http_microcrawl_added_keywords_total",
		"http_microcrawl_new_patterns_total",
		"http_microcrawl_kw_growth_ratio",
		"http_microcrawl_zero_success_total",
	}

	for _, name := range expected {
		// Gather metric family and ensure at least descriptor exists
		mf, err := prometheus.DefaultGatherer.Gather()
		if err != nil {
			t.Fatalf("gather failed: %v", err)
		}
		found := false
		for _, fam := range mf {
			if fam.GetName() == name {
				found = true
				break
			}
		}
		if !found {
			t.Errorf("expected metric %s to be registered", name)
		}
	}

	// Smoke check: write a single increment and ensure scrape not zero length
	if svc.mtx.microCrawlSuccesses == nil {
		t.Fatalf("microCrawlSuccesses counter not initialized")
	}
	svc.mtx.microCrawlSuccesses.Inc()
	if c := promtest.ToFloat64(svc.mtx.microCrawlSuccesses); c != 1 {
		t.Fatalf("expected microCrawlSuccesses=1 got %v", c)
	}
}
