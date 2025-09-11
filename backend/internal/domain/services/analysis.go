// Analysis Service - orchestrates contentfetcher and keywordextractor engines
package services

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"
	"time"

	"github.com/fntelecomllc/studio/backend/internal/contentfetcher"
	"github.com/fntelecomllc/studio/backend/internal/keywordextractor"
	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/fntelecomllc/studio/backend/internal/store"
	"github.com/google/uuid"
)

// analysisService orchestrates content analysis engines
// It coordinates contentfetcher and keywordextractor without replacing their functionality
type analysisService struct {
	store          store.CampaignStore
	personaStore   store.PersonaStore
	proxyStore     store.ProxyStore
	deps           Dependencies
	contentFetcher *contentfetcher.ContentFetcher

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
		if ex.StartedAt.IsZero() { /* keep zero so omitted */
		}
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

	// Check if already executing
	s.mu.Lock()
	if _, exists := s.executions[campaignID]; exists {
		s.mu.Unlock()
		return nil, fmt.Errorf("analysis already in progress for campaign %s", campaignID)
	}

	// Create execution tracking
	execution := &analysisExecution{
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

	// Get analysis configuration
	config, err := s.getAnalysisConfig(ctx, campaignID)
	if err != nil {
		s.updateExecutionStatus(campaignID, models.PhaseStatusFailed, fmt.Sprintf("failed to get analysis config: %v", err))
		return
	}

	// Phase 1: Content Fetching (80% of progress)
	s.sendProgress(campaignID, 10.0, "Starting content fetching")

	contentResults, err := s.fetchContent(ctx, campaignID, domains, config)
	if err != nil {
		s.updateExecutionStatus(campaignID, models.PhaseStatusFailed, fmt.Sprintf("content fetching failed: %v", err))
		return
	}

	s.sendProgress(campaignID, 80.0, "Content fetching completed")

	// Phase 2: Keyword Extraction (20% of progress)
	s.sendProgress(campaignID, 85.0, "Starting keyword extraction")

	keywordResults, err := s.extractKeywords(ctx, campaignID, contentResults, config)
	if err != nil {
		s.updateExecutionStatus(campaignID, models.PhaseStatusFailed, fmt.Sprintf("keyword extraction failed: %v", err))
		return
	}

	s.sendProgress(campaignID, 95.0, "Keyword extraction completed")

	// Store combined results
	s.mu.Lock()
	if execution, exists := s.executions[campaignID]; exists {
		execution.ContentResults = contentResults
		execution.KeywordResults = keywordResults
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
	if err := s.storeAnalysisResults(ctx, campaignID, contentResults, keywordResults); err != nil {
		s.deps.Logger.Error(ctx, "Failed to store analysis results", err, map[string]interface{}{
			"campaign_id": campaignID,
		})
	}

	s.deps.Logger.Info(ctx, "Analysis completed successfully", map[string]interface{}{
		"campaign_id":      campaignID,
		"content_results":  len(contentResults),
		"keyword_results":  len(keywordResults),
		"domains_analyzed": len(domains),
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
		return nil, fmt.Errorf("analysis phase configuration not found")
	}
	var cfg AnalysisConfig
	if err := json.Unmarshal(*phase.Configuration, &cfg); err != nil {
		return nil, fmt.Errorf("failed to parse analysis configuration: %w", err)
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
