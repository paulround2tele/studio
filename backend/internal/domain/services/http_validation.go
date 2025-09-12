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

	"github.com/fntelecomllc/studio/backend/internal/keywordscanner"
	"golang.org/x/net/html"

	"github.com/fntelecomllc/studio/backend/internal/httpvalidator"
	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/fntelecomllc/studio/backend/internal/store"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

// httpValidationService orchestrates the HTTP validation engine
// It wraps httpvalidator.HTTPValidator without replacing its core functionality
type httpValidationService struct {
	store         store.CampaignStore
	personaStore  store.PersonaStore
	proxyStore    store.ProxyStore
	deps          Dependencies
	httpValidator *httpvalidator.HTTPValidator
	// keyword scanner (lazy init)
	kwScannerInit sync.Once
	kwScanner     *keywordscanner.Service

	// Execution tracking per campaign
	mu         sync.RWMutex
	executions map[uuid.UUID]*httpValidationExecution
	status     models.PhaseStatusEnum
}

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

	// Enforce phase order: DNS must be completed before HTTP can be configured
	if err := s.ensureDNSCompleted(ctx, campaignID); err != nil {
		s.deps.Logger.Warn(ctx, "HTTP configuration blocked: DNS not completed", map[string]interface{}{
			"campaign_id": campaignID,
		})
		return fmt.Errorf("cannot configure HTTP validation before DNS validation completes: %w", err)
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
		if raw, mErr := json.Marshal(httpConfig); mErr == nil {
			var exec store.Querier
			if q, ok := s.deps.DB.(store.Querier); ok {
				exec = q
			}
			_ = s.store.UpdatePhaseConfiguration(ctx, exec, campaignID, models.PhaseTypeHTTPKeywordValidation, raw)
		}
	}
	s.deps.Logger.Info(ctx, "HTTP validation configuration stored", map[string]interface{}{
		"campaign_id":    campaignID,
		"persona_count":  len(httpConfig.PersonaIDs),
		"keyword_count":  len(httpConfig.Keywords),
		"adhoc_keywords": len(httpConfig.AdHocKeywords),
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
	totalKeywords := len(httpConfig.Keywords) + len(httpConfig.AdHocKeywords)
	if totalKeywords == 0 {
		return fmt.Errorf("at least one keyword (predefined or ad-hoc) must be provided")
	}

	s.deps.Logger.Debug(ctx, "HTTP validation configuration validated", map[string]interface{}{
		"persona_count":  len(httpConfig.PersonaIDs),
		"keyword_count":  len(httpConfig.Keywords),
		"adhoc_keywords": len(httpConfig.AdHocKeywords),
		"total_keywords": totalKeywords,
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
		s.updateExecutionStatus(campaignID, models.PhaseStatusCompleted, "no validated domains found")
		close(execution.ProgressChan)
		return execution.ProgressChan, nil
	}

	// Apply stealth order and jitter if present
	if order, _, _, ok := s.loadStealthForHTTP(ctx, campaignID); ok {
		if len(order) > 0 {
			domains = order
		}
	}

	execution.ItemsTotal = len(domains)

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
	s.deps.Logger.Info(ctx, "Cancelling HTTP validation", map[string]interface{}{
		"campaign_id": campaignID,
	})

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

	s.deps.Logger.Info(ctx, "HTTP validation cancelled", map[string]interface{}{
		"campaign_id": campaignID,
	})

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
	enrichmentEnabled := false
	microcrawlEnabled := false
	microMaxPages := 3
	microByteBudget := 150000
	if v, ok := os.LookupEnv("ENABLE_HTTP_ENRICHMENT"); ok && (v == "1" || strings.EqualFold(v, "true")) {
		enrichmentEnabled = true
	}
	if v, ok := os.LookupEnv("ENABLE_HTTP_MICROCRAWL"); ok && (v == "1" || strings.EqualFold(v, "true")) {
		microcrawlEnabled = true
	}
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
	parkedHeuristic := func(title string, snippet string) (bool, float64) {
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
		scoreIf(strings.Contains(ls, "coming soon"), 2)
		if total == 0 {
			return false, 0
		}
		conf := float64(signals) / float64(total)
		return conf >= 0.75, conf
	}

	for i := 0; i < total; i += batchSize {
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
		results := s.httpValidator.ValidateDomainsBulk(ctx, genBatch, 25, persona, proxy)

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
					keywordSetIDs = append(keywordSetIDs, cfg.Keywords...)
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
				mapped := "error"
				le := strings.ToLower(r.Error)
				switch {
				case r.IsSuccess || r.Status == "Validated" || r.Status == "OK":
					mapped = "ok"
				case strings.EqualFold(r.Status, "timeout") || strings.Contains(le, "timeout"):
					mapped = "timeout"
				}
				if mapped != "ok" {
					continue
				}
				fv := map[string]interface{}{
					"status_code":   r.StatusCode,
					"fetched_at":    time.Now().UTC().Format(time.RFC3339),
					"content_bytes": r.ContentLength,
				}
				// Keyword scans (root only for now)
				if len(r.RawBody) > 0 && (len(keywordSetIDs) > 0 || len(adHocKeywords) > 0) {
					var exec store.Querier
					if q, ok := s.deps.DB.(store.Querier); ok {
						exec = q
					}
					kwSetHits := 0
					uniqueSetPatterns := make(map[string]struct{}, 32)
					if len(keywordSetIDs) > 0 {
						if hitsBySet, err := s.kwScanner.ScanBySetIDs(ctx, exec, r.RawBody, keywordSetIDs); err == nil && len(hitsBySet) > 0 {
							perSet := make(map[string]int, len(hitsBySet))
							for setID, patterns := range hitsBySet {
								perSet[setID] = len(patterns)
								kwSetHits += len(patterns)
								for _, p := range patterns {
									uniqueSetPatterns[p] = struct{}{}
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
								uniqueSetPatterns[p] = struct{}{}
							}
						}
					}
					if r.ExtractedTitle != "" {
						tl := strings.ToLower(r.ExtractedTitle)
						hasTitleKeyword := false
						for k := range uniqueSetPatterns {
							if strings.Contains(tl, strings.ToLower(k)) {
								hasTitleKeyword = true
								break
							}
						}
						fv["title_has_keyword"] = hasTitleKeyword
					}
					fv["kw_hits_total"] = len(uniqueSetPatterns)
					fv["kw_unique"] = len(uniqueSetPatterns)
				}
				// Parked heuristic
				isParked, conf := parkedHeuristic(r.ExtractedTitle, r.ExtractedContentSnippet)
				fv["parked_confidence"] = conf
				if isParked {
					fv["is_parked"] = true
				}
				// Micro-crawl execution (depth-1) if criteria met
				if microcrawlEnabled && !isParked {
					kwu, _ := fv["kw_unique"].(int)
					if kwu < 2 && r.ContentLength < 60000 && conf < 0.5 {
						pagesExamined, exhausted, newKw, newPatterns := s.microCrawlEnhance(ctx, campaignID, r, keywordSetIDs, adHocKeywords, microMaxPages, microByteBudget)
						if pagesExamined > 0 {
							fv["microcrawl_used"] = true
							fv["microcrawl_pages"] = pagesExamined
							fv["microcrawl_exhausted"] = exhausted
							fv["secondary_pages_examined"] = pagesExamined
							// merge keywords
							if len(newPatterns) > 0 {
								fv["kw_hits_total"] = newKw
								fv["kw_unique"] = newKw
							}
						} else {
							fv["microcrawl_planned"] = false
						}
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
			if err := s.persistFeatureVectors(ctx, campaignID, enrichmentVectors); err != nil {
				s.deps.Logger.Warn(ctx, "Failed to persist feature vectors", map[string]interface{}{"campaign_id": campaignID, "error": err.Error()})
			} else {
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
					})
					s.deps.SSE.Send(string(msg))
				}
				// reset map
				for k := range enrichmentVectors {
					delete(enrichmentVectors, k)
				}
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

	s.deps.Logger.Info(ctx, "HTTP validation completed successfully", map[string]interface{}{
		"campaign_id":    campaignID,
		"results_count":  len(allResults),
		"domains_tested": len(domains),
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
	// If a stealth order exists, use it
	if order, _, _, ok := s.loadStealthForHTTP(ctx, campaignID); ok && len(order) > 0 {
		return order, nil
	}
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

// loadStealthForHTTP reads stealth order and jitter from campaign domains data
func (s *httpValidationService) loadStealthForHTTP(ctx context.Context, campaignID uuid.UUID) (order []string, jitterMin int, jitterMax int, ok bool) {
	// Phase C: domains_data deprecated; stealth config persistence removed. Return no-op.
	return nil, 0, 0, false
}

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
		valueStrings = append(valueStrings, fmt.Sprintf("($%d,$%d,$%d,$%d,$%d)", idx, idx+1, idx+2, idx+3, idx+4))
		valueArgs = append(valueArgs, r.DomainName, r.ValidationStatus, r.HTTPStatusCode, r.LastCheckedAt, r.Reason)
	}
	valuesClause := strings.Join(valueStrings, ",")
	query := fmt.Sprintf(`WITH updates(domain_name,validation_status,http_status_code,last_checked_at,reason) AS (VALUES %s)
UPDATE generated_domains gd
SET http_status = u.validation_status,
    http_status_code = u.http_status_code,
    http_checked_at = u.last_checked_at,
    http_reason = CASE WHEN u.validation_status = 'ok' THEN NULL ELSE COALESCE(u.reason, gd.http_reason) END
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
			if exec != nil {
				_, err := exec.ExecContext(ctx, `UPDATE generated_domains SET feature_vector = $1, last_http_fetched_at = NOW(), parked_confidence = COALESCE($2, parked_confidence), is_parked = CASE WHEN $3::boolean IS TRUE THEN TRUE ELSE is_parked END WHERE campaign_id = $4 AND domain_name = $5`, raw, fv["parked_confidence"], fv["is_parked"], campaignID, domain)
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
		valueStrings = append(valueStrings, fmt.Sprintf("($%d,$%d,$%d,$%d)", idx, idx+1, idx+2, idx+3))
		args = append(args, d, raw, fv["parked_confidence"], fv["is_parked"]) // domain, feature_vector, parked_confidence, is_parked
		idx += 4
	}
	query := fmt.Sprintf(`WITH incoming(domain_name,feature_vector,parked_confidence,is_parked) AS (VALUES %s)
UPDATE generated_domains gd
SET feature_vector = incoming.feature_vector,
	last_http_fetched_at = NOW(),
	parked_confidence = COALESCE(incoming.parked_confidence, gd.parked_confidence),
	is_parked = CASE WHEN incoming.is_parked IS TRUE THEN TRUE ELSE gd.is_parked END
FROM incoming
WHERE gd.campaign_id = $1 AND gd.domain_name = incoming.domain_name`, strings.Join(valueStrings, ","))
	if _, err := sqlxDB.ExecContext(ctx, query, args...); err != nil {
		return fmt.Errorf("bulk feature vector update failed: %w", err)
	}
	return nil
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

	if status == models.PhaseStatusCompleted || status == models.PhaseStatusFailed {
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
		case models.PhaseStatusFailed:
			_ = s.store.FailPhase(ctx, exec, campaignID, models.PhaseTypeHTTPKeywordValidation, errorMsg)
		case models.PhaseStatusPaused:
			_ = s.store.PausePhase(ctx, exec, campaignID, models.PhaseTypeHTTPKeywordValidation)
		}
	}
}
