// HTTP Validation Service - orchestrates httpvalidator.HTTPValidator engine
package services

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"sort"
	"strings"
	"sync"
	"time"

	"bytes"
	"net/http"
	"net/url"
	"strconv"

	"github.com/prometheus/client_golang/prometheus"

	"github.com/fntelecomllc/studio/backend/internal/keywordscanner"
	"golang.org/x/net/html"

	"github.com/fntelecomllc/studio/backend/internal/httpvalidator"
	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/fntelecomllc/studio/backend/internal/store"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

// Threshold for diminishing returns ratio; can be tuned as needed.
const diminishingReturnsThreshold = 1.15

// computeDiminishingReturns determines if keyword growth is below threshold given baseline and added counts.
// Rules:
//   - if pagesExamined < 2 => false (need at least 2 pages to judge trend)
//   - if baseline == 0: true only if added < 2 (crawl yielded almost nothing)
//   - else: growth ratio = (baseline+added)/baseline; diminishing if ratio < threshold
func computeDiminishingReturns(baseline, added, pagesExamined int) bool {
	if pagesExamined < 2 {
		return false
	}
	if baseline <= 0 {
		return added < 2
	}
	ratio := float64(baseline+added) / float64(baseline)
	return ratio < diminishingReturnsThreshold
}

// httpValidationService orchestrates the HTTP validation engine
// It wraps httpvalidator.HTTPValidator without replacing its core functionality
type httpValidationService struct {
	store         store.CampaignStore
	personaStore  store.PersonaStore
	proxyStore    store.ProxyStore
	deps          Dependencies
	httpValidator *httpvalidator.HTTPValidator
	// keyword scanner (lazy init)
	kwScanner *keywordscanner.Service

	// metrics (registered once globally)
	metricsOnce sync.Once
	mtx         struct {
		fetchOutcome      *prometheus.CounterVec
		fetchAlias        *prometheus.CounterVec
		microCrawl        prometheus.Counter
		microCrawlReasons *prometheus.CounterVec
		// ROI-oriented micro-crawl metrics (new)
		microCrawlSuccesses    prometheus.Counter   // micro-crawl triggers that yielded >0 new unique keywords
		microCrawlAddedKw      prometheus.Counter   // total new unique keywords contributed by micro-crawl
		microCrawlNewPatterns  prometheus.Counter   // same as AddedKw but kept distinct for future divergence (pattern vs keyword normalization)
		microCrawlGrowthRatio  prometheus.Histogram // distribution of kw growth ratios (post / baseline) when baseline >0
		microCrawlZeroSuccess  prometheus.Counter   // micro-crawl triggers that produced zero new keywords (for success rate denominator)
		parkedDetection        *prometheus.CounterVec
		enrichmentBatches      prometheus.Counter
		enrichmentBatchSeconds prometheus.ObserverVec
		phaseDuration          prometheus.Histogram
		microCrawlPages        *prometheus.CounterVec
		microCrawlPagesHist    prometheus.Histogram
		enrichmentDropped      *prometheus.CounterVec
		validationBatchSeconds prometheus.Histogram
		phaseDurationVec       *prometheus.HistogramVec
	}

	// Execution tracking per campaign
	mu         sync.RWMutex
	executions map[uuid.UUID]*httpValidationExecution
	status     models.PhaseStatusEnum
}

type keywordCount struct {
	keyword string
	count   int
}

func topKeywordsFromCounts(counts map[string]int, limit int) []string {
	if len(counts) == 0 || limit <= 0 {
		return nil
	}
	list := make([]keywordCount, 0, len(counts))
	for k, v := range counts {
		if v <= 0 || k == "" {
			continue
		}
		list = append(list, keywordCount{keyword: k, count: v})
	}
	if len(list) == 0 {
		return nil
	}
	sort.Slice(list, func(i, j int) bool {
		if list[i].count == list[j].count {
			return list[i].keyword < list[j].keyword
		}
		return list[i].count > list[j].count
	})
	if len(list) > limit {
		list = list[:limit]
	}
	out := make([]string, len(list))
	for i, kv := range list {
		out[i] = kv.keyword
	}
	return out
}

// ensureMetricsRegistered wraps metricsOnce.Do for testability (allows unit tests to trigger registration
// without executing a full validation run). Safe to call multiple times.
func (s *httpValidationService) ensureMetricsRegistered() {
	s.metricsOnce.Do(func() {
		s.mtx.fetchOutcome = prometheus.NewCounterVec(prometheus.CounterOpts{
			Name: "http_validation_fetch_outcomes_total",
			Help: "HTTP validation fetch outcomes (status label: ok|error|timeout)",
		}, []string{"status"})
		s.mtx.fetchAlias = prometheus.NewCounterVec(prometheus.CounterOpts{
			Name: "http_fetch_result_total",
			Help: "Alias of http_validation_fetch_outcomes_total (status label: ok|error|timeout)",
		}, []string{"status"})
		s.mtx.microCrawl = prometheus.NewCounter(prometheus.CounterOpts{Name: "http_validation_microcrawl_triggers_total", Help: "Number of micro-crawl trigger executions (legacy, will deprecate)"})
		s.mtx.microCrawlReasons = prometheus.NewCounterVec(prometheus.CounterOpts{Name: "microcrawl_trigger_total", Help: "Micro-crawl triggers by reason"}, []string{"reason"})
		s.mtx.microCrawlSuccesses = prometheus.NewCounter(prometheus.CounterOpts{Name: "http_microcrawl_successes_total", Help: "Micro-crawl executions that produced at least one new unique keyword"})
		s.mtx.microCrawlAddedKw = prometheus.NewCounter(prometheus.CounterOpts{Name: "http_microcrawl_added_keywords_total", Help: "Total count of new unique keywords contributed by micro-crawl across domains"})
		s.mtx.microCrawlNewPatterns = prometheus.NewCounter(prometheus.CounterOpts{Name: "http_microcrawl_new_patterns_total", Help: "Total count of new unique keyword patterns discovered via micro-crawl (alias of added keywords for now)"})
		s.mtx.microCrawlGrowthRatio = prometheus.NewHistogram(prometheus.HistogramOpts{Name: "http_microcrawl_kw_growth_ratio", Help: "Observed keyword growth ratio (post/baseline) for micro-crawl successes where baseline >0", Buckets: []float64{0.5, 0.8, 1.0, 1.1, 1.2, 1.5, 2, 3, 5}})
		s.mtx.microCrawlZeroSuccess = prometheus.NewCounter(prometheus.CounterOpts{Name: "http_microcrawl_zero_success_total", Help: "Micro-crawl executions that examined pages but yielded zero new keywords"})
		s.mtx.parkedDetection = prometheus.NewCounterVec(prometheus.CounterOpts{Name: "parked_detection_total", Help: "Parked detection outcomes"}, []string{"result"})
		s.mtx.enrichmentBatches = prometheus.NewCounter(prometheus.CounterOpts{Name: "http_enrichment_batches_total", Help: "Number of enrichment feature vector persistence batches"})
		s.mtx.enrichmentBatchSeconds = prometheus.NewHistogramVec(prometheus.HistogramOpts{Name: "http_enrichment_batch_seconds", Help: "Duration of enrichment batch persistence"}, []string{"status"})
		s.mtx.phaseDuration = prometheus.NewHistogram(prometheus.HistogramOpts{Name: "http_validation_phase_seconds", Help: "Elapsed time of full HTTP validation phase"})
		s.mtx.phaseDurationVec = prometheus.NewHistogramVec(prometheus.HistogramOpts{Name: "campaign_phase_duration_seconds", Help: "Generic campaign phase durations"}, []string{"phase"})
		s.mtx.enrichmentDropped = prometheus.NewCounterVec(prometheus.CounterOpts{Name: "http_enrichment_dropped_total", Help: "Enrichment skipped cause=no_body|parse_error"}, []string{"cause"})
		s.mtx.validationBatchSeconds = prometheus.NewHistogram(prometheus.HistogramOpts{Name: "http_validation_batch_seconds", Help: "Duration of ValidateDomainsBulk per batch"})
		s.mtx.microCrawlPages = prometheus.NewCounterVec(prometheus.CounterOpts{Name: "http_microcrawl_pages_total", Help: "Total micro-crawl secondary pages grouped by exhaustion result"}, []string{"result"})
		s.mtx.microCrawlPagesHist = prometheus.NewHistogram(prometheus.HistogramOpts{Name: "http_microcrawl_pages_per_domain", Help: "Pages examined per micro-crawl trigger", Buckets: []float64{1, 2, 3, 4, 5, 8, 13}})
		prometheus.MustRegister(
			s.mtx.fetchOutcome,
			s.mtx.fetchAlias,
			s.mtx.microCrawl,
			s.mtx.microCrawlReasons,
			s.mtx.microCrawlSuccesses,
			s.mtx.microCrawlAddedKw,
			s.mtx.microCrawlNewPatterns,
			s.mtx.microCrawlGrowthRatio,
			s.mtx.microCrawlZeroSuccess,
			s.mtx.parkedDetection,
			s.mtx.enrichmentBatches,
			s.mtx.enrichmentBatchSeconds,
			s.mtx.phaseDuration,
			s.mtx.phaseDurationVec,
			s.mtx.enrichmentDropped,
			s.mtx.microCrawlPages,
			s.mtx.microCrawlPagesHist,
			s.mtx.validationBatchSeconds,
		)
	})
}

// ---- Enrichment & Scoring Integration (ANCHOR STUBS - AUDITED) ----
// NOTE: The actual enrichment + micro-crawl logic now exists further below in this
// file (feature vector assembly, parkedHeuristic closure, microCrawlEnhance, bulk
// persist). These legacy stub placeholders remain only as architectural guardrails.
// TODO(ENRICHMENT-CLEANUP): After confirming no external callers rely on these names,
// remove buildFeatureVectorFromPage / applyParkedHeuristic / maybeAdaptiveMicroCrawl
// to eliminate confusion, or repoint them to thin wrappers around the implemented
// logic for backwards compatibility.

// buildFeatureVectorFromPage constructs a partial feature vector for a single root page.
// TODO(ENRICHMENT-P1): implement real extraction of structural & keyword metrics.
func buildFeatureVectorFromPage(rawHTML []byte) map[string]any { // DEPRECATED STUB
	// Existing production path builds feature vectors inline in Execute loop (see ~560+).
	if len(rawHTML) == 0 {
		return map[string]any{"empty": true}
	}
	return map[string]any{"bytes": len(rawHTML)}
}

// applyParkedHeuristic returns (isParked, confidence). Confidence in [0,1].
// TODO(ENRICHMENT-P1): real heuristic using title phrases, repetition, parking lexicon.
func applyParkedHeuristic(text string) (bool, float64) { // DEPRECATED STUB (real heuristic closure inline later)
	lowered := strings.ToLower(text)
	tokens := []string{"buy this domain", "domain for sale", "parking"}
	for _, t := range tokens {
		if strings.Contains(lowered, t) {
			return true, 0.85
		}
	}
	return false, 0.10
}

// realParkedHeuristic implements the production parked detection scoring used in enrichment.
// Extracted for unit testing. Returns (isParked, confidence [0..1]).
func realParkedHeuristic(title string, snippet string) (bool, float64) {
	if title == "" && snippet == "" {
		return false, 0
	}
	lt := strings.ToLower(title)
	ls := strings.ToLower(snippet)
	signals := 0
	total := 0
	scoreIf := func(cond bool, weight int) {
		if cond {
			signals += weight
		}
		total += weight
	}
	scoreIf(strings.Contains(lt, "parked"), 3)
	scoreIf(strings.Contains(lt, "buy this domain"), 4)
	scoreIf(strings.Contains(ls, "sedo"), 2)
	scoreIf(strings.Contains(ls, "namecheap"), 1)
	scoreIf(strings.Contains(ls, "godaddy"), 1)
	// "coming soon" may appear in either title or snippet; treat either as a parking signal.
	scoreIf(strings.Contains(lt, "coming soon") || strings.Contains(ls, "coming soon"), 2)
	if total == 0 {
		return false, 0
	}
	conf := float64(signals) / float64(total)
	// Threshold rationale: with current static denominator (sum of all weights = 13),
	// we want at least a moderately strong composite or a single strongest phrase
	// ("buy this domain") to qualify. That phrase alone scores 4/13 ≈ 0.3077.
	// Setting threshold at 0.30 classifies that explicit parking intent phrase
	// while excluding weaker single keywords (e.g. just "parked" = 3/13 ≈ 0.23).
	return conf >= 0.30, conf
}

// maybeAdaptiveMicroCrawl optionally fetches a small set of internal pages to enrich signals.
// It MUST honor byte/page limits and return quickly on errors. All network operations
// should reuse existing persona/proxy selection from the main validator path.
// TODO(ENRICHMENT-P2): implement link scoring + budgeted fetch. For now returns no extra data.
func (s *httpValidationService) maybeAdaptiveMicroCrawl(ctx context.Context, campaignID uuid.UUID, rootURL *url.URL, rootSignals map[string]any) (map[string]any, error) { // IMPLEMENTED
	if ctx.Err() != nil {
		return nil, ctx.Err()
	}
	if rootURL == nil || s.kwScanner == nil {
		return nil, nil
	}
	// Feature flag gate
	if !isFeatureEnabled("ENABLE_HTTP_MICROCRAWL") {
		return nil, nil
	}
	// Limits (can be tuned via env later)
	maxPages := 3
	byteBudget := 60000 // 60KB total across secondary pages
	if v := os.Getenv("MICROCRAWL_MAX_PAGES"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 && n <= 10 {
			maxPages = n
		}
	}
	if v := os.Getenv("MICROCRAWL_BYTE_BUDGET"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 1024 && n <= 500000 {
			byteBudget = n
		}
	}
	// Extract links from rootSignals if already parsed; else bail (we avoid reparsing root HTML here for simplicity)
	// Future: rootSignals could include an "internal_links" slice. For now we perform a focused fetch on a small set of guessed paths.
	candidates := []string{
		rootURL.Scheme + "://" + rootURL.Host + "/about",
		rootURL.Scheme + "://" + rootURL.Host + "/contact",
		rootURL.Scheme + "://" + rootURL.Host + "/products",
	}
	seen := make(map[string]struct{}, len(candidates))
	filtered := make([]string, 0, len(candidates))
	for _, c := range candidates {
		if _, ok := seen[c]; ok {
			continue
		}
		seen[c] = struct{}{}
		filtered = append(filtered, c)
		if len(filtered) >= maxPages {
			break
		}
	}
	if len(filtered) == 0 {
		return nil, nil
	}
	client := &http.Client{Timeout: 5 * time.Second}
	bytesUsed := 0
	keywordPatterns := make(map[string]struct{}, 32)
	pagesExamined := 0
	var exec store.Querier
	if q, ok := s.deps.DB.(store.Querier); ok {
		exec = q
	}
	for _, link := range filtered {
		if ctx.Err() != nil {
			return nil, ctx.Err()
		}
		if bytesUsed >= byteBudget {
			break
		}
		req, _ := http.NewRequestWithContext(ctx, "GET", link, nil)
		resp, err := client.Do(req)
		if err != nil {
			continue
		}
		body, _ := io.ReadAll(io.LimitReader(resp.Body, int64(byteBudget-bytesUsed)))
		_ = resp.Body.Close()
		pagesExamined++
		bytesUsed += len(body)
		if len(body) == 0 {
			continue
		}
		// Keyword scanning (reuse existing root keyword sets if rootSignals contains a hint)
		// We look for presence of dynamic slice rootSignals["ad_hoc_keywords"] if any
		if ks, ok := rootSignals["ad_hoc_keywords"].([]string); ok && len(ks) > 0 {
			if adh, err := s.kwScanner.ScanAdHocKeywords(ctx, body, ks); err == nil {
				for _, p := range adh {
					keywordPatterns[p] = struct{}{}
				}
			}
		}
		if ids, ok := rootSignals["keyword_set_ids"].([]string); ok && len(ids) > 0 {
			if hitsBySet, err := s.kwScanner.ScanBySetIDs(ctx, exec, body, ids); err == nil {
				for _, patterns := range hitsBySet {
					for _, p := range patterns {
						keywordPatterns[p] = struct{}{}
					}
				}
			}
		}
		if pagesExamined >= maxPages {
			break
		}
	}
	if pagesExamined == 0 || len(keywordPatterns) == 0 {
		return map[string]any{"microcrawl_pages": pagesExamined, "microcrawl_keywords": 0}, nil
	}
	merged := make([]string, 0, len(keywordPatterns))
	for p := range keywordPatterns {
		merged = append(merged, p)
	}
	return map[string]any{
		"microcrawl_pages":    pagesExamined,
		"microcrawl_keywords": len(merged),
		"microcrawl_patterns": merged,
	}, nil
}

// mergeFeatureVectors shallow-merges secondary into primary without overwriting existing keys.
// (In later iterations we may weight contributions.)
func mergeFeatureVectors(primary, secondary map[string]any) map[string]any {
	if primary == nil {
		return secondary
	}
	for k, v := range secondary {
		if _, exists := primary[k]; !exists {
			primary[k] = v
		}
	}
	return primary
}

// ---- End Enrichment & Scoring Integration (ANCHOR STUBS) ----

// httpValidationExecution tracks HTTP validation execution state
type httpValidationExecution struct {
	CampaignID     uuid.UUID                         `json:"campaign_id"`
	Status         models.PhaseStatusEnum            `json:"status"`
	StartedAt      time.Time                         `json:"started_at"`
	CompletedAt    *time.Time                        `json:"completed_at,omitempty"`
	Progress       float64                           `json:"progress"`
	ItemsProcessed int                               `json:"items_processed"`
	ItemsTotal     int                               `json:"items_total"`
	ErrorMessage   string                            `json:"error_message,omitempty"`
	Results        []*httpvalidator.ValidationResult `json:"results,omitempty"`
	CancelChan     chan struct{}                     `json:"-"`
	ProgressChan   chan PhaseProgress                `json:"-"`
}

// NewHTTPValidationService creates a new HTTP validation service
func NewHTTPValidationService(store store.CampaignStore, deps Dependencies, httpValidator *httpvalidator.HTTPValidator, personaStore store.PersonaStore, proxyStore store.ProxyStore, keywordStore store.KeywordStore) HTTPValidationService {
	return &httpValidationService{
		store:         store,
		personaStore:  personaStore,
		proxyStore:    proxyStore,
		deps:          deps,
		httpValidator: httpValidator,
		executions:    make(map[uuid.UUID]*httpValidationExecution),
		status:        models.PhaseStatusNotStarted,
		kwScanner: func() *keywordscanner.Service {
			if keywordStore != nil {
				return keywordscanner.NewService(keywordStore)
			}
			return nil
		}(),
	}
}

// GetPhaseType returns the phase type this service handles
func (s *httpValidationService) GetPhaseType() models.PhaseTypeEnum {
	return models.PhaseTypeHTTPKeywordValidation
}

// Configure sets up HTTP validation configuration for a campaign
func (s *httpValidationService) Configure(ctx context.Context, campaignID uuid.UUID, config interface{}) error {
	s.deps.Logger.Info(ctx, "Configuring HTTP validation service", map[string]interface{}{
		"campaign_id": campaignID,
	})

	// Observe DNS phase status; allow configuration even if discovery/DNS still pending
	if s.store != nil {
		var exec store.Querier
		if q, ok := s.deps.DB.(store.Querier); ok {
			exec = q
		}
		phase, err := s.store.GetCampaignPhase(ctx, exec, campaignID, models.PhaseTypeDNSValidation)
		if err != nil {
			return fmt.Errorf("failed to inspect DNS phase status: %w", err)
		}
		if phase == nil || phase.Status != models.PhaseStatusCompleted {
			if s.deps.Logger != nil {
				dnsStatus := "unknown"
				if phase != nil {
					dnsStatus = string(phase.Status)
				}
				s.deps.Logger.Info(ctx, "HTTP validation configuration stored while DNS phase pending", map[string]interface{}{
					"campaign_id": campaignID,
					"dns_status":  dnsStatus,
				})
			}
		}
	}

	// Type assert the configuration
	httpConfig, ok := config.(*models.HTTPPhaseConfigRequest)
	if !ok {
		return fmt.Errorf("invalid configuration type for HTTP validation: expected *models.HTTPPhaseConfigRequest")
	}

	// Validate configuration
	if err := s.Validate(ctx, httpConfig); err != nil {
		return fmt.Errorf("configuration validation failed: %w", err)
	}

	// Create or update in-memory configured execution (without starting)
	s.mu.Lock()
	if exec, exists := s.executions[campaignID]; exists {
		// Preserve any prior results but reset status to Configured
		exec.Status = models.PhaseStatusConfigured
	} else {
		s.executions[campaignID] = &httpValidationExecution{
			CampaignID:     campaignID,
			Status:         models.PhaseStatusConfigured,
			ItemsProcessed: 0,
			ItemsTotal:     0, // Will be filled on Execute when domains known
			Progress:       0,
		}
	}
	s.mu.Unlock()

	// Store configuration in campaign phases
	if s.store != nil {
		raw, marshalErr := json.Marshal(httpConfig)
		if marshalErr != nil {
			return fmt.Errorf("failed to marshal http validation config: %w", marshalErr)
		}
		var exec store.Querier
		if q, ok := s.deps.DB.(store.Querier); ok {
			exec = q
		}
		if err := s.store.UpdatePhaseConfiguration(ctx, exec, campaignID, models.PhaseTypeHTTPKeywordValidation, raw); err != nil {
			return fmt.Errorf("failed to persist http validation config: %w", err)
		}
	}
	s.deps.Logger.Info(ctx, "HTTP validation configuration stored", map[string]interface{}{
		"campaign_id":       campaignID,
		"persona_count":     len(httpConfig.PersonaIDs),
		"keyword_set_count": len(httpConfig.KeywordSetIDs),
		"keyword_count":     len(httpConfig.Keywords),
		"adhoc_keywords":    len(httpConfig.AdHocKeywords),
	})

	return nil
}

// Validate validates HTTP validation configuration
func (s *httpValidationService) Validate(ctx context.Context, config interface{}) error {
	httpConfig, ok := config.(*models.HTTPPhaseConfigRequest)
	if !ok {
		return fmt.Errorf("invalid configuration type: expected *models.HTTPPhaseConfigRequest")
	}

	// Validate personas exist and are HTTP type
	if len(httpConfig.PersonaIDs) == 0 {
		return fmt.Errorf("at least one persona ID must be provided")
	}

	// Validate at least some keywords are provided
	totalKeywords := len(httpConfig.Keywords) + len(httpConfig.AdHocKeywords) + len(httpConfig.KeywordSetIDs)
	if totalKeywords == 0 {
		return fmt.Errorf("at least one keyword (predefined or ad-hoc) must be provided")
	}

	s.deps.Logger.Debug(ctx, "HTTP validation configuration validated", map[string]interface{}{
		"persona_count":     len(httpConfig.PersonaIDs),
		"keyword_count":     len(httpConfig.Keywords),
		"keyword_set_count": len(httpConfig.KeywordSetIDs),
		"adhoc_keywords":    len(httpConfig.AdHocKeywords),
		"total_keywords":    totalKeywords,
	})

	return nil
}

// Execute starts HTTP validation for a campaign
func (s *httpValidationService) Execute(ctx context.Context, campaignID uuid.UUID) (<-chan PhaseProgress, error) {
	s.deps.Logger.Info(ctx, "Starting HTTP validation execution", map[string]interface{}{
		"campaign_id": campaignID,
	})

	// Enforce phase order at runtime as a hard precondition
	if err := s.ensureDNSCompleted(ctx, campaignID); err != nil {
		return nil, fmt.Errorf("cannot start HTTP validation before DNS validation completes: %w", err)
	}

	// Handle existing execution state (Configured -> InProgress transition, idempotent restarts)
	reuseExisting := false
	s.mu.Lock()
	if existing, exists := s.executions[campaignID]; exists {
		switch existing.Status {
		case models.PhaseStatusInProgress:
			// Idempotent: attach to existing execution instead of treating as error (Blocker B2)
			ch := existing.ProgressChan
			s.mu.Unlock()
			s.deps.Logger.Debug(ctx, "HTTP validation Execute idempotent attach to existing in-progress execution", map[string]interface{}{"campaign_id": campaignID})
			return ch, nil
		case models.PhaseStatusConfigured:
			// Transition configured stub to active execution
			existing.Status = models.PhaseStatusInProgress
			existing.StartedAt = time.Now()
			existing.Progress = 0
			existing.ItemsProcessed = 0
			if existing.CancelChan == nil {
				existing.CancelChan = make(chan struct{})
			}
			if existing.ProgressChan == nil {
				existing.ProgressChan = make(chan PhaseProgress, 100)
			}
			reuseExisting = true
		case models.PhaseStatusCompleted, models.PhaseStatusFailed, models.PhaseStatusPaused:
			if existing.ProgressChan != nil {
				close(existing.ProgressChan)
			}
			// Will create new execution below
		}
	}
	var execution *httpValidationExecution
	if reuseExisting {
		execution = s.executions[campaignID]
		s.deps.Logger.Debug(ctx, "HTTP validation resumed from configured state", map[string]interface{}{"campaign_id": campaignID})
	} else {
		// Create new execution tracking (first start or restart after terminal state)
		execution = &httpValidationExecution{
			CampaignID:   campaignID,
			Status:       models.PhaseStatusInProgress,
			StartedAt:    time.Now(),
			Progress:     0.0,
			CancelChan:   make(chan struct{}),
			ProgressChan: make(chan PhaseProgress, 100),
		}
		s.executions[campaignID] = execution
	}
	s.mu.Unlock()

	// Mark phase started in store
	if s.store != nil {
		var exec store.Querier
		if q, ok := s.deps.DB.(store.Querier); ok {
			exec = q
		}
		_ = s.store.StartPhase(ctx, exec, campaignID, models.PhaseTypeHTTPKeywordValidation)
	}

	// Get domains from previous phase (DNS validation)
	domains, err := s.getValidatedDomains(ctx, campaignID)
	if err != nil {
		s.updateExecutionStatus(campaignID, models.PhaseStatusFailed, fmt.Sprintf("failed to get validated domains: %v", err))
		return nil, fmt.Errorf("failed to get validated domains: %w", err)
	}

	if len(domains) == 0 {
		s.updateExecutionStatus(campaignID, models.PhaseStatusSkipped, "no validated domains found")
		close(execution.ProgressChan)
		return execution.ProgressChan, nil
	}

	// NOTE: Legacy stealth loader removed. Stealth ordering now exclusively handled by stealth-aware wrapper service.

	execution.ItemsTotal = len(domains)

	// Log keyword configuration snapshot (counts only) for transparency
	var keywordSetCount, inlineKeywordCount, adHocCount int
	var enrichmentFlag, microcrawlFlag bool
	if s.store != nil {
		var exec store.Querier
		if q, ok := s.deps.DB.(store.Querier); ok {
			exec = q
		}
		if phase, perr := s.store.GetCampaignPhase(ctx, exec, campaignID, models.PhaseTypeHTTPKeywordValidation); perr == nil && phase != nil && phase.Configuration != nil {
			var cfg models.HTTPPhaseConfigRequest
			if json.Unmarshal(*phase.Configuration, &cfg) == nil {
				setIDs, inlineKeywords := coalesceKeywordSources(&cfg)
				keywordSetCount = len(setIDs)
				inlineKeywordCount = len(inlineKeywords)
				adHocCount = len(cfg.AdHocKeywords)
				if cfg.EnrichmentEnabled != nil {
					enrichmentFlag = *cfg.EnrichmentEnabled
				} else {
					enrichmentFlag = isFeatureEnabled("ENABLE_HTTP_ENRICHMENT")
				}
				if cfg.MicroCrawlEnabled != nil {
					microcrawlFlag = *cfg.MicroCrawlEnabled
				} else {
					microcrawlFlag = isFeatureEnabled("ENABLE_HTTP_MICROCRAWL")
				}
			}
		}
	}
	s.deps.Logger.Info(ctx, "HTTP validation domain set ready", map[string]interface{}{
		"campaign_id":        campaignID,
		"domains_total":      len(domains),
		"keyword_sets":       keywordSetCount,
		"inline_keywords":    inlineKeywordCount,
		"ad_hoc_keywords":    adHocCount,
		"enrichment_enabled": enrichmentFlag,
		"microcrawl_enabled": microcrawlFlag,
	})

	// Start HTTP validation in goroutine
	go s.executeHTTPValidation(ctx, campaignID, domains)

	s.deps.Logger.Info(ctx, "HTTP validation execution started", map[string]interface{}{
		"campaign_id":  campaignID,
		"domain_count": len(domains),
	})

	return execution.ProgressChan, nil
}

// GetStatus returns the current status of HTTP validation for a campaign
func (s *httpValidationService) GetStatus(ctx context.Context, campaignID uuid.UUID) (*PhaseStatus, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	execution, exists := s.executions[campaignID]
	if !exists {
		return &PhaseStatus{
			Phase:          models.PhaseTypeHTTPKeywordValidation,
			Status:         models.PhaseStatusNotStarted,
			ProgressPct:    0.0,
			ItemsTotal:     0,
			ItemsProcessed: 0,
			Configuration:  map[string]interface{}{},
		}, nil
	}

	// Build configuration snapshot (HTTP config stored in phase table; here we only echo minimal runtime state)
	cfgMap := map[string]interface{}{}
	// Attempt to include counts for richer UI
	cfgMap["itemsTotal"] = execution.ItemsTotal
	cfgMap["itemsProcessed"] = execution.ItemsProcessed

	var startedPtr *time.Time
	if !execution.StartedAt.IsZero() {
		startedPtr = &execution.StartedAt
	}

	return &PhaseStatus{
		Phase:          models.PhaseTypeHTTPKeywordValidation,
		Status:         execution.Status,
		ProgressPct:    execution.Progress,
		ItemsTotal:     int64(execution.ItemsTotal),
		ItemsProcessed: int64(execution.ItemsProcessed),
		StartedAt:      startedPtr,
		CompletedAt:    execution.CompletedAt,
		LastError:      execution.ErrorMessage,
		Configuration:  cfgMap,
	}, nil
}

// Cancel stops HTTP validation for a campaign
func (s *httpValidationService) Cancel(ctx context.Context, campaignID uuid.UUID) error {
	if s.deps.Logger != nil {
		s.deps.Logger.Info(ctx, "Cancelling HTTP validation", map[string]interface{}{
			"campaign_id": campaignID,
		})
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	execution, exists := s.executions[campaignID]
	if !exists {
		return fmt.Errorf("no HTTP validation in progress for campaign %s", campaignID)
	}

	if execution.Status != models.PhaseStatusInProgress {
		return fmt.Errorf("HTTP validation not in progress for campaign %s", campaignID)
	}

	// Signal cancellation
	close(execution.CancelChan)
	execution.Status = models.PhaseStatusFailed // Use Failed for cancellation
	execution.ErrorMessage = "HTTP validation cancelled by user"
	now := time.Now()
	execution.CompletedAt = &now

	// Close progress channel
	close(execution.ProgressChan)

	if s.deps.Logger != nil {
		s.deps.Logger.Info(ctx, "HTTP validation cancelled", map[string]interface{}{
			"campaign_id": campaignID,
		})
	}

	return nil
}

// Helper methods

// executeHTTPValidation performs the actual HTTP validation using the engine
func (s *httpValidationService) executeHTTPValidation(ctx context.Context, campaignID uuid.UUID, domains []string) {
	defer func() {
		s.mu.Lock()
		if execution, exists := s.executions[campaignID]; exists && execution.ProgressChan != nil {
			close(execution.ProgressChan)
		}
		s.mu.Unlock()
	}()

	s.deps.Logger.Info(ctx, "Starting HTTP validation engine execution", map[string]interface{}{
		"campaign_id":  campaignID,
		"domain_count": len(domains),
	})

	// Get persona and proxy from config (simplified for now)
	persona, proxy, err := s.getPersonaAndProxy(ctx, campaignID)
	if err != nil {
		s.updateExecutionStatus(campaignID, models.PhaseStatusFailed, fmt.Sprintf("failed to get persona/proxy: %v", err))
		return
	}

	// Process in batches for progress visibility
	const batchSize = 50
	total := len(domains)
	processed := 0
	allResults := make([]*httpvalidator.ValidationResult, 0, total)

	// Feature flags & config parsing
	enrichmentEnabled := isFeatureEnabled("ENABLE_HTTP_ENRICHMENT")
	microcrawlEnabled := isFeatureEnabled("ENABLE_HTTP_MICROCRAWL")
	microMaxPages := 3
	microByteBudget := 150000
	// Phase config overrides
	if s.store != nil {
		var exec store.Querier
		if q, ok := s.deps.DB.(store.Querier); ok {
			exec = q
		}
		if phase, perr := s.store.GetCampaignPhase(ctx, exec, campaignID, models.PhaseTypeHTTPKeywordValidation); perr == nil && phase != nil && phase.Configuration != nil {
			var cfg models.HTTPPhaseConfigRequest
			if uErr := json.Unmarshal(*phase.Configuration, &cfg); uErr == nil {
				if cfg.EnrichmentEnabled != nil {
					enrichmentEnabled = *cfg.EnrichmentEnabled
				}
				if cfg.MicroCrawlEnabled != nil {
					microcrawlEnabled = *cfg.MicroCrawlEnabled
				}
				if cfg.MicroCrawlMaxPages != nil && *cfg.MicroCrawlMaxPages > 0 {
					microMaxPages = *cfg.MicroCrawlMaxPages
				}
				if cfg.MicroCrawlByteBudget != nil && *cfg.MicroCrawlByteBudget > 0 {
					microByteBudget = *cfg.MicroCrawlByteBudget
				}
			}
		}
	}

	// Keyword scanner already eagerly injected; no-op lazy init retained for future dynamic wiring
	if enrichmentEnabled && s.kwScanner == nil {
		// nothing: we failed to inject keyword store; continue gracefully
	}

	// Batch-level reusable structures
	var enrichmentVectors map[string]map[string]interface{}
	if enrichmentEnabled {
		enrichmentVectors = make(map[string]map[string]interface{}, 2048)
	}

	// helper parked heuristic (MVP)
	// Use shared helper for parked heuristic
	parkedHeuristic := realParkedHeuristic

	for i := 0; i < total; i += batchSize {
		// metrics registration (idempotent)
		s.ensureMetricsRegistered()
		select {
		case <-ctx.Done():
			s.updateExecutionStatus(campaignID, models.PhaseStatusPaused, "Execution cancelled by caller context")
			return
		default:
		}

		end := i + batchSize
		if end > total {
			end = total
		}
		batch := domains[i:end]

		// Prepare batch for engine
		genBatch := s.prepareGeneratedDomains(batch)
		batchStart := time.Now()
		results := s.httpValidator.ValidateDomainsBulk(ctx, genBatch, 25, persona, proxy)
		if s.mtx.validationBatchSeconds != nil {
			s.mtx.validationBatchSeconds.Observe(time.Since(batchStart).Seconds())
		}

		// Accumulate
		allResults = append(allResults, results...)
		processed += len(results)

		// Enrichment: feature vector construction (keywords + parked heuristic)
		if enrichmentEnabled && s.kwScanner != nil {
			// Acquire HTTP phase config to get keyword/ad-hoc lists once per batch
			var keywordSetIDs []string
			var adHocKeywords []string
			if s.store != nil {
				var exec store.Querier
				if q, ok := s.deps.DB.(store.Querier); ok {
					exec = q
				}
				if phase, perr := s.store.GetCampaignPhase(ctx, exec, campaignID, models.PhaseTypeHTTPKeywordValidation); perr == nil && phase != nil && phase.Configuration != nil {
					var cfg models.HTTPPhaseConfigRequest
					_ = json.Unmarshal(*phase.Configuration, &cfg)
					setIDs, inlineKeywords := coalesceKeywordSources(&cfg)
					if len(setIDs) > 0 {
						keywordSetIDs = append(keywordSetIDs, setIDs...)
					}
					if len(inlineKeywords) > 0 {
						adHocKeywords = append(adHocKeywords, inlineKeywords...)
					}
					adHocKeywords = append(adHocKeywords, cfg.AdHocKeywords...)
				}
			}
			// de-duplicate ad-hoc keywords
			if len(adHocKeywords) > 1 {
				seen := make(map[string]struct{}, len(adHocKeywords))
				uniq := adHocKeywords[:0]
				for _, k := range adHocKeywords {
					kl := strings.ToLower(k)
					if _, ok := seen[kl]; ok {
						continue
					}
					seen[kl] = struct{}{}
					uniq = append(uniq, k)
				}
				adHocKeywords = uniq
			}
			for _, r := range results {
				if r == nil || r.Domain == "" {
					continue
				}
				if len(r.RawBody) == 0 { // no body scenario
					if s.mtx.enrichmentDropped != nil {
						s.mtx.enrichmentDropped.WithLabelValues("no_body").Inc()
					}
				}
				mapped := "error"
				le := strings.ToLower(r.Error)
				switch {
				case r.IsSuccess || r.Status == "Validated" || r.Status == "OK":
					mapped = "ok"
				case strings.EqualFold(r.Status, "timeout") || strings.Contains(le, "timeout"):
					mapped = "timeout"
				}
				if s.mtx.fetchOutcome != nil {
					s.mtx.fetchOutcome.WithLabelValues(mapped).Inc()
					if s.mtx.fetchAlias != nil { // mirror to alias
						s.mtx.fetchAlias.WithLabelValues(mapped).Inc()
					}
				}
				if mapped != "ok" {
					continue
				}
				fv := map[string]interface{}{
					"status_code":   r.StatusCode,
					"fetched_at":    time.Now().UTC().Format(time.RFC3339),
					"content_bytes": r.ContentLength,
				}
				// Structural parsing (HTML) & naive language heuristic
				if len(r.RawBody) > 0 {
					ss := parseStructuralSignals(r.RawBody, r.FinalURL)
					fv["h1_count"] = ss.H1Count
					fv["link_internal_count"] = ss.LinkInternalCount
					fv["link_external_count"] = ss.LinkExternalCount
					fv["link_internal_ratio"] = ss.LinkInternalRatio
					fv["primary_lang"] = ss.PrimaryLang
					fv["lang_confidence"] = ss.LangConfidence
					fv["has_structural_signals"] = true
				}
				// Keyword scans (root only for now)
				if len(r.RawBody) > 0 && (len(keywordSetIDs) > 0 || len(adHocKeywords) > 0) {
					var exec store.Querier
					if q, ok := s.deps.DB.(store.Querier); ok {
						exec = q
					}
					patternCounts := make(map[string]int, 32)
					uniquePatterns := make(map[string]struct{}, 32)
					if len(keywordSetIDs) > 0 {
						if hitsBySet, err := s.kwScanner.ScanBySetIDs(ctx, exec, r.RawBody, keywordSetIDs); err == nil && len(hitsBySet) > 0 {
							perSet := make(map[string]int, len(hitsBySet))
							for setID, patterns := range hitsBySet {
								perSet[setID] = len(patterns)
								for _, p := range patterns {
									uniquePatterns[p] = struct{}{}
									patternCounts[p]++
								}
							}
							fv["keyword_set_hits"] = perSet
						}
					}
					// ad-hoc
					if len(adHocKeywords) > 0 {
						if adhHits, err := s.kwScanner.ScanAdHocKeywords(ctx, r.RawBody, adHocKeywords); err == nil && len(adhHits) > 0 {
							fv["ad_hoc_hits"] = adhHits
							for _, p := range adhHits {
								uniquePatterns[p] = struct{}{}
								patternCounts[p]++
							}
						}
					}
					if r.ExtractedTitle != "" {
						tl := strings.ToLower(r.ExtractedTitle)
						hasTitleKeyword := false
						for k := range uniquePatterns {
							if strings.Contains(tl, strings.ToLower(k)) {
								hasTitleKeyword = true
								break
							}
						}
						fv["title_has_keyword"] = hasTitleKeyword
					}
					fv["kw_hits_total"] = len(uniquePatterns)
					fv["kw_unique"] = len(uniquePatterns)
					if top := topKeywordsFromCounts(patternCounts, 3); len(top) > 0 {
						fv["kw_top3"] = top
					}
				}
				// Parked heuristic
				isParked, conf := parkedHeuristic(r.ExtractedTitle, r.ExtractedContentSnippet)
				if s.mtx.parkedDetection != nil {
					res := "not_parked"
					if isParked {
						res = "parked"
					}
					s.mtx.parkedDetection.WithLabelValues(res).Inc()
				}
				fv["parked_confidence"] = conf
				if isParked {
					fv["is_parked"] = true
				}
				// Micro-crawl execution (depth-1) if criteria met
				if microcrawlEnabled && !isParked {
					kwuBaseline, _ := fv["kw_unique"].(int)
					if kwuBaseline < 2 && r.ContentLength < 60000 && conf < 0.5 {
						pagesExamined, exhausted, addedKw, newPatterns := s.microCrawlEnhance(ctx, campaignID, r, keywordSetIDs, adHocKeywords, microMaxPages, microByteBudget)
						if pagesExamined > 0 {
							if s.mtx.microCrawl != nil {
								s.mtx.microCrawl.Inc()
							}
							if s.mtx.microCrawlReasons != nil {
								// TODO: encode explicit reasons once reason extraction logic formalized
								s.mtx.microCrawlReasons.WithLabelValues("low_kw_and_not_parked").Inc()
							}
							if s.mtx.microCrawlPages != nil {
								state := "partial"
								if exhausted {
									state = "exhausted"
								}
								s.mtx.microCrawlPages.WithLabelValues(state).Add(float64(pagesExamined))
							}
							if s.mtx.microCrawlPagesHist != nil {
								s.mtx.microCrawlPagesHist.Observe(float64(pagesExamined))
							}
							fv["microcrawl_used"] = true
							fv["microcrawl_pages"] = pagesExamined
							fv["microcrawl_exhausted"] = exhausted
							fv["secondary_pages_examined"] = pagesExamined
							// Merge: total unique = baseline + added (if new patterns found)
							if len(newPatterns) > 0 && addedKw > 0 {
								// ROI counters
								if s.mtx.microCrawlSuccesses != nil {
									s.mtx.microCrawlSuccesses.Inc()
								}
								if s.mtx.microCrawlAddedKw != nil {
									s.mtx.microCrawlAddedKw.Add(float64(addedKw))
								}
								if s.mtx.microCrawlNewPatterns != nil {
									s.mtx.microCrawlNewPatterns.Add(float64(len(newPatterns)))
								}
								fv["kw_unique_root"] = kwuBaseline
								fv["kw_unique_added"] = addedKw
								totalUnique := kwuBaseline + addedKw
								fv["kw_unique"] = totalUnique
								fv["kw_hits_total"] = totalUnique
								// growth ratio; avoid div by zero
								if kwuBaseline > 0 {
									fv["kw_growth_ratio"] = float64(totalUnique) / float64(kwuBaseline)
									if s.mtx.microCrawlGrowthRatio != nil {
										if gr, ok := fv["kw_growth_ratio"].(float64); ok {
											s.mtx.microCrawlGrowthRatio.Observe(gr)
										}
									}
								} else {
									fv["kw_growth_ratio"] = float64(totalUnique)
								}
								// Diminishing returns: pages >=2 AND growth < 1.15 (if baseline >0) OR addedKw <2 for zero baseline
								if pagesExamined >= 2 {
									if kwuBaseline > 0 {
										if gr, _ := fv["kw_growth_ratio"].(float64); gr < 1.15 {
											fv["diminishing_returns"] = true
										}
									} else if addedKw < 2 { // nothing much learned from crawl
										fv["diminishing_returns"] = true
									}
								}
							} else {
								// zero success path
								if s.mtx.microCrawlZeroSuccess != nil {
									s.mtx.microCrawlZeroSuccess.Inc()
								}
							}
							if exhausted {
								fv["partial_coverage"] = true
							}
						} else {
							fv["microcrawl_planned"] = false
						}
					}
				}
				// If microcrawl not used still mark defaults for new fields
				if _, ok := fv["diminishing_returns"]; !ok {
					fv["diminishing_returns"] = false
				}
				if _, ok := fv["partial_coverage"]; !ok {
					if exhausted, _ := fv["microcrawl_exhausted"].(bool); exhausted { // carry over if earlier logic set
						fv["partial_coverage"] = true
					} else {
						fv["partial_coverage"] = false
					}
				}
				enrichmentVectors[r.Domain] = fv
			}
		}

		// Persist batch results
		if err := s.storeHTTPResults(ctx, campaignID, results); err != nil {
			s.updateExecutionStatus(campaignID, models.PhaseStatusFailed, fmt.Sprintf("failed to store HTTP results: %v", err))
			return
		}
		// Persist enrichment feature vectors (batched incremental merge)
		if enrichmentEnabled && len(enrichmentVectors) > 0 {
			startPersist := time.Now()
			errStatus := "ok"
			if err := s.persistFeatureVectors(ctx, campaignID, enrichmentVectors); err != nil {
				errStatus = "error"
				s.deps.Logger.Warn(ctx, "Failed to persist feature vectors", map[string]interface{}{"campaign_id": campaignID, "error": err.Error()})
			} else {
				if err := s.persistExtractionFeatureRows(ctx, campaignID, enrichmentVectors); err != nil && s.deps.Logger != nil {
					s.deps.Logger.Warn(ctx, "Failed to persist analysis-ready feature rows", map[string]interface{}{"campaign_id": campaignID, "error": err.Error()})
				}
				// Emit SSE enrichment sample
				if s.deps.SSE != nil {
					limit := 25
					count := 0
					sample := make([]map[string]interface{}, 0, limit)
					for d, fv := range enrichmentVectors {
						if count >= limit {
							break
						}
						sample = append(sample, map[string]interface{}{"domain": d, "kw_unique": fv["kw_unique"], "parked_confidence": fv["parked_confidence"], "is_parked": fv["is_parked"], "microcrawl_planned": fv["microcrawl_planned"]})
						count++
					}
					msg, _ := json.Marshal(map[string]interface{}{
						"event":           "http_enrichment",
						"campaignId":      campaignID.String(),
						"count":           len(enrichmentVectors),
						"sample":          sample,
						"microcrawl":      microcrawlEnabled,
						"microMaxPages":   microMaxPages,
						"microByteBudget": microByteBudget,
						"correlationId":   uuid.New().String(),
					})
					s.deps.SSE.Send(string(msg))
				}
				// reset map
				for k := range enrichmentVectors {
					delete(enrichmentVectors, k)
				}
			}
			// metrics for batch persistence
			if s.mtx.enrichmentBatches != nil {
				s.mtx.enrichmentBatches.Inc()
			}
			if s.mtx.enrichmentBatchSeconds != nil {
				s.mtx.enrichmentBatchSeconds.WithLabelValues(errStatus).Observe(time.Since(startPersist).Seconds())
			}
		}

		// Update in-memory execution and emit progress
		s.mu.Lock()
		if execution, exists := s.executions[campaignID]; exists {
			execution.Results = append(execution.Results, results...)
			execution.ItemsProcessed = processed
			execution.Progress = (float64(processed) / float64(total)) * 100
			// Send progress update
			if execution.ProgressChan != nil {
				progress := PhaseProgress{
					Phase:          models.PhaseTypeHTTPKeywordValidation,
					Status:         models.PhaseStatusInProgress,
					ProgressPct:    execution.Progress,
					ItemsProcessed: int64(execution.ItemsProcessed),
					ItemsTotal:     int64(execution.ItemsTotal),
					Message:        fmt.Sprintf("Validated %d/%d domains", processed, total),
					Timestamp:      time.Now(),
				}
				select {
				case execution.ProgressChan <- progress:
				default:
				}
				// Publish via EventBus if available
				if s.deps.EventBus != nil {
					_ = s.deps.EventBus.PublishProgress(ctx, progress)
				}
			}
		}
		s.mu.Unlock()

		// Persist progress to store
		if s.store != nil {
			var exec store.Querier
			if q, ok := s.deps.DB.(store.Querier); ok {
				exec = q
			}
			total64 := int64(total)
			processed64 := int64(processed)
			_ = s.store.UpdatePhaseProgress(ctx, exec, campaignID, models.PhaseTypeHTTPKeywordValidation, (float64(processed)/float64(total))*100, &total64, &processed64, nil, nil)
		}
	}

	if processed == 0 {
		s.updateExecutionStatus(campaignID, models.PhaseStatusFailed, "HTTP validation returned no results")
		return
	}

	// Finalize execution
	s.mu.Lock()
	if execution, exists := s.executions[campaignID]; exists {
		execution.Status = models.PhaseStatusCompleted
		execution.Progress = 100.0
		execution.ItemsProcessed = processed
		now := time.Now()
		execution.CompletedAt = &now
		if s.mtx.phaseDuration != nil && !execution.StartedAt.IsZero() {
			s.mtx.phaseDuration.Observe(now.Sub(execution.StartedAt).Seconds())
		}
		if s.mtx.phaseDurationVec != nil && !execution.StartedAt.IsZero() {
			s.mtx.phaseDurationVec.WithLabelValues("http_validation").Observe(now.Sub(execution.StartedAt).Seconds())
		}
		if execution.ProgressChan != nil {
			select {
			case execution.ProgressChan <- PhaseProgress{
				Phase:          models.PhaseTypeHTTPKeywordValidation,
				Status:         models.PhaseStatusCompleted,
				ProgressPct:    100.0,
				ItemsProcessed: int64(execution.ItemsProcessed),
				ItemsTotal:     int64(execution.ItemsTotal),
				Timestamp:      time.Now(),
			}:
			default:
			}
		}
	}
	s.mu.Unlock()

	// record phase duration metric (approximate: from first batch start to completion)
	if s.mtx.phaseDuration != nil {
		// Can't easily capture exact start without refactor; using ItemsProcessed time diff not stored.
		// TODO: capture explicit start time in execution struct for more accurate metric.
		// For now, omit observation if we lack start timestamp.
	}
	s.deps.Logger.Info(ctx, "HTTP validation completed successfully", map[string]interface{}{
		"campaign_id":        campaignID,
		"results_count":      len(allResults),
		"domains_tested":     len(domains),
		"enrichment_enabled": enrichmentEnabled,
		"microcrawl_enabled": microcrawlEnabled,
	})

	// Mark completed in store
	if s.store != nil {
		var exec store.Querier
		if q, ok := s.deps.DB.(store.Querier); ok {
			exec = q
		}
		_ = s.store.CompletePhase(ctx, exec, campaignID, models.PhaseTypeHTTPKeywordValidation)
	}
}

// getValidatedDomains retrieves domains that passed DNS validation
func (s *httpValidationService) getValidatedDomains(ctx context.Context, campaignID uuid.UUID) ([]string, error) {
	s.deps.Logger.Debug(ctx, "Retrieving validated domains from DNS phase", map[string]interface{}{
		"campaign_id": campaignID,
	})

	if s.store == nil {
		return nil, fmt.Errorf("campaign store not available")
	}
	// Legacy stealth order path removed; wrapper applies stealth before calling base service.
	var exec store.Querier
	if q, ok := s.deps.DB.(store.Querier); ok {
		exec = q
	}
	var after string
	all := make([]string, 0, 2048)
	for {
		page, err := s.store.GetGeneratedDomainsWithCursor(ctx, exec, store.ListGeneratedDomainsFilter{
			CursorPaginationFilter: store.CursorPaginationFilter{First: 1000, After: after, SortBy: "offset_index", SortOrder: "ASC"},
			CampaignID:             campaignID,
			ValidationStatus:       string(models.DomainDNSStatusOK),
		})
		if err != nil {
			return nil, fmt.Errorf("failed to fetch validated domains: %w", err)
		}
		for _, gd := range page.Data {
			if gd != nil && gd.DomainName != "" {
				all = append(all, gd.DomainName)
			}
		}
		if !page.PageInfo.HasNextPage || page.PageInfo.EndCursor == "" {
			break
		}
		after = page.PageInfo.EndCursor
	}
	return all, nil
}

// loadStealthForHTTP removed: stealth ordering now occurs exclusively in stealth-aware wrapper.

// ensureDNSCompleted checks the campaign phase table and ensures DNS phase is marked completed
func (s *httpValidationService) ensureDNSCompleted(ctx context.Context, campaignID uuid.UUID) error {
	// Try to use a Querier if available from deps.DB, else pass nil and let store use default connection
	var exec store.Querier
	if q, ok := s.deps.DB.(store.Querier); ok {
		exec = q
	}
	phase, err := s.store.GetCampaignPhase(ctx, exec, campaignID, models.PhaseTypeDNSValidation)
	if err != nil {
		return fmt.Errorf("failed to get DNS phase status: %w", err)
	}
	if phase == nil {
		return fmt.Errorf("DNS phase not found")
	}
	if phase.Status != models.PhaseStatusCompleted {
		// Temporary debug instrumentation for Blocker B3 verification
		s.deps.Logger.Warn(ctx, "DNS phase not completed when starting HTTP validation", map[string]interface{}{
			"campaign_id": campaignID,
			"dns_status":  phase.Status,
		})
		return fmt.Errorf("DNS phase status is '%s' (must be 'completed')", phase.Status)
	}
	return nil
}

// prepareGeneratedDomains converts string domains to GeneratedDomain models for the engine
func (s *httpValidationService) prepareGeneratedDomains(domains []string) []*models.GeneratedDomain {
	generatedDomains := make([]*models.GeneratedDomain, len(domains))
	for i, domain := range domains {
		generatedDomains[i] = &models.GeneratedDomain{
			DomainName: domain,
		}
	}
	return generatedDomains
}

// getPersonaAndProxy retrieves persona and proxy configuration for HTTP validation
func (s *httpValidationService) getPersonaAndProxy(ctx context.Context, campaignID uuid.UUID) (*models.Persona, *models.Proxy, error) {
	// Default: no persona/proxy -> engine will use app defaults
	var exec store.Querier
	if q, ok := s.deps.DB.(store.Querier); ok {
		exec = q
	}

	// Try canonical HTTP params table first
	if s.store != nil {
		if params, err := s.store.GetHTTPKeywordParams(ctx, exec, campaignID); err == nil && params != nil {
			// Resolve persona (first ID for now)
			var persona *models.Persona
			if len(params.PersonaIDs) > 0 && s.personaStore != nil {
				if p, err := s.personaStore.GetPersonaByID(ctx, exec, params.PersonaIDs[0]); err == nil {
					persona = p
				} else if s.deps.Logger != nil {
					s.deps.Logger.Warn(ctx, "Failed to load persona by ID", map[string]interface{}{"campaign_id": campaignID, "error": err.Error()})
				}
			}

			// Resolve proxy preference: explicit ProxyIDs first, else by persona IDs, else none
			var proxy *models.Proxy
			if params.ProxyIDs != nil && len(*params.ProxyIDs) > 0 && s.proxyStore != nil {
				if p, err := s.proxyStore.GetProxyByID(ctx, exec, (*params.ProxyIDs)[0]); err == nil {
					proxy = p
				} else if s.deps.Logger != nil {
					s.deps.Logger.Warn(ctx, "Failed to load proxy by ID", map[string]interface{}{"campaign_id": campaignID, "error": err.Error()})
				}
			} else if s.proxyStore != nil && len(params.PersonaIDs) > 0 {
				if proxies, err := s.proxyStore.GetProxiesByPersonaIDs(ctx, exec, params.PersonaIDs); err == nil {
					// Pick the first healthy & enabled if available
					for _, pr := range proxies {
						if pr != nil && pr.IsEnabled && pr.IsHealthy {
							proxy = pr
							break
						}
					}
					// Fallback to first available
					if proxy == nil && len(proxies) > 0 {
						proxy = proxies[0]
					}
				}
			}

			return persona, proxy, nil
		}
	}

	// Fallback: read phase configuration JSON for HTTP (HTTPPhaseConfigRequest)
	if s.store != nil {
		if phase, err := s.store.GetCampaignPhase(ctx, exec, campaignID, models.PhaseTypeHTTPKeywordValidation); err == nil && phase != nil && phase.Configuration != nil {
			var cfg models.HTTPPhaseConfigRequest
			if uErr := json.Unmarshal(*phase.Configuration, &cfg); uErr == nil {
				// cfg.PersonaIDs are strings; parse first
				if len(cfg.PersonaIDs) > 0 && s.personaStore != nil {
					if pid, pErr := uuid.Parse(cfg.PersonaIDs[0]); pErr == nil {
						if p, gErr := s.personaStore.GetPersonaByID(ctx, exec, pid); gErr == nil {
							return p, nil, nil
						}
					}
				}
			}
		}
	}

	return nil, nil, nil
}

// storeHTTPResults stores HTTP validation results in the campaign store
func (s *httpValidationService) storeHTTPResults(ctx context.Context, campaignID uuid.UUID, results []*httpvalidator.ValidationResult) error {
	s.deps.Logger.Info(ctx, "Storing HTTP validation results", map[string]interface{}{
		"campaign_id":  campaignID,
		"result_count": len(results),
	})
	if s.store == nil || len(results) == 0 {
		return nil
	}
	// Map to bulk model slice
	bulk := make([]models.HTTPKeywordResult, 0, len(results))
	for _, r := range results {
		if r == nil || r.Domain == "" {
			continue
		}
		status := "error"
		reasonPtr := (*string)(nil)
		// Map underlying validator status -> canonical (ok|error|timeout)
		switch {
		case r.IsSuccess || r.Status == "Validated" || r.Status == "OK":
			status = "ok"
		case strings.EqualFold(r.Status, "timeout"):
			status = "timeout"
			r := "TIMEOUT"
			reasonPtr = &r
		}
		if status == "error" {
			// Consolidated HTTP error taxonomy inspired by DNS taxonomy normalization.
			le := strings.ToLower(r.Error)
			ls := strings.ToLower(r.Status)
			// Direct status string mappings first (validator domain specific)
			switch {
			case strings.Contains(ls, "statuscodemismatch"):
				val := "STATUS_CODE_MISMATCH"
				reasonPtr = &val
			case strings.Contains(ls, "contentmismatch"):
				val := "CONTENT_MISMATCH"
				reasonPtr = &val
			case strings.Contains(ls, "fetcherror"):
				// Often network layer issues
				val := "FETCH_ERROR"
				reasonPtr = &val
			case strings.Contains(ls, "headlessfailed"):
				val := "HEADLESS_FAILED"
				reasonPtr = &val
			case strings.Contains(ls, "headlesstimeout"):
				status = "timeout"
				val := "TIMEOUT"
				reasonPtr = &val
			}
			// If still generic, inspect error text & status code
			if reasonPtr == nil {
				switch {
				case strings.Contains(le, "timeout"):
					status = "timeout"
					tr := "TIMEOUT"
					reasonPtr = &tr
				case strings.Contains(le, "context canceled") || strings.Contains(le, "canceled"):
					val := "CANCELED"
					reasonPtr = &val
				case strings.Contains(le, "connection refused"):
					val := "CONNECTION_REFUSED"
					reasonPtr = &val
				case strings.Contains(le, "no such host") || strings.Contains(le, "lookup "):
					val := "DNS_RESOLVE_ERROR"
					reasonPtr = &val
				case strings.Contains(le, "connection reset"):
					val := "CONNECTION_RESET"
					reasonPtr = &val
				case strings.Contains(le, "tls") && strings.Contains(le, "handshake"):
					val := "TLS_HANDSHAKE"
					reasonPtr = &val
				case strings.Contains(le, "certificate has expired") || strings.Contains(le, "certificate expired"):
					val := "SSL_EXPIRED"
					reasonPtr = &val
				case strings.Contains(le, "certificate"):
					val := "TLS_ERROR"
					reasonPtr = &val
				case strings.Contains(le, "proxy"):
					val := "PROXY_ERROR"
					reasonPtr = &val
				}
			}
			// HTTP status code derived reasons
			if reasonPtr == nil {
				switch {
				case r.StatusCode == 404:
					val := "NOT_FOUND"
					reasonPtr = &val
				case r.StatusCode == 403:
					val := "FORBIDDEN"
					reasonPtr = &val
				case r.StatusCode == 401:
					val := "UNAUTHORIZED"
					reasonPtr = &val
				case r.StatusCode == 410:
					val := "GONE"
					reasonPtr = &val
				case r.StatusCode == 429:
					val := "RATE_LIMIT"
					reasonPtr = &val
				case r.StatusCode == 451:
					val := "UNAVAILABLE_LEGAL"
					reasonPtr = &val
				case r.StatusCode >= 500 && r.StatusCode < 600:
					val := "UPSTREAM_5XX"
					reasonPtr = &val
				}
			}
			// Final fallback if we still don't have a reason but we are error
			if reasonPtr == nil && r.Error != "" {
				val := "ERROR"
				reasonPtr = &val
			}
		}
		var codePtr *int32
		if r.StatusCode != 0 {
			c := int32(r.StatusCode)
			codePtr = &c
		}
		var titlePtr *string
		if r.ExtractedTitle != "" {
			t := r.ExtractedTitle
			titlePtr = &t
		}
		bulk = append(bulk, models.HTTPKeywordResult{
			HTTPKeywordCampaignID: campaignID,
			DomainName:            r.Domain,
			ValidationStatus:      status,
			HTTPStatusCode:        codePtr,
			PageTitle:             titlePtr,
			LastCheckedAt:         func() *time.Time { t := time.Now(); return &t }(),
			Reason:                reasonPtr,
		})
	}
	var exec store.Querier
	if q, ok := s.deps.DB.(store.Querier); ok {
		exec = q
	}
	// B1: transactional pending-only update with RETURNING to ensure idempotent counter deltas
	var sqlxDB *sqlx.DB
	if dbx, ok := s.deps.DB.(*sqlx.DB); ok {
		sqlxDB = dbx
	}
	if sqlxDB == nil {
		// Fallback to legacy best-effort path (non-idempotent). Rare in tests; keep for safety.
		if err := s.store.UpdateDomainsBulkHTTPStatus(ctx, exec, bulk); err != nil {
			return fmt.Errorf("failed to persist HTTP results (fallback): %w", err)
		}
		return nil
	}
	tx, txErr := sqlxDB.BeginTxx(ctx, nil)
	if txErr != nil {
		if err := s.store.UpdateDomainsBulkHTTPStatus(ctx, exec, bulk); err != nil {
			return fmt.Errorf("failed to persist HTTP results (fallback no-tx): %w", err)
		}
		return nil
	}
	// Build VALUES list starting after $1 (reserved for campaign id)
	if len(bulk) == 0 {
		_ = tx.Rollback()
		return nil
	}
	valueStrings := make([]string, 0, len(bulk))
	valueArgs := make([]interface{}, 0, len(bulk)*5+1)
	valueArgs = append(valueArgs, campaignID) // $1
	for i, r := range bulk {
		idx := i*5 + 2 // domain starts at $2
		// Cast http_status_code placeholder to integer explicitly to prevent Postgres inferring text type when NULLs present
		valueStrings = append(valueStrings, fmt.Sprintf("($%d,$%d,$%d::integer,$%d::timestamptz,$%d)", idx, idx+1, idx+2, idx+3, idx+4))
		// Ensure HTTPStatusCode stored as primitive int or NULL to satisfy integer column type
		var httpCode interface{}
		if r.HTTPStatusCode != nil {
			httpCode = *r.HTTPStatusCode
		} else {
			httpCode = nil
		}
		valueArgs = append(valueArgs, r.DomainName, r.ValidationStatus, httpCode, r.LastCheckedAt, r.Reason)
	}
	valuesClause := strings.Join(valueStrings, ",")
	// NOTE: Schema columns: http_status (enum), http_status_code, last_validated_at. Some legacy code referenced http_checked_at/http_reason which do not exist.
	// We cast validation_status (text) to domain_http_status_enum explicitly to satisfy Postgres type requirements.
	query := fmt.Sprintf(`WITH updates(domain_name,validation_status,http_status_code,last_checked_at,reason) AS (VALUES %s)
	UPDATE generated_domains gd
	SET http_status = u.validation_status::domain_http_status_enum,
			http_status_code = u.http_status_code,
			last_validated_at = u.last_checked_at
	FROM updates u
	WHERE gd.domain_name = u.domain_name
		AND gd.campaign_id = $1
		AND gd.http_status = 'pending'
	RETURNING u.validation_status`, valuesClause)
	rows, qErr := tx.QueryxContext(ctx, query, valueArgs...)
	if qErr != nil {
		_ = tx.Rollback()
		return fmt.Errorf("http bulk pending update failed: %w", qErr)
	}
	okN, errN, timeoutN := 0, 0, 0
	for rows.Next() {
		var st string
		if err := rows.Scan(&st); err != nil {
			_ = rows.Close()
			_ = tx.Rollback()
			return fmt.Errorf("scan returned status: %w", err)
		}
		switch st {
		case "ok":
			okN++
		case "error":
			errN++
		case "timeout":
			timeoutN++
		}
	}
	_ = rows.Close()
	total := okN + errN + timeoutN
	if total > 0 {
		if _, cerr := tx.ExecContext(ctx, `UPDATE campaign_domain_counters SET http_pending = http_pending - $1, http_ok = http_ok + $2, http_error = http_error + $3, http_timeout = http_timeout + $4, updated_at = NOW() WHERE campaign_id = $5`, total, okN, errN, timeoutN, campaignID); cerr != nil {
			_ = tx.Rollback()
			return fmt.Errorf("counter update failed: %w", cerr)
		}
	}
	if cErr := tx.Commit(); cErr != nil {
		return fmt.Errorf("commit http bulk tx: %w", cErr)
	}
	// Broadcast SSE sample if interface available and no EventBus abstraction
	if s.deps.SSE != nil {
		top := 50
		if len(bulk) < top {
			top = len(bulk)
		}
		payload := make([]map[string]interface{}, 0, top)
		for i := 0; i < top; i++ {
			b := bulk[i]
			m := map[string]interface{}{"domain": b.DomainName, "status": b.ValidationStatus}
			if b.Reason != nil {
				m["reason"] = *b.Reason
			}
			payload = append(payload, m)
		}
		if len(payload) > 0 {
			msg, _ := json.Marshal(map[string]interface{}{"event": "http_batch_validated", "campaignId": campaignID.String(), "sample": payload, "count": len(bulk)})
			s.deps.SSE.Send(string(msg))
		}
	}
	// Publish structured domain delta via EventBus if available
	if s.deps.EventBus != nil && len(bulk) > 0 {
		limit := len(bulk)
		if limit > 200 {
			limit = 200
		}
		items := make([]map[string]interface{}, 0, limit)
		for i := 0; i < limit; i++ {
			b := bulk[i]
			m := map[string]interface{}{"domain": b.DomainName, "http_status": b.ValidationStatus}
			if b.Reason != nil {
				m["http_reason"] = *b.Reason
			}
			items = append(items, m)
		}
		_ = s.deps.EventBus.PublishSystemEvent(ctx, "domain_status_delta", map[string]interface{}{
			"campaignId": campaignID.String(),
			"phase":      "http_validation",
			"count":      len(bulk),
			"items":      items,
		})
	}
	return nil
}

// persistFeatureVectors performs a best-effort bulk update of feature_vector and last_http_fetched_at
// Placeholder: refine with batched UPDATE (e.g., using jsonb_set) or dedicated store method later.
func (s *httpValidationService) persistFeatureVectors(ctx context.Context, campaignID uuid.UUID, vectors map[string]map[string]interface{}) error {
	if s.store == nil || len(vectors) == 0 {
		return nil
	}
	var exec store.Querier
	if q, ok := s.deps.DB.(store.Querier); ok {
		exec = q
	}
	// If we have a *sqlx.DB we can perform a single bulk UPDATE using VALUES
	sqlxDB, _ := s.deps.DB.(*sqlx.DB)
	if sqlxDB == nil || len(vectors) == 1 {
		// fallback per-domain
		for domain, fv := range vectors {
			raw, _ := json.Marshal(fv)

			// Convert parked_confidence to proper float64 or nil
			var parkedConf interface{} = nil
			if pc, ok := fv["parked_confidence"]; ok && pc != nil {
				switch v := pc.(type) {
				case float64:
					parkedConf = v
				case float32:
					parkedConf = float64(v)
				case int:
					parkedConf = float64(v)
				case string:
					if f, err := strconv.ParseFloat(v, 64); err == nil {
						parkedConf = f
					}
				}
			}

			// Convert is_parked to proper boolean or nil
			var isParked interface{} = nil
			if ip, ok := fv["is_parked"]; ok && ip != nil {
				switch v := ip.(type) {
				case bool:
					isParked = v
				case string:
					isParked = v == "true"
				}
			}

			if exec != nil {
				_, err := exec.ExecContext(ctx, `UPDATE generated_domains SET feature_vector = $1, last_http_fetched_at = NOW(), parked_confidence = CASE WHEN $2 IS NOT NULL THEN $2::numeric ELSE parked_confidence END, is_parked = CASE WHEN $3::boolean IS TRUE THEN TRUE ELSE is_parked END WHERE campaign_id = $4 AND domain_name = $5`, raw, parkedConf, isParked, campaignID, domain)
				if err != nil && s.deps.Logger != nil {
					s.deps.Logger.Debug(ctx, "Feature vector update failed", map[string]interface{}{"domain": domain, "error": err.Error()})
				}
			}
		}
		return nil
	}
	// Bulk path
	domains := make([]string, 0, len(vectors))
	for d := range vectors {
		domains = append(domains, d)
	}
	sort.Strings(domains)
	valueStrings := make([]string, 0, len(domains))
	args := make([]interface{}, 0, len(domains)*4+1)
	args = append(args, campaignID) // $1
	idx := 2
	for _, d := range domains {
		fv := vectors[d]
		raw, _ := json.Marshal(fv)

		// Convert parked_confidence to proper float64 or nil
		var parkedConf interface{} = nil
		if pc, ok := fv["parked_confidence"]; ok && pc != nil {
			switch v := pc.(type) {
			case float64:
				parkedConf = v
			case float32:
				parkedConf = float64(v)
			case int:
				parkedConf = float64(v)
			case string:
				if f, err := strconv.ParseFloat(v, 64); err == nil {
					parkedConf = f
				}
			}
		}

		// Convert is_parked to proper boolean or nil
		var isParked interface{} = nil
		if ip, ok := fv["is_parked"]; ok && ip != nil {
			switch v := ip.(type) {
			case bool:
				isParked = v
			case string:
				isParked = v == "true"
			}
		}

		valueStrings = append(valueStrings, fmt.Sprintf("($%d, $%d, $%d, $%d)", idx, idx+1, idx+2, idx+3))
		args = append(args, d, raw, parkedConf, isParked) // domain, feature_vector, parked_confidence, is_parked
		idx += 4
	}
	query := fmt.Sprintf(`WITH incoming AS (
		SELECT 
			v.column1::text AS domain_name,
			v.column2::jsonb AS feature_vector,
			v.column3::numeric AS parked_confidence,
			v.column4::boolean AS is_parked
		FROM (VALUES %s) AS v
	)
UPDATE generated_domains gd
SET feature_vector = incoming.feature_vector,
	last_http_fetched_at = NOW(),
	parked_confidence = CASE WHEN incoming.parked_confidence IS NOT NULL THEN incoming.parked_confidence ELSE gd.parked_confidence END,
	is_parked = CASE WHEN incoming.is_parked IS TRUE THEN TRUE ELSE gd.is_parked END
FROM incoming
WHERE gd.campaign_id = $1 AND gd.domain_name = incoming.domain_name`, strings.Join(valueStrings, ","))

	// Debug: Log the query and args
	if s.deps.Logger != nil {
		sampleLen := len(args)
		if sampleLen > 5 {
			sampleLen = 5
		}
		s.deps.Logger.Debug(ctx, "Feature vector bulk update query", map[string]interface{}{
			"campaign_id": campaignID.String(),
			"num_domains": len(domains),
			"sample_args": fmt.Sprintf("%v", args[:sampleLen]),
		})
	}

	if _, err := sqlxDB.ExecContext(ctx, query, args...); err != nil {
		if s.deps.Logger != nil {
			s.deps.Logger.Warn(ctx, "Feature vector bulk update failed", map[string]interface{}{
				"campaign_id": campaignID.String(),
				"error":       err.Error(),
				"query":       query,
			})
		}
		return fmt.Errorf("bulk feature vector update failed: %w", err)
	}
	return nil
}

const upsertExtractionFeatureSQL = `
INSERT INTO domain_extraction_features (
	campaign_id,
	domain_id,
	domain_name,
	processing_state,
	attempt_count,
	http_status,
	http_status_code,
	content_bytes,
	page_lang,
	kw_unique_count,
	kw_total_occurrences,
	kw_weight_sum,
	kw_top3,
	kw_signal_distribution,
	microcrawl_enabled,
	microcrawl_pages,
	microcrawl_base_kw_count,
	microcrawl_added_kw_count,
	microcrawl_gain_ratio,
	diminishing_returns,
	is_parked,
	parked_confidence,
	content_richness_score,
	feature_vector,
	extraction_version,
	keyword_dictionary_version,
	updated_at,
	created_at
)
SELECT
	$1,
	gd.id,
	gd.domain_name,
	'ready',
	1,
	'ok',
	$2,
	$3,
	$4,
	$5,
	$6,
	$7,
	$8::jsonb,
	$9::jsonb,
	$10,
	$11,
	$12,
	$13,
	$14,
	$15,
	$16,
	$17,
	$18,
	$19::jsonb,
	$20,
	$21,
	now(),
	now()
FROM generated_domains gd
WHERE gd.campaign_id = $1 AND gd.domain_name = $22
ON CONFLICT (campaign_id, domain_id) DO UPDATE SET
	domain_name = EXCLUDED.domain_name,
	processing_state = EXCLUDED.processing_state,
	attempt_count = EXCLUDED.attempt_count,
	http_status = EXCLUDED.http_status,
	http_status_code = EXCLUDED.http_status_code,
	content_bytes = EXCLUDED.content_bytes,
	page_lang = EXCLUDED.page_lang,
	kw_unique_count = EXCLUDED.kw_unique_count,
	kw_total_occurrences = EXCLUDED.kw_total_occurrences,
	kw_weight_sum = EXCLUDED.kw_weight_sum,
	kw_top3 = EXCLUDED.kw_top3,
	kw_signal_distribution = EXCLUDED.kw_signal_distribution,
	microcrawl_enabled = EXCLUDED.microcrawl_enabled,
	microcrawl_pages = EXCLUDED.microcrawl_pages,
	microcrawl_base_kw_count = EXCLUDED.microcrawl_base_kw_count,
	microcrawl_added_kw_count = EXCLUDED.microcrawl_added_kw_count,
	microcrawl_gain_ratio = EXCLUDED.microcrawl_gain_ratio,
	diminishing_returns = EXCLUDED.diminishing_returns,
	is_parked = EXCLUDED.is_parked,
	parked_confidence = EXCLUDED.parked_confidence,
	content_richness_score = EXCLUDED.content_richness_score,
	feature_vector = EXCLUDED.feature_vector,
	extraction_version = EXCLUDED.extraction_version,
	keyword_dictionary_version = EXCLUDED.keyword_dictionary_version,
	updated_at = now();`

func (s *httpValidationService) persistExtractionFeatureRows(ctx context.Context, campaignID uuid.UUID, vectors map[string]map[string]interface{}) error {
	if len(vectors) == 0 {
		return nil
	}
	sqlxDB, ok := s.deps.DB.(*sqlx.DB)
	if !ok || sqlxDB == nil {
		return fmt.Errorf("sqlx DB unavailable for extraction feature persistence")
	}
	domains := make([]string, 0, len(vectors))
	for domain := range vectors {
		domains = append(domains, domain)
	}
	sort.Strings(domains)
	var lastErr error
	for _, domain := range domains {
		row, err := buildExtractionFeatureRow(domain, vectors[domain])
		if err != nil {
			lastErr = err
			if s.deps.Logger != nil {
				s.deps.Logger.Warn(ctx, "Skipping extraction feature row", map[string]interface{}{"campaign_id": campaignID, "domain": domain, "error": err.Error()})
			}
			continue
		}
		args := []interface{}{
			campaignID,
			row.HTTPStatusCode,
			row.ContentBytes,
			row.PageLang,
			row.KwUniqueCount,
			row.KwTotalOccurrences,
			row.KwWeightSum,
			row.KwTop3JSON,
			row.KwSignalJSON,
			row.MicrocrawlEnabled,
			row.MicrocrawlPages,
			row.MicrocrawlBaseKwCount,
			row.MicrocrawlAddedKwCount,
			row.MicrocrawlGainRatio,
			row.DiminishingReturns,
			row.IsParked,
			row.ParkedConfidence,
			row.ContentRichnessScore,
			row.FeatureVectorJSON,
			row.ExtractionVersion,
			row.KeywordDictionaryVersion,
			domain,
		}
		if _, err := sqlxDB.ExecContext(ctx, upsertExtractionFeatureSQL, args...); err != nil {
			lastErr = err
			if s.deps.Logger != nil {
				s.deps.Logger.Warn(ctx, "Failed to persist extraction feature row", map[string]interface{}{"campaign_id": campaignID, "domain": domain, "error": err.Error()})
			}
		}
	}
	return lastErr
}

type extractionFeatureRow struct {
	DomainName               string
	HTTPStatusCode           *int
	ContentBytes             *int
	PageLang                 *string
	KwUniqueCount            *int
	KwTotalOccurrences       *int
	KwWeightSum              *float64
	KwTop3JSON               *string
	KwSignalJSON             *string
	MicrocrawlEnabled        bool
	MicrocrawlPages          *int
	MicrocrawlBaseKwCount    *int
	MicrocrawlAddedKwCount   *int
	MicrocrawlGainRatio      *float64
	DiminishingReturns       bool
	IsParked                 bool
	ParkedConfidence         *float64
	ContentRichnessScore     *float64
	FeatureVectorJSON        string
	ExtractionVersion        int
	KeywordDictionaryVersion int
}

func buildExtractionFeatureRow(domain string, fv map[string]interface{}) (*extractionFeatureRow, error) {
	if len(fv) == 0 {
		return nil, fmt.Errorf("feature vector empty for domain %s", domain)
	}
	raw, err := json.Marshal(fv)
	if err != nil {
		return nil, fmt.Errorf("marshal feature vector: %w", err)
	}
	row := &extractionFeatureRow{
		DomainName:               domain,
		FeatureVectorJSON:        string(raw),
		ExtractionVersion:        1,
		KeywordDictionaryVersion: 1,
	}
	row.HTTPStatusCode = toIntPtr(fv["status_code"])
	row.ContentBytes = toIntPtr(fv["content_bytes"])
	row.PageLang = toStringPtr(fv["primary_lang"])
	row.KwUniqueCount = toIntPtr(fv["kw_unique"])
	row.KwTotalOccurrences = toIntPtr(fv["kw_hits_total"])
	row.KwWeightSum = toFloatPtr(fv["kw_weight_sum"])
	if top := vectorStringSlice(fv["kw_top3"]); len(top) > 0 {
		if encoded, err := json.Marshal(top); err == nil {
			s := string(encoded)
			row.KwTop3JSON = &s
		}
	}
	if dist := vectorStringIntMap(fv["kw_signal_distribution"]); len(dist) > 0 {
		if encoded, err := json.Marshal(dist); err == nil {
			s := string(encoded)
			row.KwSignalJSON = &s
		}
	}
	row.MicrocrawlPages = toIntPtr(fv["microcrawl_pages"])
	if row.MicrocrawlPages == nil {
		row.MicrocrawlPages = toIntPtr(fv["secondary_pages_examined"])
	}
	row.MicrocrawlBaseKwCount = toIntPtr(fv["kw_unique_root"])
	row.MicrocrawlAddedKwCount = toIntPtr(fv["kw_unique_added"])
	row.MicrocrawlGainRatio = toFloatPtr(fv["kw_growth_ratio"])
	if row.MicrocrawlGainRatio == nil {
		row.MicrocrawlGainRatio = toFloatPtr(fv["microcrawl_gain_ratio"])
	}
	if val, ok := boolFromAny(fv["microcrawl_used"]); ok {
		row.MicrocrawlEnabled = val
	} else if row.MicrocrawlPages != nil && *row.MicrocrawlPages > 0 {
		row.MicrocrawlEnabled = true
	}
	if val, ok := boolFromAny(fv["diminishing_returns"]); ok {
		row.DiminishingReturns = val
	}
	if val, ok := boolFromAny(fv["is_parked"]); ok {
		row.IsParked = val
	}
	row.ParkedConfidence = toFloatPtr(fv["parked_confidence"])
	row.ContentRichnessScore = toFloatPtr(fv["richness"])
	if row.ContentRichnessScore == nil {
		row.ContentRichnessScore = toFloatPtr(fv["richness_score"])
	}
	return row, nil
}

func toIntPtr(v interface{}) *int {
	if val, ok := intFromAny(v); ok {
		ptr := val
		return &ptr
	}
	return nil
}

func toFloatPtr(v interface{}) *float64 {
	if val, ok := floatFromAny(v); ok {
		ptr := val
		return &ptr
	}
	return nil
}

func toStringPtr(v interface{}) *string {
	if val, ok := stringFromAny(v); ok && val != "" {
		ptr := val
		return &ptr
	}
	return nil
}

func intFromAny(v interface{}) (int, bool) {
	switch t := v.(type) {
	case int:
		return t, true
	case int32:
		return int(t), true
	case int64:
		return int(t), true
	case float64:
		return int(t), true
	case float32:
		return int(t), true
	case json.Number:
		if val, err := t.Int64(); err == nil {
			return int(val), true
		}
	case string:
		if val, err := strconv.Atoi(strings.TrimSpace(t)); err == nil {
			return val, true
		}
	}
	return 0, false
}

func floatFromAny(v interface{}) (float64, bool) {
	switch t := v.(type) {
	case float64:
		return t, true
	case float32:
		return float64(t), true
	case int:
		return float64(t), true
	case int32:
		return float64(t), true
	case int64:
		return float64(t), true
	case json.Number:
		if val, err := t.Float64(); err == nil {
			return val, true
		}
	case string:
		if val, err := strconv.ParseFloat(strings.TrimSpace(t), 64); err == nil {
			return val, true
		}
	}
	return 0, false
}

func boolFromAny(v interface{}) (bool, bool) {
	switch t := v.(type) {
	case bool:
		return t, true
	case string:
		lv := strings.ToLower(strings.TrimSpace(t))
		switch lv {
		case "true", "1", "yes", "on":
			return true, true
		case "false", "0", "no", "off":
			return false, true
		}
	case int, int32, int64, float32, float64:
		if val, ok := intFromAny(v); ok {
			return val != 0, true
		}
	}
	return false, false
}

func stringFromAny(v interface{}) (string, bool) {
	switch t := v.(type) {
	case string:
		return t, true
	case []byte:
		return string(t), true
	}
	return "", false
}

func vectorStringSlice(v interface{}) []string {
	switch val := v.(type) {
	case []string:
		return val
	case []interface{}:
		out := make([]string, 0, len(val))
		for _, item := range val {
			if s, ok := item.(string); ok {
				out = append(out, s)
			}
		}
		return out
	default:
		return nil
	}
}

func vectorStringIntMap(v interface{}) map[string]int {
	out := map[string]int{}
	switch val := v.(type) {
	case map[string]int:
		for k, v := range val {
			out[k] = v
		}
	case map[string]interface{}:
		for k, raw := range val {
			if i, ok := intFromAny(raw); ok {
				out[k] = i
			}
		}
	}
	return out
}

// microCrawlEnhance performs a bounded depth-1 crawl of internal links for a single domain result.
// Returns: pagesExamined, exhausted(bool), newUniqueKeywordCount, mergedKeywordPatterns
func (s *httpValidationService) microCrawlEnhance(ctx context.Context, campaignID uuid.UUID, root *httpvalidator.ValidationResult, keywordSetIDs []string, adHocKeywords []string, maxPages int, byteBudget int) (int, bool, int, []string) {
	// Preconditions
	if root == nil || len(root.RawBody) == 0 || maxPages <= 0 || byteBudget <= 0 || s.kwScanner == nil {
		return 0, false, 0, nil
	}
	// Parse root HTML to extract candidate internal links
	doc, err := html.Parse(bytes.NewReader(root.RawBody))
	if err != nil {
		return 0, false, 0, nil
	}
	// Extract host from final URL
	u, perr := url.Parse(root.FinalURL)
	if perr != nil || u.Host == "" {
		return 0, false, 0, nil
	}
	host := u.Host
	// Collect links
	links := make([]string, 0, 32)
	var f func(*html.Node)
	f = func(n *html.Node) {
		if n.Type == html.ElementNode && n.Data == "a" {
			for _, attr := range n.Attr {
				if attr.Key == "href" && attr.Val != "" {
					href := strings.TrimSpace(attr.Val)
					if strings.HasPrefix(href, "#") {
						continue
					}
					// Normalize relative
					var abs string
					if strings.HasPrefix(href, "http://") || strings.HasPrefix(href, "https://") {
						abs = href
					} else if strings.HasPrefix(href, "//") {
						abs = u.Scheme + ":" + href
					} else if strings.HasPrefix(href, "/") {
						abs = u.Scheme + "://" + host + href
					} else {
						continue
					}
					// Filter same host only
					if pu, e2 := url.Parse(abs); e2 == nil && pu.Host == host {
						if !strings.Contains(pu.Path, ".") { // skip assets crudely
							links = append(links, abs)
						}
					}
				}
			}
		}
		for c := n.FirstChild; c != nil; c = c.NextSibling {
			f(c)
		}
	}
	f(doc)
	if len(links) == 0 {
		return 0, false, 0, nil
	}
	// Deduplicate
	uniq := make(map[string]struct{}, len(links))
	dedup := make([]string, 0, len(links))
	for _, l := range links {
		if _, ok := uniq[l]; ok {
			continue
		}
		uniq[l] = struct{}{}
		dedup = append(dedup, l)
	}
	// Bound pages
	if len(dedup) > maxPages {
		dedup = dedup[:maxPages]
	}
	client := &http.Client{Timeout: 6 * time.Second}
	bytesUsed := 0
	keywordPatterns := make(map[string]struct{}, 32)
	// Root patterns baseline
	// Merge existing root keywords if already scanned via enrichment; we don't have them here explicitly, so only new pages contribute additional
	pagesExamined := 0
	exhausted := false
	var exec store.Querier
	if q, ok := s.deps.DB.(store.Querier); ok {
		exec = q
	}
	for _, link := range dedup {
		if bytesUsed >= byteBudget {
			exhausted = true
			break
		}
		req, _ := http.NewRequestWithContext(ctx, "GET", link, nil)
		resp, err := client.Do(req)
		if err != nil {
			continue
		}
		body, _ := io.ReadAll(io.LimitReader(resp.Body, int64(byteBudget-bytesUsed)))
		_ = resp.Body.Close()
		pagesExamined++
		bytesUsed += len(body)
		if len(body) == 0 {
			continue
		}
		if len(keywordSetIDs) > 0 {
			if hitsBySet, err := s.kwScanner.ScanBySetIDs(ctx, exec, body, keywordSetIDs); err == nil {
				for _, patterns := range hitsBySet {
					for _, p := range patterns {
						keywordPatterns[p] = struct{}{}
					}
				}
			}
		}
		if len(adHocKeywords) > 0 {
			if adh, err := s.kwScanner.ScanAdHocKeywords(ctx, body, adHocKeywords); err == nil {
				for _, p := range adh {
					keywordPatterns[p] = struct{}{}
				}
			}
		}
		if pagesExamined >= maxPages {
			break
		}
	}
	totalUnique := len(keywordPatterns)
	if totalUnique == 0 {
		return pagesExamined, exhausted, 0, nil
	}
	merged := make([]string, 0, totalUnique)
	for k := range keywordPatterns {
		merged = append(merged, k)
	}
	return pagesExamined, exhausted, totalUnique, merged
}

func coalesceKeywordSources(cfg *models.HTTPPhaseConfigRequest) ([]string, []string) {
	if cfg == nil {
		return nil, nil
	}
	appendUniqueUUID := func(seen map[string]struct{}, list []string, raw string) ([]string, map[string]struct{}) {
		if seen == nil {
			seen = make(map[string]struct{})
		}
		trimmed := strings.TrimSpace(raw)
		if trimmed == "" {
			return list, seen
		}
		if _, err := uuid.Parse(trimmed); err != nil {
			return list, seen
		}
		if _, ok := seen[trimmed]; ok {
			return list, seen
		}
		seen[trimmed] = struct{}{}
		return append(list, trimmed), seen
	}
	var seen map[string]struct{}
	var setIDs []string
	for _, id := range cfg.KeywordSetIDs {
		setIDs, seen = appendUniqueUUID(seen, setIDs, id)
	}
	legacySetIDs, inlineKeywords := partitionKeywordInputs(cfg.Keywords)
	for _, id := range legacySetIDs {
		setIDs, seen = appendUniqueUUID(seen, setIDs, id)
	}
	if len(setIDs) == 0 {
		setIDs = nil
	}
	return setIDs, inlineKeywords
}

func partitionKeywordInputs(inputs []string) ([]string, []string) {
	if len(inputs) == 0 {
		return nil, nil
	}
	setIDs := make([]string, 0, len(inputs))
	inlineKeywords := make([]string, 0, len(inputs))
	for _, raw := range inputs {
		trimmed := strings.TrimSpace(raw)
		if trimmed == "" {
			continue
		}
		if _, err := uuid.Parse(trimmed); err == nil {
			setIDs = append(setIDs, trimmed)
			continue
		}
		inlineKeywords = append(inlineKeywords, trimmed)
	}
	if len(setIDs) == 0 {
		setIDs = nil
	}
	if len(inlineKeywords) == 0 {
		inlineKeywords = nil
	}
	return setIDs, inlineKeywords
}

// isFeatureEnabled checks if a feature flag environment variable is enabled (1 or true, case-insensitive).
func isFeatureEnabled(envVar string) bool {
	v, ok := os.LookupEnv(envVar)
	return ok && (v == "1" || strings.EqualFold(v, "true"))
}

// updateExecutionStatus updates the execution status for a campaign
func (s *httpValidationService) updateExecutionStatus(campaignID uuid.UUID, status models.PhaseStatusEnum, errorMsg string) {
	s.mu.Lock()
	defer s.mu.Unlock()

	execution, exists := s.executions[campaignID]
	if !exists {
		return
	}

	execution.Status = status
	execution.ErrorMessage = errorMsg

	if status == models.PhaseStatusCompleted || status == models.PhaseStatusFailed || status == models.PhaseStatusSkipped {
		now := time.Now()
		execution.CompletedAt = &now
	}

	// Send progress update
	if execution.ProgressChan != nil {
		select {
		case execution.ProgressChan <- PhaseProgress{
			Phase:          models.PhaseTypeHTTPKeywordValidation,
			Status:         status,
			ProgressPct:    execution.Progress,
			ItemsProcessed: int64(execution.ItemsProcessed),
			ItemsTotal:     int64(execution.ItemsTotal),
			Error:          errorMsg,
		}:
		default:
		}
	}

	// Persist status change
	ctx := context.Background()
	if s.store != nil {
		var exec store.Querier
		if q, ok := s.deps.DB.(store.Querier); ok {
			exec = q
		}
		switch status {
		case models.PhaseStatusCompleted:
			_ = s.store.CompletePhase(ctx, exec, campaignID, models.PhaseTypeHTTPKeywordValidation)
		case models.PhaseStatusSkipped:
			_ = s.store.SkipPhase(ctx, exec, campaignID, models.PhaseTypeHTTPKeywordValidation, errorMsg)
		case models.PhaseStatusFailed:
			_ = s.store.FailPhase(ctx, exec, campaignID, models.PhaseTypeHTTPKeywordValidation, errorMsg)
		case models.PhaseStatusPaused:
			_ = s.store.PausePhase(ctx, exec, campaignID, models.PhaseTypeHTTPKeywordValidation)
		}
	}
}
