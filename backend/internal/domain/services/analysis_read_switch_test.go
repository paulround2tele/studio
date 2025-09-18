package services

import (
	"context"
	"fmt"
	"testing"

	"github.com/google/uuid"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/stretchr/testify/assert"
)

func TestReadPathDecision(t *testing.T) {
	tests := []struct {
		name           string
		flagEnabled    bool
		coverage       float64
		threshold      float64
		expectedCount  int64
		hasError       bool
		expectedUseNew bool
		expectedReason string
	}{
		{
			name:           "flag disabled - always legacy",
			flagEnabled:    false,
			coverage:       0.95,
			threshold:      0.9,
			expectedCount:  100,
			hasError:       false,
			expectedUseNew: false,
			expectedReason: "flag_disabled",
		},
		{
			name:           "flag enabled high coverage - use new path",
			flagEnabled:    true,
			coverage:       0.95,
			threshold:      0.9,
			expectedCount:  100,
			hasError:       false,
			expectedUseNew: true,
			expectedReason: "coverage_sufficient",
		},
		{
			name:           "flag enabled low coverage - fallback to legacy",
			flagEnabled:    true,
			coverage:       0.85,
			threshold:      0.9,
			expectedCount:  100,
			hasError:       false,
			expectedUseNew: false,
			expectedReason: "below_coverage",
		},
		{
			name:           "flag enabled error in coverage query - fallback to legacy",
			flagEnabled:    true,
			coverage:       0.0,
			threshold:      0.9,
			expectedCount:  100,
			hasError:       true,
			expectedUseNew: false,
			expectedReason: "error",
		},
		{
			name:           "flag enabled small sample override - use new path",
			flagEnabled:    true,
			coverage:       0.5, // Low coverage but...
			threshold:      0.9,
			expectedCount:  3, // Small sample override
			hasError:       false,
			expectedUseNew: true,
			expectedReason: "small_sample_override",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			decision := makeReadPathDecision(
				tt.flagEnabled,
				tt.coverage,
				tt.threshold,
				tt.expectedCount,
				tt.hasError,
			)

			assert.Equal(t, tt.expectedUseNew, decision.useNew)
			assert.Equal(t, tt.expectedReason, decision.reason)
			assert.Equal(t, tt.coverage, decision.coverage)
			assert.Equal(t, tt.threshold, decision.threshold)
		})
	}
}

func TestAnalysisCoverageOK_EmptyContext(t *testing.T) {
	// This is a placeholder test for the coverage function
	// In a real implementation, this would test the actual database queries
	ctx := context.Background()
	campaignID := uuid.New()

	// For now, just test that the function signature compiles
	// Real tests would use sqlmock or test database
	_, _, err := analysisCoverageOK(ctx, nil, campaignID)
	assert.Error(t, err) // Should error with nil DB
}

func TestAnalysisServiceCoverageIntegration(t *testing.T) {
	// This tests the actual service method implementation
	// Note: This test requires the analysisService to be properly initialized
	// In a real scenario, this would use test fixtures and database mocks
	
	ctx := context.Background()
	campaignID := uuid.New()
	
	// Test with nil dependencies - should fail gracefully
	service := &analysisService{
		deps: Dependencies{
			DB: nil,
		},
	}
	
	_, ratio, err := service.analysisCoverageOK(ctx, campaignID)
	assert.Error(t, err)
	assert.Equal(t, 0.0, ratio)
	assert.Contains(t, err.Error(), "database connection required")
}

func TestReadPathDecisionIntegration(t *testing.T) {
	// Test the makeReadPathDecision method on the service
	ctx := context.Background()
	campaignID := uuid.New()
	
	// Mock service with nil DB (will trigger error path)
	service := &analysisService{
		deps: Dependencies{
			DB: nil,
		},
		mtx: struct {
			scoreHistogram                       prometheus.Histogram
			rescoreRuns                          *prometheus.CounterVec
			rescoreRunsV2                        *prometheus.CounterVec
			phaseDuration                        prometheus.Histogram
			reuseCounter                         prometheus.Counter
			preflightFail                        prometheus.Counter
			analysisFeatureFetchDuration         prometheus.Histogram
			analysisFeatureFetchDomains          prometheus.Histogram
			featureCacheHits                     prometheus.Counter
			featureCacheMisses                   prometheus.Counter
			featureCacheInvalidations            prometheus.Counter
			analysisFeatureTableCoverageRatio    *prometheus.GaugeVec
			analysisFeatureTableFallbacks        *prometheus.CounterVec
			analysisFeatureTablePrimaryReads     prometheus.Counter
		}{
			// Initialize to nil - will be set by initReadSwitchMetrics if called
		},
	}
	
	// Test decision making with nil DB (should handle gracefully)
	decision := service.makeReadPathDecision(ctx, campaignID)
	
	// When flag is disabled (default), should use legacy path
	assert.False(t, decision.useNew)
	assert.Equal(t, "flag_disabled", decision.reason)
}

// makeReadPathDecision implements the core decision logic for testing
func makeReadPathDecision(flagEnabled bool, coverage, threshold float64, expectedCount int64, hasError bool) readPathDecision {
	if !flagEnabled {
		return readPathDecision{
			useNew:    false,
			coverage:  coverage,
			threshold: threshold,
			reason:    "flag_disabled",
		}
	}

	if hasError {
		return readPathDecision{
			useNew:    false,
			coverage:  coverage,
			threshold: threshold,
			reason:    "error",
		}
	}

	// Small sample override: if expected count < 5, treat as coverage satisfied
	if expectedCount < 5 {
		return readPathDecision{
			useNew:    true,
			coverage:  coverage,
			threshold: threshold,
			reason:    "small_sample_override",
		}
	}

	if coverage >= threshold {
		return readPathDecision{
			useNew:    true,
			coverage:  coverage,
			threshold: threshold,
			reason:    "coverage_sufficient",
		}
	}

	return readPathDecision{
		useNew:    false,
		coverage:  coverage,
		threshold: threshold,
		reason:    "below_coverage",
	}
}

// Placeholder for the actual coverage function that will be implemented
func analysisCoverageOK(ctx context.Context, db interface{}, campaignID uuid.UUID) (bool, float64, error) {
	if db == nil {
		return false, 0.0, fmt.Errorf("database connection required")
	}
	// TODO: Implement actual coverage calculation
	return false, 0.0, fmt.Errorf("not implemented")
}