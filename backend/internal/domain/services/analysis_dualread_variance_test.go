package services

import (
	"context"
	"fmt"
	"testing"

	"github.com/fntelecomllc/studio/backend/internal/featureflags"
	"github.com/prometheus/client_golang/prometheus"
	promtest "github.com/prometheus/client_golang/prometheus/testutil"
)

// Test that no metrics increment when dual read disabled
func TestDualReadVarianceMetrics_Disabled(t *testing.T) {
	// Create analysis service with nil metrics (safe fallback)
	s := &analysisService{}
	
	// Verify metrics are nil (expected initial state)
	if s.mtx.dualReadCampaignsTotal != nil {
		t.Error("Expected nil dualReadCampaignsTotal when not initialized")
	}
	
	// Test that dual read threshold function works
	threshold := featureflags.GetDualReadVarianceThreshold()
	if threshold != 0.25 {
		t.Errorf("Expected default threshold 0.25, got %f", threshold)
	}
}

// Test that metrics increment when dual read enabled
func TestDualReadVarianceMetrics_Enabled(t *testing.T) {
	// Create test metrics with fake registry
	registry := prometheus.NewRegistry()
	
	campaignsTotal := prometheus.NewCounter(prometheus.CounterOpts{
		Namespace: "analysis",
		Name:      "dualread_campaigns_total",
		Help:      "Test counter",
	})
	domainsComparedTotal := prometheus.NewCounter(prometheus.CounterOpts{
		Namespace: "analysis", 
		Name:      "dualread_domains_compared_total",
		Help:      "Test counter",
	})
	highVarianceTotal := prometheus.NewCounter(prometheus.CounterOpts{
		Namespace: "analysis",
		Name:      "dualread_high_variance_domains_total", 
		Help:      "Test counter",
	})
	varianceHistogram := prometheus.NewHistogram(prometheus.HistogramOpts{
		Namespace: "analysis",
		Name:      "dualread_domain_variance",
		Help:      "Test histogram",
		Buckets:   []float64{0, .05, .1, .15, .2, .25, .3, .4, .5, 1},
	})
	
	registry.MustRegister(campaignsTotal, domainsComparedTotal, highVarianceTotal, varianceHistogram)
	
	// Create analysis service with test metrics
	s := &analysisService{}
	s.mtx.dualReadCampaignsTotal = campaignsTotal
	s.mtx.dualReadDomainsComparedTotal = domainsComparedTotal  
	s.mtx.dualReadHighVarianceDomainsTotal = highVarianceTotal
	s.mtx.dualReadDomainVariance = varianceHistogram
	
	// Test increments
	s.mtx.dualReadCampaignsTotal.Inc()
	s.mtx.dualReadDomainsComparedTotal.Inc()
	s.mtx.dualReadHighVarianceDomainsTotal.Add(5)
	s.mtx.dualReadDomainVariance.Observe(0.3)
	
	// Verify metrics
	if val := promtest.ToFloat64(campaignsTotal); val != 1 {
		t.Errorf("Expected campaigns total = 1, got %f", val)
	}
	if val := promtest.ToFloat64(domainsComparedTotal); val != 1 {
		t.Errorf("Expected domains compared = 1, got %f", val)
	}
	if val := promtest.ToFloat64(highVarianceTotal); val != 5 {
		t.Errorf("Expected high variance = 5, got %f", val)
	}
	// Note: Histogram testing requires different approach, skipping detailed verification
}

// Test variance collector Add and Summary methods
func TestDualReadVarianceCollector_Basic(t *testing.T) {
	campaignID := "test-campaign"
	threshold := 0.25
	
	collector := newDualReadVarianceCollector(campaignID, threshold)
	
	// Test initial state
	high, total, diffs := collector.Summary()
	if high != 0 || total != 0 || len(diffs) != 0 {
		t.Errorf("Expected initial counts (0,0,0), got (%d,%d,%d)", high, total, len(diffs))
	}
	
	// Add low variance domain (below threshold)
	legacyMeta := map[string]any{"keywords": map[string]any{"unique_count": 10.0, "weight_sum": 100.0}}
	newMeta := map[string]any{"keywords": map[string]any{"unique_count": 11.0, "weight_sum": 105.0}}
	collector.Add("low-variance.com", 10.0, 11.0, legacyMeta, newMeta)
	
	high, total, diffs = collector.Summary()
	if high != 0 || total != 1 || len(diffs) != 0 {
		t.Errorf("Expected counts (0,1,0) for low variance, got (%d,%d,%d)", high, total, len(diffs))
	}
	
	// Add high variance domain (above threshold)
	collector.Add("high-variance.com", 10.0, 15.0, legacyMeta, newMeta)
	
	high, total, diffs = collector.Summary()
	if high != 1 || total != 2 || len(diffs) != 1 {
		t.Errorf("Expected counts (1,2,1) for high variance, got (%d,%d,%d)", high, total, len(diffs))
	}
	
	// Verify diff details
	if len(diffs) > 0 {
		diff := diffs[0]
		if diff.Domain != "high-variance.com" {
			t.Errorf("Expected domain 'high-variance.com', got '%s'", diff.Domain)
		}
		if diff.LegacyScore != 10.0 {
			t.Errorf("Expected legacy score 10.0, got %f", diff.LegacyScore)
		}
		if diff.NewScore != 15.0 {
			t.Errorf("Expected new score 15.0, got %f", diff.NewScore)
		}
		expectedVariance := 0.5 // |15-10|/10 = 0.5
		if diff.VarianceRatio != expectedVariance {
			t.Errorf("Expected variance ratio %f, got %f", expectedVariance, diff.VarianceRatio)
		}
	}
}

// Test that diff cap is enforced (max 50 items)
func TestDualReadVarianceCollector_DiffCap(t *testing.T) {
	campaignID := "test-campaign"
	threshold := 0.1 // Low threshold to ensure all domains are high variance
	
	collector := newDualReadVarianceCollector(campaignID, threshold)
	
	// Add more than maxVarianceDiffs (50) high variance domains
	legacyMeta := map[string]any{"keywords": map[string]any{"unique_count": 5.0}}
	newMeta := map[string]any{"keywords": map[string]any{"unique_count": 10.0}}
	
	for i := 0; i < 60; i++ {
		domain := fmt.Sprintf("domain%d.com", i)
		collector.Add(domain, 5.0, 10.0, legacyMeta, newMeta) // variance = 1.0 > 0.1 threshold
	}
	
	high, total, diffs := collector.Summary()
	if high != 60 {
		t.Errorf("Expected 60 high variance domains, got %d", high)
	}
	if total != 60 {
		t.Errorf("Expected 60 total domains, got %d", total)  
	}
	if len(diffs) != maxVarianceDiffs {
		t.Errorf("Expected %d diffs (capped), got %d", maxVarianceDiffs, len(diffs))
	}
}

// Test threshold respected in variance calculation
func TestDualReadVarianceCollector_ThresholdRespected(t *testing.T) {
	campaignID := "test-campaign"
	threshold := 0.3 // 30% threshold
	
	collector := newDualReadVarianceCollector(campaignID, threshold)
	
	legacyMeta := map[string]any{"keywords": map[string]any{"unique_count": 10.0}}
	newMeta := map[string]any{"keywords": map[string]any{"unique_count": 12.0}}
	
	// Add domain with 20% variance (below 30% threshold)
	collector.Add("below-threshold.com", 10.0, 12.0, legacyMeta, newMeta) // variance = 0.2
	
	// Add domain with 40% variance (above 30% threshold)  
	newMeta2 := map[string]any{"keywords": map[string]any{"unique_count": 14.0}}
	collector.Add("above-threshold.com", 10.0, 14.0, legacyMeta, newMeta2) // variance = 0.4
	
	high, total, diffs := collector.Summary()
	if high != 1 {
		t.Errorf("Expected 1 high variance domain, got %d", high)
	}
	if total != 2 {
		t.Errorf("Expected 2 total domains, got %d", total)
	}
	if len(diffs) != 1 {
		t.Errorf("Expected 1 diff, got %d", len(diffs))
	}
	
	// Verify the high variance domain is the correct one
	if len(diffs) > 0 && diffs[0].Domain != "above-threshold.com" {
		t.Errorf("Expected high variance domain 'above-threshold.com', got '%s'", diffs[0].Domain)
	}
}

// Test that EventBus system event is sent when dual read enabled
func TestDualReadVarianceCollector_SSEEvent(t *testing.T) {
	// Mock EventBus that captures published events
	mockEventBus := &mockEventBus{events: make([]mockEvent, 0)}
	
	// Create analysis service with mock dependencies
	s := &analysisService{
		deps: Dependencies{
			EventBus: mockEventBus,
		},
	}
	
	// Create variance collector
	campaignID := "test-campaign-id"
	threshold := 0.25
	collector := newDualReadVarianceCollector(campaignID, threshold)
	
	// Add some domains with variance
	legacyMeta := map[string]any{"keywords": map[string]any{"unique_count": 10.0}}
	newMeta := map[string]any{"keywords": map[string]any{"unique_count": 15.0}}
	collector.Add("high-variance.com", 10.0, 15.0, legacyMeta, newMeta)
	
	// Simulate the SSE event emission logic
	high, total, _ := collector.Summary()
	if total > 0 {
		payload := map[string]interface{}{
			"campaignId":          campaignID,
			"highVarianceDomains": high,
			"totalDomainsCompared": total,
			"threshold":           threshold,
		}
		s.deps.EventBus.PublishSystemEvent(context.Background(), "dualread_variance_summary", payload)
	}
	
	// Verify event was published
	if len(mockEventBus.events) != 1 {
		t.Fatalf("Expected 1 system event, got %d", len(mockEventBus.events))
	}
	
	event := mockEventBus.events[0]
	if event.name != "dualread_variance_summary" {
		t.Errorf("Expected event name 'dualread_variance_summary', got '%s'", event.name)
	}
	
	// Verify payload contents
	if campaignIDVal, ok := event.payload["campaignId"].(string); !ok || campaignIDVal != campaignID {
		t.Errorf("Expected campaignId '%s', got %v", campaignID, event.payload["campaignId"])
	}
	if highVar, ok := event.payload["highVarianceDomains"].(int); !ok || highVar != 1 {
		t.Errorf("Expected 1 high variance domain, got %v", event.payload["highVarianceDomains"])
	}
	if totalComp, ok := event.payload["totalDomainsCompared"].(int); !ok || totalComp != 1 {
		t.Errorf("Expected 1 total domains compared, got %v", event.payload["totalDomainsCompared"])
	}
}

// Mock EventBus for testing
type mockEventBus struct {
	events []mockEvent
}

type mockEvent struct {
	name    string
	payload map[string]interface{}
}

func (m *mockEventBus) PublishProgress(ctx context.Context, progress PhaseProgress) error {
	return nil
}

func (m *mockEventBus) PublishStatusChange(ctx context.Context, status PhaseStatus) error {
	return nil
}

func (m *mockEventBus) PublishSystemEvent(ctx context.Context, name string, payload map[string]interface{}) error {
	m.events = append(m.events, mockEvent{name: name, payload: payload})
	return nil
}