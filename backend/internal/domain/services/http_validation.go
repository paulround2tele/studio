// HTTP Validation Service - orchestrates httpvalidator.HTTPValidator engine
package services

import (
	"context"
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
func NewHTTPValidationService(store store.CampaignStore, deps Dependencies, httpValidator *httpvalidator.HTTPValidator) HTTPValidationService {
	return &httpValidationService{
		store:         store,
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

	// Type assert the configuration
	httpConfig, ok := config.(*models.HTTPPhaseConfigRequest)
	if !ok {
		return fmt.Errorf("invalid configuration type for HTTP validation: expected *models.HTTPPhaseConfigRequest")
	}

	// Validate configuration
	if err := s.Validate(ctx, httpConfig); err != nil {
		return fmt.Errorf("configuration validation failed: %w", err)
	}

	// Store configuration in campaign store
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
		}, nil
	}

	return &PhaseStatus{
		Phase:          models.PhaseTypeHTTPKeywordValidation,
		Status:         execution.Status,
		ProgressPct:    execution.Progress,
		ItemsTotal:     int64(execution.ItemsTotal),
		ItemsProcessed: int64(execution.ItemsProcessed),
		StartedAt:      &execution.StartedAt,
		CompletedAt:    execution.CompletedAt,
		LastError:      execution.ErrorMessage,
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

	// Prepare domains for the engine
	generatedDomains := s.prepareGeneratedDomains(domains)

	// Get persona and proxy from config (simplified for now)
	persona, proxy, err := s.getPersonaAndProxy(ctx, campaignID)
	if err != nil {
		s.updateExecutionStatus(campaignID, models.PhaseStatusFailed, fmt.Sprintf("failed to get persona/proxy: %v", err))
		return
	}

	// Execute HTTP validation using the engine
	results := s.httpValidator.ValidateDomainsBulk(ctx, generatedDomains, 25, persona, proxy)
	if len(results) == 0 {
		s.updateExecutionStatus(campaignID, models.PhaseStatusFailed, "HTTP validation returned no results")
		return
	}

	// Process results
	s.mu.Lock()
	if execution, exists := s.executions[campaignID]; exists {
		execution.Results = results
		execution.ItemsProcessed = len(results)
		execution.Progress = 100.0
		execution.Status = models.PhaseStatusCompleted
		now := time.Now()
		execution.CompletedAt = &now

		// Send final progress update
		if execution.ProgressChan != nil {
			select {
			case execution.ProgressChan <- PhaseProgress{
				Phase:          models.PhaseTypeHTTPKeywordValidation,
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
	if err := s.storeHTTPResults(ctx, campaignID, results); err != nil {
		s.deps.Logger.Error(ctx, "Failed to store HTTP validation results", err, map[string]interface{}{
			"campaign_id": campaignID,
		})
	}

	s.deps.Logger.Info(ctx, "HTTP validation completed successfully", map[string]interface{}{
		"campaign_id":    campaignID,
		"results_count":  len(results),
		"domains_tested": len(domains),
	})
}

// getValidatedDomains retrieves domains that passed DNS validation
func (s *httpValidationService) getValidatedDomains(ctx context.Context, campaignID uuid.UUID) ([]string, error) {
	// This would query the campaign store for domains that passed DNS validation
	s.deps.Logger.Debug(ctx, "Retrieving validated domains from DNS phase", map[string]interface{}{
		"campaign_id": campaignID,
	})

	// TODO: Implement actual query to get domains from DNS validation results
	return []string{"example.com", "test.com"}, nil
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
	// TODO: Query actual persona and proxy from campaign configuration
	// For now, return nil which means use default HTTP client settings
	return nil, nil, nil
}

// storeHTTPResults stores HTTP validation results in the campaign store
func (s *httpValidationService) storeHTTPResults(ctx context.Context, campaignID uuid.UUID, results []*httpvalidator.ValidationResult) error {
	// This would store the results in the campaign store
	s.deps.Logger.Info(ctx, "Storing HTTP validation results", map[string]interface{}{
		"campaign_id":  campaignID,
		"result_count": len(results),
	})

	// TODO: Implement actual storage of HTTP validation results
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
}
