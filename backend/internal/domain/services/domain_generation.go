// Domain Generation Service - orchestrates domainexpert.DomainGenerator engine
package services

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/fntelecomllc/studio/backend/internal/domainexpert"
	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/fntelecomllc/studio/backend/internal/store"
	"github.com/google/uuid"
)

// DomainGenerationConfig represents the configuration for domain generation
type DomainGenerationConfig struct {
	PatternType    string `json:"pattern_type"` // prefix, suffix, both
	VariableLength int    `json:"variable_length"`
	CharacterSet   string `json:"character_set"`
	ConstantString string `json:"constant_string"`
	TLD            string `json:"tld"`
	NumDomains     int64  `json:"num_domains"`
	BatchSize      int    `json:"batch_size"`
	OffsetStart    int64  `json:"offset_start"`
}

// domainGenerationService implements DomainGenerationService
// Orchestrates the existing domainexpert.DomainGenerator engine
type domainGenerationService struct {
	store store.CampaignStore
	deps  Dependencies

	// Execution state tracking
	mu         sync.RWMutex
	executions map[uuid.UUID]*domainExecution
}

// domainExecution tracks the state of a domain generation execution
type domainExecution struct {
	campaignID     uuid.UUID
	config         DomainGenerationConfig
	generator      *domainexpert.DomainGenerator
	status         models.PhaseStatusEnum
	startedAt      time.Time
	completedAt    *time.Time
	progressCh     chan PhaseProgress
	cancelCtx      context.Context
	cancelFunc     context.CancelFunc
	itemsTotal     int64
	itemsProcessed int64
	lastError      string
}

// NewDomainGenerationService creates a new domain generation service
func NewDomainGenerationService(
	store store.CampaignStore,
	deps Dependencies,
) DomainGenerationService {
	return &domainGenerationService{
		store:      store,
		deps:       deps,
		executions: make(map[uuid.UUID]*domainExecution),
	}
}

// GetPhaseType returns the phase type this service handles
func (s *domainGenerationService) GetPhaseType() models.PhaseTypeEnum {
	return models.PhaseTypeDomainGeneration
}

// Configure sets up the domain generation phase
func (s *domainGenerationService) Configure(ctx context.Context, campaignID uuid.UUID, config interface{}) error {
	s.deps.Logger.Info(ctx, "Configuring domain generation phase", map[string]interface{}{
		"campaign_id": campaignID,
	})

	// Type assert the configuration
	domainConfig, ok := config.(DomainGenerationConfig)
	if !ok {
		return fmt.Errorf("invalid configuration type for domain generation")
	}

	// Validate configuration
	if err := s.Validate(ctx, domainConfig); err != nil {
		return fmt.Errorf("invalid domain generation configuration: %w", err)
	}

	// Create domain generator using existing domainexpert engine
	generator, err := domainexpert.NewDomainGenerator(
		domainexpert.CampaignPatternType(domainConfig.PatternType),
		domainConfig.VariableLength,
		domainConfig.CharacterSet,
		domainConfig.ConstantString,
		domainConfig.TLD,
	)
	if err != nil {
		return fmt.Errorf("failed to create domain generator: %w", err)
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	// Store execution state
	s.executions[campaignID] = &domainExecution{
		campaignID:     campaignID,
		config:         domainConfig,
		generator:      generator,
		status:         models.PhaseStatusNotStarted,
		itemsTotal:     domainConfig.NumDomains,
		itemsProcessed: 0,
	}

	s.deps.Logger.Info(ctx, "Domain generation phase configured successfully", map[string]interface{}{
		"campaign_id":  campaignID,
		"pattern_type": domainConfig.PatternType,
		"num_domains":  domainConfig.NumDomains,
	})

	return nil
}

// Execute runs the domain generation phase
func (s *domainGenerationService) Execute(ctx context.Context, campaignID uuid.UUID) (<-chan PhaseProgress, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	execution, exists := s.executions[campaignID]
	if !exists {
		return nil, fmt.Errorf("domain generation not configured for campaign %s", campaignID)
	}

	if execution.status != models.PhaseStatusNotStarted {
		return nil, fmt.Errorf("domain generation already started for campaign %s", campaignID)
	}

	// Create cancellable context for execution
	execution.cancelCtx, execution.cancelFunc = context.WithCancel(ctx)
	execution.progressCh = make(chan PhaseProgress, 100)
	execution.status = models.PhaseStatusInProgress
	execution.startedAt = time.Now()

	s.deps.Logger.Info(execution.cancelCtx, "Starting domain generation execution", map[string]interface{}{
		"campaign_id": campaignID,
		"config":      execution.config,
	})

	// Start execution in goroutine
	go s.executeGeneration(execution)

	return execution.progressCh, nil
}

// executeGeneration performs the actual domain generation using domainexpert engine
func (s *domainGenerationService) executeGeneration(execution *domainExecution) {
	defer close(execution.progressCh)

	ctx := execution.cancelCtx
	campaignID := execution.campaignID
	config := execution.config

	// Use existing domainexpert engine for generation
	batchSize := config.BatchSize
	if batchSize <= 0 {
		batchSize = 1000 // Default batch size
	}

	var processedCount int64
	offset := config.OffsetStart

	for processedCount < config.NumDomains {
		select {
		case <-ctx.Done():
			s.updateExecutionStatus(campaignID, models.PhaseStatusFailed, "Execution cancelled")
			return
		default:
		}

		// Calculate batch size for this iteration
		remaining := config.NumDomains - processedCount
		currentBatch := int64(batchSize)
		if remaining < currentBatch {
			currentBatch = remaining
		}

		// Generate domains using domainexpert engine
		domains, nextOffset, err := execution.generator.GenerateBatch(offset, int(currentBatch))
		if err != nil {
			s.updateExecutionStatus(campaignID, models.PhaseStatusFailed, fmt.Sprintf("Domain generation failed: %v", err))
			return
		}

		// Store generated domains (this would integrate with the existing store)
		if err := s.storeGeneratedDomains(ctx, campaignID, domains); err != nil {
			s.updateExecutionStatus(campaignID, models.PhaseStatusFailed, fmt.Sprintf("Failed to store domains: %v", err))
			return
		}

		// Update progress
		processedCount += int64(len(domains))
		offset = nextOffset

		s.mu.Lock()
		execution.itemsProcessed = processedCount
		s.mu.Unlock()

		// Send progress update
		progress := PhaseProgress{
			CampaignID:     campaignID,
			Phase:          models.PhaseTypeDomainGeneration,
			Status:         models.PhaseStatusInProgress,
			ProgressPct:    float64(processedCount) / float64(config.NumDomains) * 100,
			ItemsTotal:     config.NumDomains,
			ItemsProcessed: processedCount,
			Message:        fmt.Sprintf("Generated %d domains", processedCount),
			Timestamp:      time.Now(),
		}

		select {
		case execution.progressCh <- progress:
		case <-ctx.Done():
			return
		}

		// Publish progress event
		if err := s.deps.EventBus.PublishProgress(ctx, progress); err != nil {
			s.deps.Logger.Warn(ctx, "Failed to publish progress event", map[string]interface{}{
				"campaign_id": campaignID,
				"error":       err.Error(),
			})
		}
	}

	// Mark as completed
	s.updateExecutionStatus(campaignID, models.PhaseStatusCompleted, "Domain generation completed successfully")

	s.deps.Logger.Info(ctx, "Domain generation completed", map[string]interface{}{
		"campaign_id":       campaignID,
		"domains_generated": processedCount,
	})
}

// GetStatus returns the current status of domain generation
func (s *domainGenerationService) GetStatus(ctx context.Context, campaignID uuid.UUID) (*PhaseStatus, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	execution, exists := s.executions[campaignID]
	if !exists {
		return &PhaseStatus{
			CampaignID: campaignID,
			Phase:      models.PhaseTypeDomainGeneration,
			Status:     models.PhaseStatusNotStarted,
		}, nil
	}

	status := &PhaseStatus{
		CampaignID:     campaignID,
		Phase:          models.PhaseTypeDomainGeneration,
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

// Cancel stops the domain generation execution
func (s *domainGenerationService) Cancel(ctx context.Context, campaignID uuid.UUID) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	execution, exists := s.executions[campaignID]
	if !exists {
		return fmt.Errorf("no domain generation execution found for campaign %s", campaignID)
	}

	if execution.cancelFunc != nil {
		execution.cancelFunc()
	}

	s.deps.Logger.Info(ctx, "Domain generation cancelled", map[string]interface{}{
		"campaign_id": campaignID,
	})

	return nil
}

// Validate validates the domain generation configuration
func (s *domainGenerationService) Validate(ctx context.Context, config interface{}) error {
	domainConfig, ok := config.(DomainGenerationConfig)
	if !ok {
		return fmt.Errorf("invalid configuration type")
	}

	if domainConfig.VariableLength <= 0 {
		return fmt.Errorf("variable length must be positive")
	}

	if domainConfig.CharacterSet == "" {
		return fmt.Errorf("character set cannot be empty")
	}

	if domainConfig.TLD == "" {
		return fmt.Errorf("TLD cannot be empty")
	}

	if domainConfig.NumDomains <= 0 {
		return fmt.Errorf("number of domains must be positive")
	}

	// Use domainexpert engine to validate configuration
	_, err := domainexpert.NewDomainGenerator(
		domainexpert.CampaignPatternType(domainConfig.PatternType),
		domainConfig.VariableLength,
		domainConfig.CharacterSet,
		domainConfig.ConstantString,
		domainConfig.TLD,
	)

	return err
}

// Helper methods

func (s *domainGenerationService) updateExecutionStatus(campaignID uuid.UUID, status models.PhaseStatusEnum, errorMsg string) {
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
		Phase:          models.PhaseTypeDomainGeneration,
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
	if err := s.deps.EventBus.PublishStatusChange(ctx, phaseStatus); err != nil {
		s.deps.Logger.Warn(ctx, "Failed to publish status change event", map[string]interface{}{
			"campaign_id": campaignID,
			"error":       err.Error(),
		})
	}
}

func (s *domainGenerationService) storeGeneratedDomains(ctx context.Context, campaignID uuid.UUID, domains []string) error {
	// This would integrate with the existing store to save generated domains
	// For now, just log the domains
	s.deps.Logger.Debug(ctx, "Storing generated domains", map[string]interface{}{
		"campaign_id":    campaignID,
		"domain_count":   len(domains),
		"sample_domains": domains[:min(len(domains), 5)], // Log first 5 domains as sample
	})

	// TODO: Integrate with actual store.CampaignStore to persist domains
	return nil
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
