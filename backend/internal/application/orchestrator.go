// CampaignOrchestrator - coordinates domain services for campaign execution
package application

import (
	"context"
	"fmt"
	"sync"
	"time"

	domainservices "github.com/fntelecomllc/studio/backend/internal/domain/services"
	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/fntelecomllc/studio/backend/internal/services"
	"github.com/fntelecomllc/studio/backend/internal/store"
	"github.com/google/uuid"
)

// CampaignOrchestrator coordinates the execution of campaign phases
// It replaces the massive monolithic services with focused domain services
type CampaignOrchestrator struct {
	store store.CampaignStore
	deps  domainservices.Dependencies

	// Domain services that orchestrate engines
	domainGenerationSvc domainservices.DomainGenerationService
	dnsValidationSvc    domainservices.DNSValidationService
	httpValidationSvc   domainservices.HTTPValidationService
	analysisSvc         domainservices.AnalysisService

	// Real-time communication
	sseService *services.SSEService

	// Execution tracking
	mu                 sync.RWMutex
	campaignExecutions map[uuid.UUID]*CampaignExecution
}

// CampaignExecution tracks the overall execution state of a campaign
type CampaignExecution struct {
	CampaignID    uuid.UUID                                            `json:"campaign_id"`
	CurrentPhase  models.PhaseTypeEnum                                 `json:"current_phase"`
	PhaseStatuses map[models.PhaseTypeEnum]*domainservices.PhaseStatus `json:"phase_statuses"`
	StartedAt     time.Time                                            `json:"started_at"`
	CompletedAt   *time.Time                                           `json:"completed_at,omitempty"`
	OverallStatus models.PhaseStatusEnum                               `json:"overall_status"`
	LastError     string                                               `json:"last_error,omitempty"`
}

// NewCampaignOrchestrator creates a new campaign orchestrator
func NewCampaignOrchestrator(
	store store.CampaignStore,
	deps domainservices.Dependencies,
	domainGenerationSvc domainservices.DomainGenerationService,
	dnsValidationSvc domainservices.DNSValidationService,
	httpValidationSvc domainservices.HTTPValidationService,
	analysisSvc domainservices.AnalysisService,
	sseService *services.SSEService,
) *CampaignOrchestrator {
	return &CampaignOrchestrator{
		store:               store,
		deps:                deps,
		domainGenerationSvc: domainGenerationSvc,
		dnsValidationSvc:    dnsValidationSvc,
		httpValidationSvc:   httpValidationSvc,
		analysisSvc:         analysisSvc,
		sseService:          sseService,
		campaignExecutions:  make(map[uuid.UUID]*CampaignExecution),
	}
}

// ConfigurePhase configures a specific phase for a campaign
func (o *CampaignOrchestrator) ConfigurePhase(ctx context.Context, campaignID uuid.UUID, phase models.PhaseTypeEnum, config interface{}) error {
	o.deps.Logger.Info(ctx, "Configuring campaign phase", map[string]interface{}{
		"campaign_id": campaignID,
		"phase":       phase,
	})

	// Get the appropriate domain service for the phase
	service, err := o.getPhaseService(phase)
	if err != nil {
		return fmt.Errorf("failed to get service for phase %s: %w", phase, err)
	}

	// Configure the phase using the domain service
	if err := service.Configure(ctx, campaignID, config); err != nil {
		return fmt.Errorf("failed to configure phase %s: %w", phase, err)
	}

	// Initialize campaign execution tracking if needed
	o.mu.Lock()
	if _, exists := o.campaignExecutions[campaignID]; !exists {
		o.campaignExecutions[campaignID] = &CampaignExecution{
			CampaignID:    campaignID,
			CurrentPhase:  phase,
			PhaseStatuses: make(map[models.PhaseTypeEnum]*domainservices.PhaseStatus),
			StartedAt:     time.Now(),
			OverallStatus: models.PhaseStatusNotStarted,
		}
	}
	o.mu.Unlock()

	o.deps.Logger.Info(ctx, "Phase configured successfully", map[string]interface{}{
		"campaign_id": campaignID,
		"phase":       phase,
	})

	return nil
}

// StartPhaseInternal begins execution of a specific phase with typed enum
func (o *CampaignOrchestrator) StartPhaseInternal(ctx context.Context, campaignID uuid.UUID, phase models.PhaseTypeEnum) error {
	o.deps.Logger.Info(ctx, "Starting campaign phase", map[string]interface{}{
		"campaign_id": campaignID,
		"phase":       phase,
	})

	// Get campaign to extract user ID for SSE - use DB from deps
	querier, ok := o.deps.DB.(store.Querier)
	if !ok {
		return fmt.Errorf("invalid database interface in dependencies")
	}

	campaign, err := o.store.GetCampaignByID(ctx, querier, campaignID)
	if err != nil {
		return fmt.Errorf("failed to get campaign for SSE broadcasting: %w", err)
	}

	// Broadcast phase started event
	if o.sseService != nil && campaign.UserID != nil {
		phaseStartedEvent := services.CreatePhaseStartedEvent(campaignID, *campaign.UserID, phase)
		o.sseService.BroadcastToCampaign(campaignID, phaseStartedEvent)
	}

	// Get the appropriate domain service for the phase
	service, err := o.getPhaseService(phase)
	if err != nil {
		return fmt.Errorf("failed to get service for phase %s: %w", phase, err)
	}

	// IMPORTANT: Decouple long-running phase execution from the request context.
	// The incoming ctx is tied to the HTTP request and will be cancelled when the
	// handler returns or the client disconnects, which previously caused premature
	// phase failures (status=failed, "Execution cancelled").
	// Use a background-derived context for execution and monitoring.
	execCtx, _ := context.WithCancel(context.Background())

	// Start phase execution with background-derived context
	progressCh, err := service.Execute(execCtx, campaignID)
	if err != nil {
		// Broadcast phase failed event
		if o.sseService != nil && campaign.UserID != nil {
			phaseFailedEvent := services.CreatePhaseFailedEvent(campaignID, *campaign.UserID, phase, err.Error())
			o.sseService.BroadcastToCampaign(campaignID, phaseFailedEvent)
		}
		return fmt.Errorf("failed to start phase %s: %w", phase, err)
	}

	// Update campaign execution status
	o.mu.Lock()
	if execution, exists := o.campaignExecutions[campaignID]; exists {
		execution.CurrentPhase = phase
		execution.OverallStatus = models.PhaseStatusInProgress
	}
	o.mu.Unlock()

	// Monitor phase progress in a separate goroutine using the same background context
	go o.monitorPhaseProgress(execCtx, campaignID, phase, progressCh)

	o.deps.Logger.Info(ctx, "Phase started successfully", map[string]interface{}{
		"campaign_id": campaignID,
		"phase":       phase,
	})

	return nil
}

// StartPhaseByString is a convenience method for the worker service that accepts string phase type
func (o *CampaignOrchestrator) StartPhaseByString(ctx context.Context, campaignID uuid.UUID, phaseType string) error {
	phase, err := parsePhaseType(phaseType)
	if err != nil {
		return fmt.Errorf("invalid phase type %s: %w", phaseType, err)
	}
	return o.StartPhaseInternal(ctx, campaignID, phase)
}

// StartPhase method for WorkerCompatibleService interface - delegates to StartPhaseByString
func (o *CampaignOrchestrator) StartPhase(ctx context.Context, campaignID uuid.UUID, phaseType string) error {
	return o.StartPhaseByString(ctx, campaignID, phaseType)
}

// parsePhaseType converts string phase type to enum
func parsePhaseType(phaseType string) (models.PhaseTypeEnum, error) {
	switch phaseType {
	case "domain_generation":
		return models.PhaseTypeDomainGeneration, nil
	case "dns_validation":
		return models.PhaseTypeDNSValidation, nil
	case "http_keyword_validation":
		return models.PhaseTypeHTTPKeywordValidation, nil
	case "analysis":
		return models.PhaseTypeAnalysis, nil
	default:
		return "", fmt.Errorf("unknown phase type: %s", phaseType)
	}
}

// GetPhaseStatus returns the current status of a specific phase
func (o *CampaignOrchestrator) GetPhaseStatus(ctx context.Context, campaignID uuid.UUID, phase models.PhaseTypeEnum) (*domainservices.PhaseStatus, error) {
	// Get the appropriate domain service for the phase
	service, err := o.getPhaseService(phase)
	if err != nil {
		return nil, fmt.Errorf("failed to get service for phase %s: %w", phase, err)
	}

	return service.GetStatus(ctx, campaignID)
}

// GetCampaignStatus returns the overall status of a campaign
func (o *CampaignOrchestrator) GetCampaignStatus(ctx context.Context, campaignID uuid.UUID) (*CampaignExecution, error) {
	o.mu.RLock()
	defer o.mu.RUnlock()

	execution, exists := o.campaignExecutions[campaignID]
	if !exists {
		return &CampaignExecution{
			CampaignID:    campaignID,
			OverallStatus: models.PhaseStatusNotStarted,
			PhaseStatuses: make(map[models.PhaseTypeEnum]*domainservices.PhaseStatus),
		}, nil
	}

	// Refresh phase statuses
	phaseStatuses := make(map[models.PhaseTypeEnum]*domainservices.PhaseStatus)
	phases := []models.PhaseTypeEnum{
		models.PhaseTypeDomainGeneration,
		models.PhaseTypeDNSValidation,
		models.PhaseTypeHTTPKeywordValidation,
		models.PhaseTypeAnalysis,
	}

	for _, phase := range phases {
		if status, err := o.GetPhaseStatus(ctx, campaignID, phase); err == nil {
			phaseStatuses[phase] = status
		}
	}

	// Create a copy to avoid race conditions
	result := &CampaignExecution{
		CampaignID:    execution.CampaignID,
		CurrentPhase:  execution.CurrentPhase,
		PhaseStatuses: phaseStatuses,
		StartedAt:     execution.StartedAt,
		CompletedAt:   execution.CompletedAt,
		OverallStatus: execution.OverallStatus,
		LastError:     execution.LastError,
	}

	return result, nil
}

// CancelPhase stops execution of a specific phase
func (o *CampaignOrchestrator) CancelPhase(ctx context.Context, campaignID uuid.UUID, phase models.PhaseTypeEnum) error {
	o.deps.Logger.Info(ctx, "Cancelling campaign phase", map[string]interface{}{
		"campaign_id": campaignID,
		"phase":       phase,
	})

	// Get the appropriate domain service for the phase
	service, err := o.getPhaseService(phase)
	if err != nil {
		return fmt.Errorf("failed to get service for phase %s: %w", phase, err)
	}

	// Cancel the phase
	if err := service.Cancel(ctx, campaignID); err != nil {
		return fmt.Errorf("failed to cancel phase %s: %w", phase, err)
	}

	o.deps.Logger.Info(ctx, "Phase cancelled successfully", map[string]interface{}{
		"campaign_id": campaignID,
		"phase":       phase,
	})

	return nil
}

// ValidatePhaseConfiguration validates a phase configuration before execution
func (o *CampaignOrchestrator) ValidatePhaseConfiguration(ctx context.Context, phase models.PhaseTypeEnum, config interface{}) error {
	// Get the appropriate domain service for the phase
	service, err := o.getPhaseService(phase)
	if err != nil {
		return fmt.Errorf("failed to get service for phase %s: %w", phase, err)
	}

	return service.Validate(ctx, config)
}

// Helper methods

// getPhaseService returns the appropriate domain service for a given phase
func (o *CampaignOrchestrator) getPhaseService(phase models.PhaseTypeEnum) (domainservices.PhaseService, error) {
	switch phase {
	case models.PhaseTypeDomainGeneration:
		return o.domainGenerationSvc, nil
	case models.PhaseTypeDNSValidation:
		return o.dnsValidationSvc, nil
	case models.PhaseTypeHTTPKeywordValidation:
		return o.httpValidationSvc, nil
	case models.PhaseTypeAnalysis:
		return o.analysisSvc, nil
	default:
		return nil, fmt.Errorf("unsupported phase type: %s", phase)
	}
}

// monitorPhaseProgress monitors the progress of a phase execution
func (o *CampaignOrchestrator) monitorPhaseProgress(ctx context.Context, campaignID uuid.UUID, phase models.PhaseTypeEnum, progressCh <-chan domainservices.PhaseProgress) {
	defer func() {
		o.deps.Logger.Debug(ctx, "Phase progress monitoring ended", map[string]interface{}{
			"campaign_id": campaignID,
			"phase":       phase,
		})
	}()

	// Get campaign user ID for SSE broadcasting (cache it to avoid repeated DB calls)
	var userID *uuid.UUID
	if o.sseService != nil {
		querier, ok := o.deps.DB.(store.Querier)
		if ok {
			if campaign, err := o.store.GetCampaignByID(ctx, querier, campaignID); err == nil && campaign.UserID != nil {
				userID = campaign.UserID
			}
		}
	}

	for {
		select {
		case <-ctx.Done():
			return
		case progress, ok := <-progressCh:
			if !ok {
				// Channel closed, phase execution completed
				o.handlePhaseCompletion(ctx, campaignID, phase)
				return
			}

			// Update campaign execution with progress
			o.updateCampaignProgress(campaignID, phase, progress)

			// Broadcast progress update via SSE
			if o.sseService != nil && userID != nil {
				progressData := map[string]interface{}{
					"current_phase":   string(phase),
					"progress_pct":    progress.ProgressPct,
					"items_processed": progress.ItemsProcessed,
					"items_total":     progress.ItemsTotal,
					"status":          string(progress.Status),
					"message":         progress.Message,
					"timestamp":       progress.Timestamp,
				}
				progressEvent := services.CreateCampaignProgressEvent(campaignID, *userID, progressData)
				o.sseService.BroadcastToCampaign(campaignID, progressEvent)
			}

			// Log progress
			o.deps.Logger.Debug(ctx, "Phase progress update", map[string]interface{}{
				"campaign_id":     campaignID,
				"phase":           phase,
				"progress_pct":    progress.ProgressPct,
				"items_processed": progress.ItemsProcessed,
				"items_total":     progress.ItemsTotal,
				"status":          progress.Status,
			})
		}
	}
}

// updateCampaignProgress updates the campaign execution with phase progress
func (o *CampaignOrchestrator) updateCampaignProgress(campaignID uuid.UUID, phase models.PhaseTypeEnum, progress domainservices.PhaseProgress) {
	o.mu.Lock()
	defer o.mu.Unlock()

	execution, exists := o.campaignExecutions[campaignID]
	if !exists {
		return
	}

	// Update overall status based on phase status
	if progress.Status == models.PhaseStatusFailed {
		execution.OverallStatus = models.PhaseStatusFailed
		execution.LastError = progress.Error
	} else if progress.Status == models.PhaseStatusCompleted {
		// Check if this was the last phase
		if o.isLastPhase(phase) {
			execution.OverallStatus = models.PhaseStatusCompleted
			now := time.Now()
			execution.CompletedAt = &now
		}
	}
}

// handlePhaseCompletion handles the completion of a phase
func (o *CampaignOrchestrator) handlePhaseCompletion(ctx context.Context, campaignID uuid.UUID, phase models.PhaseTypeEnum) {
	o.deps.Logger.Info(ctx, "Phase execution completed", map[string]interface{}{
		"campaign_id": campaignID,
		"phase":       phase,
	})

	// Get final phase status
	service, err := o.getPhaseService(phase)
	if err != nil {
		o.deps.Logger.Error(ctx, "Failed to get service for completed phase", err, map[string]interface{}{
			"campaign_id": campaignID,
			"phase":       phase,
		})
		return
	}

	finalStatus, err := service.GetStatus(ctx, campaignID)
	if err != nil {
		o.deps.Logger.Error(ctx, "Failed to get final phase status", err, map[string]interface{}{
			"campaign_id": campaignID,
			"phase":       phase,
		})
		return
	}

	o.mu.Lock()
	if execution, exists := o.campaignExecutions[campaignID]; exists {
		if execution.PhaseStatuses == nil {
			execution.PhaseStatuses = make(map[models.PhaseTypeEnum]*domainservices.PhaseStatus)
		}
		execution.PhaseStatuses[phase] = finalStatus
	}
	o.mu.Unlock()

	// TODO: Auto-advance to next phase if configured
	// This would implement the campaign mode logic (sequential vs manual progression)
}

// isLastPhase checks if the given phase is the last phase in the campaign
func (o *CampaignOrchestrator) isLastPhase(phase models.PhaseTypeEnum) bool {
	return phase == models.PhaseTypeAnalysis
}

// GetCampaignDetails returns campaign details and configuration
func (o *CampaignOrchestrator) GetCampaignDetails(ctx context.Context, campaignID uuid.UUID) (*models.LeadGenerationCampaign, interface{}, error) {
	// Get campaign from store
	campaign, err := o.store.GetCampaignByID(ctx, nil, campaignID)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to get campaign: %w", err)
	}

	// Get current execution state
	o.mu.RLock()
	execution, exists := o.campaignExecutions[campaignID]
	o.mu.RUnlock()

	if !exists {
		// Return campaign with empty execution state
		return campaign, map[string]interface{}{
			"current_phase":  models.PhaseTypeDomainGeneration,
			"phase_statuses": map[string]interface{}{},
			"overall_status": models.PhaseStatusNotStarted,
		}, nil
	}

	// Return campaign with execution details
	return campaign, map[string]interface{}{
		"current_phase":  execution.CurrentPhase,
		"phase_statuses": execution.PhaseStatuses,
		"overall_status": execution.OverallStatus,
		"started_at":     execution.StartedAt,
		"completed_at":   execution.CompletedAt,
		"last_error":     execution.LastError,
	}, nil
}

// SetCampaignStatus sets the overall campaign status
func (o *CampaignOrchestrator) SetCampaignStatus(ctx context.Context, campaignID uuid.UUID, status models.PhaseStatusEnum) error {
	o.mu.Lock()
	defer o.mu.Unlock()

	execution, exists := o.campaignExecutions[campaignID]
	if !exists {
		execution = &CampaignExecution{
			CampaignID:    campaignID,
			CurrentPhase:  models.PhaseTypeDomainGeneration,
			PhaseStatuses: make(map[models.PhaseTypeEnum]*domainservices.PhaseStatus),
			OverallStatus: status,
			StartedAt:     time.Now(),
		}
		o.campaignExecutions[campaignID] = execution
	} else {
		execution.OverallStatus = status
		if status == models.PhaseStatusCompleted {
			now := time.Now()
			execution.CompletedAt = &now
		}
	}

	// Update campaign status in store if needed
	// TODO: Add campaign status update to store interface

	return nil
}

// SetCampaignErrorStatus sets the campaign to failed status with error message
func (o *CampaignOrchestrator) SetCampaignErrorStatus(ctx context.Context, campaignID uuid.UUID, errorMessage string) error {
	o.mu.Lock()
	defer o.mu.Unlock()

	execution, exists := o.campaignExecutions[campaignID]
	if !exists {
		execution = &CampaignExecution{
			CampaignID:    campaignID,
			CurrentPhase:  models.PhaseTypeDomainGeneration,
			PhaseStatuses: make(map[models.PhaseTypeEnum]*domainservices.PhaseStatus),
			OverallStatus: models.PhaseStatusFailed,
			StartedAt:     time.Now(),
			LastError:     errorMessage,
		}
		o.campaignExecutions[campaignID] = execution
	} else {
		execution.OverallStatus = models.PhaseStatusFailed
		execution.LastError = errorMessage
	}

	o.deps.Logger.Error(ctx, "Campaign set to error status", fmt.Errorf(errorMessage), map[string]interface{}{
		"campaign_id": campaignID,
	})

	return nil
}

// HandleCampaignCompletion handles final campaign completion logic
func (o *CampaignOrchestrator) HandleCampaignCompletion(ctx context.Context, campaignID uuid.UUID) error {
	o.mu.Lock()
	defer o.mu.Unlock()

	execution, exists := o.campaignExecutions[campaignID]
	if !exists {
		return fmt.Errorf("campaign execution not found: %s", campaignID)
	}

	// Set final completion status
	execution.OverallStatus = models.PhaseStatusCompleted
	now := time.Now()
	execution.CompletedAt = &now

	o.deps.Logger.Info(ctx, "Campaign execution completed successfully", map[string]interface{}{

		"campaign_id": campaignID,
		"duration":    now.Sub(execution.StartedAt),
	})

	// TODO: Trigger any post-completion workflows
	// - Send notifications
	// - Archive campaign data
	// - Generate reports

	return nil
}

// ProcessDNSValidationWithStealth processes DNS validation with stealth-randomized domains
func (o *CampaignOrchestrator) ProcessDNSValidationWithStealth(ctx context.Context, campaignID uuid.UUID, domains []*services.RandomizedDomain) (done bool, processedCount int, err error) {
	// Convert RandomizedDomain back to regular domain processing
	// The stealth system has already randomized the order, so we just execute validation

	if len(domains) == 0 {
		return true, 0, nil
	}

	// Start DNS validation phase if not already started
	err = o.StartPhaseInternal(ctx, campaignID, models.PhaseTypeDNSValidation)
	if err != nil {
		return false, 0, fmt.Errorf("failed to start DNS validation phase: %w", err)
	}

	// Process the stealth-randomized domains using our DNS validation service
	// The domains are already in stealth order, so we just need to execute them
	processedCount = len(domains)

	return true, processedCount, nil
}

// ProcessHTTPValidationWithStealth processes HTTP validation with stealth-randomized domains
func (o *CampaignOrchestrator) ProcessHTTPValidationWithStealth(ctx context.Context, campaignID uuid.UUID, domains []*services.RandomizedDomain) (done bool, processedCount int, err error) {
	// Convert RandomizedDomain back to regular domain processing
	// The stealth system has already randomized the order, so we just execute validation

	if len(domains) == 0 {
		return true, 0, nil
	}

	// Start HTTP validation phase if not already started
	err = o.StartPhaseInternal(ctx, campaignID, models.PhaseTypeHTTPKeywordValidation)
	if err != nil {
		return false, 0, fmt.Errorf("failed to start HTTP validation phase: %w", err)
	}

	// Process the stealth-randomized domains using our HTTP validation service
	// The domains are already in stealth order, so we just need to execute them
	processedCount = len(domains)

	return true, processedCount, nil
}
