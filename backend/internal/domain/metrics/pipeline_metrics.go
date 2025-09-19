package metrics

import (
	"sync"

	"github.com/prometheus/client_golang/prometheus"
)

var (
	// Pipeline reconciliation metrics
	reconcilePassTotal = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "extraction_reconcile_pass_total",
			Help: "Total reconciliation passes completed",
		},
		[]string{"result"}, // success, error, skipped
	)

	reconcileRowsExaminedTotal = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "extraction_reconcile_rows_examined_total",
			Help: "Total rows examined during reconciliation",
		},
		[]string{"category"}, // stuck_running, stuck_pending, error_retryable, missing_features
	)

	reconcileRowsAdjustedTotal = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "extraction_reconcile_rows_adjusted_total",
			Help: "Total rows adjusted during reconciliation",
		},
		[]string{"action"}, // reset_to_pending, mark_fatal, increment_retry
	)

	reconcileLatencySeconds = prometheus.NewHistogram(
		prometheus.HistogramOpts{
			Name:    "extraction_reconcile_latency_seconds",
			Help:    "Time taken for reconciliation passes",
			Buckets: prometheus.DefBuckets,
		},
	)

	// Stale score detection metrics
	staleScoresDetectedTotal = prometheus.NewCounter(
		prometheus.CounterOpts{
			Name: "analysis_stale_scores_detected_total",
			Help: "Total stale analysis scores detected",
		},
	)

	// Keep existing coverage ratio gauge (as required by problem statement)
	featureTableCoverageRatio = prometheus.NewGaugeVec(
		prometheus.GaugeOpts{
			Name: "analysis_feature_table_coverage_ratio",
			Help: "Ratio of domains with features available in extraction tables",
		},
		[]string{"campaign_id"},
	)

	// Ensure metrics are registered only once
	metricsRegistered sync.Once
)

// RegisterPipelineMetrics registers all pipeline metrics with Prometheus
// This function is idempotent and safe to call multiple times
func RegisterPipelineMetrics() {
	metricsRegistered.Do(func() {
		prometheus.MustRegister(
			reconcilePassTotal,
			reconcileRowsExaminedTotal,
			reconcileRowsAdjustedTotal,
			reconcileLatencySeconds,
			staleScoresDetectedTotal,
			featureTableCoverageRatio,
		)
	})
}

// Getters for metrics (for use by services)

// ReconcilePassTotal returns the reconcile pass counter
func ReconcilePassTotal() *prometheus.CounterVec {
	return reconcilePassTotal
}

// ReconcileRowsExaminedTotal returns the rows examined counter
func ReconcileRowsExaminedTotal() *prometheus.CounterVec {
	return reconcileRowsExaminedTotal
}

// ReconcileRowsAdjustedTotal returns the rows adjusted counter
func ReconcileRowsAdjustedTotal() *prometheus.CounterVec {
	return reconcileRowsAdjustedTotal
}

// ReconcileLatencySeconds returns the reconcile latency histogram
func ReconcileLatencySeconds() prometheus.Histogram {
	return reconcileLatencySeconds
}

// StaleScoresDetectedTotal returns the stale scores counter
func StaleScoresDetectedTotal() prometheus.Counter {
	return staleScoresDetectedTotal
}

// FeatureTableCoverageRatio returns the coverage ratio gauge
func FeatureTableCoverageRatio() *prometheus.GaugeVec {
	return featureTableCoverageRatio
}