// DNS Validation Service - orchestrates dnsvalidator.DNSValidator engine
package services

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/fntelecomllc/studio/backend/internal/dnsvalidator"
	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/fntelecomllc/studio/backend/internal/store"
	"github.com/google/uuid"
)

// DNSValidationConfig represents the configuration for DNS validation
type DNSValidationConfig struct {
	PersonaIDs      []uuid.UUID `json:"persona_ids"`
	BatchSize       int         `json:"batch_size"`
	Timeout         int         `json:"timeout_seconds"`
	MaxRetries      int         `json:"max_retries"`
	ValidationTypes []string    `json:"validation_types"` // A, AAAA, CNAME, etc.
	RequiredRecords []string    `json:"required_records,omitempty"`
}

// dnsValidationService implements DNSValidationService
// Orchestrates the existing dnsvalidator.DNSValidator engine
type dnsValidationService struct {
	dnsValidator *dnsvalidator.DNSValidator
	store        store.CampaignStore
	deps         Dependencies

	// Execution state tracking
	mu         sync.RWMutex
	executions map[uuid.UUID]*dnsExecution
}

// dnsExecution tracks the state of a DNS validation execution
type dnsExecution struct {
	campaignID        uuid.UUID
	config            DNSValidationConfig
	status            models.PhaseStatusEnum
	startedAt         time.Time
	completedAt       *time.Time
	progressCh        chan PhaseProgress
	cancelCtx         context.Context
	cancelFunc        context.CancelFunc
	domainsToValidate []string
	itemsTotal        int64
	itemsProcessed    int64
	validDomains      []string
	invalidDomains    []string
	lastError         string
}

// NewDNSValidationService creates a new DNS validation service
func NewDNSValidationService(
	dnsValidator *dnsvalidator.DNSValidator,
	store store.CampaignStore,
	deps Dependencies,
) DNSValidationService {
	return &dnsValidationService{
		dnsValidator: dnsValidator,
		store:        store,
		deps:         deps,
		executions:   make(map[uuid.UUID]*dnsExecution),
	}
}

// GetPhaseType returns the phase type this service handles
func (s *dnsValidationService) GetPhaseType() models.PhaseTypeEnum {
	return models.PhaseTypeDNSValidation
}

// Configure sets up the DNS validation phase
func (s *dnsValidationService) Configure(ctx context.Context, campaignID uuid.UUID, config interface{}) error {
	s.deps.Logger.Info(ctx, "Configuring DNS validation phase", map[string]interface{}{
		"campaign_id": campaignID,
	})

	// Type assert the configuration
	dnsConfig, ok := config.(DNSValidationConfig)
	if !ok {
		return fmt.Errorf("invalid configuration type for DNS validation")
	}

	// Validate configuration
	if err := s.Validate(ctx, dnsConfig); err != nil {
		return fmt.Errorf("invalid DNS validation configuration: %w", err)
	}

	// Get domains to validate from previous phase (domain generation)
	domains, err := s.getDomainsToValidate(ctx, campaignID)
	if err != nil {
		return fmt.Errorf("failed to get domains for validation: %w", err)
	}

	if len(domains) == 0 {
		return fmt.Errorf("no domains found to validate for campaign %s", campaignID)
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	// Store execution state
	s.executions[campaignID] = &dnsExecution{
		campaignID:        campaignID,
		config:            dnsConfig,
		status:            models.PhaseStatusConfigured,
		domainsToValidate: domains,
		itemsTotal:        int64(len(domains)),
		itemsProcessed:    0,
		validDomains:      make([]string, 0),
		invalidDomains:    make([]string, 0),
	}

	s.deps.Logger.Info(ctx, "DNS validation phase configured successfully", map[string]interface{}{
		"campaign_id":   campaignID,
		"domains_count": len(domains),
		"persona_count": len(dnsConfig.PersonaIDs),
	})

	return nil
}

// Execute runs the DNS validation phase
func (s *dnsValidationService) Execute(ctx context.Context, campaignID uuid.UUID) (<-chan PhaseProgress, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	execution, exists := s.executions[campaignID]
	if !exists {
		return nil, fmt.Errorf("DNS validation not configured for campaign %s", campaignID)
	}

	if execution.status != models.PhaseStatusNotStarted {
		return nil, fmt.Errorf("DNS validation already started for campaign %s", campaignID)
	}

	// Create cancellable context for execution
	execution.cancelCtx, execution.cancelFunc = context.WithCancel(ctx)
	execution.progressCh = make(chan PhaseProgress, 100)
	execution.status = models.PhaseStatusInProgress
	execution.startedAt = time.Now()

	s.deps.Logger.Info(execution.cancelCtx, "Starting DNS validation execution", map[string]interface{}{
		"campaign_id":   campaignID,
		"domains_count": len(execution.domainsToValidate),
	})

	// Start execution in goroutine
	go s.executeValidation(execution)

	return execution.progressCh, nil
}

// executeValidation performs the actual DNS validation using dnsvalidator engine
func (s *dnsValidationService) executeValidation(execution *dnsExecution) {
	defer close(execution.progressCh)

	ctx := execution.cancelCtx
	campaignID := execution.campaignID
	config := execution.config

	batchSize := config.BatchSize
	if batchSize <= 0 {
		batchSize = 50 // Default batch size for DNS validation
	}

	domains := execution.domainsToValidate
	var processedCount int64

	// Process domains in batches
	for i := 0; i < len(domains); i += batchSize {
		select {
		case <-ctx.Done():
			s.updateExecutionStatus(campaignID, models.PhaseStatusPaused, "Execution cancelled by caller context")
			return
		default:
		}

		// Calculate batch end
		end := i + batchSize
		if end > len(domains) {
			end = len(domains)
		}

		batch := domains[i:end]

		// Validate batch using dnsvalidator engine
		results, err := s.validateDomainBatch(ctx, batch, config)
		if err != nil {
			s.updateExecutionStatus(campaignID, models.PhaseStatusFailed, fmt.Sprintf("DNS validation failed: %v", err))
			return
		}

		// Process results
		for domain, isValid := range results {
			s.mu.Lock()
			if isValid {
				execution.validDomains = append(execution.validDomains, domain)
			} else {
				execution.invalidDomains = append(execution.invalidDomains, domain)
			}
			execution.itemsProcessed++
			processedCount = execution.itemsProcessed
			s.mu.Unlock()
		}

		// Store validation results
		if err := s.storeValidationResults(ctx, campaignID, results); err != nil {
			s.updateExecutionStatus(campaignID, models.PhaseStatusFailed, fmt.Sprintf("Failed to store validation results: %v", err))
			return
		}

		// Send progress update
		progress := PhaseProgress{
			CampaignID:     campaignID,
			Phase:          models.PhaseTypeDNSValidation,
			Status:         models.PhaseStatusInProgress,
			ProgressPct:    float64(processedCount) / float64(len(domains)) * 100,
			ItemsTotal:     int64(len(domains)),
			ItemsProcessed: processedCount,
			Message:        fmt.Sprintf("Validated %d domains", processedCount),
			Timestamp:      time.Now(),
		}

		select {
		case execution.progressCh <- progress:
		case <-ctx.Done():
			return
		}

		// Publish progress event (guard EventBus)
		if s.deps.EventBus != nil {
			if err := s.deps.EventBus.PublishProgress(ctx, progress); err != nil {
				if s.deps.Logger != nil {
					s.deps.Logger.Warn(ctx, "Failed to publish progress event", map[string]interface{}{
						"campaign_id": campaignID,
						"error":       err.Error(),
					})
				}
			}
		}
	}

	// Mark as completed
	s.mu.RLock()
	validCount := len(execution.validDomains)
	invalidCount := len(execution.invalidDomains)
	s.mu.RUnlock()

	s.updateExecutionStatus(campaignID, models.PhaseStatusCompleted, "DNS validation completed successfully")

	s.deps.Logger.Info(ctx, "DNS validation completed", map[string]interface{}{
		"campaign_id":     campaignID,
		"domains_total":   len(domains),
		"domains_valid":   validCount,
		"domains_invalid": invalidCount,
	})
}

// validateDomainBatch validates a batch of domains using the dnsvalidator engine
func (s *dnsValidationService) validateDomainBatch(ctx context.Context, domains []string, config DNSValidationConfig) (map[string]bool, error) {
	results := make(map[string]bool)

	// Use existing dnsvalidator engine for bulk validation
	validationResults := s.dnsValidator.ValidateDomainsBulk(domains, ctx, config.BatchSize)

	// Convert ValidationResult to our simple bool map
	for _, result := range validationResults {
		// Check if the domain has valid DNS records
		isValid := result.Status == "Resolved" && len(result.IPs) > 0
		results[result.Domain] = isValid
	}

	return results, nil
}

// GetStatus returns the current status of DNS validation
func (s *dnsValidationService) GetStatus(ctx context.Context, campaignID uuid.UUID) (*PhaseStatus, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	execution, exists := s.executions[campaignID]
	if !exists {
		return &PhaseStatus{
			CampaignID: campaignID,
			Phase:      models.PhaseTypeDNSValidation,
			Status:     models.PhaseStatusNotStarted,
		}, nil
	}

	status := &PhaseStatus{
		CampaignID:     campaignID,
		Phase:          models.PhaseTypeDNSValidation,
		Status:         execution.status,
		StartedAt:      &execution.startedAt,
		CompletedAt:    execution.completedAt,
		ItemsTotal:     execution.itemsTotal,
		ItemsProcessed: execution.itemsProcessed,
		LastError:      execution.lastError,
	}

	if execution.itemsTotal > 0 {
		status.ProgressPct = float64(execution.itemsProcessed) / float64(execution.itemsTotal) * 100
	}

	return status, nil
}

// Cancel stops the DNS validation execution
func (s *dnsValidationService) Cancel(ctx context.Context, campaignID uuid.UUID) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	execution, exists := s.executions[campaignID]
	if !exists {
		return fmt.Errorf("no DNS validation execution found for campaign %s", campaignID)
	}

	if execution.cancelFunc != nil {
		execution.cancelFunc()
	}

	s.deps.Logger.Info(ctx, "DNS validation cancelled", map[string]interface{}{
		"campaign_id": campaignID,
	})

	return nil
}

// Validate validates the DNS validation configuration
func (s *dnsValidationService) Validate(ctx context.Context, config interface{}) error {
	dnsConfig, ok := config.(DNSValidationConfig)
	if !ok {
		return fmt.Errorf("invalid configuration type")
	}

	if len(dnsConfig.PersonaIDs) == 0 {
		return fmt.Errorf("at least one persona must be specified")
	}

	if dnsConfig.BatchSize < 0 {
		return fmt.Errorf("batch size cannot be negative")
	}

	if dnsConfig.Timeout <= 0 {
		return fmt.Errorf("timeout must be positive")
	}

	if dnsConfig.MaxRetries < 0 {
		return fmt.Errorf("max retries cannot be negative")
	}

	return nil
}

// Helper methods

func (s *dnsValidationService) updateExecutionStatus(campaignID uuid.UUID, status models.PhaseStatusEnum, errorMsg string) {
	s.mu.Lock()
	defer s.mu.Unlock()

	execution, exists := s.executions[campaignID]
	if !exists {
		return
	}

	execution.status = status
	if status == models.PhaseStatusCompleted || status == models.PhaseStatusFailed {
		now := time.Now()
		execution.completedAt = &now
	}

	if errorMsg != "" {
		execution.lastError = errorMsg
	}

	// Publish status change event
	phaseStatus := PhaseStatus{
		CampaignID:     campaignID,
		Phase:          models.PhaseTypeDNSValidation,
		Status:         status,
		StartedAt:      &execution.startedAt,
		CompletedAt:    execution.completedAt,
		ItemsTotal:     execution.itemsTotal,
		ItemsProcessed: execution.itemsProcessed,
		LastError:      errorMsg,
	}

	if execution.itemsTotal > 0 {
		phaseStatus.ProgressPct = float64(execution.itemsProcessed) / float64(execution.itemsTotal) * 100
	}

	ctx := context.Background()
	if s.deps.EventBus != nil {
		if err := s.deps.EventBus.PublishStatusChange(ctx, phaseStatus); err != nil {
			if s.deps.Logger != nil {
				s.deps.Logger.Warn(ctx, "Failed to publish status change event", map[string]interface{}{
					"campaign_id": campaignID,
					"error":       err.Error(),
				})
			}
		}
	}
}

func (s *dnsValidationService) getDomainsToValidate(ctx context.Context, campaignID uuid.UUID) ([]string, error) {
	// This would integrate with the existing store to get domains from the domain generation phase
	// For now, return placeholder logic
	s.deps.Logger.Debug(ctx, "Getting domains for DNS validation", map[string]interface{}{
		"campaign_id": campaignID,
	})

	// TODO: Integrate with actual store.CampaignStore to get generated domains
	// This would typically query the domains generated in the previous phase
	return []string{}, fmt.Errorf("domain retrieval not implemented - integrate with store")
}

func (s *dnsValidationService) storeValidationResults(ctx context.Context, campaignID uuid.UUID, results map[string]bool) error {
	// This would integrate with the existing store to save validation results
	validCount := 0
	invalidCount := 0
	for _, isValid := range results {
		if isValid {
			validCount++
		} else {
			invalidCount++
		}
	}

	s.deps.Logger.Debug(ctx, "Storing DNS validation results", map[string]interface{}{
		"campaign_id":     campaignID,
		"total_domains":   len(results),
		"valid_domains":   validCount,
		"invalid_domains": invalidCount,
	})

	// TODO: Integrate with actual store.CampaignStore to persist validation results
	return nil
}
