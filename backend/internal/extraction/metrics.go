package extraction

import (
	"context"
	"database/sql"
	"sync"
	"time"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

var metricsOnce sync.Once

var (
	FeatureStateGauge                    *prometheus.GaugeVec
	DualReadDiffCounter                  *prometheus.CounterVec
	RichnessComponentHistogram           *prometheus.HistogramVec
	RichnessPenaltyCounter               *prometheus.CounterVec
	RichnessCanaryDiffHistogram          *prometheus.HistogramVec
	RichnessCanaryDiffArchetypeHistogram *prometheus.HistogramVec

	// NEW: Extraction latency histograms (EXT-28)
	extractionLatencyHistogram = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "extraction_step_duration_seconds",
			Help:    "Time spent in each extraction sub-step",
			Buckets: prometheus.ExponentialBuckets(0.001, 2, 15), // 1ms to ~32s
		},
		[]string{"step", "campaign_id", "status"},
	)

	// Per-domain total extraction time
	domainExtractionDuration = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "extraction_domain_total_duration_seconds",
			Help:    "Total time to complete extraction for a single domain",
			Buckets: prometheus.ExponentialBuckets(0.1, 2, 12), // 100ms to ~6 minutes
		},
		[]string{"campaign_id", "status"},
	)

	// HTTP fetch metrics
	httpFetchDuration = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "extraction_http_fetch_duration_seconds",
			Help:    "Time spent fetching HTTP content",
			Buckets: prometheus.ExponentialBuckets(0.1, 2, 10), // 100ms to ~1.7 minutes
		},
		[]string{"campaign_id", "status_code_class"},
	)

	// Keyword extraction metrics
	keywordExtractionDuration = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "extraction_keyword_processing_duration_seconds",
			Help:    "Time spent processing keywords for a domain",
			Buckets: prometheus.ExponentialBuckets(0.01, 2, 10), // 10ms to ~17s
		},
		[]string{"campaign_id", "keyword_count_class"},
	)

	// Microcrawl metrics
	microcrawlDuration = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "extraction_microcrawl_duration_seconds",
			Help:    "Time spent in microcrawl operations",
			Buckets: prometheus.ExponentialBuckets(1, 2, 10), // 1s to ~17 minutes
		},
		[]string{"campaign_id", "pages_crawled_class", "status"},
	)

	// Feature aggregation metrics
	featureAggregationDuration = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "extraction_feature_aggregation_duration_seconds",
			Help:    "Time spent aggregating features from raw signals",
			Buckets: prometheus.ExponentialBuckets(0.001, 2, 12), // 1ms to ~4s
		},
		[]string{"campaign_id", "feature_count_class"},
	)

	// Persistence metrics
	persistenceDuration = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "extraction_persistence_duration_seconds",
			Help:    "Time spent persisting extraction results to database",
			Buckets: prometheus.ExponentialBuckets(0.01, 2, 10), // 10ms to ~17s
		},
		[]string{"campaign_id", "operation_type"},
	)
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

// TimerWrapper provides convenient timing functionality for metrics
type TimerWrapper struct {
	start  time.Time
	labels prometheus.Labels
}

// NewExtractionTimer creates a new timer for extraction step measurement
func NewExtractionTimer(step, campaignID string) *TimerWrapper {
	return &TimerWrapper{
		start: time.Now(),
		labels: prometheus.Labels{
			"step":        step,
			"campaign_id": campaignID,
		},
	}
}

// Finish records the duration and status for the extraction step
func (t *TimerWrapper) Finish(status string) {
	duration := time.Since(t.start)
	t.labels["status"] = status
	extractionLatencyHistogram.With(t.labels).Observe(duration.Seconds())
}

// ObserveDomainExtractionDuration records the total time for domain extraction
func ObserveDomainExtractionDuration(campaignID, status string, duration time.Duration) {
	domainExtractionDuration.WithLabelValues(campaignID, status).Observe(duration.Seconds())
}

// ObserveHTTPFetchDuration records HTTP fetch timing
func ObserveHTTPFetchDuration(campaignID string, statusCode int, duration time.Duration) {
	statusClass := getStatusCodeClass(statusCode)
	httpFetchDuration.WithLabelValues(campaignID, statusClass).Observe(duration.Seconds())
}

// ObserveKeywordExtractionDuration records keyword processing timing
func ObserveKeywordExtractionDuration(campaignID string, keywordCount int, duration time.Duration) {
	countClass := getKeywordCountClass(keywordCount)
	keywordExtractionDuration.WithLabelValues(campaignID, countClass).Observe(duration.Seconds())
}

// ObserveMicrocrawlDuration records microcrawl operation timing
func ObserveMicrocrawlDuration(campaignID string, pagesCrawled int, status string, duration time.Duration) {
	pagesClass := getPagesCrawledClass(pagesCrawled)
	microcrawlDuration.WithLabelValues(campaignID, pagesClass, status).Observe(duration.Seconds())
}

// ObserveFeatureAggregationDuration records feature aggregation timing
func ObserveFeatureAggregationDuration(campaignID string, featureCount int, duration time.Duration) {
	countClass := getFeatureCountClass(featureCount)
	featureAggregationDuration.WithLabelValues(campaignID, countClass).Observe(duration.Seconds())
}

// ObservePersistenceDuration records database persistence timing
func ObservePersistenceDuration(campaignID, operationType string, duration time.Duration) {
	persistenceDuration.WithLabelValues(campaignID, operationType).Observe(duration.Seconds())
}

// Helper functions for classification
func getStatusCodeClass(statusCode int) string {
	switch {
	case statusCode >= 200 && statusCode < 300:
		return "2xx"
	case statusCode >= 300 && statusCode < 400:
		return "3xx"
	case statusCode >= 400 && statusCode < 500:
		return "4xx"
	case statusCode >= 500:
		return "5xx"
	default:
		return "other"
	}
}

func getKeywordCountClass(count int) string {
	switch {
	case count <= 10:
		return "small"
	case count <= 50:
		return "medium"
	case count <= 200:
		return "large"
	default:
		return "xlarge"
	}
}

func getPagesCrawledClass(pages int) string {
	switch {
	case pages <= 1:
		return "single"
	case pages <= 3:
		return "few"
	case pages <= 10:
		return "many"
	default:
		return "extensive"
	}
}

func getFeatureCountClass(count int) string {
	switch {
	case count <= 5:
		return "minimal"
	case count <= 15:
		return "standard"
	case count <= 30:
		return "rich"
	default:
		return "comprehensive"
	}
}
