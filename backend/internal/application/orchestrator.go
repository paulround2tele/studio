// CampaignOrchestrator - coordinates domain services for campaign execution
package application

import (
	"context"
	"database/sql"
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

	// Optional post-completion hooks
	hooks []PostCompletionHook
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
		hooks:               make([]PostCompletionHook, 0),
	}
}

// PostCompletionHook defines a hook executed after campaign completion
type PostCompletionHook interface {
	Run(ctx context.Context, campaignID uuid.UUID) error
}

// RegisterPostCompletionHook registers a hook to run after campaign completion
func (o *CampaignOrchestrator) RegisterPostCompletionHook(h PostCompletionHook) {
	if h == nil {
		return
	}
	o.mu.Lock()
	defer o.mu.Unlock()
	o.hooks = append(o.hooks, h)
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

	// Persist campaign phase fields and overall status at phase start
	if querier, ok := o.deps.DB.(store.Querier); ok {
		phaseStatus := models.PhaseStatusInProgress
		_ = o.store.UpdateCampaignPhaseFields(context.Background(), querier, campaignID, &phase, &phaseStatus)
		_ = o.store.UpdateCampaignStatus(context.Background(), querier, campaignID, models.PhaseStatusInProgress, sql.NullString{})
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
	case "http_keyword_validation", "http_validation": // accept alias used by some handlers
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

	// Persist top-level campaign progress when available
	if querier, ok := o.deps.DB.(store.Querier); ok {
		// Only persist when we have totals to avoid zeroing
		if progress.ItemsTotal > 0 || progress.ItemsProcessed > 0 {
			pct := progress.ProgressPct
			// Guard invalid pct
			if pct < 0 {
				pct = 0
			}
			if pct > 100 {
				pct = 100
			}
			_ = o.store.UpdateCampaignProgress(context.Background(), querier, campaignID, progress.ItemsProcessed, progress.ItemsTotal, pct)
		}
		// Also sync current phase and status
		curPhase := phase
		curStatus := progress.Status
		_ = o.store.UpdateCampaignPhaseFields(context.Background(), querier, campaignID, &curPhase, &curStatus)
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

	// Broadcast phase completed event via SSE with final stats if available
	if o.sseService != nil {
		if querier, ok := o.deps.DB.(store.Querier); ok {
			if campaign, err := o.store.GetCampaignByID(ctx, querier, campaignID); err == nil && campaign.UserID != nil {
				results := map[string]interface{}{
					"status":          string(finalStatus.Status),
					"progress_pct":    finalStatus.ProgressPct,
					"items_total":     finalStatus.ItemsTotal,
					"items_processed": finalStatus.ItemsProcessed,
					"started_at":      finalStatus.StartedAt,
					"completed_at":    finalStatus.CompletedAt,
				}
				completedEvent := services.CreatePhaseCompletedEvent(campaignID, *campaign.UserID, phase, results)
				o.sseService.BroadcastToCampaign(campaignID, completedEvent)
			}
		}
	}

	o.mu.Lock()
	if execution, exists := o.campaignExecutions[campaignID]; exists {
		if execution.PhaseStatuses == nil {
			execution.PhaseStatuses = make(map[models.PhaseTypeEnum]*domainservices.PhaseStatus)
		}
		execution.PhaseStatuses[phase] = finalStatus
	}
	o.mu.Unlock()

	// Auto-advance to next phase if configured and phase completed successfully
	if finalStatus != nil && finalStatus.Status == models.PhaseStatusCompleted {
		// If this was the last phase, finalize campaign execution
		if o.isLastPhase(phase) {
			_ = o.HandleCampaignCompletion(ctx, campaignID)
			return
		}

		// Check campaign flags to determine if we should auto-advance
		querier, ok := o.deps.DB.(store.Querier)
		if !ok {
			o.deps.Logger.Warn(ctx, "Auto-advance skipped: invalid DB interface", map[string]interface{}{
				"campaign_id": campaignID,
			})
			return
		}

		campaign, err := o.store.GetCampaignByID(ctx, querier, campaignID)
		if err != nil {
			o.deps.Logger.Error(ctx, "Auto-advance: failed to load campaign", err, map[string]interface{}{
				"campaign_id": campaignID,
			})
			return
		}

		if campaign != nil && (campaign.IsFullSequenceMode || campaign.AutoAdvancePhases) {
			// Determine next phase in sequence
			next, ok := o.nextPhase(phase)
			if !ok {
				return
			}

			// Ensure next phase isn't already completed
			if nextPhaseRow, err := o.store.GetCampaignPhase(ctx, querier, campaignID, next); err == nil {
				if nextPhaseRow.Status == models.PhaseStatusCompleted {
					// Already completed; attempt to chain to following phase
					if chainedNext, ok2 := o.nextPhase(next); ok2 {
						next = chainedNext
					} else {
						_ = o.HandleCampaignCompletion(ctx, campaignID)
						return
					}
				}
			}

			o.deps.Logger.Info(ctx, "Auto-advancing to next phase", map[string]interface{}{
				"campaign_id": campaignID,
				"from_phase":  phase,
				"to_phase":    next,
			})

			// Start next phase using orchestrator; it will manage SSE start events and monitoring
			if err := o.StartPhaseInternal(ctx, campaignID, next); err != nil {
				o.deps.Logger.Error(ctx, "Failed to auto-advance to next phase", err, map[string]interface{}{
					"campaign_id": campaignID,
					"from_phase":  phase,
					"to_phase":    next,
				})
			}
		}
	}
}

// isLastPhase checks if the given phase is the last phase in the campaign
func (o *CampaignOrchestrator) isLastPhase(phase models.PhaseTypeEnum) bool {
	return phase == models.PhaseTypeAnalysis
}

// nextPhase returns the next phase in the standard sequence
func (o *CampaignOrchestrator) nextPhase(current models.PhaseTypeEnum) (models.PhaseTypeEnum, bool) {
	switch current {
	case models.PhaseTypeDomainGeneration:
		return models.PhaseTypeDNSValidation, true
	case models.PhaseTypeDNSValidation:
		return models.PhaseTypeHTTPKeywordValidation, true
	case models.PhaseTypeHTTPKeywordValidation:
		return models.PhaseTypeAnalysis, true
	default:
		return "", false
	}
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

	// Update campaign status in store
	if querier, ok := o.deps.DB.(store.Querier); ok {
		var errMsg sql.NullString
		if status == models.PhaseStatusFailed {
			if exec, ok := o.campaignExecutions[campaignID]; ok && exec.LastError != "" {
				errMsg = sql.NullString{String: exec.LastError, Valid: true}
			}
		}
		if err := o.store.UpdateCampaignStatus(ctx, querier, campaignID, status, errMsg); err != nil {
			o.deps.Logger.Warn(ctx, "Failed to persist campaign status", map[string]interface{}{
				"campaign_id": campaignID,
				"status":      status,
				"error":       err.Error(),
			})
		}
	}

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

	// Persist failure status
	if querier, ok := o.deps.DB.(store.Querier); ok {
		_ = o.store.UpdateCampaignStatus(ctx, querier, campaignID, models.PhaseStatusFailed, sql.NullString{String: errorMessage, Valid: true})
	}

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

	// Persist completed status
	if querier, ok := o.deps.DB.(store.Querier); ok {
		if err := o.store.UpdateCampaignStatus(ctx, querier, campaignID, models.PhaseStatusCompleted, sql.NullString{}); err != nil {
			o.deps.Logger.Warn(ctx, "Failed to persist completed status", map[string]interface{}{
				"campaign_id": campaignID,
				"error":       err.Error(),
			})
		}
		// Broadcast CampaignCompleted SSE
		if campaign, err := o.store.GetCampaignByID(ctx, querier, campaignID); err == nil && campaign.UserID != nil && o.sseService != nil {
			meta := map[string]interface{}{
				"duration_ms":    now.Sub(execution.StartedAt).Milliseconds(),
				"overall_status": string(execution.OverallStatus),
			}
			evt := services.CreateCampaignCompletedEvent(campaignID, *campaign.UserID, meta)
			o.sseService.BroadcastToCampaign(campaignID, evt)
		}
	}

	// Trigger any post-completion workflows (feature-guarded)
	go o.runPostCompletionHooks(context.Background(), campaignID)

	return nil
}

// runPostCompletionHooks executes optional post-completion workflows
func (o *CampaignOrchestrator) runPostCompletionHooks(ctx context.Context, campaignID uuid.UUID) {
	// Simple guard: check a config manager flag if available
	if o.deps.ConfigManager != nil {
		if v, err := o.deps.ConfigManager.Get("features.post_completion_hooks"); err == nil {
			if enabled, ok := v.(bool); ok && !enabled {
				return
			}
		}
	}

	// Execute registered hooks sequentially
	o.mu.RLock()
	hooks := append([]PostCompletionHook(nil), o.hooks...)
	o.mu.RUnlock()
	for _, h := range hooks {
		if err := h.Run(ctx, campaignID); err != nil {
			o.deps.Logger.Warn(ctx, "Post-completion hook failed", map[string]interface{}{
				"campaign_id": campaignID,
				"error":       err.Error(),
			})
		}
	}
}

// Stealth-specific processing methods removed; stealth-aware services now handle any ordering internally.
