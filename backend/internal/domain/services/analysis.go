// Analysis Service - orchestrates contentfetcher and keywordextractor engines
package services

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"math"
	"os"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/prometheus/client_golang/prometheus"

	"github.com/fntelecomllc/studio/backend/internal/extraction"

	"github.com/fntelecomllc/studio/backend/internal/contentfetcher"
	"github.com/fntelecomllc/studio/backend/internal/keywordextractor"
	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/fntelecomllc/studio/backend/internal/store"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

// Error code constants (centralization TODO: move to dedicated phase error codes module when standardized)
const (
	// ErrCodeAnalysisMissingFeatures indicates that analysis cannot proceed because no feature vectors
	// were found for the campaign (HTTP enrichment/validation phase likely absent or failed earlier).
	ErrCodeAnalysisMissingFeatures = "E_ANALYSIS_MISSING_FEATURES"
)

// analysisService orchestrates content analysis engines
// It coordinates contentfetcher and keywordextractor without replacing their functionality
type analysisService struct {
	store          store.CampaignStore
	personaStore   store.PersonaStore
	proxyStore     store.ProxyStore
	deps           Dependencies
	contentFetcher *contentfetcher.ContentFetcher
	mtx            struct {
		scoreHistogram prometheus.Histogram
		rescoreRuns    *prometheus.CounterVec
		rescoreRunsV2  *prometheus.CounterVec
		phaseDuration  prometheus.Histogram
		reuseCounter   prometheus.Counter
		preflightFail  prometheus.Counter
	}

	// Execution tracking per campaign
	mu         sync.RWMutex
	executions map[uuid.UUID]*analysisExecution
	status     models.PhaseStatusEnum
}

// analysisExecution tracks analysis execution state
type analysisExecution struct {
	CampaignID     uuid.UUID                                             `json:"campaign_id"`
	Status         models.PhaseStatusEnum                                `json:"status"`
	StartedAt      time.Time                                             `json:"started_at"`
	CompletedAt    *time.Time                                            `json:"completed_at,omitempty"`
	Progress       float64                                               `json:"progress"`
	ItemsProcessed int                                                   `json:"items_processed"`
	ItemsTotal     int                                                   `json:"items_total"`
	ErrorMessage   string                                                `json:"error_message,omitempty"`
	ContentResults map[string][]byte                                     `json:"content_results,omitempty"` // domain -> content
	KeywordResults map[string][]keywordextractor.KeywordExtractionResult `json:"keyword_results,omitempty"` // domain -> keywords
	CancelChan     chan struct{}                                         `json:"-"`
	ProgressChan   chan PhaseProgress                                    `json:"-"`
}

// AnalysisConfig represents configuration for analysis phase
type AnalysisConfig struct {
	PersonaIDs      []string             `json:"personaIds" validate:"required,min=1"`
	KeywordRules    []models.KeywordRule `json:"keywordRules,omitempty"`    // Rules for keyword extraction
	IncludeExternal bool                 `json:"includeExternal,omitempty"` // Include external links
	Name            *string              `json:"name,omitempty"`
}

// NewAnalysisService creates a new analysis service
func NewAnalysisService(
	store store.CampaignStore,
	deps Dependencies,
	contentFetcher *contentfetcher.ContentFetcher,
	personaStore store.PersonaStore,
	proxyStore store.ProxyStore,
) AnalysisService {
	return &analysisService{
		store:          store,
		personaStore:   personaStore,
		proxyStore:     proxyStore,
		deps:           deps,
		contentFetcher: contentFetcher,
		executions:     make(map[uuid.UUID]*analysisExecution),
		status:         models.PhaseStatusNotStarted,
	}
}

// GetPhaseType returns the phase type this service handles
func (s *analysisService) GetPhaseType() models.PhaseTypeEnum {
	return models.PhaseTypeAnalysis
}

// Configure sets up analysis configuration for a campaign
func (s *analysisService) Configure(ctx context.Context, campaignID uuid.UUID, config interface{}) error {
	s.deps.Logger.Info(ctx, "Configuring analysis service", map[string]interface{}{
		"campaign_id": campaignID,
	})

	// Type assert the configuration
	analysisConfig, ok := config.(*AnalysisConfig)
	if !ok {
		return fmt.Errorf("invalid configuration type for analysis: expected *AnalysisConfig")
	}

	// Validate configuration
	if err := s.Validate(ctx, analysisConfig); err != nil {
		return fmt.Errorf("configuration validation failed: %w", err)
	}

	// Mark configured state in memory for status API (include zeroed metrics now)
	s.mu.Lock()
	if _, ok := s.executions[campaignID]; !ok {
		s.executions[campaignID] = &analysisExecution{CampaignID: campaignID, Status: models.PhaseStatusConfigured, ItemsProcessed: 0, ItemsTotal: 0, Progress: 0}
	} else {
		ex := s.executions[campaignID]
		ex.Status = models.PhaseStatusConfigured
		// leave StartedAt unchanged; if zero it will be omitted from status responses
	}
	s.mu.Unlock()

	// Store configuration in campaign phases
	if s.store != nil {
		if raw, mErr := json.Marshal(analysisConfig); mErr == nil {
			var exec store.Querier
			if q, ok := s.deps.DB.(store.Querier); ok {
				exec = q
			}
			_ = s.store.UpdatePhaseConfiguration(ctx, exec, campaignID, models.PhaseTypeAnalysis, raw)
		}
	}
	s.deps.Logger.Info(ctx, "Analysis configuration stored", map[string]interface{}{
		"campaign_id":   campaignID,
		"persona_count": len(analysisConfig.PersonaIDs),
		"keyword_rules": len(analysisConfig.KeywordRules),
	})

	return nil
}

// Validate validates analysis configuration
func (s *analysisService) Validate(ctx context.Context, config interface{}) error {
	analysisConfig, ok := config.(*AnalysisConfig)
	if !ok {
		return fmt.Errorf("invalid configuration type: expected *AnalysisConfig")
	}

	// Validate personas exist
	if len(analysisConfig.PersonaIDs) == 0 {
		return fmt.Errorf("at least one persona ID must be provided")
	}

	// Optional: validate name length if provided
	if analysisConfig.Name != nil {
		trim := strings.TrimSpace(*analysisConfig.Name)
		if trim == "" {
			return fmt.Errorf("name cannot be empty when provided")
		}
		if len([]rune(trim)) > 120 {
			return fmt.Errorf("name exceeds maximum length of 120 characters")
		}
		*analysisConfig.Name = trim
	}

	// Validate keyword rules (if provided). We allow zero rules; presence means each must have pattern & rule type
	for i, r := range analysisConfig.KeywordRules {
		if strings.TrimSpace(r.Pattern) == "" {
			return fmt.Errorf("keywordRules[%d].pattern required", i)
		}
		if strings.TrimSpace(string(r.RuleType)) == "" {
			return fmt.Errorf("keywordRules[%d].ruleType required", i)
		}
		// Restrict rule type to expected enum values (align with models.KeywordRuleTypeEnum)
		if rt := strings.ToLower(string(r.RuleType)); rt != "string" && rt != "regex" {
			return fmt.Errorf("keywordRules[%d].ruleType must be one of 'string' or 'regex'", i)
		}
		if r.ContextChars < 0 {
			return fmt.Errorf("keywordRules[%d].contextChars must be >= 0", i)
		}
		// Additional regex compilation check if regex type
		if strings.ToLower(string(r.RuleType)) == "regex" {
			if _, err := regexp.Compile(r.Pattern); err != nil {
				return fmt.Errorf("keywordRules[%d].pattern invalid regex: %v", i, err)
			}
		}
	}

	s.deps.Logger.Debug(ctx, "Analysis configuration validated", map[string]interface{}{
		"persona_count": len(analysisConfig.PersonaIDs),
		"keyword_rules": len(analysisConfig.KeywordRules),
	})

	return nil
}

// Execute starts analysis for a campaign
func (s *analysisService) Execute(ctx context.Context, campaignID uuid.UUID) (<-chan PhaseProgress, error) {
	s.deps.Logger.Info(ctx, "Starting analysis execution", map[string]interface{}{
		"campaign_id": campaignID,
	})

	// Handle existing execution state similar to HTTP validation: allow transition from Configured, restart after terminal
	reuseExisting := false
	s.mu.Lock()
	if existing, exists := s.executions[campaignID]; exists {
		switch existing.Status {
		case models.PhaseStatusInProgress:
			s.mu.Unlock()
			return nil, fmt.Errorf("analysis already in progress for campaign %s", campaignID)
		case models.PhaseStatusConfigured:
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
			existing.ContentResults = make(map[string][]byte)
			existing.KeywordResults = make(map[string][]keywordextractor.KeywordExtractionResult)
			reuseExisting = true
		case models.PhaseStatusCompleted, models.PhaseStatusFailed, models.PhaseStatusPaused:
			if existing.ProgressChan != nil {
				close(existing.ProgressChan)
			}
		}
	}
	var execution *analysisExecution
	if reuseExisting {
		execution = s.executions[campaignID]
		s.deps.Logger.Debug(ctx, "Analysis resumed from configured state", map[string]interface{}{"campaign_id": campaignID})
	} else {
		execution = &analysisExecution{
			CampaignID:     campaignID,
			Status:         models.PhaseStatusInProgress,
			StartedAt:      time.Now(),
			Progress:       0.0,
			CancelChan:     make(chan struct{}),
			ProgressChan:   make(chan PhaseProgress, 100),
			ContentResults: make(map[string][]byte),
			KeywordResults: make(map[string][]keywordextractor.KeywordExtractionResult),
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
		_ = s.store.StartPhase(ctx, exec, campaignID, models.PhaseTypeAnalysis)
	}

	// Get domains from previous phase (HTTP validation)
	domains, err := s.getValidatedHTTPDomains(ctx, campaignID)
	if err != nil {
		s.updateExecutionStatus(campaignID, models.PhaseStatusFailed, fmt.Sprintf("failed to get validated domains: %v", err))
		return nil, fmt.Errorf("failed to get validated domains: %w", err)
	}

	if len(domains) == 0 {
		s.updateExecutionStatus(campaignID, models.PhaseStatusCompleted, "no validated domains found for analysis")
		close(execution.ProgressChan)
		return execution.ProgressChan, nil
	}

	execution.ItemsTotal = len(domains)

	// Start analysis in goroutine
	go s.executeAnalysis(ctx, campaignID, domains)

	s.deps.Logger.Info(ctx, "Analysis execution started", map[string]interface{}{
		"campaign_id":  campaignID,
		"domain_count": len(domains),
	})

	return execution.ProgressChan, nil
}

// GetStatus returns the current status of analysis for a campaign
func (s *analysisService) GetStatus(ctx context.Context, campaignID uuid.UUID) (*PhaseStatus, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	execution, exists := s.executions[campaignID]
	if !exists {
		return &PhaseStatus{
			Phase:          models.PhaseTypeAnalysis,
			Status:         models.PhaseStatusNotStarted,
			ProgressPct:    0.0,
			ItemsTotal:     0,
			ItemsProcessed: 0,
			Configuration:  map[string]interface{}{},
		}, nil
	}

	var startedPtr *time.Time
	if !execution.StartedAt.IsZero() {
		startedPtr = &execution.StartedAt
	}
	cfgMap := map[string]interface{}{}
	cfgMap["itemsTotal"] = execution.ItemsTotal
	cfgMap["itemsProcessed"] = execution.ItemsProcessed

	return &PhaseStatus{
		Phase:          models.PhaseTypeAnalysis,
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

// Cancel stops analysis for a campaign
func (s *analysisService) Cancel(ctx context.Context, campaignID uuid.UUID) error {
	s.deps.Logger.Info(ctx, "Cancelling analysis", map[string]interface{}{
		"campaign_id": campaignID,
	})

	s.mu.Lock()
	defer s.mu.Unlock()

	execution, exists := s.executions[campaignID]
	if !exists {
		return fmt.Errorf("no analysis in progress for campaign %s", campaignID)
	}

	if execution.Status != models.PhaseStatusInProgress {
		return fmt.Errorf("analysis not in progress for campaign %s", campaignID)
	}

	// Signal cancellation
	close(execution.CancelChan)
	execution.Status = models.PhaseStatusFailed // Use Failed for cancellation
	execution.ErrorMessage = "Analysis cancelled by user"
	now := time.Now()
	execution.CompletedAt = &now

	// Close progress channel
	close(execution.ProgressChan)

	s.deps.Logger.Info(ctx, "Analysis cancelled", map[string]interface{}{
		"campaign_id": campaignID,
	})

	return nil
}

// Helper methods

// executeAnalysis performs the actual analysis using both engines
func (s *analysisService) executeAnalysis(ctx context.Context, campaignID uuid.UUID, domains []string) {
	defer func() {
		s.mu.Lock()
		if execution, exists := s.executions[campaignID]; exists && execution.ProgressChan != nil {
			close(execution.ProgressChan)
		}
		s.mu.Unlock()
	}()

	s.deps.Logger.Info(ctx, "Starting analysis engine execution", map[string]interface{}{
		"campaign_id":  campaignID,
		"domain_count": len(domains),
	})

	// Get analysis configuration (still needed for personas/future weighting, though extraction removed)
	// Retrieve configuration (may be used later for persona-based weighting or future scoring extensions)
	if _, err := s.getAnalysisConfig(ctx, campaignID); err != nil {
		s.updateExecutionStatus(campaignID, models.PhaseStatusFailed, fmt.Sprintf("failed to get analysis config: %v", err))
		return
	}

	// Preflight: verify feature vectors exist (HTTP enrichment should have produced them)
	var dbx *sql.DB
	switch db := s.deps.DB.(type) {
	case *sqlx.DB:
		dbx = db.DB
	case *sql.DB:
		dbx = db
	}
	var fvCount int64
	if dbx != nil {
		_ = dbx.QueryRowContext(ctx, `SELECT COUNT(*) FROM generated_domains WHERE campaign_id=$1 AND feature_vector IS NOT NULL`, campaignID).Scan(&fvCount)
	}
	if fvCount == 0 {
		// Structured failure – no feature vectors present
		errMsg := fmt.Sprintf("%s: no feature vectors present (HTTP phase missing or enrichment disabled)", ErrCodeAnalysisMissingFeatures)
		if s.mtx.preflightFail != nil {
			s.mtx.preflightFail.Inc()
		}
		s.updateExecutionStatus(campaignID, models.PhaseStatusFailed, errMsg)
		// Emit failure SSE explicitly including errorCode
		if s.deps.SSE != nil {
			payload, _ := json.Marshal(map[string]interface{}{
				"event":      "analysis_failed",
				"campaignId": campaignID.String(),
				"error":      errMsg,
				"errorCode":  ErrCodeAnalysisMissingFeatures,
				"timestamp":  time.Now().UTC(),
			})
			s.deps.SSE.Send(string(payload))
		}
		return
	}

	// Emit reuse enrichment SSE event for transparency
	if s.deps.SSE != nil {
		if s.mtx.reuseCounter != nil {
			s.mtx.reuseCounter.Inc()
		}
		payload, _ := json.Marshal(map[string]interface{}{
			"event":              "analysis_reuse_enrichment",
			"campaignId":         campaignID.String(),
			"featureVectorCount": fvCount,
			"timestamp":          time.Now().UTC(),
		})
		s.deps.SSE.Send(string(payload))
	}
	// TODO(metrics): consider histogram for featureVectorCount distribution and gauge for active analysis executions.

	// Directly proceed to scoring; repurpose majority of remaining progress window.
	s.sendProgress(campaignID, 85.0, "Starting scoring computation (reused HTTP enrichment)")
	// ANCHOR (SCORING-ENGINE): All future scoring feature additions (penalties, new components,
	// rescore batching improvements) MUST extend scoreDomains / helpers in this file. Do NOT
	// create a parallel scoring service. Keep weight validation in scoring_helpers.go.
	if _, err := s.scoreDomains(ctx, campaignID); err != nil {
		s.deps.Logger.Warn(ctx, "Scoring failed", map[string]interface{}{"campaign_id": campaignID, "error": err.Error()})
	} else {
		s.sendProgress(campaignID, 99.0, "Scoring completed")
	}

	// Store combined results
	s.mu.Lock()
	if execution, exists := s.executions[campaignID]; exists {
		// Legacy fields left nil after removal of inline fetching & extraction.
		// TODO(doc): Update pipeline docs to reflect analysis now only performs scoring using prior HTTP enrichment artifacts.
		execution.ItemsProcessed = len(domains)
		execution.Progress = 100.0
		execution.Status = models.PhaseStatusCompleted
		now := time.Now()
		execution.CompletedAt = &now

		// Send final progress update
		if execution.ProgressChan != nil {
			select {
			case execution.ProgressChan <- PhaseProgress{
				Phase:          models.PhaseTypeAnalysis,
				Status:         models.PhaseStatusCompleted,
				ProgressPct:    100.0,
				ItemsProcessed: int64(execution.ItemsProcessed),
				ItemsTotal:     int64(execution.ItemsTotal),
			}:
			default:
			}
		}
	}
	s.mu.Unlock()

	// Store results in campaign store
	// No inline content/keyword results to persist now; scoring writes directly to generated_domains.
	// Future: store analysis summary (score distribution snapshot) if needed.

	s.deps.Logger.Info(ctx, "Analysis completed successfully", map[string]interface{}{
		"campaign_id":      campaignID,
		"domains_analyzed": len(domains),
		"mode":             "scoring-only",
	})

	// Mark completed in store
	if s.store != nil {
		var exec store.Querier
		if q, ok := s.deps.DB.(store.Querier); ok {
			exec = q
		}
		_ = s.store.CompletePhase(ctx, exec, campaignID, models.PhaseTypeAnalysis)
	}
}

// fetchContent uses the content fetcher engine to retrieve domain content
func (s *analysisService) fetchContent(ctx context.Context, campaignID uuid.UUID, domains []string, config *AnalysisConfig) (map[string][]byte, error) {
	s.deps.Logger.Debug(ctx, "Fetching content for domains", map[string]interface{}{
		"campaign_id":  campaignID,
		"domain_count": len(domains),
	})

	contentResults := make(map[string][]byte)

	// Get personas for content fetching
	httpPersona, dnsPersona, proxy, err := s.getPersonasForFetching(ctx, config)
	if err != nil {
		return nil, fmt.Errorf("failed to get personas: %w", err)
	}

	// Fetch content for each domain using the contentfetcher engine
	for i, domain := range domains {
		// Check for cancellation
		if execution, exists := s.executions[campaignID]; exists {
			select {
			case <-execution.CancelChan:
				return nil, fmt.Errorf("content fetching cancelled")
			default:
			}
		}

		// Construct URL
		url := fmt.Sprintf("https://%s", domain)

		// Use the contentfetcher engine's FetchUsingPersonas method
		body, finalURL, statusCode, _, _, _, err := s.contentFetcher.FetchUsingPersonas(
			ctx, url, httpPersona, dnsPersona, proxy,
		)

		if err != nil {
			s.deps.Logger.Warn(ctx, "Failed to fetch content for domain", map[string]interface{}{
				"domain": domain,
				"error":  err.Error(),
			})
			continue
		}

		if statusCode >= 200 && statusCode < 300 {
			contentResults[domain] = body
			s.deps.Logger.Debug(ctx, "Successfully fetched content", map[string]interface{}{
				"domain":     domain,
				"final_url":  finalURL,
				"status":     statusCode,
				"size_bytes": len(body),
			})
		}

		// Update progress
		progressPct := 10.0 + (float64(i+1)/float64(len(domains)))*70.0 // 10% to 80%
		s.sendProgress(campaignID, progressPct, fmt.Sprintf("Fetched content for %s", domain))
	}

	s.deps.Logger.Debug(ctx, "Content fetching completed", map[string]interface{}{
		"campaign_id":   campaignID,
		"results_count": len(contentResults),
	})

	return contentResults, nil
}

// extractKeywords uses the keyword extractor engine to analyze content
func (s *analysisService) extractKeywords(ctx context.Context, campaignID uuid.UUID, contentResults map[string][]byte, config *AnalysisConfig) (map[string][]keywordextractor.KeywordExtractionResult, error) {
	s.deps.Logger.Debug(ctx, "Extracting keywords from content", map[string]interface{}{
		"campaign_id":     campaignID,
		"content_results": len(contentResults),
	})

	keywordResults := make(map[string][]keywordextractor.KeywordExtractionResult)

	// Use default keyword rules if none provided
	rules := config.KeywordRules
	if len(rules) == 0 {
		// Create some basic default rules
		rules = []models.KeywordRule{
			{Pattern: "contact", RuleType: "string"},
			{Pattern: "email", RuleType: "string"},
			{Pattern: "phone", RuleType: "string"},
			{Pattern: "about", RuleType: "string"},
		}
	}

	i := 0
	for domain, content := range contentResults {
		// Check for cancellation
		if execution, exists := s.executions[campaignID]; exists {
			select {
			case <-execution.CancelChan:
				return nil, fmt.Errorf("keyword extraction cancelled")
			default:
			}
		}

		// Use the keywordextractor engine's ExtractKeywords method
		results, err := keywordextractor.ExtractKeywords(content, rules)
		if err != nil {
			s.deps.Logger.Warn(ctx, "Failed to extract keywords for domain", map[string]interface{}{
				"domain": domain,
				"error":  err.Error(),
			})
			continue
		}

		keywordResults[domain] = results
		s.deps.Logger.Debug(ctx, "Successfully extracted keywords", map[string]interface{}{
			"domain":  domain,
			"matches": len(results),
		})

		// Update progress
		i++
		progressPct := 80.0 + (float64(i)/float64(len(contentResults)))*15.0 // 80% to 95%
		s.sendProgress(campaignID, progressPct, fmt.Sprintf("Extracted keywords for %s", domain))
	}

	s.deps.Logger.Debug(ctx, "Keyword extraction completed", map[string]interface{}{
		"campaign_id":   campaignID,
		"results_count": len(keywordResults),
	})

	return keywordResults, nil
}

// getValidatedHTTPDomains retrieves domains that passed HTTP validation
func (s *analysisService) getValidatedHTTPDomains(ctx context.Context, campaignID uuid.UUID) ([]string, error) {
	s.deps.Logger.Debug(ctx, "Retrieving validated domains from HTTP phase", map[string]interface{}{
		"campaign_id": campaignID,
	})
	if s.store == nil {
		return nil, fmt.Errorf("campaign store not available")
	}
	var exec store.Querier
	if q, ok := s.deps.DB.(store.Querier); ok {
		exec = q
	}
	// Page through HTTP results marked as success
	out := make([]string, 0, 1024)
	const pageSize = 1000
	offset := 0
	for {
		results, err := s.store.GetHTTPKeywordResultsByCampaign(ctx, exec, campaignID, store.ListValidationResultsFilter{
			ValidationStatus: "success",
			Limit:            pageSize,
			Offset:           offset,
		})
		if err != nil {
			return nil, fmt.Errorf("failed to fetch HTTP results: %w", err)
		}
		if len(results) == 0 {
			break
		}
		for _, r := range results {
			if r != nil && r.DomainName != "" {
				out = append(out, r.DomainName)
			}
		}
		if len(results) < pageSize {
			break
		}
		offset += pageSize
	}
	return out, nil
}

// getAnalysisConfig retrieves analysis configuration for a campaign
func (s *analysisService) getAnalysisConfig(ctx context.Context, campaignID uuid.UUID) (*AnalysisConfig, error) {
	s.deps.Logger.Debug(ctx, "Retrieving analysis configuration", map[string]interface{}{
		"campaign_id": campaignID,
	})
	if s.store == nil {
		return nil, fmt.Errorf("campaign store not available")
	}
	var exec store.Querier
	if q, ok := s.deps.DB.(store.Querier); ok {
		exec = q
	}
	phase, err := s.store.GetCampaignPhase(ctx, exec, campaignID, models.PhaseTypeAnalysis)
	if err != nil {
		return nil, fmt.Errorf("failed to get analysis phase: %w", err)
	}
	if phase == nil || phase.Configuration == nil {
		// Provide permissive default instead of failing to allow analysis to proceed.
		defaultCfg := AnalysisConfig{PersonaIDs: []string{}, KeywordRules: []models.KeywordRule{}, IncludeExternal: false}
		return &defaultCfg, nil
	}
	var cfg AnalysisConfig
	if err := json.Unmarshal(*phase.Configuration, &cfg); err != nil {
		// Fallback to default if parsing fails
		defaultCfg := AnalysisConfig{PersonaIDs: []string{}, KeywordRules: []models.KeywordRule{}, IncludeExternal: false}
		return &defaultCfg, nil
	}
	return &cfg, nil
}

// getPersonasForFetching gets personas and proxy for content fetching
func (s *analysisService) getPersonasForFetching(ctx context.Context, config *AnalysisConfig) (*models.Persona, *models.Persona, *models.Proxy, error) {
	if config == nil || len(config.PersonaIDs) == 0 || s.personaStore == nil {
		return nil, nil, nil, nil
	}
	var exec store.Querier
	if q, ok := s.deps.DB.(store.Querier); ok {
		exec = q
	}
	// Parse persona IDs
	personaUUIDs := make([]uuid.UUID, 0, len(config.PersonaIDs))
	for _, idStr := range config.PersonaIDs {
		if id, err := uuid.Parse(idStr); err == nil {
			personaUUIDs = append(personaUUIDs, id)
		}
	}
	if len(personaUUIDs) == 0 {
		return nil, nil, nil, nil
	}
	personas, err := s.personaStore.GetPersonasByIDs(ctx, exec, personaUUIDs)
	if err != nil {
		return nil, nil, nil, fmt.Errorf("failed to load personas: %w", err)
	}
	var httpPersona *models.Persona
	var dnsPersona *models.Persona
	for _, p := range personas {
		if p == nil || !p.IsEnabled {
			continue
		}
		switch p.PersonaType {
		case models.PersonaTypeHTTP:
			if httpPersona == nil {
				httpPersona = p
			}
		case models.PersonaTypeDNS:
			if dnsPersona == nil {
				dnsPersona = p
			}
		}
		if httpPersona != nil && dnsPersona != nil {
			break
		}
	}
	// Resolve proxy: prefer proxies associated with these personas
	var proxy *models.Proxy
	if s.proxyStore != nil {
		if proxies, err := s.proxyStore.GetProxiesByPersonaIDs(ctx, exec, personaUUIDs); err == nil && len(proxies) > 0 {
			for _, pr := range proxies {
				if pr != nil && pr.IsEnabled && pr.IsHealthy {
					proxy = pr
					break
				}
			}
			if proxy == nil {
				proxy = proxies[0]
			}
		}
	}
	return httpPersona, dnsPersona, proxy, nil
}

// storeAnalysisResults stores analysis results in the campaign store
func (s *analysisService) storeAnalysisResults(ctx context.Context, campaignID uuid.UUID, contentResults map[string][]byte, keywordResults map[string][]keywordextractor.KeywordExtractionResult) error {
	s.deps.Logger.Info(ctx, "Storing analysis results", map[string]interface{}{
		"campaign_id":     campaignID,
		"content_results": len(contentResults),
		"keyword_results": len(keywordResults),
	})
	if s.store == nil {
		return fmt.Errorf("campaign store not available")
	}
	// Build a compact JSON document to store
	type domainAnalysis struct {
		ContentSnippet string                                     `json:"contentSnippet,omitempty"`
		Keywords       []keywordextractor.KeywordExtractionResult `json:"keywords,omitempty"`
		ContentSize    int                                        `json:"contentSize,omitempty"`
	}
	payload := make(map[string]domainAnalysis, len(keywordResults))
	for domain, kws := range keywordResults {
		snippet := ""
		size := 0
		if b, ok := contentResults[domain]; ok && len(b) > 0 {
			size = len(b)
			if size > 1024 {
				snippet = string(b[:1024])
			} else {
				snippet = string(b)
			}
		}
		payload[domain] = domainAnalysis{ContentSnippet: snippet, Keywords: kws, ContentSize: size}
	}
	// Replace legacy RawMessage update with high-level structured update
	var exec store.Querier
	if q, ok := s.deps.DB.(store.Querier); ok {
		exec = q
	}
	if err := s.store.UpdateAnalysisResults(ctx, exec, campaignID, payload); err != nil {
		return fmt.Errorf("failed to persist analysis results: %w", err)
	}
	return nil
}

// sendProgress sends a progress update for the campaign
func (s *analysisService) sendProgress(campaignID uuid.UUID, progressPct float64, message string) {
	s.mu.Lock()
	defer s.mu.Unlock()

	execution, exists := s.executions[campaignID]
	if !exists || execution.ProgressChan == nil {
		return
	}

	execution.Progress = progressPct

	select {
	case execution.ProgressChan <- PhaseProgress{
		Phase:          models.PhaseTypeAnalysis,
		Status:         models.PhaseStatusInProgress,
		ProgressPct:    progressPct,
		ItemsProcessed: int64(execution.ItemsProcessed),
		ItemsTotal:     int64(execution.ItemsTotal),
		Message:        message,
	}:
	default:
	}

	// Persist progress
	ctx := context.Background()
	if s.store != nil {
		var exec store.Querier
		if q, ok := s.deps.DB.(store.Querier); ok {
			exec = q
		}
		itemsTotal := int64(execution.ItemsTotal)
		itemsProcessed := int64(execution.ItemsProcessed)
		_ = s.store.UpdatePhaseProgress(ctx, exec, campaignID, models.PhaseTypeAnalysis, progressPct, &itemsTotal, &itemsProcessed, nil, nil)
	}
}

// updateExecutionStatus updates the execution status for a campaign
func (s *analysisService) updateExecutionStatus(campaignID uuid.UUID, status models.PhaseStatusEnum, errorMsg string) {
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
			Phase:          models.PhaseTypeAnalysis,
			Status:         status,
			ProgressPct:    execution.Progress,
			ItemsProcessed: int64(execution.ItemsProcessed),
			ItemsTotal:     int64(execution.ItemsTotal),
			Error:          errorMsg,
		}:
		default:
		}
	}

	// Persist terminal status
	ctx := context.Background()
	if s.store != nil {
		var exec store.Querier
		if q, ok := s.deps.DB.(store.Querier); ok {
			exec = q
		}
		switch status {
		case models.PhaseStatusCompleted:
			_ = s.store.CompletePhase(ctx, exec, campaignID, models.PhaseTypeAnalysis)
		case models.PhaseStatusFailed:
			_ = s.store.FailPhase(ctx, exec, campaignID, models.PhaseTypeAnalysis, errorMsg)
		case models.PhaseStatusPaused:
			_ = s.store.PausePhase(ctx, exec, campaignID, models.PhaseTypeAnalysis)
		}
	}
}

// scoreDomains computes relevance_score & domain_score from feature_vector JSON for a campaign.
// Basic weights: keyword_density, unique_keyword_coverage, non_parked, content_length_quality, title_keyword, freshness.

// Global once to avoid duplicate metric registration when multiple service instances are created (tests)
var globalScoringMetricsOnce sync.Once

func (s *analysisService) scoreDomains(ctx context.Context, campaignID uuid.UUID) (string, error) {
	globalScoringMetricsOnce.Do(func() {
		s.mtx.scoreHistogram = prometheus.NewHistogram(prometheus.HistogramOpts{Name: "domain_relevance_score", Help: "Distribution of computed relevance scores", Buckets: []float64{0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0}})
		s.mtx.rescoreRuns = prometheus.NewCounterVec(prometheus.CounterOpts{Name: "rescore_runs_total", Help: "Number of rescore runs"}, []string{"profile"})
		s.mtx.rescoreRunsV2 = prometheus.NewCounterVec(prometheus.CounterOpts{Name: "rescore_runs_v2_total", Help: "Rescore runs by profile state & result"}, []string{"profile", "result"})
		s.mtx.phaseDuration = prometheus.NewHistogram(prometheus.HistogramOpts{Name: "analysis_phase_seconds", Help: "Duration of analysis scoring phase"})
		// New counters for preflight reuse/failure transparency
		s.mtx.reuseCounter = prometheus.NewCounter(prometheus.CounterOpts{Name: "analysis_reuse_enrichment_total", Help: "Times analysis reused existing HTTP feature vectors"})
		s.mtx.preflightFail = prometheus.NewCounter(prometheus.CounterOpts{Name: "analysis_preflight_failure_total", Help: "Times analysis preflight failed due to missing feature vectors"})
		prometheus.MustRegister(s.mtx.scoreHistogram, s.mtx.rescoreRuns, s.mtx.rescoreRunsV2, s.mtx.phaseDuration, s.mtx.reuseCounter, s.mtx.preflightFail)
	})
	phaseStart := time.Now()
	// Campaign store is optional for pure scoring recompute; skip if absent.
	// Acquire raw *sql.DB from supported dependency types (*sqlx.DB or *sql.DB)
	var dbx *sql.DB
	switch db := s.deps.DB.(type) {
	case *sqlx.DB:
		dbx = db.DB
	case *sql.DB:
		dbx = db
	}
	if dbx == nil {
		return "", fmt.Errorf("scoring requires *sql.DB or *sqlx.DB dependency")
	}
	// Load validated, normalized weights (defaults if no profile) + optional penalty factor
	weightsMap, penaltyPtr, wErr := loadCampaignScoringWeights(ctx, dbx, campaignID)
	if wErr != nil {
		return "", fmt.Errorf("load weights: %w", wErr)
	}
	parkedPenaltyFactor := 0.5
	if penaltyPtr != nil {
		parkedPenaltyFactor = *penaltyPtr
		if parkedPenaltyFactor < 0 {
			parkedPenaltyFactor = 0
		} else if parkedPenaltyFactor > 1 {
			parkedPenaltyFactor = 1
		}
	}
	// Fetch candidate domains with feature vectors
	// Pre-count total for progress events
	var totalCount int64
	if err := dbx.QueryRowContext(ctx, `SELECT COUNT(*) FROM generated_domains WHERE campaign_id = $1 AND feature_vector IS NOT NULL`, campaignID).Scan(&totalCount); err != nil {
		// Non-fatal: fallback to zero (no progress events)
		totalCount = 0
	}
	rows, err := dbx.QueryContext(ctx, `SELECT domain_name, feature_vector, last_http_fetched_at, is_parked, parked_confidence FROM generated_domains WHERE campaign_id = $1 AND feature_vector IS NOT NULL`, campaignID)
	if err != nil {
		return "", fmt.Errorf("query feature vectors: %w", err)
	}
	defer rows.Close()
	type scoreRow struct {
		Domain            string
		Score             float64
		Rel               float64
		H1Count           interface{}
		LinkInternalRatio interface{}
		PrimaryLang       interface{}
		DensityScore      float64
		CoverageScore     float64
		NonParkedScore    float64
		ContentLenScore   float64
		TitleScore        float64
		FreshnessScore    float64
		LegacyKwUnique    float64
	}
	scores := make([]scoreRow, 0, 1024)
	processed := int64(0)
	interval := 500
	if v := os.Getenv("RESCORE_PROGRESS_INTERVAL"); v != "" {
		if parsed, perr := strconv.Atoi(v); perr == nil && parsed > 0 {
			interval = parsed
		}
	}
	correlationId := uuid.New().String()
	now := time.Now()
	for rows.Next() {
		var domain string
		var raw json.RawMessage
		var fetchedAt *time.Time
		var isParked sql.NullBool
		var parkedConf sql.NullFloat64
		if err := rows.Scan(&domain, &raw, &fetchedAt, &isParked, &parkedConf); err != nil {
			continue
		}
		processed++
		fv := map[string]interface{}{}
		_ = json.Unmarshal(raw, &fv)
		// Extract features
		kwUnique := asFloat(fv["kw_unique"])         // count of unique keyword patterns
		kwHitsTotal := asFloat(fv["kw_hits_total"])  // total hits across sets (may equal unique if only presence stored)
		contentBytes := asFloat(fv["content_bytes"]) // size (content length baseline)
		titleHas := boolVal(fv["title_has_keyword"])
		isParkedB := isParked.Valid && isParked.Bool
		freshness := 0.0
		if fetchedAt != nil {
			age := now.Sub(*fetchedAt).Hours() / 24.0
			if age <= 1 {
				freshness = 1
			} else if age < 7 {
				freshness = 0.7
			} else if age < 30 {
				freshness = 0.4
			}
		}
		// Normalizations
		kwCoverageScore := clamp(kwUnique/5.0, 0, 1) // assume 5+ unique = max coverage for early heuristic
		// Density: if we have contentBytes > 0 compute hits per KB normalized; else fallback to coverage
		var densityScore float64
		if contentBytes > 0 && kwHitsTotal > 0 {
			perKB := (kwHitsTotal / (contentBytes / 1024.0)) // hits per KB
			// Normalize: >= 3 hits/KB saturates, <= 0 => 0
			densityScore = clamp(perKB/3.0, 0, 1)
		} else {
			densityScore = kwCoverageScore
		}
		nonParkedScore := 1.0
		if isParkedB {
			nonParkedScore = 0
		}
		contentLenScore := clamp(contentBytes/50000.0, 0, 1)
		titleScore := 0.0
		if titleHas {
			titleScore = 1.0
		}
		// Optional TF-lite experimental component: hits per KB * log(1 + unique keywords)
		var tfLite float64
		if v, ok := os.LookupEnv("ENABLE_TF_LITE"); ok && (v == "1" || strings.EqualFold(v, "true")) {
			if contentBytes > 0 && kwHitsTotal > 0 {
				perKB := kwHitsTotal / (contentBytes / 1024.0)
				if perKB < 0 {
					perKB = 0
				}
				idfApprox := math.Log(1 + kwUnique)
				if idfApprox < 0 {
					idfApprox = 0
				}
				// Normalize roughly: cap perKB at 5 (>=5 saturates), idfApprox at log(1+10)=~2.398
				perKBn := clamp(perKB/5.0, 0, 1)
				idfN := clamp(idfApprox/2.4, 0, 1)
				tfLite = perKBn * idfN
			}
		}
		// Weighted sum (include tf_lite_weight if present)
		rel := densityScore*weightsMap["keyword_density_weight"] +
			kwCoverageScore*weightsMap["unique_keyword_coverage_weight"] +
			nonParkedScore*weightsMap["non_parked_weight"] +
			contentLenScore*weightsMap["content_length_quality_weight"] +
			titleScore*weightsMap["title_keyword_weight"] +
			freshness*weightsMap["freshness_weight"]
		if w, ok := weightsMap["tf_lite_weight"]; ok && w > 0 && tfLite > 0 {
			rel += tfLite * w
		}
		// Parked penalty if low confidence parked (parked_confidence < .9 but flagged?) using configurable factor
		if isParkedB && parkedConf.Valid && parkedConf.Float64 < 0.9 {
			rel *= parkedPenaltyFactor
		}
		rel = math.Round(rel*1000) / 1000
		if s.mtx.scoreHistogram != nil {
			// histogram expects non-negative; scores already in 0-1.
			s.mtx.scoreHistogram.Observe(rel)
		}
		scores = append(scores, scoreRow{
			Domain:            domain,
			Score:             rel,
			Rel:               rel,
			H1Count:           fv["h1_count"],
			LinkInternalRatio: fv["link_internal_ratio"],
			PrimaryLang:       fv["primary_lang"],
			DensityScore:      densityScore,
			CoverageScore:     kwCoverageScore,
			NonParkedScore:    nonParkedScore,
			ContentLenScore:   contentLenScore,
			TitleScore:        titleScore,
			FreshnessScore:    freshness,
			LegacyKwUnique:    kwUnique,
		})

		// Progress SSE emission (only during rescore / scoring runs). Guard on totalCount>0 and interval>0.
		if s.deps.SSE != nil && totalCount > 0 && interval > 0 && (processed%int64(interval) == 0) {
			pct := 0.0
			if totalCount > 0 {
				pct = (float64(processed) / float64(totalCount)) * 100.0
			}
			payload := map[string]interface{}{
				"event":         "rescore_progress",
				"campaignId":    campaignID.String(),
				"processed":     processed,
				"total":         totalCount,
				"percentage":    math.Round(pct*100) / 100,
				"correlationId": correlationId,
				"timestamp":     time.Now().UTC(),
			}
			if b, mErr := json.Marshal(payload); mErr == nil {
				s.deps.SSE.Send(string(b))
			}
		}
	}
	if len(scores) == 0 {
		return correlationId, nil
	}

	// Dual-read comparison (non-blocking). Only executed if ANALYSIS_DUAL_READ enabled.
	if envVal, ok := os.LookupEnv("ANALYSIS_DUAL_READ"); ok && (envVal == "1" || strings.EqualFold(envVal, "true") || strings.EqualFold(envVal, "on")) {
		if newFeatures, derr := s.dualReadFetchFeatures(ctx, campaignID); derr == nil && len(newFeatures) > 0 {
			missingLegacy := 0
			missingNew := 0
			varianceHigh := 0
			threshold := 0.25
			if tv := os.Getenv("DUAL_READ_VARIANCE_THRESHOLD"); tv != "" {
				if f, perr := strconv.ParseFloat(tv, 64); perr == nil && f > 0 {
					threshold = f
				}
			}
			perDomainVariance := 0
			legacyKwSum := 0.0
			for _, sr := range scores {
				legacyKwSum += sr.LegacyKwUnique
			}
			newKwSum := 0.0
			for _, nf := range newFeatures {
				if v, ok := nf["kw_unique_count"].(int64); ok {
					newKwSum += float64(v)
				}
				if v, ok := nf["kw_unique_count"].(float64); ok {
					newKwSum += v
				}
			}
			legacyAvg := 0.0
			if len(scores) > 0 {
				legacyAvg = legacyKwSum / float64(len(scores))
			}
			newAvg := 0.0
			if len(newFeatures) > 0 {
				newAvg = newKwSum / float64(len(newFeatures))
			}
			relDiff := 0.0
			if legacyAvg > 0 {
				relDiff = math.Abs(newAvg-legacyAvg) / legacyAvg
			}
			if relDiff > threshold {
				varianceHigh++
				if extraction.DualReadDiffCounter != nil {
					extraction.DualReadDiffCounter.WithLabelValues("kw_unique_mean_variance").Inc()
				}
			}
			for _, sr := range scores {
				if nf, ok := newFeatures[sr.Domain]; ok {
					legacyVal := sr.LegacyKwUnique
					var newVal float64
					switch v := nf["kw_unique_count"].(type) {
					case int64:
						newVal = float64(v)
					case float64:
						newVal = v
					}
					if legacyVal > 0 {
						pd := math.Abs(newVal-legacyVal) / legacyVal
						if pd > threshold {
							perDomainVariance++
							if extraction.DualReadDiffCounter != nil {
								extraction.DualReadDiffCounter.WithLabelValues("kw_unique_domain_variance").Inc()
							}
						}
					}
				} else {
					missingLegacy++
				}
			}
			if s.deps.Logger != nil {
				s.deps.Logger.Info(ctx, "dual-read comparison", map[string]interface{}{
					"campaign_id":          campaignID.String(),
					"features_new":         len(newFeatures),
					"domains_scored":       len(scores),
					"missing_legacy":       missingLegacy,
					"missing_new":          missingNew,
					"high_variance_cnt":    varianceHigh,
					"per_domain_variance":  perDomainVariance,
					"legacy_kw_unique_avg": legacyAvg,
					"new_kw_unique_avg":    newAvg,
					"relative_diff":        relDiff,
					"threshold":            threshold,
				})
			}
		}
	}
	// Bulk update
	// VALUES (domain, relevance, domain_score)
	valueStrings := make([]string, 0, len(scores))
	args := make([]interface{}, 0, len(scores)*3+1)
	args = append(args, campaignID)
	idx := 2
	for _, sr := range scores {
		valueStrings = append(valueStrings, fmt.Sprintf("($%d,$%d,$%d)", idx, idx+1, idx+2))
		args = append(args, sr.Domain, sr.Rel, sr.Score)
		idx += 3
	}
	query := fmt.Sprintf(`WITH incoming(domain_name,relevance_score,domain_score) AS (VALUES %s)
UPDATE generated_domains gd
SET relevance_score = incoming.relevance_score,
	domain_score = incoming.domain_score
FROM incoming
WHERE gd.campaign_id = $1 AND gd.domain_name = incoming.domain_name`, strings.Join(valueStrings, ","))
	if _, err := dbx.ExecContext(ctx, query, args...); err != nil {
		return "", fmt.Errorf("bulk score update failed: %w", err)
	}
	// SSE sample (enriched components map for transparency while preserving legacy shape)
	if s.deps.SSE != nil {
		// Feature flags to emit actual structural numeric values and optionally full component breakdown.
		emitStructuralDetails := false
		if v, ok := os.LookupEnv("ENABLE_SSE_STRUCTURAL_DETAILS"); ok && (v == "1" || strings.EqualFold(v, "true")) {
			emitStructuralDetails = true
		}
		emitFullComponents := false
		if v, ok := os.LookupEnv("ENABLE_SSE_FULL_COMPONENTS"); ok && (v == "1" || strings.EqualFold(v, "true")) {
			emitFullComponents = true
		}
		lim := 25
		if len(scores) < lim {
			lim = len(scores)
		}
		sample := make([]map[string]interface{}, 0, lim)
		for i := 0; i < lim; i++ {
			components := map[string]interface{}{}
			if emitFullComponents {
				components["density"] = scores[i].DensityScore
				components["coverage"] = scores[i].CoverageScore
				components["non_parked"] = scores[i].NonParkedScore
				components["content_length"] = scores[i].ContentLenScore
				components["title_keyword"] = scores[i].TitleScore
				components["freshness"] = scores[i].FreshnessScore
			} else {
				components["density"] = "omitted"
				components["coverage"] = "omitted"
				components["non_parked"] = "omitted"
				components["content_length"] = "omitted"
				components["title_keyword"] = "omitted"
				components["freshness"] = "omitted"
			}
			if emitStructuralDetails {
				components["h1_count"] = scores[i].H1Count
				components["link_internal_ratio"] = scores[i].LinkInternalRatio
				components["primary_lang"] = scores[i].PrimaryLang
			} else {
				components["h1_count"] = "structural"
				components["link_internal_ratio"] = "structural"
				components["primary_lang"] = "structural"
			}
			sample = append(sample, map[string]interface{}{
				"domain":     scores[i].Domain,
				"score":      scores[i].Score,
				"components": components,
			})
		}
		payload := map[string]interface{}{
			"event":         "domain_scored",
			"campaignId":    campaignID.String(),
			"count":         len(scores),
			"sample":        sample,
			"correlationId": correlationId,
			"componentsMeta": func() string {
				if emitFullComponents && emitStructuralDetails {
					return "full component and structural details included"
				}
				if emitFullComponents {
					return "full component details (scores) included"
				}
				if emitStructuralDetails {
					return "structural details included for h1_count, link_internal_ratio, primary_lang"
				}
				return "components values omitted; enable flags for details"
			}(),
		}
		msg, _ := json.Marshal(payload)
		s.deps.SSE.Send(string(msg))
	}
	// Final progress event if we didn't land exactly on an interval boundary
	if s.deps.SSE != nil && totalCount > 0 && processed > 0 && processed%int64(interval) != 0 {
		pct := (float64(processed) / float64(totalCount)) * 100.0
		payload := map[string]interface{}{
			"event":         "rescore_progress",
			"campaignId":    campaignID.String(),
			"processed":     processed,
			"total":         totalCount,
			"percentage":    math.Round(pct*100) / 100,
			"correlationId": correlationId,
			"timestamp":     time.Now().UTC(),
		}
		if b, mErr := json.Marshal(payload); mErr == nil {
			s.deps.SSE.Send(string(b))
		}
	}
	if s.mtx.phaseDuration != nil {
		s.mtx.phaseDuration.Observe(time.Since(phaseStart).Seconds())
	}
	return correlationId, nil
}

// ScoreDomains exposes scoring for external callers (API / rescore triggers)
func (s *analysisService) ScoreDomains(ctx context.Context, campaignID uuid.UUID) error {
	_, err := s.scoreDomains(ctx, campaignID)
	return err
}

// ScoreBreakdown recomputes the component scores for a single domain using stored feature_vector.
// It does not persist anything; intended for API transparency endpoint.
func (s *analysisService) ScoreBreakdown(ctx context.Context, campaignID uuid.UUID, domain string) (map[string]float64, error) {
	var dbx *sql.DB
	switch db := s.deps.DB.(type) {
	case *sqlx.DB:
		dbx = db.DB
	case *sql.DB:
		dbx = db
	}
	if dbx == nil {
		return nil, fmt.Errorf("db unavailable")
	}
	weightsMap, penaltyPtr, err := loadCampaignScoringWeights(ctx, dbx, campaignID)
	if err != nil {
		return nil, err
	}
	parkedPenaltyFactor := 0.5
	if penaltyPtr != nil {
		parkedPenaltyFactor = *penaltyPtr
	}
	row := dbx.QueryRowContext(ctx, `SELECT feature_vector, last_http_fetched_at, is_parked, parked_confidence FROM generated_domains WHERE campaign_id=$1 AND domain_name=$2`, campaignID, domain)
	var raw json.RawMessage
	var fetchedAt *time.Time
	var isParked sql.NullBool
	var parkedConf sql.NullFloat64
	if err := row.Scan(&raw, &fetchedAt, &isParked, &parkedConf); err != nil {
		return nil, err
	}
	fv := map[string]interface{}{}
	_ = json.Unmarshal(raw, &fv)
	kwUnique := asFloat(fv["kw_unique"])
	kwHitsTotal := asFloat(fv["kw_hits_total"])
	contentBytes := asFloat(fv["content_bytes"])
	titleHas := boolVal(fv["title_has_keyword"])
	isParkedB := isParked.Valid && isParked.Bool
	now := time.Now()
	freshness := 0.0
	if fetchedAt != nil {
		age := now.Sub(*fetchedAt).Hours() / 24.0
		if age <= 1 {
			freshness = 1
		} else if age < 7 {
			freshness = .7
		} else if age < 30 {
			freshness = .4
		}
	}
	kwCoverage := clamp(kwUnique/5.0, 0, 1)
	var density float64
	if contentBytes > 0 && kwHitsTotal > 0 {
		perKB := (kwHitsTotal / (contentBytes / 1024.0))
		density = clamp(perKB/3.0, 0, 1)
	} else {
		density = kwCoverage
	}
	nonParked := 1.0
	if isParkedB {
		nonParked = 0
	}
	contentLen := clamp(contentBytes/50000.0, 0, 1)
	titleScore := 0.0
	if titleHas {
		titleScore = 1
	}
	var tfLite float64
	if v, ok := os.LookupEnv("ENABLE_TF_LITE"); ok && (v == "1" || strings.EqualFold(v, "true")) && contentBytes > 0 && kwHitsTotal > 0 {
		perKB := kwHitsTotal / (contentBytes / 1024.0)
		if perKB < 0 {
			perKB = 0
		}
		idfApprox := math.Log(1 + kwUnique)
		if idfApprox < 0 {
			idfApprox = 0
		}
		perKBn := clamp(perKB/5.0, 0, 1)
		idfN := clamp(idfApprox/2.4, 0, 1)
		tfLite = perKBn * idfN
	}
	rel := density*weightsMap["keyword_density_weight"] +
		kwCoverage*weightsMap["unique_keyword_coverage_weight"] +
		nonParked*weightsMap["non_parked_weight"] +
		contentLen*weightsMap["content_length_quality_weight"] +
		titleScore*weightsMap["title_keyword_weight"] +
		freshness*weightsMap["freshness_weight"]
	if w, ok := weightsMap["tf_lite_weight"]; ok && w > 0 && tfLite > 0 {
		rel += tfLite * w
	}
	if isParkedB && parkedConf.Valid && parkedConf.Float64 < 0.9 {
		rel *= parkedPenaltyFactor
	}
	breakdown := map[string]float64{
		"density":        density,
		"coverage":       kwCoverage,
		"non_parked":     nonParked,
		"content_length": contentLen,
		"title_keyword":  titleScore,
		"freshness":      freshness,
		"tf_lite":        tfLite,
		"final":          rel,
	}
	return breakdown, nil
}

// RescoreCampaign recomputes scores (alias of ScoreDomains for now; placeholder for profile diff logic)
func (s *analysisService) RescoreCampaign(ctx context.Context, campaignID uuid.UUID) error {
	// Determine profile state prior to run
	profileState := "none"
	var dbx *sql.DB
	switch db := s.deps.DB.(type) {
	case *sqlx.DB:
		dbx = db.DB
	case *sql.DB:
		dbx = db
	}
	if dbx != nil {
		if _, _, err := loadCampaignScoringWeights(ctx, dbx, campaignID); err == nil {
			profileState = "active"
		}
	}
	if s.mtx.rescoreRunsV2 != nil {
		s.mtx.rescoreRunsV2.WithLabelValues(profileState, "started").Inc()
	}
	correlationId, err := s.scoreDomains(ctx, campaignID)
	if err != nil {
		if s.mtx.rescoreRunsV2 != nil {
			s.mtx.rescoreRunsV2.WithLabelValues(profileState, "failed").Inc()
		}
		// Emit failure completion event
		if s.deps.SSE != nil {
			payload, _ := json.Marshal(map[string]interface{}{
				"event":         "rescore_completed",
				"campaignId":    campaignID.String(),
				"timestamp":     time.Now().UTC(),
				"correlationId": correlationId,
				"result":        "failed",
				"error":         err.Error(),
			})
			s.deps.SSE.Send(string(payload))
		}
		return err
	}
	if s.mtx.rescoreRuns != nil {
		s.mtx.rescoreRuns.WithLabelValues(profileState).Inc()
	}
	if s.mtx.rescoreRunsV2 != nil {
		s.mtx.rescoreRunsV2.WithLabelValues(profileState, "success").Inc()
	}
	// Emit rescore_completed SSE event (success summary)
	if s.deps.SSE != nil {
		payload, _ := json.Marshal(map[string]interface{}{
			"event":         "rescore_completed",
			"campaignId":    campaignID.String(),
			"timestamp":     time.Now().UTC(),
			"correlationId": correlationId,
			"result":        "success",
		})
		s.deps.SSE.Send(string(payload))
	}
	return nil
}

// helper conversions
func asFloat(v interface{}) float64 {
	switch t := v.(type) {
	case float64:
		return t
	case int:
		return float64(t)
	case int32:
		return float64(t)
	case int64:
		return float64(t)
	case json.Number:
		f, _ := t.Float64()
		return f
	default:
		return 0
	}
}
func boolVal(v interface{}) bool { b, _ := v.(bool); return b }
func clamp(v, lo, hi float64) float64 {
	if v < lo {
		return lo
	}
	if v > hi {
		return hi
	}
	return v
}

// dualReadFetchFeatures loads minimal features from new extraction table when ANALYSIS_DUAL_READ is enabled.
// It returns a map domain_id -> feature subset for comparison; errors are non-fatal to legacy path caller.
func (s *analysisService) dualReadFetchFeatures(ctx context.Context, campaignID uuid.UUID) (map[string]map[string]any, error) {
	if v, ok := os.LookupEnv("ANALYSIS_DUAL_READ"); !ok || !strings.EqualFold(v, "true") && v != "1" && !strings.EqualFold(v, "on") {
		return nil, nil
	}
	var dbx *sql.DB
	switch db := s.deps.DB.(type) {
	case *sqlx.DB:
		dbx = db.DB
	case *sql.DB:
		dbx = db
	}
	if dbx == nil {
		return nil, fmt.Errorf("db unavailable for dual-read")
	}
	rows, err := dbx.QueryContext(ctx, `SELECT def.domain_id, gd.domain_name,
	   def.kw_unique_count, def.kw_total_occurrences, def.kw_weight_sum,
	   def.content_richness_score, def.microcrawl_gain_ratio, def.feature_vector
FROM analysis_ready_features def
JOIN generated_domains gd ON gd.id = def.domain_id AND gd.campaign_id = def.campaign_id
WHERE def.campaign_id=$1`, campaignID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	res := make(map[string]map[string]any)
	for rows.Next() {
		var domainID string
		var domainName string
		var kwUnique sql.NullInt64
		var kwHits sql.NullInt64
		var weightSum sql.NullFloat64
		var richness sql.NullFloat64
		var gain sql.NullFloat64
		var fvRaw []byte
		if err := rows.Scan(&domainID, &domainName, &kwUnique, &kwHits, &weightSum, &richness, &gain, &fvRaw); err != nil {
			return res, err
		}
		// Parse feature_vector JSON
		fv := map[string]any{}
		if len(fvRaw) > 0 {
			if err := json.Unmarshal(fvRaw, &fv); err != nil {
				return res, fmt.Errorf("failed to unmarshal feature_vector for domain %s: %w", domainName, err)
			}
		}
		// Fail fast if critical richness keys missing
		required := []string{"richness_weights_version","prominence_norm","diversity_effective_unique","diversity_norm","enrichment_norm","applied_bonus","applied_deductions_total","stuffing_penalty","repetition_index","anchor_share"}
		for _, k := range required { if _, ok := fv[k]; !ok { return res, fmt.Errorf("missing required feature_vector key '%s' for domain %s", k, domainName) } }

		// Build nested structure
		top3 := anyToStringSlice(fv["kw_top3"])
		sigDist := anyToStringIntMap(fv["kw_signal_distribution"])
		nested := map[string]any{
			"domain": domainName,
			"keywords": map[string]any{
				"unique_count": nullableInt64(kwUnique),
				"hits_total": nullableInt64(kwHits),
				"weight_sum": nullableFloat64(weightSum),
				"top3": top3,
				"signal_distribution": sigDist,
			},
			"richness": map[string]any{
				"score": nullableFloat64(richness),
				"version": fv["richness_weights_version"],
				"prominence_norm": fv["prominence_norm"],
				"diversity_effective_unique": fv["diversity_effective_unique"],
				"diversity_norm": fv["diversity_norm"],
				"enrichment_norm": fv["enrichment_norm"],
				"applied_bonus": fv["applied_bonus"],
				"applied_deductions_total": fv["applied_deductions_total"],
				"stuffing_penalty": fv["stuffing_penalty"],
				"repetition_index": fv["repetition_index"],
				"anchor_share": fv["anchor_share"],
			},
			"microcrawl": map[string]any{
				"gain_ratio": nullableFloat64(gain),
			},
		}
		res[domainName] = nested
	}
	return res, rows.Err()
}

func nullableInt64(v sql.NullInt64) any {
	if v.Valid {
		return v.Int64
	}
	return nil
}
func nullableFloat64(v sql.NullFloat64) any {
	if v.Valid {
		return v.Float64
	}
	return nil
}

func anyToStringSlice(v any) []string {
	if v == nil { return []string{} }
	switch arr := v.(type) {
	case []string:
		return arr
	case []any:
		out := make([]string,0,len(arr))
		for _, e := range arr { if s, ok := e.(string); ok { out = append(out, s) } }
		return out
	default:
		return []string{}
	}
}

func anyToStringIntMap(v any) map[string]int {
	out := map[string]int{}
	if v == nil { return out }
	switch m := v.(type) {
	case map[string]any:
		for k,val := range m { switch x:=val.(type){case float64: out[k]=int(x); case int: out[k]=x; case int64: out[k]=int(x)} }
	case map[string]int:
		return m
	}
	return out
}
