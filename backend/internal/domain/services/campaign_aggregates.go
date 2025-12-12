package services

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/prometheus/client_golang/prometheus"

	"github.com/google/uuid"
	openapi_types "github.com/oapi-codegen/runtime/types"

	"github.com/fntelecomllc/studio/backend/internal/domain/constants"
	"github.com/fntelecomllc/studio/backend/internal/models"
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

// AggregatesCache holds separate maps for funnel & metrics & new endpoints
// All operations must hold appropriate RW locks.
type AggregatesCache struct {
	mu              sync.RWMutex
	funnel          map[uuid.UUID]cacheEntry
	metrics         map[uuid.UUID]cacheEntry
	classifications map[uuid.UUID]cacheEntry
	momentum        map[uuid.UUID]cacheEntry
	recommendations map[uuid.UUID]cacheEntry
	status          map[uuid.UUID]cacheEntry
}

func NewAggregatesCache() *AggregatesCache {
	registerAggregatesMetricsOnce.Do(func() {
		prometheus.MustRegister(campaignAggregationLatency, campaignAggregationCacheHits)
	})
	return &AggregatesCache{
		funnel:          make(map[uuid.UUID]cacheEntry),
		metrics:         make(map[uuid.UUID]cacheEntry),
		classifications: make(map[uuid.UUID]cacheEntry),
		momentum:        make(map[uuid.UUID]cacheEntry),
		recommendations: make(map[uuid.UUID]cacheEntry),
		status:          make(map[uuid.UUID]cacheEntry),
	}
}

// Invalidation hooks – these can be called by other services on domain insert / status change / analysis completion / lead update
func (c *AggregatesCache) InvalidateCampaign(id uuid.UUID) {
	c.mu.Lock()
	delete(c.funnel, id)
	delete(c.metrics, id)
	delete(c.classifications, id)
	delete(c.momentum, id)
	delete(c.recommendations, id)
	delete(c.status, id)
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

// ClassificationsDTO mirrors CampaignClassificationsResponse schema
type ClassificationsDTO struct {
	Counts  ClassificationCounts   `json:"counts"`
	Samples []ClassificationSample `json:"samples"`
}

type ClassificationCounts struct {
	HighPotential int64 `json:"highPotential"`
	Emerging      int64 `json:"emerging"`
	AtRisk        int64 `json:"atRisk"`
	LeadCandidate int64 `json:"leadCandidate"`
	LowValue      int64 `json:"lowValue"`
	Other         int64 `json:"other"`
}

type ClassificationSample struct {
	Bucket  string                       `json:"bucket"`
	Domains []ClassificationSampleDomain `json:"domains"`
}

type ClassificationSampleDomain struct {
	Domain   string   `json:"domain"`
	Richness *float64 `json:"richness"`
}

// MomentumDTO mirrors CampaignMomentumResponse schema
type MomentumDTO struct {
	MoversUp   []MomentumMover     `json:"moversUp"`
	MoversDown []MomentumMover     `json:"moversDown"`
	Histogram  []MomentumHistogram `json:"histogram"`
}

type MomentumMover struct {
	Domain string  `json:"domain"`
	Delta  float64 `json:"delta"`
}

type MomentumHistogram struct {
	Bucket string `json:"bucket"`
	Count  int64  `json:"count"`
}

// RecommendationsDTO mirrors CampaignRecommendationsResponse schema
type RecommendationsDTO struct {
	Recommendations []Recommendation `json:"recommendations"`
}

type Recommendation struct {
	ID            string `json:"id"`
	Message       string `json:"message"`
	RationaleCode string `json:"rationaleCode"`
	Severity      string `json:"severity"`
}

// StatusDTO mirrors CampaignPhasesStatusResponse schema
type StatusDTO struct {
	CampaignID                openapi_types.UUID `json:"campaignId"`
	OverallProgressPercentage float64            `json:"overallProgressPercentage"`
	Phases                    []PhaseStatusItem  `json:"phases"`
	ErrorMessage              *string            `json:"errorMessage,omitempty"`
}

type PhaseStatusItem struct {
	Phase              string                 `json:"phase"`
	Status             string                 `json:"status"`
	ProgressPercentage float64                `json:"progressPercentage"`
	StartedAt          *time.Time             `json:"startedAt"`
	CompletedAt        *time.Time             `json:"completedAt"`
	FailedAt           *time.Time             `json:"failedAt"`
	ErrorMessage       *string                `json:"errorMessage,omitempty"`
	ErrorDetails       map[string]interface{} `json:"errorDetails,omitempty"`
}

type campaignPhaseRecord struct {
	PhaseType    models.PhaseTypeEnum
	PhaseOrder   int
	Status       string
	Progress     float64
	StartedAt    *time.Time
	CompletedAt  *time.Time
	FailedAt     *time.Time
	ErrorMsg     *string
	ErrorDetails map[string]interface{}
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

	q := `WITH domain_data AS (
	    SELECT
	      gd.dns_status,
	      gd.http_status,
	      gd.http_keywords,
	      COALESCE(def.feature_vector, gd.feature_vector, '{}'::jsonb) AS feature_vector,
	      def.content_richness_score,
	      gd.domain_score,
	      gd.lead_status
	    FROM generated_domains gd
	    LEFT JOIN domain_extraction_features def ON def.domain_id = gd.id
	    WHERE gd.campaign_id = $2
	  )
	  SELECT
	    COUNT(*) AS generated,
	    COUNT(*) FILTER (WHERE dns_status = 'ok') AS dns_valid,
	    COUNT(*) FILTER (WHERE http_status = 'ok') AS http_valid,
	    COUNT(*) FILTER (WHERE http_keywords IS NOT NULL
	                     OR (feature_vector ? 'kw_top3' AND jsonb_array_length(feature_vector->'kw_top3') > 0)) AS keyword_hits,
	    COUNT(*) FILTER (WHERE content_richness_score IS NOT NULL) AS analyzed,
	    COUNT(*) FILTER (WHERE content_richness_score IS NOT NULL AND domain_score >= $1) AS high_potential,
	    COUNT(*) FILTER (WHERE lead_status = 'match') AS leads
	  FROM domain_data`

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

func buildPhaseStatusItem(fallbackType models.PhaseTypeEnum, record *campaignPhaseRecord) PhaseStatusItem {
	phaseName := string(fallbackType)
	status := string(models.PhaseStatusNotStarted)
	progress := 0.0
	var startedAt *time.Time
	var completedAt *time.Time
	var failedAt *time.Time
	var errorMessage *string
	var errorDetails map[string]interface{}

	if record != nil {
		if record.PhaseType != "" {
			phaseName = string(record.PhaseType)
		}
		rawStatus := strings.TrimSpace(record.Status)
		if rawStatus != "" {
			status = rawStatus
		}
		progress = record.Progress
		startedAt = record.StartedAt
		completedAt = record.CompletedAt
		failedAt = record.FailedAt
		errorMessage = record.ErrorMsg
		errorDetails = record.ErrorDetails
	}

	progress = clampProgress(progress)

	if status == string(models.PhaseStatusCompleted) && progress < 100 {
		progress = 100
	}

	if progress >= 100 {
		switch status {
		case string(models.PhaseStatusFailed), string(models.PhaseStatusPaused):
			// Preserve failure/paused terminal states even with 100% progress.
		default:
			status = string(models.PhaseStatusCompleted)
		}
	} else if progress > 0 {
		switch status {
		case string(models.PhaseStatusNotStarted), "":
			status = string(models.PhaseStatusInProgress)
		}
	}

	if status == "" {
		status = string(models.PhaseStatusNotStarted)
	}

	return PhaseStatusItem{
		Phase:              phaseName,
		Status:             status,
		ProgressPercentage: progress,
		StartedAt:          startedAt,
		CompletedAt:        completedAt,
		FailedAt:           failedAt,
		ErrorMessage:       errorMessage,
		ErrorDetails:       errorDetails,
	}
}

func clampProgress(value float64) float64 {
	if value != value || value < 0 { // NaN check via self-comparison.
		return 0
	}
	if value > 100 {
		return 100
	}
	return value
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

	q := `WITH domain_data AS (
	    SELECT
	      gd.domain_score,
	      gd.lead_status,
	      gd.http_keywords,
	      COALESCE(def.feature_vector, gd.feature_vector, '{}'::jsonb) AS feature_vector,
	      def.content_richness_score
	    FROM generated_domains gd
	    LEFT JOIN domain_extraction_features def ON def.domain_id = gd.id
	    WHERE gd.campaign_id = $4
	  )
	  SELECT
	    COUNT(*) FILTER (WHERE content_richness_score IS NOT NULL AND domain_score >= $1) AS high_potential,
	    COUNT(*) FILTER (WHERE lead_status = 'match') AS leads,
	    COUNT(*) FILTER (WHERE http_keywords IS NOT NULL
	                     OR (feature_vector ? 'kw_top3' AND jsonb_array_length(feature_vector->'kw_top3') > 0)) AS keyword_hits,
	    COUNT(*) FILTER (WHERE content_richness_score IS NOT NULL) AS analyzed,
	    AVG(content_richness_score) AS avg_richness,
	    COUNT(*) FILTER (WHERE content_richness_score IS NOT NULL AND ((feature_vector->>'stuffing_penalty')::double precision > 0 OR (feature_vector->>'repetition_index')::double precision > $2 OR (feature_vector->>'anchor_share')::double precision > $3)) AS warning_domains,
	    COUNT(*) FILTER (WHERE (feature_vector->>'stuffing_penalty')::double precision > 0) AS stuffing_count,
	    COUNT(*) FILTER (WHERE (feature_vector->>'repetition_index')::double precision > $2) AS repetition_count,
	    COUNT(*) FILTER (WHERE (feature_vector->>'anchor_share')::double precision > $3) AS anchor_count,
	    percentile_disc(0.5) WITHIN GROUP (ORDER BY (feature_vector->>'microcrawl_gain_ratio')::double precision) AS median_gain
	  FROM domain_data`

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
func (c *AggregatesCache) InvalidateClassifications(id uuid.UUID) {
	c.mu.Lock()
	delete(c.classifications, id)
	c.mu.Unlock()
}
func (c *AggregatesCache) InvalidateMomentum(id uuid.UUID) {
	c.mu.Lock()
	delete(c.momentum, id)
	c.mu.Unlock()
}
func (c *AggregatesCache) InvalidateRecommendations(id uuid.UUID) {
	c.mu.Lock()
	delete(c.recommendations, id)
	c.mu.Unlock()
}
func (c *AggregatesCache) InvalidateStatus(id uuid.UUID) {
	c.mu.Lock()
	delete(c.status, id)
	c.mu.Unlock()
}

// GetCampaignStatus retrieves campaign phase status with overall progress
func GetCampaignStatus(ctx context.Context, repo AggregatesRepository, cache *AggregatesCache, campaignID uuid.UUID) (StatusDTO, error) {
	// Check cache first
	cache.mu.RLock()
	if entry, exists := cache.status[campaignID]; exists {
		if time.Since(entry.FetchedAt) < aggregatesTTL {
			campaignAggregationCacheHits.WithLabelValues("status", "hit").Inc()
			cache.mu.RUnlock()
			return entry.Data.(StatusDTO), nil
		}
	}
	cache.mu.RUnlock()
	campaignAggregationCacheHits.WithLabelValues("status", "miss").Inc()

	start := time.Now()
	query := `SELECT 
		COALESCE(cp.phase_type::text, pe.phase_type::text) AS phase_type,
		COALESCE(cp.phase_order, 0) AS phase_order,
		COALESCE(pe.status::text, cp.status::text) AS status,
		COALESCE(pe.progress_percentage, cp.progress_percentage) AS progress_percentage,
		COALESCE(pe.started_at, cp.started_at) AS started_at,
		COALESCE(pe.completed_at, cp.completed_at) AS completed_at,
		COALESCE(pe.failed_at, cp.failed_at) AS failed_at,
		pe.error_details->>'message' AS error_message,
		pe.error_details
	   FROM campaign_phases cp
	   FULL OUTER JOIN phase_executions pe ON pe.campaign_id = cp.campaign_id AND pe.phase_type = cp.phase_type
	   WHERE COALESCE(cp.campaign_id, pe.campaign_id) = $1
	   ORDER BY COALESCE(cp.phase_order, 0) ASC`

	phaseRecords := make(map[models.PhaseTypeEnum]*campaignPhaseRecord)

	queryCtx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()

	rows, err := repo.DB().QueryContext(queryCtx, query, campaignID)
	if err != nil {
		return StatusDTO{}, err
	}
	defer rows.Close()

	for rows.Next() {
		var (
			phaseTypeStr    sql.NullString
			phaseOrder      int
			status          sql.NullString
			progressRaw     sql.NullFloat64
			startedRaw      sql.NullTime
			completedRaw    sql.NullTime
			failedRaw       sql.NullTime
			errorRaw        sql.NullString
			errorDetailsRaw []byte
		)

		if err := rows.Scan(&phaseTypeStr, &phaseOrder, &status, &progressRaw, &startedRaw, &completedRaw, &failedRaw, &errorRaw, &errorDetailsRaw); err != nil {
			return StatusDTO{}, err
		}

		if !phaseTypeStr.Valid || phaseTypeStr.String == "" {
			continue
		}

		record := &campaignPhaseRecord{
			PhaseType:  models.PhaseTypeEnum(phaseTypeStr.String),
			PhaseOrder: phaseOrder,
		}
		if status.Valid {
			record.Status = status.String
		}
		if progressRaw.Valid {
			record.Progress = progressRaw.Float64
		}
		if startedRaw.Valid {
			started := startedRaw.Time
			record.StartedAt = &started
		}
		if completedRaw.Valid {
			completed := completedRaw.Time
			record.CompletedAt = &completed
		}
		if failedRaw.Valid {
			failed := failedRaw.Time
			record.FailedAt = &failed
		}
		if errorRaw.Valid {
			err := errorRaw.String
			record.ErrorMsg = &err
		}
		if len(errorDetailsRaw) > 0 {
			var details map[string]interface{}
			if err := json.Unmarshal(errorDetailsRaw, &details); err == nil {
				record.ErrorDetails = details
			}
		}

		phaseRecords[record.PhaseType] = record
	}

	if err := rows.Err(); err != nil {
		return StatusDTO{}, err
	}

	defaultOrder := []models.PhaseTypeEnum{
		models.PhaseTypeDomainGeneration,
		models.PhaseTypeDNSValidation,
		models.PhaseTypeHTTPKeywordValidation,
		models.PhaseTypeExtraction,
		models.PhaseTypeAnalysis,
		models.PhaseTypeEnrichment,
	}

	phases := make([]PhaseStatusItem, 0, len(defaultOrder)+len(phaseRecords))
	totalProgress := 0.0
	phaseCount := 0

	for _, phaseType := range defaultOrder {
		var record *campaignPhaseRecord
		if existing, ok := phaseRecords[phaseType]; ok {
			record = existing
			delete(phaseRecords, phaseType)
		}

		item := buildPhaseStatusItem(phaseType, record)
		phases = append(phases, item)
		totalProgress += item.ProgressPercentage
		phaseCount++
	}

	if len(phaseRecords) > 0 {
		leftovers := make([]*campaignPhaseRecord, 0, len(phaseRecords))
		for _, record := range phaseRecords {
			leftovers = append(leftovers, record)
		}
		sort.SliceStable(leftovers, func(i, j int) bool {
			oi := leftovers[i].PhaseOrder
			oj := leftovers[j].PhaseOrder
			switch {
			case oi == 0 && oj == 0:
				return strings.Compare(string(leftovers[i].PhaseType), string(leftovers[j].PhaseType)) < 0
			case oi == 0:
				return false
			case oj == 0:
				return true
			default:
				if oi == oj {
					return strings.Compare(string(leftovers[i].PhaseType), string(leftovers[j].PhaseType)) < 0
				}
				return oi < oj
			}
		})

		for _, record := range leftovers {
			item := buildPhaseStatusItem(record.PhaseType, record)
			phases = append(phases, item)
			totalProgress += item.ProgressPercentage
			phaseCount++
		}
	}

	overallProgress := 0.0
	if phaseCount > 0 {
		overallProgress = clampProgress(totalProgress / float64(phaseCount))
	}

	var campaignError sql.NullString
	if err := repo.DB().QueryRowContext(ctx, `SELECT error_message FROM lead_generation_campaigns WHERE id = $1`, campaignID).Scan(&campaignError); err != nil {
		if err != sql.ErrNoRows {
			return StatusDTO{}, err
		}
	}

	dto := StatusDTO{
		CampaignID:                openapi_types.UUID(campaignID),
		OverallProgressPercentage: overallProgress,
		Phases:                    phases,
	}
	if campaignError.Valid {
		errMsg := campaignError.String
		dto.ErrorMessage = &errMsg
	}

	campaignAggregationLatency.WithLabelValues("status").Observe(time.Since(start).Seconds())

	cache.mu.Lock()
	cache.status[campaignID] = cacheEntry{FetchedAt: time.Now(), Data: dto}
	cache.mu.Unlock()

	return dto, nil
}

// GetCampaignClassifications retrieves classification buckets with sample domains (limit=5 per bucket)
func GetCampaignClassifications(ctx context.Context, repo AggregatesRepository, cache *AggregatesCache, campaignID uuid.UUID) (ClassificationsDTO, error) {
	// Check cache first
	cache.mu.RLock()
	if entry, exists := cache.classifications[campaignID]; exists {
		if time.Since(entry.FetchedAt) < aggregatesTTL {
			campaignAggregationCacheHits.WithLabelValues("classifications", "hit").Inc()
			cache.mu.RUnlock()
			return entry.Data.(ClassificationsDTO), nil
		}
	}
	cache.mu.RUnlock()
	campaignAggregationCacheHits.WithLabelValues("classifications", "miss").Inc()

	start := time.Now()

	// For now, return mock data until we implement the full classification logic
	// TODO: Implement real classification logic based on domain analysis
	dto := ClassificationsDTO{
		Counts: ClassificationCounts{
			HighPotential: 25,
			Emerging:      15,
			AtRisk:        8,
			LeadCandidate: 12,
			LowValue:      40,
			Other:         10,
		},
		Samples: []ClassificationSample{
			{
				Bucket: "highPotential",
				Domains: []ClassificationSampleDomain{
					{Domain: "example1.com", Richness: float64Ptr(0.85)},
					{Domain: "example2.com", Richness: float64Ptr(0.92)},
				},
			},
		},
	}

	campaignAggregationLatency.WithLabelValues("classifications").Observe(time.Since(start).Seconds())

	cache.mu.Lock()
	cache.classifications[campaignID] = cacheEntry{FetchedAt: time.Now(), Data: dto}
	cache.mu.Unlock()

	return dto, nil
}

// GetCampaignMomentum retrieves momentum analysis with top movers and histogram
func GetCampaignMomentum(ctx context.Context, repo AggregatesRepository, cache *AggregatesCache, campaignID uuid.UUID) (MomentumDTO, error) {
	// Check cache first
	cache.mu.RLock()
	if entry, exists := cache.momentum[campaignID]; exists {
		if time.Since(entry.FetchedAt) < aggregatesTTL {
			campaignAggregationCacheHits.WithLabelValues("momentum", "hit").Inc()
			cache.mu.RUnlock()
			return entry.Data.(MomentumDTO), nil
		}
	}
	cache.mu.RUnlock()
	campaignAggregationCacheHits.WithLabelValues("momentum", "miss").Inc()

	start := time.Now()

	// Return empty data until momentum analysis is implemented
	// TODO: Implement real momentum calculation based on richness score deltas
	// Momentum requires historical score snapshots which are not yet tracked
	dto := MomentumDTO{
		MoversUp:   []MomentumMover{},
		MoversDown: []MomentumMover{},
		Histogram:  []MomentumHistogram{},
	}

	campaignAggregationLatency.WithLabelValues("momentum").Observe(time.Since(start).Seconds())

	cache.mu.Lock()
	cache.momentum[campaignID] = cacheEntry{FetchedAt: time.Now(), Data: dto}
	cache.mu.Unlock()

	return dto, nil
}

// GetCampaignRecommendations retrieves actionable recommendations based on funnel ratios and warnings
func GetCampaignRecommendations(ctx context.Context, repo AggregatesRepository, cache *AggregatesCache, campaignID uuid.UUID) (RecommendationsDTO, error) {
	// Check cache first
	cache.mu.RLock()
	if entry, exists := cache.recommendations[campaignID]; exists {
		if time.Since(entry.FetchedAt) < aggregatesTTL {
			campaignAggregationCacheHits.WithLabelValues("recommendations", "hit").Inc()
			cache.mu.RUnlock()
			return entry.Data.(RecommendationsDTO), nil
		}
	}
	cache.mu.RUnlock()
	campaignAggregationCacheHits.WithLabelValues("recommendations", "miss").Inc()

	start := time.Now()

	// Get funnel and metrics to generate recommendations
	funnel, err := GetCampaignFunnel(ctx, repo, cache, campaignID)
	if err != nil {
		return RecommendationsDTO{}, err
	}

	metrics, err := GetCampaignMetrics(ctx, repo, cache, campaignID)
	if err != nil {
		return RecommendationsDTO{}, err
	}

	var recommendations []Recommendation

	// DNS validation rate too low
	if funnel.Generated > 0 && float64(funnel.DNSValid)/float64(funnel.Generated) < 0.7 {
		recommendations = append(recommendations, Recommendation{
			ID:            "rec-001",
			Message:       "DNS validation rate is below 70%. Consider reviewing domain generation patterns.",
			RationaleCode: "R_DNS_LOW",
			Severity:      "warning",
		})
	}

	// HTTP validation rate too low
	if funnel.DNSValid > 0 && float64(funnel.HTTPValid)/float64(funnel.DNSValid) < 0.8 {
		recommendations = append(recommendations, Recommendation{
			ID:            "rec-002",
			Message:       "HTTP validation rate is below 80%. Check for connectivity issues or blocked requests.",
			RationaleCode: "R_HTTP_LOW",
			Severity:      "warning",
		})
	}

	// Few high potential domains
	if funnel.Analyzed > 100 && funnel.HighPotential < 10 {
		recommendations = append(recommendations, Recommendation{
			ID:            "rec-003",
			Message:       "Very few high-potential domains found. Consider adjusting targeting criteria.",
			RationaleCode: "R_FEW_HIGH_POTENTIAL",
			Severity:      "action",
		})
	}

	// High warning rate
	if metrics.WarningRatePct != nil && *metrics.WarningRatePct > 30.0 {
		recommendations = append(recommendations, Recommendation{
			ID:            "rec-004",
			Message:       "Warning rate exceeds 30%. Review domain quality filters.",
			RationaleCode: "R_WARNING_RATE_HIGH",
			Severity:      "warning",
		})
	}

	// No leads generated
	if funnel.Analyzed > 50 && funnel.Leads == 0 {
		recommendations = append(recommendations, Recommendation{
			ID:            "rec-005",
			Message:       "No leads generated yet. Consider lowering qualification thresholds.",
			RationaleCode: "R_NO_LEADS",
			Severity:      "action",
		})
	}

	// All clear case
	if len(recommendations) == 0 {
		recommendations = append(recommendations, Recommendation{
			ID:            "rec-000",
			Message:       "Campaign performance looks good. All metrics are within expected ranges.",
			RationaleCode: "R_ALL_CLEAR",
			Severity:      "info",
		})
	}

	dto := RecommendationsDTO{
		Recommendations: recommendations,
	}

	campaignAggregationLatency.WithLabelValues("recommendations").Observe(time.Since(start).Seconds())

	cache.mu.Lock()
	cache.recommendations[campaignID] = cacheEntry{FetchedAt: time.Now(), Data: dto}
	cache.mu.Unlock()

	return dto, nil
}

// Helper to create *float64 from float64
func float64Ptr(f float64) *float64 {
	return &f
}

// Helper to create *time.Time from time.Time
func timePtr(t time.Time) *time.Time {
	return &t
}

// Errors
var ErrNotFound = errors.New("not found")

// TODO: refine keyword hit heuristic once kw_unique_count column lands
