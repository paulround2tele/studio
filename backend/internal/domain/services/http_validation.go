// HTTP Validation Service - orchestrates httpvalidator.HTTPValidator engine
package services

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"
	"time"

	"github.com/fntelecomllc/studio/backend/internal/httpvalidator"
	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/fntelecomllc/studio/backend/internal/store"
	"github.com/google/uuid"
)

// httpValidationService orchestrates the HTTP validation engine
// It wraps httpvalidator.HTTPValidator without replacing its core functionality
type httpValidationService struct {
	store         store.CampaignStore
	personaStore  store.PersonaStore
	proxyStore    store.ProxyStore
	deps          Dependencies
	httpValidator *httpvalidator.HTTPValidator

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
func NewHTTPValidationService(store store.CampaignStore, deps Dependencies, httpValidator *httpvalidator.HTTPValidator, personaStore store.PersonaStore, proxyStore store.ProxyStore) HTTPValidationService {
	return &httpValidationService{
		store:         store,
		personaStore:  personaStore,
		proxyStore:    proxyStore,
		deps:          deps,
		httpValidator: httpValidator,
		executions:    make(map[uuid.UUID]*httpValidationExecution),
		status:        models.PhaseStatusNotStarted,
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
		if exec.StartedAt.IsZero() {
			// leave StartedAt zero so it is omitted until execution
		}
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

	// Check if already executing
	s.mu.Lock()
	if _, exists := s.executions[campaignID]; exists {
		s.mu.Unlock()
		return nil, fmt.Errorf("HTTP validation already in progress for campaign %s", campaignID)
	}

	// Create execution tracking
	execution := &httpValidationExecution{
		CampaignID:   campaignID,
		Status:       models.PhaseStatusInProgress,
		StartedAt:    time.Now(),
		Progress:     0.0,
		CancelChan:   make(chan struct{}),
		ProgressChan: make(chan PhaseProgress, 100),
	}
	s.executions[campaignID] = execution
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

		// Persist batch results
		if err := s.storeHTTPResults(ctx, campaignID, results); err != nil {
			s.updateExecutionStatus(campaignID, models.PhaseStatusFailed, fmt.Sprintf("failed to store HTTP results: %v", err))
			return
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
	if s.store == nil {
		return nil, 0, 0, false
	}
	var exec store.Querier
	if q, qok := s.deps.DB.(store.Querier); qok {
		exec = q
	}
	raw, err := s.store.GetCampaignDomainsData(ctx, exec, campaignID)
	if err != nil || raw == nil {
		return nil, 0, 0, false
	}
	var data map[string]interface{}
	if err := json.Unmarshal(*raw, &data); err != nil {
		return nil, 0, 0, false
	}
	if arr, ok2 := data["stealth_order_http"].([]interface{}); ok2 {
		order = make([]string, 0, len(arr))
		for _, v := range arr {
			if s, ok3 := v.(string); ok3 {
				order = append(order, s)
			}
		}
	}
	if st, ok2 := data["stealth"].(map[string]interface{}); ok2 {
		if http, ok3 := st["http"].(map[string]interface{}); ok3 {
			if v, ok4 := http["jitterMinMs"].(float64); ok4 {
				jitterMin = int(v)
			}
			if v, ok4 := http["jitterMaxMs"].(float64); ok4 {
				jitterMax = int(v)
			}
		}
	}
	return order, jitterMin, jitterMax, len(order) > 0 || jitterMax > 0
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
		if r.IsSuccess || r.Status == "Validated" || r.Status == "OK" {
			status = "ok"
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
		})
	}
	var exec store.Querier
	if q, ok := s.deps.DB.(store.Querier); ok {
		exec = q
	}
	if err := s.store.UpdateDomainsBulkHTTPStatus(ctx, exec, bulk); err != nil {
		return fmt.Errorf("failed to persist HTTP results: %w", err)
	}
	return nil
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
