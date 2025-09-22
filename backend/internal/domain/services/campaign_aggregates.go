package services

import (
	"context"
	"database/sql"
	"errors"
	"sync"
	"time"

	"github.com/prometheus/client_golang/prometheus"

	"github.com/google/uuid"

	"github.com/fntelecomllc/studio/backend/internal/domain/constants"
)

// TTL for funnel & metrics caches
const aggregatesTTL = 30 * time.Second

// Prometheus metrics (registered lazily once)
var (
	campaignAggregationLatency = prometheus.NewHistogramVec(prometheus.HistogramOpts{
		Namespace: "campaign",
		Name:      "aggregation_latency_seconds",
		Help:      "Latency of campaign aggregation SQL queries.",
	}, []string{"endpoint"})

	campaignAggregationCacheHits = prometheus.NewCounterVec(prometheus.CounterOpts{
		Namespace: "campaign",
		Name:      "aggregation_cache_hits_total",
		Help:      "Cache hit/miss counts for campaign aggregations.",
	}, []string{"endpoint", "result"})

	registerAggregatesMetricsOnce sync.Once
)

// cacheEntry is a small generic holder for cached data
// we intentionally do not use generics here to keep interface friction low in this codebase's style.
type cacheEntry struct {
	FetchedAt time.Time
	Data      any
}

// AggregatesCache holds separate maps for funnel & metrics
// All operations must hold appropriate RW locks.
type AggregatesCache struct {
	mu      sync.RWMutex
	funnel  map[uuid.UUID]cacheEntry
	metrics map[uuid.UUID]cacheEntry
}

func NewAggregatesCache() *AggregatesCache {
	registerAggregatesMetricsOnce.Do(func() {
		prometheus.MustRegister(campaignAggregationLatency, campaignAggregationCacheHits)
	})
	return &AggregatesCache{
		funnel:  make(map[uuid.UUID]cacheEntry),
		metrics: make(map[uuid.UUID]cacheEntry),
	}
}

// Invalidation hooks – these can be called by other services on domain insert / status change / analysis completion / lead update
func (c *AggregatesCache) InvalidateCampaign(id uuid.UUID) {
	c.mu.Lock()
	delete(c.funnel, id)
	delete(c.metrics, id)
	c.mu.Unlock()
}

// FunnelDTO mirrors CampaignFunnelResponse schema
// All fields are counts (0 is a valid value; no nullable fields required here)
type FunnelDTO struct {
	Generated     int64 `json:"generated"`
	DNSValid      int64 `json:"dnsValid"`
	HTTPValid     int64 `json:"httpValid"`
	KeywordHits   int64 `json:"keywordHits"`
	Analyzed      int64 `json:"analyzed"`
	HighPotential int64 `json:"highPotential"`
	Leads         int64 `json:"leads"`
}

// MetricsDTO mirrors CampaignMetricsResponse
// Percentages / averages are pointers so NULL (no data) is distinguishable from 0
// Counts remain plain integers.
type MetricsDTO struct {
	HighPotential      int64    `json:"highPotential"`
	Leads              int64    `json:"leads"`
	KeywordCoveragePct *float64 `json:"keywordCoveragePct"`
	AvgRichness        *float64 `json:"avgRichness"`
	WarningRatePct     *float64 `json:"warningRatePct"`
	MedianGain         *float64 `json:"medianGain"`
	StuffingCount      int64    `json:"stuffing"`
	RepetitionCount    int64    `json:"repetition"`
	AnchorCount        int64    `json:"anchor"`
	TotalAnalyzed      int64    `json:"totalAnalyzed"`
}

// Repository abstraction (minimal) – adapt if broader store layer exists
// We accept *sql.DB to keep it simple; if a store interface exists we can swap later.

type AggregatesRepository interface {
	DB() *sql.DB
}

// getCampaignFunnel executes / caches the funnel aggregation.
func GetCampaignFunnel(ctx context.Context, repo AggregatesRepository, cache *AggregatesCache, campaignID uuid.UUID) (FunnelDTO, error) {
	var zero FunnelDTO
	// Fast-path cache
	cache.mu.RLock()
	if ce, ok := cache.funnel[campaignID]; ok && time.Since(ce.FetchedAt) < aggregatesTTL {
		cache.mu.RUnlock()
		campaignAggregationCacheHits.WithLabelValues("funnel", "hit").Inc()
		if v, okCast := ce.Data.(FunnelDTO); okCast {
			return v, nil
		}
	} else {
		cache.mu.RUnlock()
		campaignAggregationCacheHits.WithLabelValues("funnel", "miss").Inc()
	}

	q := `SELECT
	    COUNT(*) AS generated,
	    COUNT(*) FILTER (WHERE dns_status = 'ok') AS dns_valid,
	    COUNT(*) FILTER (WHERE http_status = 'ok') AS http_valid,
	    COUNT(*) FILTER (WHERE http_keywords IS NOT NULL
	                     OR (feature_vector ? 'kw_top3' AND jsonb_array_length(feature_vector->'kw_top3') > 0)) AS keyword_hits,
	    COUNT(*) FILTER (WHERE content_richness_score IS NOT NULL) AS analyzed,
	    COUNT(*) FILTER (WHERE content_richness_score IS NOT NULL AND domain_score >= $1) AS high_potential,
	    COUNT(*) FILTER (WHERE lead_status = 'match') AS leads
	  FROM generated_domains
	  WHERE campaign_id = $2`

	ctx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()
	start := time.Now()
	row := repo.DB().QueryRowContext(ctx, q, constants.HighPotentialScoreThreshold, campaignID)
	var dto FunnelDTO
	if err := row.Scan(&dto.Generated, &dto.DNSValid, &dto.HTTPValid, &dto.KeywordHits, &dto.Analyzed, &dto.HighPotential, &dto.Leads); err != nil {
		return zero, err
	}
	campaignAggregationLatency.WithLabelValues("funnel").Observe(time.Since(start).Seconds())

	cache.mu.Lock()
	cache.funnel[campaignID] = cacheEntry{FetchedAt: time.Now(), Data: dto}
	cache.mu.Unlock()

	return dto, nil
}

// GetCampaignMetrics executes / caches the metrics aggregation.
func GetCampaignMetrics(ctx context.Context, repo AggregatesRepository, cache *AggregatesCache, campaignID uuid.UUID) (MetricsDTO, error) {
	var zero MetricsDTO
	cache.mu.RLock()
	if ce, ok := cache.metrics[campaignID]; ok && time.Since(ce.FetchedAt) < aggregatesTTL {
		cache.mu.RUnlock()
		campaignAggregationCacheHits.WithLabelValues("metrics", "hit").Inc()
		if v, okCast := ce.Data.(MetricsDTO); okCast {
			return v, nil
		}
	} else {
		cache.mu.RUnlock()
		campaignAggregationCacheHits.WithLabelValues("metrics", "miss").Inc()
	}

	q := `SELECT
	    COUNT(*) FILTER (WHERE content_richness_score IS NOT NULL AND domain_score >= $1) AS high_potential,
	    COUNT(*) FILTER (WHERE lead_status = 'match') AS leads,
	    COUNT(*) FILTER (WHERE http_keywords IS NOT NULL
	                     OR (feature_vector ? 'kw_top3' AND jsonb_array_length(feature_vector->'kw_top3') > 0)) AS keyword_hits,
	    COUNT(*) FILTER (WHERE content_richness_score IS NOT NULL) AS analyzed,
	    AVG(content_richness_score) AS avg_richness,
	    COUNT(*) FILTER (WHERE content_richness_score IS NOT NULL AND (stuffing_penalty > 0 OR repetition_index > $2 OR anchor_share > $3)) AS warning_domains,
	    COUNT(*) FILTER (WHERE stuffing_penalty > 0) AS stuffing_count,
	    COUNT(*) FILTER (WHERE repetition_index > $2) AS repetition_count,
	    COUNT(*) FILTER (WHERE anchor_share > $3) AS anchor_count,
	    percentile_disc(0.5) WITHIN GROUP (ORDER BY microcrawl_gain_ratio) AS median_gain
	  FROM generated_domains
	  WHERE campaign_id = $4`

	ctx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()
	start := time.Now()
	row := repo.DB().QueryRowContext(ctx, q, constants.HighPotentialScoreThreshold, constants.RepetitionIndexThreshold, constants.AnchorShareThreshold, campaignID)

	var (
		highPotential   int64
		leads           int64
		keywordHits     int64
		analyzed        int64
		avgRichness     sql.NullFloat64
		warningDomains  int64
		stuffingCount   int64
		repetitionCount int64
		anchorCount     int64
		medianGain      sql.NullFloat64
	)

	if err := row.Scan(&highPotential, &leads, &keywordHits, &analyzed, &avgRichness, &warningDomains, &stuffingCount, &repetitionCount, &anchorCount, &medianGain); err != nil {
		return zero, err
	}
	campaignAggregationLatency.WithLabelValues("metrics").Observe(time.Since(start).Seconds())

	var keywordCoveragePct *float64
	var warningRatePct *float64
	var avgRichnessPtr *float64
	var medianGainPtr *float64

	if analyzed > 0 {
		kc := float64(keywordHits) / float64(analyzed)
		wr := float64(warningDomains) / float64(analyzed)
		keywordCoveragePct = &kc
		warningRatePct = &wr
	}
	if avgRichness.Valid {
		v := avgRichness.Float64
		avgRichnessPtr = &v
	}
	if medianGain.Valid {
		v := medianGain.Float64
		medianGainPtr = &v
	}

	dto := MetricsDTO{
		HighPotential:      highPotential,
		Leads:              leads,
		KeywordCoveragePct: keywordCoveragePct,
		AvgRichness:        avgRichnessPtr,
		WarningRatePct:     warningRatePct,
		MedianGain:         medianGainPtr,
		StuffingCount:      stuffingCount,
		RepetitionCount:    repetitionCount,
		AnchorCount:        anchorCount,
		TotalAnalyzed:      analyzed,
	}

	cache.mu.Lock()
	cache.metrics[campaignID] = cacheEntry{FetchedAt: time.Now(), Data: dto}
	cache.mu.Unlock()

	return dto, nil
}

// Invalidation helpers for specific events (optional granular future usage)
func (c *AggregatesCache) InvalidateFunnel(id uuid.UUID) {
	c.mu.Lock()
	delete(c.funnel, id)
	c.mu.Unlock()
}
func (c *AggregatesCache) InvalidateMetrics(id uuid.UUID) {
	c.mu.Lock()
	delete(c.metrics, id)
	c.mu.Unlock()
}

// Errors
var ErrNotFound = errors.New("not found")

// TODO: refine keyword hit heuristic once kw_unique_count column lands
