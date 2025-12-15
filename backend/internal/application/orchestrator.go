// CampaignOrchestrator - coordinates domain services for campaign execution
package application

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"reflect"
	"sort"
	"strings"
	"sync"
	"time"

	domainservices "github.com/fntelecomllc/studio/backend/internal/domain/services"
	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/fntelecomllc/studio/backend/internal/services"
	"github.com/fntelecomllc/studio/backend/internal/store"
	"github.com/google/uuid"
)

// Typed errors for campaign orchestration
var (
	// ErrMissingPhaseConfigs signals one or more downstream phase configurations are missing.
	ErrMissingPhaseConfigs = fmt.Errorf("missing_phase_configs")
	// ErrPhaseDependenciesNotMet indicates a requested phase attempted to start before its prerequisites completed.
	ErrPhaseDependenciesNotMet = fmt.Errorf("phase_dependencies_not_met")
	// ErrNoActivePhase indicates no phase is currently running for the campaign when a stop was requested.
	ErrNoActivePhase = fmt.Errorf("no_active_phase")
)

const (
	controlAckTimeout   = 30 * time.Second
	controlRetryBackoff = 250 * time.Millisecond
	campaignStopMessage = "Campaign stop requested by user"
)

// PhaseDependencyError captures structured context when dependency gating prevents a phase from starting.
type PhaseDependencyError struct {
	Phase          models.PhaseTypeEnum
	BlockingPhase  models.PhaseTypeEnum
	BlockingStatus models.PhaseStatusEnum
}

func (e *PhaseDependencyError) Error() string {
	return fmt.Sprintf("%s cannot start until %s is completed (current status: %s)", e.Phase, e.BlockingPhase, e.BlockingStatus)
}

func (e *PhaseDependencyError) Unwrap() error { return ErrPhaseDependenciesNotMet }

// MissingPhaseConfigsError wraps ErrMissingPhaseConfigs with the concrete missing phases list.
type MissingPhaseConfigsError struct {
	Missing []string
}

func (e *MissingPhaseConfigsError) Error() string {
	return fmt.Sprintf("%v: %v", ErrMissingPhaseConfigs, e.Missing)
}
func (e *MissingPhaseConfigsError) Unwrap() error { return ErrMissingPhaseConfigs }

// CampaignOrchestrator coordinates the execution of campaign phases
// It replaces the massive monolithic services with focused domain services
type CampaignOrchestrator struct {
	store store.CampaignStore
	deps  domainservices.Dependencies

	metrics OrchestratorMetrics
	control PhaseControlManager

	// Domain services that orchestrate engines
	domainGenerationSvc domainservices.DomainGenerationService
	dnsValidationSvc    domainservices.DNSValidationService
	httpValidationSvc   domainservices.HTTPValidationService
	extractionSvc       domainservices.PhaseService
	enrichmentSvc       domainservices.EnrichmentService
	analysisSvc         domainservices.AnalysisService

	// Real-time communication (interface to allow test stubs)
	sseService SSEBroadcaster

	// Execution tracking
	mu                 sync.RWMutex
	campaignExecutions map[uuid.UUID]*CampaignExecution

	// in-flight auto starts to prevent duplicate chaining (campaignID+phase key)
	autoStartInProgress map[string]struct{}

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

// CampaignRestartResult summarizes which phases were re-queued during a restart attempt.
type CampaignRestartResult struct {
	RestartedPhases []models.PhaseTypeEnum
	FailedPhases    map[models.PhaseTypeEnum]error
}

// CampaignStopResult summarizes the outcome of a campaign-level stop request.
type CampaignStopResult struct {
	Phase  models.PhaseTypeEnum
	Status *domainservices.PhaseStatus
}

var restartablePhaseOrder = []models.PhaseTypeEnum{
	models.PhaseTypeDNSValidation,
	models.PhaseTypeHTTPKeywordValidation,
	models.PhaseTypeExtraction,
	models.PhaseTypeAnalysis,
	models.PhaseTypeEnrichment,
}

// NewCampaignOrchestrator creates a new campaign orchestrator

// OrchestratorMetrics defines metrics operations the orchestrator will call.
type OrchestratorMetrics interface {
	IncPhaseStarts()
	IncPhaseCompletions()
	IncPhaseFailures()
	IncPhaseAutoStarts()
	IncCampaignCompletions()
	RecordPhaseDuration(phase string, d time.Duration)

	// Auto-start specific metrics
	IncAutoStartAttempts()
	IncAutoStartSuccesses()
	IncAutoStartFailures()
	RecordAutoStartLatency(d time.Duration)
	RecordFirstPhaseRunningLatency(d time.Duration)

	// Campaign mode tracking
	IncManualModeCreations()
	IncAutoModeCreations()
}

// noopMetrics provides no-op implementations when metrics are not configured.
type noopMetrics struct{}

func (n *noopMetrics) IncPhaseStarts()                              {}
func (n *noopMetrics) IncPhaseCompletions()                         {}
func (n *noopMetrics) IncPhaseFailures()                            {}
func (n *noopMetrics) IncPhaseAutoStarts()                          {}
func (n *noopMetrics) IncCampaignCompletions()                      {}
func (n *noopMetrics) RecordPhaseDuration(string, time.Duration)    {}
func (n *noopMetrics) IncAutoStartAttempts()                        {}
func (n *noopMetrics) IncAutoStartSuccesses()                       {}
func (n *noopMetrics) IncAutoStartFailures()                        {}
func (n *noopMetrics) RecordAutoStartLatency(time.Duration)         {}
func (n *noopMetrics) RecordFirstPhaseRunningLatency(time.Duration) {}
func (n *noopMetrics) IncManualModeCreations()                      {}
func (n *noopMetrics) IncAutoModeCreations()                        {}

// SSEBroadcaster minimal interface needed from SSE service
type SSEBroadcaster interface {
	BroadcastToCampaign(campaignID uuid.UUID, event services.SSEEvent)
}

func NewCampaignOrchestrator(
	store store.CampaignStore,
	deps domainservices.Dependencies,
	domainGenerationSvc domainservices.DomainGenerationService,
	dnsValidationSvc domainservices.DNSValidationService,
	httpValidationSvc domainservices.HTTPValidationService,
	extractionSvc domainservices.PhaseService,
	enrichmentSvc domainservices.EnrichmentService,
	analysisSvc domainservices.AnalysisService,
	sseService SSEBroadcaster,
	metrics OrchestratorMetrics,
) *CampaignOrchestrator {
	// Guard against typed-nil pointers passed as the interface (common when deps field set after construction)
	if metrics == nil || (reflect.ValueOf(metrics).Kind() == reflect.Ptr && reflect.ValueOf(metrics).IsNil()) {
		metrics = &noopMetrics{}
	}
	return &CampaignOrchestrator{
		store:               store,
		deps:                deps,
		domainGenerationSvc: domainGenerationSvc,
		dnsValidationSvc:    dnsValidationSvc,
		httpValidationSvc:   httpValidationSvc,
		extractionSvc:       extractionSvc,
		enrichmentSvc:       enrichmentSvc,
		analysisSvc:         analysisSvc,
		sseService:          sseService,
		metrics:             metrics,
		control:             newInMemoryPhaseControlManager(),
		campaignExecutions:  make(map[uuid.UUID]*CampaignExecution),
		autoStartInProgress: make(map[string]struct{}),
		hooks:               make([]PostCompletionHook, 0),
	}
}

// SetControlManager overrides the orchestrator's control manager; nil restores the default implementation.
func (o *CampaignOrchestrator) SetControlManager(control PhaseControlManager) {
	if o == nil {
		return
	}
	if control == nil {
		control = newInMemoryPhaseControlManager()
	}
	o.control = control
}

// RescoreCampaign triggers a synchronous domain rescore via the analysis service.
// It is lightweight and returns once scores have been recomputed (may be optimized async later).
func (o *CampaignOrchestrator) RescoreCampaign(ctx context.Context, campaignID uuid.UUID) error {
	if o == nil || o.analysisSvc == nil {
		return fmt.Errorf("analysis service unavailable")
	}
	return o.analysisSvc.RescoreCampaign(ctx, campaignID)
}

// FetchAnalysisReadyFeatures returns analysis-ready feature maps for domains in a campaign
// when the underlying analysis service supports the optional DualReadFetch method. It is a
// thin indirection that keeps the concrete analysis service unexported while giving HTTP
// handlers access to the cached dual-read path. Absent support or on any error it returns
// a nil map and non-fatal error (handlers treat feature absence as an enhancement miss).
func (o *CampaignOrchestrator) FetchAnalysisReadyFeatures(ctx context.Context, campaignID uuid.UUID) (map[string]map[string]any, error) {
	if o == nil || o.analysisSvc == nil {
		return nil, nil
	}
	// Optional interface for dual read feature fetch
	type dualReadFetcher interface {
		DualReadFetch(context.Context, uuid.UUID) (map[string]map[string]any, error)
	}
	if dr, ok := o.analysisSvc.(dualReadFetcher); ok {
		return dr.DualReadFetch(ctx, campaignID)
	}
	return nil, nil
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
	// Idempotency guard: ignore duplicate start if same phase already in progress
	o.mu.RLock()
	if exec, ok := o.campaignExecutions[campaignID]; ok && exec.CurrentPhase == phase && exec.OverallStatus == models.PhaseStatusInProgress {
		o.mu.RUnlock()
		o.deps.Logger.Debug(ctx, "Duplicate start ignored (phase already running)", map[string]interface{}{"campaign_id": campaignID, "phase": phase})
		return nil
	}
	o.mu.RUnlock()

	// Metrics: count phase starts (guard nil)
	if o.metrics != nil {
		// we increment only after successful Execute below; keep placeholder here for future pre-start metrics if needed
	}

	// Get campaign to extract user ID for SSE - use DB from deps
	querier, ok := o.deps.DB.(store.Querier)
	if !ok {
		return fmt.Errorf("invalid database interface in dependencies")
	}

	campaign, err := o.store.GetCampaignByID(ctx, querier, campaignID)
	if err != nil {
		return fmt.Errorf("failed to get campaign for SSE broadcasting: %w", err)
	}
	var cachedUserID *uuid.UUID
	if campaign.UserID != nil { // cache for reuse
		cachedUserID = campaign.UserID
	}

	// Read mode (default step_by_step) for readiness gating when starting the first phase in full_sequence
	mode, _ := o.store.GetCampaignMode(ctx, querier, campaignID)
	if mode == "full_sequence" && phase == models.PhaseTypeDomainGeneration {
		// Full-sequence mode now only requires the validation stages (DNS/HTTP) to be configured up-front.
		// Enrichment and analysis fall back to persisted defaults, so their absence should not block the run.
		configs, _ := o.store.ListPhaseConfigs(ctx, querier, campaignID)
		missingList := []string{}
		for _, required := range []models.PhaseTypeEnum{models.PhaseTypeDNSValidation, models.PhaseTypeHTTPKeywordValidation} {
			if _, ok := configs[required]; !ok {
				missingList = append(missingList, string(required))
			}
		}
		if len(missingList) > 0 {
			o.deps.Logger.Warn(ctx, "Full sequence start blocked: missing validation configs", map[string]interface{}{"campaign_id": campaignID, "missing": missingList})
			return &MissingPhaseConfigsError{Missing: missingList}
		}
	}

	if err := o.ensurePhaseDependencies(ctx, querier, campaignID, phase); err != nil {
		return err
	}

	if err := o.ensurePhaseDefaultConfig(ctx, querier, campaignID, phase); err != nil {
		return fmt.Errorf("failed to ensure default configuration for %s: %w", phase, err)
	}

	// Broadcast phase started event will occur after successful Execute

	// Get the appropriate domain service for the phase
	service, err := o.getPhaseService(phase)
	if err != nil {
		return fmt.Errorf("failed to get service for phase %s: %w", phase, err)
	}

	// Ensure the domain service has an up-to-date configuration snapshot before execution.
	if err := o.hydratePhaseConfiguration(ctx, querier, campaignID, phase, service); err != nil {
		return err
	}

	// IMPORTANT: Decouple long-running phase execution from the request context.
	// The incoming ctx is tied to the HTTP request and will be cancelled when the
	// handler returns or the client disconnects, which previously caused premature
	// phase failures (status=failed, "Execution cancelled").
	// Use a background-derived context for execution and monitoring.
	execCtx, cancelFn := context.WithCancel(context.Background())
	// Non-blocking cleanup when execution finishes
	go func() { <-execCtx.Done(); cancelFn() }()

	// Wire runtime control channel before kick-off when supported
	o.attachControlChannel(ctx, campaignID, phase, service)

	// Start phase execution with background-derived context
	progressCh, err := service.Execute(execCtx, campaignID)
	if err != nil {
		// Broadcast phase failed event
		if o.sseService != nil && cachedUserID != nil {
			phaseFailedEvent := services.CreatePhaseFailedEvent(campaignID, *cachedUserID, phase, err.Error())
			o.sseService.BroadcastToCampaign(campaignID, phaseFailedEvent)
		}
		// Metrics: failed start counts as a phase failure
		o.metrics.IncPhaseFailures()
		return fmt.Errorf("failed to start phase %s: %w", phase, err)
	}

	// Successful start: now broadcast started + increment metric
	if o.sseService != nil && cachedUserID != nil {
		phaseStartedEvent := services.CreatePhaseStartedEvent(campaignID, *cachedUserID, phase)
		o.sseService.BroadcastToCampaign(campaignID, phaseStartedEvent)
	}
	if o.metrics != nil {
		o.metrics.IncPhaseStarts()
	}

	// Persist phase start state in campaign_phases (best-effort; orchestrator remains authoritative)
	if querier != nil {
		if err := o.store.StartPhase(context.Background(), querier, campaignID, phase); err != nil {
			o.deps.Logger.Warn(ctx, "Failed to persist phase start state", map[string]interface{}{
				"campaign_id": campaignID,
				"phase":       phase,
				"error":       err.Error(),
			})
		}
	}

	// Ensure an execution record exists (StartPhaseInternal may be called without prior ConfigurePhase)
	o.mu.Lock()
	if _, exists := o.campaignExecutions[campaignID]; !exists {
		o.campaignExecutions[campaignID] = &CampaignExecution{
			CampaignID:    campaignID,
			CurrentPhase:  phase,
			PhaseStatuses: make(map[models.PhaseTypeEnum]*domainservices.PhaseStatus),
			StartedAt:     time.Now(),
			OverallStatus: models.PhaseStatusInProgress,
		}
	}
	o.mu.Unlock()

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

// RestoreInFlightPhases rebuilds execution state for campaigns that were mid-flight before a restart.
// It ensures runtime control channels are reattached by replaying the active phase.
func (o *CampaignOrchestrator) RestoreInFlightPhases(ctx context.Context) error {
	return o.restoreInFlightPhases(ctx, 0)
}

func (o *CampaignOrchestrator) restoreInFlightPhases(ctx context.Context, sleepBetween time.Duration) error {
	if o == nil || o.store == nil || o.deps.DB == nil {
		return nil
	}
	querier, ok := o.deps.DB.(store.Querier)
	if !ok {
		return fmt.Errorf("invalid database interface in dependencies")
	}
	targetStatuses := []models.PhaseStatusEnum{
		models.PhaseStatusInProgress,
		models.PhaseStatusPaused,
	}
	candidates := make([]*models.LeadGenerationCampaign, 0)
	seen := make(map[uuid.UUID]struct{})
	for _, status := range targetStatuses {
		filter := store.ListCampaignsFilter{PhaseStatus: &status}
		campaigns, err := o.store.ListCampaigns(ctx, querier, filter)
		if err != nil {
			if o.deps.Logger != nil {
				o.deps.Logger.Warn(ctx, "campaign.rehydrate.list_failed", map[string]interface{}{
					"status": status,
					"error":  err.Error(),
				})
			}
			continue
		}
		for _, campaign := range campaigns {
			if campaign == nil || campaign.ID == uuid.Nil {
				continue
			}
			if _, exists := seen[campaign.ID]; exists {
				continue
			}
			seen[campaign.ID] = struct{}{}
			candidates = append(candidates, campaign)
		}
	}
	if len(candidates) > 1 {
		sort.SliceStable(candidates, func(i, j int) bool {
			if candidates[i] == nil || candidates[j] == nil {
				return false
			}
			return candidates[i].UpdatedAt.After(candidates[j].UpdatedAt)
		})
	}
	rehydrated := 0
	for _, campaign := range candidates {
		if err := o.rehydrateCampaignPhase(ctx, querier, campaign); err != nil {
			if o.deps.Logger != nil {
				o.deps.Logger.Error(ctx, "campaign.rehydrate.phase_failed", err, map[string]interface{}{
					"campaign_id": campaign.ID,
				})
			}
			continue
		}
		rehydrated++
		if sleepBetween > 0 {
			if err := waitForDuration(ctx, sleepBetween); err != nil {
				return err
			}
		}
	}
	if o.deps.Logger != nil {
		o.deps.Logger.Info(ctx, "campaign.rehydrate.completed", map[string]interface{}{
			"campaigns": rehydrated,
		})
	}
	return nil
}

func waitForDuration(ctx context.Context, d time.Duration) error {
	if d <= 0 {
		return nil
	}
	timer := time.NewTimer(d)
	defer timer.Stop()
	select {
	case <-ctx.Done():
		return ctx.Err()
	case <-timer.C:
		return nil
	}
}

func (o *CampaignOrchestrator) rehydrateCampaignPhase(ctx context.Context, exec store.Querier, campaign *models.LeadGenerationCampaign) error {
	if o == nil || campaign == nil || campaign.ID == uuid.Nil {
		return nil
	}
	if campaign.PhaseStatus == nil || !isPhaseActiveStatus(*campaign.PhaseStatus) {
		return nil
	}
	phase := models.PhaseTypeEnum("")
	if campaign.CurrentPhase != nil {
		phase = *campaign.CurrentPhase
	}
	if phase == "" && exec != nil {
		if active, err := o.findActivePhase(ctx, exec, campaign.ID); err == nil && active != nil {
			phase = active.PhaseType
		} else if err != nil && !errors.Is(err, ErrNoActivePhase) {
			return err
		}
	}
	if phase == "" {
		if o.deps.Logger != nil {
			o.deps.Logger.Warn(ctx, "campaign.rehydrate.skip_no_phase", map[string]interface{}{
				"campaign_id": campaign.ID,
			})
		}
		return nil
	}
	// Guard against duplicate executions when RestoreInFlightPhases runs multiple times.
	o.mu.RLock()
	if execState, ok := o.campaignExecutions[campaign.ID]; ok {
		if execState != nil && execState.CurrentPhase == phase {
			switch execState.OverallStatus {
			case models.PhaseStatusInProgress, models.PhaseStatusPaused:
				o.mu.RUnlock()
				if o.deps.Logger != nil {
					o.deps.Logger.Debug(ctx, "campaign.rehydrate.skip_duplicate", map[string]interface{}{
						"campaign_id": campaign.ID,
						"phase":       phase,
					})
				}
				return nil
			}
		}
	}
	o.mu.RUnlock()
	service, err := o.getPhaseService(phase)
	if err != nil {
		return fmt.Errorf("failed to get service for phase %s: %w", phase, err)
	}
	if o.deps.Logger != nil {
		o.deps.Logger.Info(ctx, "campaign.rehydrate.phase.start", map[string]interface{}{
			"campaign_id": campaign.ID,
			"phase":       phase,
			"status":      *campaign.PhaseStatus,
		})
	}
	controlAware := false
	if _, ok := service.(domainservices.ControlAwarePhase); ok {
		controlAware = true
	}
	if err := o.StartPhaseInternal(ctx, campaign.ID, phase); err != nil {
		return fmt.Errorf("failed to restart phase %s: %w", phase, err)
	}
	if o.deps.Logger != nil {
		o.deps.Logger.Debug(ctx, "phase.restore.attach.complete", map[string]interface{}{
			"campaign_id": campaign.ID,
			"phase":       phase,
		})
	}
	if !controlAware {
		if o.deps.Logger != nil {
			o.deps.Logger.Warn(ctx, "campaign.rehydrate.autopause.unsupported", map[string]interface{}{
				"campaign_id": campaign.ID,
				"phase":       phase,
				"reason":      "phase_not_control_aware",
			})
		}
		return nil
	}
	reason := "phase_status_unknown"
	if campaign.PhaseStatus != nil {
		switch *campaign.PhaseStatus {
		case models.PhaseStatusPaused:
			reason = "phase_was_already_paused"
		case models.PhaseStatusInProgress:
			reason = "phase_was_running"
		default:
			reason = fmt.Sprintf("phase_status_%s", *campaign.PhaseStatus)
		}
	}
	pauseCtx, cancel := context.WithTimeout(ctx, controlAckTimeout)
	defer cancel()
	if err := o.PausePhase(pauseCtx, campaign.ID, phase); err != nil {
		return fmt.Errorf("failed to autopause %s after restore: %w", phase, err)
	}
	if o.deps.Logger != nil {
		o.deps.Logger.Info(ctx, "campaign.rehydrate.autopause.applied", map[string]interface{}{
			"campaign_id": campaign.ID,
			"phase":       phase,
			"reason":      reason,
		})
	}
	return nil
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
	case "enrichment":
		return models.PhaseTypeEnrichment, nil
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
		models.PhaseTypeExtraction,
		models.PhaseTypeAnalysis,
		models.PhaseTypeEnrichment,
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
	// Ensure a control subscription exists before signaling stop so backend restarts don't drop the command.
	o.attachControlChannel(ctx, campaignID, phase, service)

	if err := o.broadcastControlSignal(ctx, campaignID, phase, domainservices.ControlSignalStop, nil); err != nil && o.deps.Logger != nil {
		o.deps.Logger.Debug(ctx, "phase.control.stop.broadcast_failed", map[string]interface{}{
			"campaign_id": campaignID,
			"phase":       phase,
			"error":       err.Error(),
		})
	}

	// Cancel the phase
	if err := service.Cancel(ctx, campaignID); err != nil {
		if errors.Is(err, domainservices.ErrPhaseExecutionMissing) || errors.Is(err, domainservices.ErrPhaseNotRunning) {
			return err
		}
		return fmt.Errorf("failed to cancel phase %s: %w", phase, err)
	}
	// (Optional) Could add a dedicated cancellation metric in future.

	o.deps.Logger.Info(ctx, "Phase cancelled successfully", map[string]interface{}{
		"campaign_id": campaignID,
		"phase":       phase,
	})

	return nil
}

// PausePhase transitions an in-progress phase to paused and halts execution.
func (o *CampaignOrchestrator) PausePhase(ctx context.Context, campaignID uuid.UUID, phase models.PhaseTypeEnum) error {
	if o.store == nil {
		return fmt.Errorf("campaign store not initialized")
	}
	o.deps.Logger.Info(ctx, "Pausing campaign phase", map[string]interface{}{
		"campaign_id": campaignID,
		"phase":       phase,
	})

	service, err := o.getPhaseService(phase)
	if err != nil {
		return fmt.Errorf("failed to get service for phase %s: %w", phase, err)
	}
	// Re-attach in case the prior control subscription was closed (e.g., orchestrator restart).
	o.attachControlChannel(ctx, campaignID, phase, service)

	ack := make(chan error, 1)
	if err := o.broadcastControlSignal(ctx, campaignID, phase, domainservices.ControlSignalPause, ack); err != nil {
		return err
	}
	if err := awaitControlAck(ctx, ack, domainservices.ErrPhasePauseTimeout); err != nil {
		return err
	}

	o.deps.Logger.Info(ctx, "Phase paused successfully", map[string]interface{}{
		"campaign_id": campaignID,
		"phase":       phase,
	})
	return nil
}

// ResumePhase transitions a paused phase back to in-progress execution when supported.
func (o *CampaignOrchestrator) ResumePhase(ctx context.Context, campaignID uuid.UUID, phase models.PhaseTypeEnum) error {
	if o.store == nil {
		return fmt.Errorf("campaign store not initialized")
	}
	o.deps.Logger.Info(ctx, "Resuming campaign phase", map[string]interface{}{
		"campaign_id": campaignID,
		"phase":       phase,
	})

	// Re-attach control channel in case backend restarted or channel was closed
	service, err := o.getPhaseService(phase)
	if err != nil {
		return fmt.Errorf("failed to get service for phase %s: %w", phase, err)
	}
	o.attachControlChannel(ctx, campaignID, phase, service)

	ack := make(chan error, 1)
	if err := o.broadcastControlSignal(ctx, campaignID, phase, domainservices.ControlSignalResume, ack); err != nil {
		return err
	}
	if err := awaitControlAck(ctx, ack, domainservices.ErrPhaseResumeTimeout); err != nil {
		return err
	}

	o.deps.Logger.Info(ctx, "Phase resumed successfully", map[string]interface{}{
		"campaign_id": campaignID,
		"phase":       phase,
	})
	return nil
}

// StopCampaign cooperatively stops whichever phase is currently active for the campaign and
// marks the campaign as cancelled in centralized state tracking.
func (o *CampaignOrchestrator) StopCampaign(ctx context.Context, campaignID uuid.UUID) (*CampaignStopResult, error) {
	if o == nil || o.store == nil || o.deps.DB == nil {
		return nil, fmt.Errorf("orchestrator not initialized")
	}
	querier, ok := o.deps.DB.(store.Querier)
	if !ok {
		return nil, fmt.Errorf("invalid database interface in dependencies")
	}

	activePhase, err := o.findActivePhase(ctx, querier, campaignID)
	if err != nil {
		return nil, err
	}
	phase := activePhase.PhaseType

	if err := o.CancelPhase(ctx, campaignID, phase); err != nil {
		return nil, err
	}

	if err := o.recordCampaignStop(ctx, querier, campaignID, phase); err != nil {
		return nil, err
	}

	status, err := o.GetPhaseStatus(ctx, campaignID, phase)
	if err != nil && o.deps.Logger != nil {
		o.deps.Logger.Warn(ctx, "campaign.stop.status_fetch_failed", map[string]interface{}{
			"campaign_id": campaignID,
			"phase":       phase,
			"error":       err.Error(),
		})
	}

	if o.deps.Logger != nil {
		o.deps.Logger.Info(ctx, "Campaign stop completed", map[string]interface{}{
			"campaign_id": campaignID,
			"phase":       phase,
		})
	}

	return &CampaignStopResult{Phase: phase, Status: status}, nil
}

func (o *CampaignOrchestrator) findActivePhase(ctx context.Context, exec store.Querier, campaignID uuid.UUID) (*models.CampaignPhase, error) {
	if o == nil || o.store == nil || exec == nil {
		return nil, fmt.Errorf("campaign store not initialized")
	}
	phases, err := o.store.GetCampaignPhases(ctx, exec, campaignID)
	if err != nil && !errors.Is(err, store.ErrNotFound) {
		return nil, fmt.Errorf("failed to load campaign phases: %w", err)
	}
	if phase := selectActivePhase(phases); phase != nil {
		return phase, nil
	}
	campaign, err := o.store.GetCampaignByID(ctx, exec, campaignID)
	if err != nil {
		return nil, err
	}
	if campaign.CurrentPhase == nil || campaign.PhaseStatus == nil || !isPhaseActiveStatus(*campaign.PhaseStatus) {
		return nil, ErrNoActivePhase
	}
	return &models.CampaignPhase{
		CampaignID: campaign.ID,
		PhaseType:  *campaign.CurrentPhase,
		Status:     *campaign.PhaseStatus,
	}, nil
}

func selectActivePhase(phases []*models.CampaignPhase) *models.CampaignPhase {
	var pausedCandidate *models.CampaignPhase
	for _, phase := range phases {
		if phase == nil {
			continue
		}
		switch phase.Status {
		case models.PhaseStatusInProgress:
			return phase
		case models.PhaseStatusPaused:
			if pausedCandidate == nil {
				pausedCandidate = phase
			}
		}
	}
	return pausedCandidate
}

func (o *CampaignOrchestrator) recordCampaignStop(ctx context.Context, exec store.Querier, campaignID uuid.UUID, phase models.PhaseTypeEnum) error {
	if o == nil || o.store == nil || exec == nil {
		return fmt.Errorf("campaign store not initialized")
	}
	if err := o.store.FailPhase(ctx, exec, campaignID, phase, campaignStopMessage, map[string]interface{}{"code": "campaign_stopped"}); err != nil {
		return fmt.Errorf("failed to update phase state: %w", err)
	}
	phaseStatus := models.PhaseStatusFailed
	if err := o.store.UpdateCampaignPhaseFields(ctx, exec, campaignID, &phase, &phaseStatus); err != nil {
		return fmt.Errorf("failed to persist campaign phase status: %w", err)
	}
	if err := o.store.UpdateCampaignStatus(ctx, exec, campaignID, models.PhaseStatusFailed, sql.NullString{String: campaignStopMessage, Valid: true}); err != nil {
		return fmt.Errorf("failed to persist campaign status: %w", err)
	}
	if err := o.persistCampaignState(ctx, exec, campaignID, models.CampaignStateCancelled); err != nil {
		return err
	}
	o.mu.Lock()
	if execution, exists := o.campaignExecutions[campaignID]; exists {
		execution.OverallStatus = models.PhaseStatusFailed
		execution.LastError = campaignStopMessage
	}
	o.mu.Unlock()
	if o.sseService != nil {
		if campaign, err := o.store.GetCampaignByID(ctx, exec, campaignID); err == nil && campaign.UserID != nil {
			evt := services.CreatePhaseFailedEvent(campaignID, *campaign.UserID, phase, campaignStopMessage)
			o.sseService.BroadcastToCampaign(campaignID, evt)
		}
	}
	return nil
}

func (o *CampaignOrchestrator) persistCampaignState(ctx context.Context, exec store.Querier, campaignID uuid.UUID, next models.CampaignStateEnum) error {
	if o.store == nil {
		return nil
	}
	state, err := o.store.GetCampaignState(ctx, exec, campaignID)
	switch {
	case err == nil && state != nil:
		state.CurrentState = next
		state.Version++
		return o.store.UpdateCampaignState(ctx, exec, state)
	case errors.Is(err, store.ErrNotFound):
		emptyCfg := json.RawMessage([]byte("{}"))
		fresh := &models.CampaignState{
			CampaignID:    campaignID,
			CurrentState:  next,
			Mode:          models.CampaignModeStepByStep,
			Configuration: emptyCfg,
			Version:       1,
		}
		return o.store.CreateCampaignState(ctx, exec, fresh)
	case err != nil:
		return fmt.Errorf("campaign state lookup failed: %w", err)
	default:
		return nil
	}
}

func isPhaseActiveStatus(status models.PhaseStatusEnum) bool {
	switch status {
	case models.PhaseStatusInProgress, models.PhaseStatusPaused:
		return true
	default:
		return false
	}
}

// RestartCampaign replays all restartable phases sequentially, skipping discovery/domain generation.
func (o *CampaignOrchestrator) RestartCampaign(ctx context.Context, campaignID uuid.UUID) (*CampaignRestartResult, error) {
	if o == nil || o.store == nil {
		return nil, fmt.Errorf("orchestrator not initialized")
	}
	result := &CampaignRestartResult{
		RestartedPhases: make([]models.PhaseTypeEnum, 0, len(restartablePhaseOrder)),
		FailedPhases:    make(map[models.PhaseTypeEnum]error),
	}

	mode := o.campaignMode(ctx, campaignID)
	if mode == "full_sequence" {
		phase := restartablePhaseOrder[0]
		if err := o.StartPhaseInternal(ctx, campaignID, phase); err != nil {
			result.FailedPhases[phase] = err
			return result, err
		}
		result.RestartedPhases = append(result.RestartedPhases, phase)
		return result, nil
	}

	for _, phase := range restartablePhaseOrder {
		if err := o.StartPhaseInternal(ctx, campaignID, phase); err != nil {
			result.FailedPhases[phase] = err
			continue
		}
		result.RestartedPhases = append(result.RestartedPhases, phase)
	}

	if len(result.RestartedPhases) == 0 && len(result.FailedPhases) > 0 {
		return result, fmt.Errorf("failed to restart any campaign phases: %w", firstRestartError(result.FailedPhases))
	}

	return result, nil
}

func firstRestartError(errs map[models.PhaseTypeEnum]error) error {
	for _, err := range errs {
		if err != nil {
			return err
		}
	}
	return nil
}

// campaignMode resolves the configured execution mode for a campaign, defaulting to step_by_step on lookup errors.
func (o *CampaignOrchestrator) campaignMode(ctx context.Context, campaignID uuid.UUID) string {
	if o == nil || o.store == nil || o.deps.DB == nil {
		return "step_by_step"
	}
	querier, ok := o.deps.DB.(store.Querier)
	if !ok {
		return "step_by_step"
	}
	if mode, err := o.store.GetCampaignMode(ctx, querier, campaignID); err == nil {
		return mode
	}
	return "step_by_step"
}

func (o *CampaignOrchestrator) ensurePhaseDependencies(ctx context.Context, exec store.Querier, campaignID uuid.UUID, phase models.PhaseTypeEnum) error {
	if o == nil || exec == nil || o.store == nil {
		return nil
	}
	required, ok := upstreamPhase(phase)
	if !ok {
		return nil
	}
	blocking, err := o.store.GetCampaignPhase(ctx, exec, campaignID, required)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) || errors.Is(err, store.ErrNotFound) || strings.Contains(err.Error(), "not found") {
			blocking = nil
		} else {
			return err
		}
	}
	status := models.PhaseStatusNotStarted
	if blocking != nil {
		status = blocking.Status
	}
	if dependencySatisfied(status) {
		return nil
	}
	return &PhaseDependencyError{Phase: phase, BlockingPhase: required, BlockingStatus: status}
}

func dependencySatisfied(status models.PhaseStatusEnum) bool {
	switch status {
	case models.PhaseStatusCompleted, models.PhaseStatusSkipped:
		return true
	default:
		return false
	}
}

func upstreamPhase(phase models.PhaseTypeEnum) (models.PhaseTypeEnum, bool) {
	switch phase {
	case models.PhaseTypeHTTPKeywordValidation:
		return models.PhaseTypeDNSValidation, true
	case models.PhaseTypeExtraction:
		return models.PhaseTypeHTTPKeywordValidation, true
	case models.PhaseTypeAnalysis:
		return models.PhaseTypeExtraction, true
	case models.PhaseTypeEnrichment:
		return models.PhaseTypeAnalysis, true
	default:
		return "", false
	}
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
	case models.PhaseTypeExtraction:
		return o.extractionSvc, nil
	case models.PhaseTypeEnrichment:
		return o.enrichmentSvc, nil
	case models.PhaseTypeAnalysis:
		return o.analysisSvc, nil
	default:
		return nil, fmt.Errorf("unsupported phase type: %s", phase)
	}
}

func (o *CampaignOrchestrator) ensurePhaseDefaultConfig(ctx context.Context, exec store.Querier, campaignID uuid.UUID, phase models.PhaseTypeEnum) error {
	if o.store == nil {
		return nil
	}
	if phase != models.PhaseTypeEnrichment && phase != models.PhaseTypeAnalysis {
		return nil
	}

	raw, err := o.store.GetPhaseConfig(ctx, exec, campaignID, phase)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) || err == sql.ErrNoRows {
			err = nil
		} else {
			return err
		}
	}
	if raw != nil {
		payload := bytes.TrimSpace([]byte(*raw))
		if len(payload) > 0 && !bytes.Equal(payload, []byte("null")) {
			return nil
		}
	} else if err == nil {
		// explicit nil payload stored, treat as missing and fall through
	}

	switch phase {
	case models.PhaseTypeEnrichment:
		if o.enrichmentSvc == nil {
			return fmt.Errorf("enrichment service unavailable")
		}
		if o.deps.Logger != nil {
			o.deps.Logger.Info(ctx, "Auto-configuring enrichment defaults", map[string]interface{}{"campaign_id": campaignID})
		}
		if err := o.enrichmentSvc.Configure(ctx, campaignID, nil); err != nil {
			return fmt.Errorf("auto-configure enrichment defaults: %w", err)
		}
	case models.PhaseTypeAnalysis:
		if o.analysisSvc == nil {
			return fmt.Errorf("analysis service unavailable")
		}
		if o.deps.Logger != nil {
			o.deps.Logger.Info(ctx, "Auto-configuring analysis defaults", map[string]interface{}{"campaign_id": campaignID})
		}
		if err := o.analysisSvc.Configure(ctx, campaignID, &domainservices.AnalysisConfig{}); err != nil {
			return fmt.Errorf("auto-configure analysis defaults: %w", err)
		}
	}

	return nil
}

// hydratePhaseConfiguration reloads persisted configuration for the provided phase and reapplies it
// to the in-memory domain service before execution resumes. This avoids relying on process-local
// Configure calls that are lost across restarts.
func (o *CampaignOrchestrator) hydratePhaseConfiguration(ctx context.Context, exec store.Querier, campaignID uuid.UUID, phase models.PhaseTypeEnum, service domainservices.PhaseService) error {
	if o == nil || o.store == nil || exec == nil || service == nil {
		return nil
	}

	payload, err := o.loadPhaseConfigurationPayload(ctx, exec, campaignID, phase)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) || errors.Is(err, errPhaseConfigMissing) {
			if o.deps.Logger != nil {
				o.deps.Logger.Debug(ctx, "campaign.phase.config.rehydrate.skipped", map[string]interface{}{
					"campaign_id": campaignID,
					"phase":       phase,
					"reason":      "config_not_found",
				})
			}
			return nil
		}
		return fmt.Errorf("failed to load configuration for %s: %w", phase, err)
	}

	config, err := decodePhaseConfiguration(phase, payload)
	if err != nil {
		if o.deps.Logger != nil {
			o.deps.Logger.Warn(ctx, "campaign.phase.config.decode_failed", map[string]interface{}{
				"campaign_id": campaignID,
				"phase":       phase,
				"error":       err.Error(),
			})
		}
		return fmt.Errorf("failed to decode stored configuration for %s: %w", phase, err)
	}
	if config == nil {
		if o.deps.Logger != nil {
			o.deps.Logger.Warn(ctx, "campaign.phase.config.decode_skipped", map[string]interface{}{
				"campaign_id": campaignID,
				"phase":       phase,
				"reason":      "decoder_returned_nil",
			})
		}
		return nil
	}

	if err := service.Configure(ctx, campaignID, config); err != nil {
		return fmt.Errorf("failed to rehydrate configuration for %s: %w", phase, err)
	}

	if o.deps.Logger != nil {
		o.deps.Logger.Debug(ctx, "campaign.phase.config.rehydrated", map[string]interface{}{
			"campaign_id": campaignID,
			"phase":       phase,
		})
	}
	return nil
}

var errPhaseConfigMissing = errors.New("phase configuration missing")

func (o *CampaignOrchestrator) loadPhaseConfigurationPayload(ctx context.Context, exec store.Querier, campaignID uuid.UUID, phase models.PhaseTypeEnum) ([]byte, error) {
	if o == nil || o.store == nil || exec == nil {
		return nil, store.ErrNotFound
	}
	phaseRow, err := o.store.GetCampaignPhase(ctx, exec, campaignID, phase)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) || errors.Is(err, store.ErrNotFound) || strings.Contains(err.Error(), "not found") {
			return nil, store.ErrNotFound
		}
		return nil, err
	}
	if phaseRow == nil || phaseRow.Configuration == nil {
		return nil, errPhaseConfigMissing
	}
	trimmed := bytes.TrimSpace([]byte(*phaseRow.Configuration))
	if len(trimmed) == 0 || bytes.Equal(trimmed, []byte("null")) {
		return nil, errPhaseConfigMissing
	}
	copyBuf := make([]byte, len(trimmed))
	copy(copyBuf, trimmed)
	return copyBuf, nil
}

func (o *CampaignOrchestrator) attachControlChannel(ctx context.Context, campaignID uuid.UUID, phase models.PhaseTypeEnum, service domainservices.PhaseService) {
	if o == nil || o.control == nil {
		return
	}
	controlAware, ok := service.(domainservices.ControlAwarePhase)
	if !ok {
		if o.deps.Logger != nil {
			o.deps.Logger.Debug(ctx, "phase.control.attach.skip", map[string]interface{}{
				"campaign_id": campaignID,
				"phase":       phase,
				"reason":      "service_not_control_aware",
			})
		}
		return
	}
	if o.deps.Logger != nil {
		o.deps.Logger.Debug(ctx, "phase.control.attach.attempt", map[string]interface{}{
			"campaign_id": campaignID,
			"phase":       phase,
		})
	}
	signalCh, err := o.control.Subscribe(ctx, campaignID, phase)
	if err != nil {
		if o.deps.Logger != nil {
			o.deps.Logger.Warn(ctx, "phase.control.subscription.failed", map[string]interface{}{
				"campaign_id": campaignID,
				"phase":       phase,
				"error":       err.Error(),
			})
		}
		return
	}
	if o.deps.Logger != nil {
		o.deps.Logger.Debug(ctx, "phase.control.subscription.established", map[string]interface{}{
			"campaign_id": campaignID,
			"phase":       phase,
		})
	}
	controlAware.AttachControlChannel(ctx, campaignID, phase, signalCh)
	if o.deps.Logger != nil {
		o.deps.Logger.Debug(ctx, "phase.control.attach.completed", map[string]interface{}{
			"campaign_id": campaignID,
			"phase":       phase,
		})
	}
}

func (o *CampaignOrchestrator) broadcastControlSignal(ctx context.Context, campaignID uuid.UUID, phase models.PhaseTypeEnum, signal domainservices.ControlSignal, ack chan error) error {
	if o == nil || o.control == nil {
		err := fmt.Errorf("phase control manager unavailable")
		notifyControlAck(ack, err)
		return err
	}
	if err := o.control.Broadcast(ctx, campaignID, phase, signal, ack); err != nil {
		if errors.Is(err, ErrControlChannelMissing) {
			// Control channel likely dropped after a restart; attempt to reattach once.
			drainControlAck(ack)
			if service, svcErr := o.getPhaseService(phase); svcErr == nil {
				if o.deps.Logger != nil {
					o.deps.Logger.Info(ctx, "phase.control.channel.retry", map[string]interface{}{
						"campaign_id": campaignID,
						"phase":       phase,
						"signal":      signal,
					})
				}
				time.Sleep(controlRetryBackoff)
				o.attachControlChannel(ctx, campaignID, phase, service)
				retryErr := o.control.Broadcast(ctx, campaignID, phase, signal, ack)
				if retryErr == nil {
					if o.deps.Logger != nil {
						o.deps.Logger.Debug(ctx, "phase.control.signal.retry_success", map[string]interface{}{
							"campaign_id": campaignID,
							"phase":       phase,
							"signal":      signal,
						})
					}
					return nil
				}
				if errors.Is(retryErr, ErrControlChannelMissing) {
					if o.deps.Logger != nil {
						o.deps.Logger.Warn(ctx, "phase.control.signal.drop", map[string]interface{}{
							"campaign_id": campaignID,
							"phase":       phase,
							"signal":      signal,
							"error":       retryErr.Error(),
							"reason":      "channel_missing_after_retry",
						})
					}
					notifyControlAck(ack, domainservices.ErrPhaseNotRunning)
					return domainservices.ErrPhaseNotRunning
				}
				return retryErr
			}
		}
		if o.deps.Logger != nil {
			o.deps.Logger.Warn(ctx, "phase.control.signal.drop", map[string]interface{}{
				"campaign_id": campaignID,
				"phase":       phase,
				"signal":      signal,
				"error":       err.Error(),
			})
		}
		return err
	}
	return nil
}

func awaitControlAck(ctx context.Context, ack <-chan error, timeoutErr error) error {
	if ack == nil {
		return fmt.Errorf("control ack channel missing")
	}
	select {
	case <-ctx.Done():
		return ctx.Err()
	case err := <-ack:
		return err
	case <-time.After(controlAckTimeout):
		return timeoutErr
	}
}

func drainControlAck(ack chan error) {
	if ack == nil {
		return
	}
	for {
		select {
		case <-ack:
		default:
			return
		}
	}
}

func notifyControlAck(ack chan error, err error) {
	if ack == nil || err == nil {
		return
	}
	select {
	case ack <- err:
	default:
	}
}

func (o *CampaignOrchestrator) closeControlChannel(campaignID uuid.UUID, phase models.PhaseTypeEnum) {
	if o == nil || o.control == nil {
		return
	}
	if o.deps.Logger != nil {
		o.deps.Logger.Debug(context.Background(), "phase.control.subscription.closed", map[string]interface{}{
			"campaign_id": campaignID,
			"phase":       phase,
		})
	}
	o.control.Close(campaignID, phase)
}

func phaseRequiresExplicitConfig(phase models.PhaseTypeEnum) bool {
	switch phase {
	case models.PhaseTypeDNSValidation, models.PhaseTypeHTTPKeywordValidation:
		return true
	default:
		return false
	}
}

func decodePhaseConfiguration(phase models.PhaseTypeEnum, payload []byte) (interface{}, error) {
	switch phase {
	case models.PhaseTypeDNSValidation:
		var cfg domainservices.DNSValidationConfig
		if err := json.Unmarshal(payload, &cfg); err != nil {
			return nil, err
		}
		return &cfg, nil
	case models.PhaseTypeHTTPKeywordValidation:
		var cfg models.HTTPPhaseConfigRequest
		if err := json.Unmarshal(payload, &cfg); err != nil {
			return nil, err
		}
		return &cfg, nil
	case models.PhaseTypeDomainGeneration:
		var cfg domainservices.DomainGenerationConfig
		if err := json.Unmarshal(payload, &cfg); err != nil {
			return nil, err
		}
		return cfg, nil
	case models.PhaseTypeEnrichment:
		copyBuf := make([]byte, len(payload))
		copy(copyBuf, payload)
		return json.RawMessage(copyBuf), nil
	case models.PhaseTypeAnalysis:
		var cfg domainservices.AnalysisConfig
		if err := json.Unmarshal(payload, &cfg); err != nil {
			return nil, err
		}
		return &cfg, nil
	default:
		return nil, nil
	}
}

// monitorPhaseProgress monitors the progress of a phase execution
func (o *CampaignOrchestrator) monitorPhaseProgress(ctx context.Context, campaignID uuid.UUID, phase models.PhaseTypeEnum, progressCh <-chan domainservices.PhaseProgress) {
	exitReason := "unknown"
	defer func() {
		if o.deps.Logger != nil {
			o.deps.Logger.Debug(ctx, "Phase progress monitoring ended", map[string]interface{}{
				"campaign_id": campaignID,
				"phase":       phase,
				"reason":      exitReason,
			})
		}
	}()

	defer o.closeControlChannel(campaignID, phase)

	// Get campaign user ID for SSE broadcasting (cache it to avoid repeated DB calls)
	var (
		userID              *uuid.UUID
		userLookupErr       error
		userLookupAttempted bool
	)
	if o.sseService != nil {
		if querier, ok := o.deps.DB.(store.Querier); ok {
			userLookupAttempted = true
			if campaign, err := o.store.GetCampaignByID(ctx, querier, campaignID); err == nil && campaign.UserID != nil {
				userID = campaign.UserID
			} else if err != nil {
				userLookupErr = err
			}
		}
	}
	if o.deps.Logger != nil {
		switch {
		case o.sseService == nil:
			o.deps.Logger.Warn(ctx, "Phase progress SSE broadcast disabled", map[string]interface{}{
				"campaign_id": campaignID,
				"phase":       phase,
				"reason":      "sse_service_unavailable",
			})
		case userID == nil:
			reason := "campaign_user_missing"
			if !userLookupAttempted {
				reason = "querier_unavailable"
			} else if userLookupErr != nil {
				reason = fmt.Sprintf("user_lookup_failed:%v", userLookupErr)
			}
			o.deps.Logger.Warn(ctx, "Phase progress SSE broadcast disabled", map[string]interface{}{
				"campaign_id": campaignID,
				"phase":       phase,
				"reason":      reason,
			})
		}
	}

	for {
		select {
		case <-ctx.Done():
			exitReason = fmt.Sprintf("context_done:%v", ctx.Err())
			return
		case progress, ok := <-progressCh:
			if !ok {
				exitReason = "progress_channel_closed"
				// Channel closed, phase execution completed
				o.handlePhaseCompletion(ctx, campaignID, phase)
				return
			}

			exitReason = "running"
			// Update campaign execution with progress
			o.updateCampaignProgress(campaignID, phase, progress)

			// Broadcast progress update via SSE
			broadcasted := false
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
				broadcasted = true
			}
			if broadcasted && o.deps.Logger != nil {
				uidStr := ""
				if userID != nil {
					uidStr = userID.String()
				}
				o.deps.Logger.Debug(ctx, "Phase progress SSE broadcast enqueued", map[string]interface{}{
					"campaign_id":  campaignID,
					"phase":        phase,
					"progress_pct": progress.ProgressPct,
					"user_id":      uidStr,
				})
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
	o.closeControlChannel(campaignID, phase)
	o.deps.Logger.Info(ctx, "Phase execution completed", map[string]interface{}{
		"campaign_id": campaignID,
		"phase":       phase,
	})
	// Attempt to record duration metrics if timestamps available
	if service, err := o.getPhaseService(phase); err == nil {
		if st, err2 := service.GetStatus(ctx, campaignID); err2 == nil && st != nil && st.StartedAt != nil && st.CompletedAt != nil {
			start := *st.StartedAt
			end := *st.CompletedAt
			if end.After(start) {
				// Record phase duration metric
				o.metrics.RecordPhaseDuration(string(phase), end.Sub(start))
			}
		}
	}

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
	var cachedUserID *uuid.UUID
	if o.sseService != nil {
		if querier, ok := o.deps.DB.(store.Querier); ok {
			if campaign, err := o.store.GetCampaignByID(ctx, querier, campaignID); err == nil && campaign.UserID != nil {
				cachedUserID = campaign.UserID
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

	// Auto-advance logic only for successful completion; record failures otherwise
	if finalStatus != nil && finalStatus.Status == models.PhaseStatusFailed {
		// Metrics: runtime failure
		o.metrics.IncPhaseFailures()
		return
	}
	if finalStatus != nil && finalStatus.Status == models.PhaseStatusCompleted {
		// Metrics: phase completion
		o.metrics.IncPhaseCompletions()
		// Mark phase completed in persistence to keep campaign_phases in sync.
		if querier, ok := o.deps.DB.(store.Querier); ok {
			if err := o.store.CompletePhase(context.Background(), querier, campaignID, phase); err != nil {
				o.deps.Logger.Warn(ctx, "Failed to persist phase completion state", map[string]interface{}{
					"campaign_id": campaignID,
					"phase":       phase,
					"error":       err.Error(),
				})
			}
		}
		// Record duration if timestamps available
		if finalStatus.StartedAt != nil && finalStatus.CompletedAt != nil {
			elapsed := finalStatus.CompletedAt.Sub(*finalStatus.StartedAt)
			// map internal model phase enum to string used by metrics recorder
			var phaseKey string
			switch phase {
			case models.PhaseTypeDomainGeneration:
				phaseKey = "domain_generation"
			case models.PhaseTypeDNSValidation:
				phaseKey = "dns_validation"
			case models.PhaseTypeHTTPKeywordValidation:
				phaseKey = "http_keyword_validation"
			case models.PhaseTypeAnalysis:
				phaseKey = "analysis"
			case models.PhaseTypeEnrichment:
				phaseKey = "enrichment"
			}
			if phaseKey != "" {
				o.metrics.RecordPhaseDuration(phaseKey, elapsed)
			}
		}
		if o.isLastPhase(phase) {
			_ = o.HandleCampaignCompletion(ctx, campaignID)
			return
		}
		querier, ok := o.deps.DB.(store.Querier)
		if !ok {
			o.deps.Logger.Warn(ctx, "Auto-advance skipped: invalid DB interface", map[string]interface{}{"campaign_id": campaignID})
			return
		}
		mode, err := o.store.GetCampaignMode(ctx, querier, campaignID)
		if err != nil {
			o.deps.Logger.Warn(ctx, "Auto-advance: failed to fetch campaign mode", map[string]interface{}{"campaign_id": campaignID, "error": err.Error()})
			return
		}
		if mode != "full_sequence" { // no auto-advance in step_by_step
			return
		}
		// Determine next phase in sequence
		next, ok := o.nextPhase(phase)
		if !ok {
			return
		}
		// Under strict model A mid-chain gating is removed; auto-advance simply attempts the next phase assuming pre-validation.
		key := campaignID.String() + ":" + string(next)
		o.mu.Lock()
		if _, exists := o.autoStartInProgress[key]; exists {
			o.mu.Unlock()
			return
		}
		o.autoStartInProgress[key] = struct{}{}
		o.mu.Unlock()

		defer func() {
			o.mu.Lock()
			delete(o.autoStartInProgress, key)
			o.mu.Unlock()
		}()

		o.deps.Logger.Info(ctx, "Auto-advancing to next phase (full_sequence mode)", map[string]interface{}{"campaign_id": campaignID, "from_phase": phase, "to_phase": next})
		if o.sseService != nil && cachedUserID != nil {
			evt := services.CreatePhaseAutoStartedEvent(campaignID, *cachedUserID, next)
			o.sseService.BroadcastToCampaign(campaignID, evt)
		}
		if err := o.StartPhaseInternal(ctx, campaignID, next); err != nil {
			o.deps.Logger.Error(ctx, "Failed to auto-advance to next phase", err, map[string]interface{}{"campaign_id": campaignID, "from_phase": phase, "to_phase": next})
		} else {
			// Metrics: auto-start only on success
			o.metrics.IncPhaseAutoStarts()
		}
	}
	// NOTE: Runtime metrics extraction currently not wired; function stub removed to avoid confusion.
}

// isLastPhase checks if the given phase is the last phase in the campaign
func (o *CampaignOrchestrator) isLastPhase(phase models.PhaseTypeEnum) bool {
	return phase == models.PhaseTypeEnrichment
}

// nextPhase returns the next phase in the standard sequence
func (o *CampaignOrchestrator) nextPhase(current models.PhaseTypeEnum) (models.PhaseTypeEnum, bool) {
	switch current {
	case models.PhaseTypeDomainGeneration:
		return models.PhaseTypeDNSValidation, true
	case models.PhaseTypeDNSValidation:
		return models.PhaseTypeHTTPKeywordValidation, true
	case models.PhaseTypeHTTPKeywordValidation:
		return models.PhaseTypeExtraction, true
	case models.PhaseTypeExtraction:
		return models.PhaseTypeAnalysis, true
	case models.PhaseTypeAnalysis:
		return models.PhaseTypeEnrichment, true
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
		// Clear current_phase once campaign is fully complete while preserving terminal status for reporting.
		completedStatus := models.PhaseStatusCompleted
		if err := o.store.UpdateCampaignPhaseFields(ctx, querier, campaignID, nil, &completedStatus); err != nil {
			o.deps.Logger.Warn(ctx, "Failed to clear current phase on completion", map[string]interface{}{
				"campaign_id": campaignID,
				"error":       err.Error(),
			})
		}
		// Broadcast CampaignCompleted SSE (even if user_id missing)
		if campaign, err := o.store.GetCampaignByID(ctx, querier, campaignID); err == nil && o.sseService != nil {
			meta := map[string]interface{}{
				"duration_ms":    now.Sub(execution.StartedAt).Milliseconds(),
				"overall_status": string(execution.OverallStatus),
			}
			if campaign.UserID != nil {
				evt := services.CreateCampaignCompletedEvent(campaignID, *campaign.UserID, meta)
				o.sseService.BroadcastToCampaign(campaignID, evt)
			} else {
				// fallback event without user context
				evt := services.SSEEvent{Event: services.SSEEventCampaignCompleted, CampaignID: &campaignID, Data: meta, Timestamp: time.Now()}
				o.sseService.BroadcastToCampaign(campaignID, evt)
			}
		}
	}

	// Trigger any post-completion workflows (feature-guarded)
	go o.runPostCompletionHooks(context.Background(), campaignID)

	// Metrics: campaign completion
	o.metrics.IncCampaignCompletions()

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
