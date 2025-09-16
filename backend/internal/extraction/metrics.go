package extraction

import (
	"context"
	"database/sql"
	"sync"
	"time"

	"github.com/prometheus/client_golang/prometheus"
)

var metricsOnce sync.Once

var (
	FeatureStateGauge                    *prometheus.GaugeVec
	DualReadDiffCounter                  *prometheus.CounterVec
	RichnessComponentHistogram           *prometheus.HistogramVec
	RichnessPenaltyCounter               *prometheus.CounterVec
	RichnessCanaryDiffHistogram          *prometheus.HistogramVec
	RichnessCanaryDiffArchetypeHistogram *prometheus.HistogramVec
)

// InitMetrics registers extraction related metrics (idempotent).
func InitMetrics() {
	metricsOnce.Do(func() {
		FeatureStateGauge = prometheus.NewGaugeVec(prometheus.GaugeOpts{
			Name: "extraction_feature_rows_state",
			Help: "Count of domain_extraction_features rows by processing_state"}, []string{"state"})
		DualReadDiffCounter = prometheus.NewCounterVec(prometheus.CounterOpts{
			Name: "analysis_dual_read_diffs_total",
			Help: "Count of detected dual-read high variance feature diffs"}, []string{"type"})

		buckets := []float64{0, 0.05, 0.1, 0.15, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1}
		RichnessComponentHistogram = prometheus.NewHistogramVec(prometheus.HistogramOpts{
			Name:    "extraction_richness_component",
			Help:    "Distribution of richness v2 components (and final)",
			Buckets: buckets,
		}, []string{"component"})
		RichnessPenaltyCounter = prometheus.NewCounterVec(prometheus.CounterOpts{
			Name: "extraction_richness_penalty_trigger_total",
			Help: "Counts of richness penalties triggered",
		}, []string{"penalty"})
		RichnessCanaryDiffHistogram = prometheus.NewHistogramVec(prometheus.HistogramOpts{
			Name:    "extraction_richness_canary_abs_diff",
			Help:    "Absolute difference between legacy and v2 richness when canary enabled",
			Buckets: buckets,
		}, []string{"type"})
		RichnessCanaryDiffArchetypeHistogram = prometheus.NewHistogramVec(prometheus.HistogramOpts{
			Name:    "extraction_richness_canary_abs_diff_archetype",
			Help:    "Absolute difference between legacy and v2 richness by page archetype",
			Buckets: buckets,
		}, []string{"archetype"})

		prometheus.MustRegister(FeatureStateGauge, DualReadDiffCounter, RichnessComponentHistogram, RichnessPenaltyCounter, RichnessCanaryDiffHistogram, RichnessCanaryDiffArchetypeHistogram)
	})
}

// Ensure metrics are registered even if caller forgets explicit InitMetrics.
func init() { InitMetrics() }

// ObserveRichnessComponents records component values & penalties (safe if metrics nil)
func ObserveRichnessComponents(components map[string]float64, penalties map[string]float64, final float64) {
	if RichnessComponentHistogram == nil {
		return
	}
	for k, v := range components {
		RichnessComponentHistogram.WithLabelValues(k).Observe(v)
	}
	RichnessComponentHistogram.WithLabelValues("final").Observe(final)
	if RichnessPenaltyCounter != nil {
		for p, val := range penalties {
			if val > 0 {
				RichnessPenaltyCounter.WithLabelValues(p).Add(1)
			}
		}
	}
}

// ObserveRichnessCanaryDiff records absolute difference buckets.
func ObserveRichnessCanaryDiff(diff float64) {
	if RichnessCanaryDiffHistogram == nil {
		return
	}
	RichnessCanaryDiffHistogram.WithLabelValues("abs").Observe(diff)
	if diff > 0.15 {
		DualReadDiffCounter.WithLabelValues("richness_v2_canary_delta_gt_015").Inc()
	}
}

// ObserveRichnessCanaryDiffArchetype records diff per archetype (safe if metric nil)
func ObserveRichnessCanaryDiffArchetype(diff float64, archetype string) {
	if RichnessCanaryDiffArchetypeHistogram == nil {
		return
	}
	if archetype == "" {
		archetype = "unknown"
	}
	RichnessCanaryDiffArchetypeHistogram.WithLabelValues(archetype).Observe(diff)
}

// UpdateFeatureStateGauge queries counts by processing_state and sets gauge values.
// Safe to call periodically; no-op if gauge uninitialized.
func UpdateFeatureStateGauge(ctx context.Context, db *sql.DB) error {
	if FeatureStateGauge == nil || db == nil {
		return nil
	}
	rows, err := db.QueryContext(ctx, `SELECT processing_state, COUNT(*) FROM domain_extraction_features GROUP BY processing_state`)
	if err != nil {
		return err
	}
	defer rows.Close()
	// Reset existing series by setting all known states to 0 first (optional: rely on scrape churn)
	states := []string{"pending", "building", "ready", "error", "stale"}
	for _, st := range states {
		FeatureStateGauge.WithLabelValues(st).Set(0)
	}
	for rows.Next() {
		var state string
		var count float64
		if err := rows.Scan(&state, &count); err != nil {
			return err
		}
		FeatureStateGauge.WithLabelValues(state).Set(count)
	}
	return rows.Err()
}

// StartFeatureMetricsLoop launches a goroutine updating state counts at interval until ctx cancel.
func StartFeatureMetricsLoop(ctx context.Context, db *sql.DB, interval time.Duration) {
	if interval <= 0 {
		interval = 30 * time.Second
	}
	go func() {
		ticker := time.NewTicker(interval)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				_ = UpdateFeatureStateGauge(context.Background(), db)
			}
		}
	}()
}
