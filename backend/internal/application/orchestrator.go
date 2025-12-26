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
	"sync/atomic"
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
	// ErrAnotherPhaseRunning indicates a different phase is already running for the campaign.
	ErrAnotherPhaseRunning = fmt.Errorf("another_phase_running")
	// ErrNoActivePhase indicates no phase is currently running for the campaign when a stop was requested.
	ErrNoActivePhase = fmt.Errorf("no_active_phase")
)

// OrchestratorErrorKind classifies how callers should treat an error returned by the orchestrator.
type OrchestratorErrorKind string

const (
	// OrchestratorErrorRecoverable signals the caller can retry after addressing the underlying issue (e.g., missing config).
	OrchestratorErrorRecoverable OrchestratorErrorKind = "recoverable"
	// OrchestratorErrorPhaseFatal indicates the active phase cannot continue without manual intervention.
	OrchestratorErrorPhaseFatal OrchestratorErrorKind = "phase_fatal"
	// OrchestratorErrorCampaignFatal indicates the broader campaign state is invalid (campaign missing, DB failure, etc.).
	OrchestratorErrorCampaignFatal OrchestratorErrorKind = "campaign_fatal"
)

// OrchestratorError wraps underlying failures with a semantic classification for upstream layers.
type OrchestratorError struct {
	Phase models.PhaseTypeEnum
	Kind  OrchestratorErrorKind
	Err   error
}

func (e *OrchestratorError) Error() string {
	if e == nil {
		return "<nil>"
	}
	base := e.Err
	if base == nil {
		return fmt.Sprintf("%s orchestrator error (phase=%s)", e.Kind, e.Phase)
	}
	return fmt.Sprintf("%s orchestrator error (phase=%s): %v", e.Kind, e.Phase, base)
}

func (e *OrchestratorError) Unwrap() error {
	if e == nil {
		return nil
	}
	return e.Err
}

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

	autoResumeOnRestart atomic.Bool

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

	// P1 Fix: Unified phase start guard to prevent auto-advance vs manual race.
	// Key format: "campaignID:phase". Set at StartPhaseInternal entry, cleared after Execute completes.
	// This ensures only one goroutine can start a specific phase at a time.
	phaseStartInProgress map[string]struct{}

	// P3.3: Idempotency cache for control operations (pause/resume/start/rerun)
	// Prevents duplicate SSE emissions on retry with same X-Idempotency-Key
	idempotencyCache *services.IdempotencyCache

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
	PhaseRunID    uuid.UUID                                            `json:"phase_run_id"`
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

func (o *CampaignOrchestrator) wrapPhaseError(phase models.PhaseTypeEnum, err error) error {
	if err == nil {
		return nil
	}
	kind := classifyOrchestratorError(err)
	return &OrchestratorError{Phase: phase, Kind: kind, Err: err}
}

func classifyOrchestratorError(err error) OrchestratorErrorKind {
	switch {
	case err == nil:
		return OrchestratorErrorRecoverable
	case errors.Is(err, ErrPhaseDependenciesNotMet),
		errors.Is(err, ErrMissingPhaseConfigs),
		errors.Is(err, errRehydratePhaseConfigMissing),
		errors.Is(err, errRehydratePhaseConfigInvalid),
		errors.Is(err, domainservices.ErrPhaseExecutionMissing),
		errors.Is(err, domainservices.ErrPhaseNotRunning),
		errors.Is(err, domainservices.ErrPhasePauseUnsupported),
		errors.Is(err, domainservices.ErrPhaseResumeUnsupported),
		errors.Is(err, context.Canceled):
		return OrchestratorErrorRecoverable
	case errors.Is(err, store.ErrNotFound):
		return OrchestratorErrorCampaignFatal
	default:
		return OrchestratorErrorPhaseFatal
	}
}

var restartablePhaseOrder = []models.PhaseTypeEnum{
	models.PhaseTypeDNSValidation,
	models.PhaseTypeHTTPKeywordValidation,
	models.PhaseTypeExtraction,
	models.PhaseTypeAnalysis,
	models.PhaseTypeEnrichment,
}

var campaignPhaseOrder = []models.PhaseTypeEnum{
	models.PhaseTypeDomainGeneration,
	models.PhaseTypeDNSValidation,
	models.PhaseTypeHTTPKeywordValidation,
	models.PhaseTypeExtraction,
	models.PhaseTypeAnalysis,
	models.PhaseTypeEnrichment,
}

func defaultPhaseStatus(campaignID uuid.UUID, phase models.PhaseTypeEnum) *domainservices.PhaseStatus {
	return &domainservices.PhaseStatus{
		CampaignID: campaignID,
		Phase:      phase,
		Status:     models.PhaseStatusNotStarted,
	}
}

func cloneTimePtr(src *time.Time) *time.Time {
	if src == nil {
		return nil
	}
	clone := *src
	return &clone
}

func derefInt64(v *int64) int64 {
	if v == nil {
		return 0
	}
	return *v
}

func derefFloat64(v *float64) float64 {
	if v == nil {
		return 0
	}
	return *v
}

func phaseStatusFromRow(campaignID uuid.UUID, row *models.CampaignPhase) *domainservices.PhaseStatus {
	if row == nil {
		return nil
	}
	status := defaultPhaseStatus(campaignID, row.PhaseType)
	status.Status = row.Status
	status.StartedAt = cloneTimePtr(row.StartedAt)
	status.CompletedAt = cloneTimePtr(row.CompletedAt)
	status.ItemsTotal = derefInt64(row.TotalItems)
	status.ItemsProcessed = derefInt64(row.ProcessedItems)
	status.ProgressPct = derefFloat64(row.ProgressPercentage)
	if row.ErrorMessage != nil {
		status.LastError = *row.ErrorMessage
	}
	return status
}

func clonePhaseStatus(status *domainservices.PhaseStatus) *domainservices.PhaseStatus {
	if status == nil {
		return nil
	}
	clone := *status
	clone.StartedAt = cloneTimePtr(status.StartedAt)
	clone.CompletedAt = cloneTimePtr(status.CompletedAt)
	if status.Configuration != nil {
		cfg := make(map[string]interface{}, len(status.Configuration))
		for k, v := range status.Configuration {
			cfg[k] = v
		}
		clone.Configuration = cfg
	}
	return &clone
}

func cloneExecution(exec *CampaignExecution) *CampaignExecution {
	if exec == nil {
		return nil
	}
	clone := &CampaignExecution{
		CampaignID:    exec.CampaignID,
		CurrentPhase:  exec.CurrentPhase,
		PhaseStatuses: make(map[models.PhaseTypeEnum]*domainservices.PhaseStatus, len(exec.PhaseStatuses)),
		StartedAt:     exec.StartedAt,
		CompletedAt:   nil,
		OverallStatus: exec.OverallStatus,
		LastError:     exec.LastError,
		PhaseRunID:    exec.PhaseRunID,
	}
	if exec.CompletedAt != nil {
		clone.CompletedAt = cloneTimePtr(exec.CompletedAt)
	}
	for phase, status := range exec.PhaseStatuses {
		clone.PhaseStatuses[phase] = clonePhaseStatus(status)
	}
	return clone
}

func (o *CampaignOrchestrator) runtimeExecutionSnapshot(campaignID uuid.UUID) *CampaignExecution {
	if o == nil {
		return nil
	}
	o.mu.RLock()
	exec, exists := o.campaignExecutions[campaignID]
	if !exists || exec == nil {
		o.mu.RUnlock()
		return nil
	}
	clone := cloneExecution(exec)
	o.mu.RUnlock()
	return clone
}

func mergeRuntimeState(base *CampaignExecution, runtimeExec *CampaignExecution) *CampaignExecution {
	if runtimeExec == nil {
		return base
	}
	if base == nil {
		return cloneExecution(runtimeExec)
	}
	if base.PhaseStatuses == nil {
		base.PhaseStatuses = make(map[models.PhaseTypeEnum]*domainservices.PhaseStatus)
	}
	for phase, status := range runtimeExec.PhaseStatuses {
		if status == nil {
			continue
		}
		if _, exists := base.PhaseStatuses[phase]; !exists {
			base.PhaseStatuses[phase] = clonePhaseStatus(status)
		}
	}
	if runtimeExec.PhaseRunID != uuid.Nil {
		base.PhaseRunID = runtimeExec.PhaseRunID
	}
	if base.LastError == "" && runtimeExec.LastError != "" {
		base.LastError = runtimeExec.LastError
	}
	if base.CurrentPhase == "" && runtimeExec.CurrentPhase != "" {
		base.CurrentPhase = runtimeExec.CurrentPhase
	}
	if base.StartedAt.IsZero() && !runtimeExec.StartedAt.IsZero() {
		base.StartedAt = runtimeExec.StartedAt
	}
	if base.CompletedAt == nil && runtimeExec.CompletedAt != nil {
		base.CompletedAt = cloneTimePtr(runtimeExec.CompletedAt)
	}
	return base
}

func (o *CampaignOrchestrator) refreshPhaseStatuses(ctx context.Context, exec *CampaignExecution) {
	if o == nil || exec == nil {
		return
	}
	if exec.PhaseStatuses == nil {
		exec.PhaseStatuses = make(map[models.PhaseTypeEnum]*domainservices.PhaseStatus)
	}
	for _, phase := range campaignPhaseOrder {
		if _, exists := exec.PhaseStatuses[phase]; !exists {
			exec.PhaseStatuses[phase] = defaultPhaseStatus(exec.CampaignID, phase)
		}
		fresh, err := o.getPhaseStatusRuntime(ctx, exec.CampaignID, phase)
		if err != nil || fresh == nil {
			continue
		}
		existing := exec.PhaseStatuses[phase]

		// If the store says the phase is paused, respect that state even if the runtime
		// still reports in_progress.
		if existing != nil && existing.Status == models.PhaseStatusPaused && fresh.Status == models.PhaseStatusInProgress {
			fresh.Status = models.PhaseStatusPaused
		}

		// Don't let a missing runtime execution ("not_started") overwrite a persisted paused/running/completed status.
		if existing == nil || existing.Status == models.PhaseStatusNotStarted || fresh.Status != models.PhaseStatusNotStarted {
			exec.PhaseStatuses[phase] = fresh
		}
	}
}

func (o *CampaignOrchestrator) snapshotExecutionFromStore(ctx context.Context, campaignID uuid.UUID) (*CampaignExecution, error) {
	if o == nil || o.store == nil || campaignID == uuid.Nil {
		return nil, nil
	}
	var exec store.Querier
	if querier, ok := o.deps.DB.(store.Querier); ok {
		exec = querier
	}
	campaign, err := o.store.GetCampaignByID(ctx, exec, campaignID)
	if err != nil {
		return nil, err
	}
	snapshot := &CampaignExecution{
		CampaignID:    campaign.ID,
		PhaseStatuses: make(map[models.PhaseTypeEnum]*domainservices.PhaseStatus, len(campaignPhaseOrder)),
		OverallStatus: models.PhaseStatusNotStarted,
	}
	if campaign.StartedAt != nil {
		snapshot.StartedAt = *campaign.StartedAt
	}
	if campaign.CompletedAt != nil {
		snapshot.CompletedAt = campaign.CompletedAt
	}
	if campaign.CurrentPhase != nil {
		snapshot.CurrentPhase = *campaign.CurrentPhase
	}
	if campaign.PhaseStatus != nil {
		snapshot.OverallStatus = *campaign.PhaseStatus
	}
	if campaign.ErrorMessage != nil {
		snapshot.LastError = *campaign.ErrorMessage
	}
	phases, err := o.store.GetCampaignPhases(ctx, exec, campaignID)
	if err != nil && !errors.Is(err, store.ErrNotFound) && !errors.Is(err, sql.ErrNoRows) {
		return nil, fmt.Errorf("failed to load campaign phases: %w", err)
	}
	for _, phase := range campaignPhaseOrder {
		snapshot.PhaseStatuses[phase] = defaultPhaseStatus(campaignID, phase)
	}
	for _, row := range phases {
		if row == nil {
			continue
		}
		if status := phaseStatusFromRow(campaignID, row); status != nil {
			snapshot.PhaseStatuses[row.PhaseType] = status
		}
	}
	if snapshot.CurrentPhase == "" {
		for _, phase := range campaignPhaseOrder {
			if st := snapshot.PhaseStatuses[phase]; st != nil {
				switch st.Status {
				case models.PhaseStatusInProgress, models.PhaseStatusPaused:
					snapshot.CurrentPhase = phase
				}
			}
			if snapshot.CurrentPhase != "" {
				break
			}
		}
	}
	return snapshot, nil
}

var errRehydratePhaseConfigMissing = errors.New("rehydration skipped: persisted phase configuration not found")

var errRehydratePhaseConfigInvalid = errors.New("rehydration skipped: persisted phase configuration invalid")

func isRestoreConfigValidationError(err error) bool {
	if err == nil {
		return false
	}
	msg := err.Error()
	// Conservative matching: only treat clearly validation-shaped errors as skippable
	// during restore. Anything else should still fail the rehydration attempt.
	return strings.Contains(msg, "invalid domain generation configuration") ||
		strings.Contains(msg, "invalid configuration type") ||
		strings.Contains(msg, "cannot be empty") ||
		strings.Contains(msg, "must be positive") ||
		strings.Contains(msg, "must ")
}

// phaseExecutionHandles tracks live phase executions across orchestrator instances so we can
// cancel stale workers (and drop their progress) when ownership changes after a restart.
var phaseExecutionHandles sync.Map // map[uuid.UUID]*phaseExecutionHandle

type phaseExecutionHandle struct {
	campaignID uuid.UUID
	phase      models.PhaseTypeEnum
	runID      uuid.UUID
	cancel     context.CancelFunc
}

func registerPhaseExecutionHandle(campaignID uuid.UUID, phase models.PhaseTypeEnum, cancel context.CancelFunc) uuid.UUID {
	runID := uuid.New()
	phaseExecutionHandles.Store(campaignID, &phaseExecutionHandle{
		campaignID: campaignID,
		phase:      phase,
		runID:      runID,
		cancel:     cancel,
	})
	return runID
}

func cancelPhaseExecutionHandle(ctx context.Context, campaignID uuid.UUID, phase models.PhaseTypeEnum, reason string, logger domainservices.Logger) bool {
	if value, ok := phaseExecutionHandles.LoadAndDelete(campaignID); ok {
		handle, _ := value.(*phaseExecutionHandle)
		if logger != nil {
			logger.Info(ctx, "phase.execution.cancelled", map[string]interface{}{
				"campaign_id": campaignID,
				"phase":       phase,
				"reason":      reason,
			})
		}
		if handle != nil && handle.cancel != nil {
			handle.cancel()
		}
		return true
	}
	return false
}

func clearPhaseExecutionHandle(campaignID uuid.UUID, runID uuid.UUID) {
	if value, ok := phaseExecutionHandles.Load(campaignID); ok {
		handle, _ := value.(*phaseExecutionHandle)
		if handle == nil {
			phaseExecutionHandles.Delete(campaignID)
			return
		}
		if runID == uuid.Nil || handle.runID == runID {
			phaseExecutionHandles.Delete(campaignID)
		}
	}
}

func isPhaseRunActive(campaignID uuid.UUID, runID uuid.UUID) bool {
	if runID == uuid.Nil {
		return true
	}
	if value, ok := phaseExecutionHandles.Load(campaignID); ok {
		handle, _ := value.(*phaseExecutionHandle)
		return handle != nil && handle.runID == runID
	}
	return false
}

func (o *CampaignOrchestrator) allowPhaseMutation(ctx context.Context, campaignID uuid.UUID, phase models.PhaseTypeEnum, runID uuid.UUID, action string, allowedStatuses ...models.PhaseStatusEnum) bool {
	statuses := allowedStatuses
	if len(statuses) == 0 {
		statuses = []models.PhaseStatusEnum{models.PhaseStatusInProgress}
	}
	if runID != uuid.Nil {
		active := isPhaseRunActive(campaignID, runID)
		if !active {
			matchesExecution := false
			if o != nil {
				o.mu.RLock()
				if exec, ok := o.campaignExecutions[campaignID]; ok && exec != nil && exec.PhaseRunID == runID {
					matchesExecution = true
				}
				o.mu.RUnlock()
			}
			if !matchesExecution {
				if o != nil && o.deps.Logger != nil {
					o.deps.Logger.Debug(ctx, "phase.state.guard.denied", map[string]interface{}{
						"campaign_id": campaignID,
						"phase":       phase,
						"action":      action,
						"reason":      "run_id_mismatch",
					})
				}
				return false
			}
		}
	}
	if o == nil || o.store == nil || o.deps.DB == nil {
		return true
	}
	querier, ok := o.deps.DB.(store.Querier)
	if !ok {
		return true
	}
	row, err := o.store.GetCampaignPhase(ctx, querier, campaignID, phase)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) || errors.Is(err, sql.ErrNoRows) {
			if o.deps.Logger != nil {
				o.deps.Logger.Debug(ctx, "phase.state.guard.denied", map[string]interface{}{
					"campaign_id": campaignID,
					"phase":       phase,
					"action":      action,
					"reason":      "phase_row_missing",
				})
			}
			return false
		}
		if o.deps.Logger != nil {
			o.deps.Logger.Warn(ctx, "phase.state.guard.lookup_failed", map[string]interface{}{
				"campaign_id": campaignID,
				"phase":       phase,
				"action":      action,
				"error":       err.Error(),
			})
		}
		return false
	}
	if !statusAllowed(row.Status, statuses) {
		if o.deps.Logger != nil {
			reason := fmt.Sprintf("status=%s", row.Status)
			if len(statuses) > 0 {
				reason = fmt.Sprintf("status=%s allowed=%v", row.Status, statuses)
			}
			o.deps.Logger.Debug(ctx, "phase.state.guard.denied", map[string]interface{}{
				"campaign_id": campaignID,
				"phase":       phase,
				"action":      action,
				"reason":      reason,
			})
		}
		return false
	}
	return true
}

func statusAllowed(status models.PhaseStatusEnum, allowed []models.PhaseStatusEnum) bool {
	for _, candidate := range allowed {
		if status == candidate {
			return true
		}
	}
	return false
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
	IncPhaseResumeAttempts()
	IncPhaseResumeSuccesses()
	IncPhaseResumeFailures()

	// Auto-start specific metrics
	IncAutoStartAttempts()
	IncAutoStartSuccesses()
	IncAutoStartFailures()
	RecordAutoStartLatency(d time.Duration)
	RecordFirstPhaseRunningLatency(d time.Duration)

	// Campaign mode tracking
	IncManualModeCreations()
	IncAutoModeCreations()

	// P3: Transition guard metrics
	IncTransitionBlocked()

	// P3.4: Bypass audit metrics
	IncTransitionBypass()
}

// noopMetrics provides no-op implementations when metrics are not configured.
type noopMetrics struct{}

func (n *noopMetrics) IncPhaseStarts()                              {}
func (n *noopMetrics) IncPhaseCompletions()                         {}
func (n *noopMetrics) IncPhaseFailures()                            {}
func (n *noopMetrics) IncPhaseAutoStarts()                          {}
func (n *noopMetrics) IncCampaignCompletions()                      {}
func (n *noopMetrics) RecordPhaseDuration(string, time.Duration)    {}
func (n *noopMetrics) IncPhaseResumeAttempts()                      {}
func (n *noopMetrics) IncPhaseResumeSuccesses()                     {}
func (n *noopMetrics) IncPhaseResumeFailures()                      {}
func (n *noopMetrics) IncAutoStartAttempts()                        {}
func (n *noopMetrics) IncAutoStartSuccesses()                       {}
func (n *noopMetrics) IncAutoStartFailures()                        {}
func (n *noopMetrics) RecordAutoStartLatency(time.Duration)         {}
func (n *noopMetrics) RecordFirstPhaseRunningLatency(time.Duration) {}
func (n *noopMetrics) IncManualModeCreations()                      {}
func (n *noopMetrics) IncAutoModeCreations()                        {}
func (n *noopMetrics) IncTransitionBlocked()                        {}
func (n *noopMetrics) IncTransitionBypass()                         {}

// ====================================================================
// P3.4 Contract: Bypass Audit System
// ====================================================================

// TransitionBypassAudit records when a status mutation bypasses the canonical transitionPhase() guard.
// All bypass points MUST call this function for observability and future migration tracking.
type TransitionBypassAudit struct {
	CampaignID uuid.UUID
	Phase      models.PhaseTypeEnum
	FromStatus models.PhaseStatusEnum
	ToStatus   models.PhaseStatusEnum
	Caller     string // function name that initiated the bypass
	Reason     string // why bypass is necessary (e.g., "runtime_coordination", "progress_sync")
	Timestamp  time.Time
}

// auditTransitionBypass logs and metrics-tracks when status is mutated outside transitionPhase().
// This is a P3.4 observability hook - all bypasses are recorded for eventual migration.
func (o *CampaignOrchestrator) auditTransitionBypass(ctx context.Context, audit TransitionBypassAudit) {
	if o.deps.Logger != nil {
		o.deps.Logger.Warn(ctx, "P3.4: Transition bypass detected", map[string]interface{}{
			"campaign_id": audit.CampaignID,
			"phase":       audit.Phase,
			"from_status": audit.FromStatus,
			"to_status":   audit.ToStatus,
			"caller":      audit.Caller,
			"reason":      audit.Reason,
			"timestamp":   audit.Timestamp,
		})
	}
	if o.metrics != nil {
		o.metrics.IncTransitionBypass()
	}
}

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
		store:                store,
		deps:                 deps,
		domainGenerationSvc:  domainGenerationSvc,
		dnsValidationSvc:     dnsValidationSvc,
		httpValidationSvc:    httpValidationSvc,
		extractionSvc:        extractionSvc,
		enrichmentSvc:        enrichmentSvc,
		analysisSvc:          analysisSvc,
		sseService:           sseService,
		metrics:              metrics,
		control:              newInMemoryPhaseControlManager(),
		campaignExecutions:   make(map[uuid.UUID]*CampaignExecution),
		phaseStartInProgress: make(map[string]struct{}),
		idempotencyCache:     services.NewIdempotencyCache(0), // P3.3: 5-minute TTL
		hooks:                make([]PostCompletionHook, 0),
	}
}

// ====================================================================
// P3 Contract: transitionPhase() – The Only Path to Mutate Phase Status
// ====================================================================

// TransitionResult captures the outcome of a phase transition for SSE emission.
type TransitionResult struct {
	CampaignID uuid.UUID
	Phase      models.PhaseTypeEnum
	FromState  models.PhaseStatusEnum
	ToState    models.PhaseStatusEnum
	Sequence   int64
	Idempotent bool // True if this was a no-op (already in target state)
}

// TransitionOptions provides optional parameters for transitionPhaseWithOpts (P3.2).
type TransitionOptions struct {
	// ExpectedState is the optional precondition. If set, the transition only proceeds
	// if current state matches. Returns 409 EXPECTED_STATE_MISMATCH on mismatch.
	// When nil, backward compatibility is maintained (no precondition check).
	ExpectedState *models.PhaseStatusEnum
}

// transitionPhase is the ONLY authorized path to mutate phase status.
// All lifecycle operations (start, pause, resume, complete, fail, rerun, retry, restore, stop)
// MUST flow through this function. Direct DB writes bypass the state machine and are blocked.
//
// Contract:
//   - Validates expected_state precondition if provided (P3.2)
//   - Validates transition via state machine (services.ValidateTransition)
//   - Persists status change to database
//   - Emits SSE event with sequence number
//   - Returns TransitionResult for caller if needed
//
// Returns:
//   - TransitionResult on success (including idempotent self-transitions)
//   - *services.TransitionError409 with EXPECTED_STATE_MISMATCH when expected_state fails (409)
//   - *services.PhaseTransitionError on invalid transition (caller should return 409)
//   - other error on persistence/emission failure
func (o *CampaignOrchestrator) transitionPhase(
	ctx context.Context,
	campaignID uuid.UUID,
	phase models.PhaseTypeEnum,
	from, to models.PhaseStatusEnum,
	trigger services.TransitionTrigger,
) (*TransitionResult, error) {
	return o.transitionPhaseWithOpts(ctx, campaignID, phase, from, to, trigger, nil)
}

// transitionPhaseWithOpts is the P3.2 extended version with optional expected_state precondition.
// When opts.ExpectedState is provided:
//   - If current state matches expected_state → proceed with transition
//   - If current state != expected_state → return 409 EXPECTED_STATE_MISMATCH
//   - If current state == target state (already there) → return idempotent 200, no new sequence
//
// When opts.ExpectedState is nil (backward compat):
//   - Normal state machine validation applies
func (o *CampaignOrchestrator) transitionPhaseWithOpts(
	ctx context.Context,
	campaignID uuid.UUID,
	phase models.PhaseTypeEnum,
	from, to models.PhaseStatusEnum,
	trigger services.TransitionTrigger,
	opts *TransitionOptions,
) (*TransitionResult, error) {
	action := string(trigger)

	// P3.2: expected_state precondition check
	if opts != nil && opts.ExpectedState != nil {
		expectedState := *opts.ExpectedState
		if from != expectedState {
			// Expected state mismatch → 409
			if o.deps.Logger != nil {
				o.deps.Logger.Warn(ctx, "P3.2: expected_state precondition failed", map[string]interface{}{
					"campaign_id":    campaignID,
					"phase":          phase,
					"current_state":  from,
					"expected_state": expectedState,
					"attempted":      action,
				})
			}
			if o.metrics != nil {
				o.metrics.IncTransitionBlocked()
			}
			return nil, services.NewExpectedStateMismatchError409(from, expectedState, action)
		}
	}

	// Self-transition is idempotent success (no DB write, no SSE)
	if from == to {
		if o.deps.Logger != nil {
			o.deps.Logger.Debug(ctx, "P3: Idempotent self-transition (no-op)", map[string]interface{}{
				"campaign_id": campaignID,
				"phase":       phase,
				"state":       from,
			})
		}
		return &TransitionResult{
			CampaignID: campaignID,
			Phase:      phase,
			FromState:  from,
			ToState:    to,
			Sequence:   0, // No new sequence for self-transition
			Idempotent: true,
		}, nil
	}

	// Validate transition via state machine
	if err := services.ValidateTransition(from, to, phase); err != nil {
		if o.deps.Logger != nil {
			o.deps.Logger.Warn(ctx, "P3: Transition blocked by state machine", map[string]interface{}{
				"campaign_id": campaignID,
				"phase":       phase,
				"from":        from,
				"to":          to,
				"trigger":     trigger,
				"error":       err.Error(),
			})
		}
		if o.metrics != nil {
			o.metrics.IncTransitionBlocked()
		}
		return nil, err
	}

	// Get querier for DB operations
	querier, ok := o.deps.DB.(store.Querier)
	if !ok {
		return nil, fmt.Errorf("invalid database interface in dependencies")
	}

	// Persist status change to database
	toStatus := to
	if err := o.store.UpdateCampaignPhaseFields(ctx, querier, campaignID, &phase, &toStatus); err != nil {
		return nil, fmt.Errorf("failed to persist phase transition: %w", err)
	}

	// Generate sequence number for SSE emission by recording a lifecycle event
	var seqNum int64
	if o.sseService != nil {
		// Get next sequence by incrementing from last known
		if lastSeq, err := o.store.GetLastLifecycleSequence(ctx, querier, campaignID); err == nil {
			seqNum = lastSeq + 1
		} else {
			seqNum = 1 // First event
		}
	}

	// Emit lifecycle event via SSE
	if o.sseService != nil {
		var userID *uuid.UUID
		if campaign, err := o.store.GetCampaignByID(ctx, querier, campaignID); err == nil && campaign.UserID != nil {
			userID = campaign.UserID
		}
		if userID != nil {
			evt := o.createTransitionEvent(campaignID, *userID, phase, from, to, trigger, seqNum)
			o.sseService.BroadcastToCampaign(campaignID, evt)
		}
	}

	if o.deps.Logger != nil {
		o.deps.Logger.Info(ctx, "P3: Phase transition completed", map[string]interface{}{
			"campaign_id": campaignID,
			"phase":       phase,
			"from":        from,
			"to":          to,
			"trigger":     trigger,
			"sequence":    seqNum,
		})
	}

	return &TransitionResult{
		CampaignID: campaignID,
		Phase:      phase,
		FromState:  from,
		ToState:    to,
		Sequence:   seqNum,
	}, nil
}

// createTransitionEvent builds the appropriate SSE event for a transition.
func (o *CampaignOrchestrator) createTransitionEvent(
	campaignID, userID uuid.UUID,
	phase models.PhaseTypeEnum,
	from, to models.PhaseStatusEnum,
	trigger services.TransitionTrigger,
	sequence int64,
) services.SSEEvent {
	switch trigger {
	case services.TriggerStart:
		return services.CreatePhaseStartedEventWithSequence(campaignID, userID, phase, sequence)
	case services.TriggerPause:
		return services.CreatePhasePausedEventWithSequence(campaignID, userID, phase, sequence)
	case services.TriggerResume:
		return services.CreatePhaseResumedEventWithSequence(campaignID, userID, phase, sequence)
	case services.TriggerComplete:
		return services.CreatePhaseCompletedEventWithSequence(campaignID, userID, phase, sequence, nil)
	case services.TriggerFail:
		return services.CreatePhaseFailedEventWithSequence(campaignID, userID, phase, sequence, "phase failed")
	case services.TriggerRerun, services.TriggerRetry:
		return services.CreatePhaseStartedEventWithSequence(campaignID, userID, phase, sequence)
	default:
		// Generic lifecycle event for unknown triggers
		return services.CreatePhaseStartedEventWithSequence(campaignID, userID, phase, sequence)
	}
}

// getCurrentPhaseStatus fetches the current phase status from the database.
// This is the authoritative source for transition validation.
func (o *CampaignOrchestrator) getCurrentPhaseStatus(ctx context.Context, campaignID uuid.UUID, phase models.PhaseTypeEnum) (models.PhaseStatusEnum, error) {
	querier, ok := o.deps.DB.(store.Querier)
	if !ok {
		return models.PhaseStatusNotStarted, fmt.Errorf("invalid database interface")
	}

	row, err := o.store.GetCampaignPhase(ctx, querier, campaignID, phase)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return models.PhaseStatusNotStarted, nil
		}
		return models.PhaseStatusNotStarted, err
	}
	if row == nil {
		return models.PhaseStatusNotStarted, nil
	}
	return row.Status, nil
}

// transitionPhaseDirect is DEPRECATED as of P3 Final.
// All lifecycle mutations now go through transitionPhase() or specialized paths
// (PausePhase/ResumePhase) that validate + persist + emit SSE atomically.
//
// This function is kept for reference but has no callers.
// It validated transitions via state machine but allowed callers to handle their own persistence.
//
// P3 Migration Complete:
// - recordCampaignStop: now uses transitionPhase()
// - PausePhase/ResumePhase: use ValidateTransition + store.PausePhase/ResumePhase + RecordLifecycleEvent
//
// Deprecated: Use transitionPhase() instead.
func (o *CampaignOrchestrator) transitionPhaseDirect(
	ctx context.Context,
	campaignID uuid.UUID,
	phase models.PhaseTypeEnum,
	from, to models.PhaseStatusEnum,
	caller string,
) error {
	// P3 Final: Log deprecation warning - this path should never be hit
	if o.deps.Logger != nil {
		o.deps.Logger.Warn(ctx, "DEPRECATED: transitionPhaseDirect called - should use transitionPhase()", map[string]interface{}{
			"campaign_id": campaignID,
			"phase":       phase,
			"from":        from,
			"to":          to,
			"caller":      caller,
		})
	}

	// Self-transition is idempotent
	if from == to {
		return nil
	}

	// Validate via state machine
	if err := services.ValidateTransition(from, to, phase); err != nil {
		if o.deps.Logger != nil {
			o.deps.Logger.Warn(ctx, "P3: Direct transition blocked by state machine", map[string]interface{}{
				"campaign_id": campaignID,
				"phase":       phase,
				"from":        from,
				"to":          to,
				"caller":      caller,
				"error":       err.Error(),
			})
		}
		if o.metrics != nil {
			o.metrics.IncTransitionBlocked()
		}
		return err
	}

	// P3.4: Audit this bypass for migration tracking
	o.auditTransitionBypass(ctx, TransitionBypassAudit{
		CampaignID: campaignID,
		Phase:      phase,
		FromStatus: from,
		ToStatus:   to,
		Caller:     caller,
		Reason:     "transitionPhaseDirect_DEPRECATED",
		Timestamp:  time.Now(),
	})

	return nil
}

// SetAutoResumeOnRestart toggles whether RestoreInFlightPhases should restart active phases automatically.
func (o *CampaignOrchestrator) SetAutoResumeOnRestart(enabled bool) {
	if o == nil {
		return
	}
	o.autoResumeOnRestart.Store(enabled)
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

// ScoreBreakdown returns the component scores for a specific domain in a campaign.
// This is used by the API to provide transparency into how scores are computed.
// Returns (breakdown map, error). On error returns nil breakdown with descriptive error.
func (o *CampaignOrchestrator) ScoreBreakdown(ctx context.Context, campaignID uuid.UUID, domain string) (map[string]float64, error) {
	if o == nil || o.analysisSvc == nil {
		return nil, fmt.Errorf("analysis service unavailable")
	}
	return o.analysisSvc.ScoreBreakdown(ctx, campaignID, domain)
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
		return o.wrapPhaseError(phase, fmt.Errorf("failed to get service for phase %s: %w", phase, err))
	}

	// Configure the phase using the domain service
	if err := service.Configure(ctx, campaignID, config); err != nil {
		return o.wrapPhaseError(phase, fmt.Errorf("failed to configure phase %s: %w", phase, err))
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
	return o.startPhaseInternalImpl(ctx, campaignID, phase, nil)
}

// startPhaseInternalImpl is the internal implementation that accepts optional control options.
func (o *CampaignOrchestrator) startPhaseInternalImpl(ctx context.Context, campaignID uuid.UUID, phase models.PhaseTypeEnum, opts *ControlOptions) error {
	o.deps.Logger.Info(ctx, "Starting campaign phase", map[string]interface{}{
		"campaign_id": campaignID,
		"phase":       phase,
	})

	// REQUIREMENT #4: Idempotency for already-completed phases.
	// If StartPhaseInternal is called for a phase already marked Completed in DB,
	// we must no-op and immediately trigger auto-advance to the next phase.
	// This ensures we never rely on timing - DB is authoritative.
	if querier, ok := o.deps.DB.(store.Querier); ok {
		if dbPhase, err := o.store.GetCampaignPhase(ctx, querier, campaignID, phase); err == nil && dbPhase != nil {
			if dbPhase.Status == models.PhaseStatusCompleted {
				o.deps.Logger.Info(ctx, "startPhaseInternal.phase_already_completed", map[string]interface{}{
					"campaign_id": campaignID,
					"phase":       phase,
					"action":      "triggering_auto_advance",
				})
				// Trigger auto-advance to the next phase asynchronously
				go func() {
					advCtx := context.Background()
					mode, _ := o.store.GetCampaignMode(advCtx, querier, campaignID)
					if mode != "full_sequence" {
						o.deps.Logger.Debug(advCtx, "startPhaseInternal.skip_auto_advance_not_full_sequence", map[string]interface{}{
							"campaign_id": campaignID,
							"phase":       phase,
							"mode":        mode,
						})
						return
					}
					if o.isLastPhase(phase) {
						_ = o.HandleCampaignCompletion(advCtx, campaignID)
						return
					}
					if next, ok := o.nextPhase(phase); ok {
						o.deps.Logger.Info(advCtx, "startPhaseInternal.auto_advancing_from_completed", map[string]interface{}{
							"campaign_id": campaignID,
							"from_phase":  phase,
							"to_phase":    next,
						})
						if err := o.StartPhaseInternal(advCtx, campaignID, next); err != nil {
							o.deps.Logger.Error(advCtx, "startPhaseInternal.auto_advance_failed", err, map[string]interface{}{
								"campaign_id": campaignID,
								"from_phase":  phase,
								"to_phase":    next,
							})
						}
					}
				}()
				return nil // No-op for the already completed phase
			}
		}
	}

	// P1 Fix: Unified phase start guard to prevent auto-advance vs manual race.
	// This check+set must be atomic to prevent both callers from proceeding.
	startKey := campaignID.String() + ":" + string(phase)
	o.mu.Lock()
	if _, inProgress := o.phaseStartInProgress[startKey]; inProgress {
		o.mu.Unlock()
		o.deps.Logger.Debug(ctx, "Phase start already in progress (race prevented)", map[string]interface{}{
			"campaign_id": campaignID,
			"phase":       phase,
		})
		return nil // Idempotent: another goroutine is already starting this phase
	}
	o.phaseStartInProgress[startKey] = struct{}{}
	o.mu.Unlock()

	// Ensure we clear the guard when this function returns (success or failure)
	defer func() {
		o.mu.Lock()
		delete(o.phaseStartInProgress, startKey)
		o.mu.Unlock()
	}()

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
		return o.wrapPhaseError(phase, fmt.Errorf("invalid database interface in dependencies"))
	}

	// Enforce campaign-level exclusivity: only one phase may be running at a time.
	if active, err := o.findRunningPhase(ctx, querier, campaignID); err != nil {
		return o.wrapPhaseError(phase, err)
	} else if active != nil && active.PhaseType != phase {
		return o.wrapPhaseError(phase, fmt.Errorf("%w: campaign %s already running %s", ErrAnotherPhaseRunning, campaignID, active.PhaseType))
	}

	campaign, err := o.store.GetCampaignByID(ctx, querier, campaignID)
	if err != nil {
		return o.wrapPhaseError(phase, fmt.Errorf("failed to get campaign for SSE broadcasting: %w", err))
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
			return o.wrapPhaseError(phase, &MissingPhaseConfigsError{Missing: missingList})
		}
	}

	if err := o.ensurePhaseDependencies(ctx, querier, campaignID, phase); err != nil {
		return o.wrapPhaseError(phase, err)
	}

	if err := o.ensurePhaseDefaultConfig(ctx, querier, campaignID, phase); err != nil {
		return o.wrapPhaseError(phase, fmt.Errorf("failed to ensure default configuration for %s: %w", phase, err))
	}

	// Broadcast phase started event will occur after successful Execute

	// Get the appropriate domain service for the phase
	service, err := o.getPhaseService(phase)
	if err != nil {
		return o.wrapPhaseError(phase, fmt.Errorf("failed to get service for phase %s: %w", phase, err))
	}

	// Ensure the domain service has an up-to-date configuration snapshot before execution.
	if err := o.hydratePhaseConfiguration(ctx, querier, campaignID, phase, service); err != nil {
		return o.wrapPhaseError(phase, err)
	}

	// IMPORTANT: Decouple long-running phase execution from the request context
	// and keep a cancel handle so we can terminate stale workers during a restart.
	execCtx, cancelFn := context.WithCancel(context.Background())
	runID := registerPhaseExecutionHandle(campaignID, phase, cancelFn)
	execCtx = domainservices.WithPhaseRun(execCtx, domainservices.PhaseRunContext{
		CampaignID: campaignID,
		Phase:      phase,
		RunID:      runID,
	})

	// Wire runtime control channel before kick-off when supported
	o.attachControlChannel(ctx, campaignID, phase, service)

	// Start phase execution with background-derived context
	progressCh, err := service.Execute(execCtx, campaignID)
	if err != nil {
		cancelPhaseExecutionHandle(ctx, campaignID, phase, "execute_failed", o.deps.Logger)
		// Broadcast phase failed event
		if o.sseService != nil && cachedUserID != nil {
			phaseFailedEvent := services.CreatePhaseFailedEvent(campaignID, *cachedUserID, phase, err.Error())
			o.sseService.BroadcastToCampaign(campaignID, phaseFailedEvent)
		}
		// Metrics: failed start counts as a phase failure
		o.metrics.IncPhaseFailures()
		return o.wrapPhaseError(phase, fmt.Errorf("failed to start phase %s: %w", phase, err))
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
			PhaseRunID:    runID,
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
		execution.PhaseRunID = runID
	}
	o.mu.Unlock()

	// Monitor phase progress in a separate goroutine using the same background context
	go o.monitorPhaseProgress(execCtx, campaignID, phase, progressCh, runID)

	o.deps.Logger.Info(ctx, "Phase started successfully", map[string]interface{}{
		"campaign_id": campaignID,
		"phase":       phase,
	})

	// P3.3: Cache successful result for idempotency
	if opts != nil && opts.IdempotencyKey != "" && o.idempotencyCache != nil {
		o.idempotencyCache.Set(opts.IdempotencyKey, nil, nil)
		o.deps.Logger.Debug(ctx, "P3.3: Cached start result", map[string]interface{}{
			"campaign_id":     campaignID,
			"phase":           phase,
			"idempotency_key": opts.IdempotencyKey,
		})
	}

	return nil
}

// StartPhaseInternalWithOpts starts a phase with optional idempotency key (P3.3).
func (o *CampaignOrchestrator) StartPhaseInternalWithOpts(ctx context.Context, campaignID uuid.UUID, phase models.PhaseTypeEnum, opts *ControlOptions) error {
	// P3.3: Check idempotency cache first
	if opts != nil && opts.IdempotencyKey != "" && o.idempotencyCache != nil {
		if cached := o.idempotencyCache.Get(opts.IdempotencyKey); cached != nil {
			o.deps.Logger.Debug(ctx, "P3.3: Returning cached start result (idempotent)", map[string]interface{}{
				"campaign_id":     campaignID,
				"phase":           phase,
				"idempotency_key": opts.IdempotencyKey,
				"cached_at":       cached.CreatedAt,
			})
			return cached.Error // nil for success, error for failure
		}
	}

	// Delegate to existing implementation which now handles caching at the end
	return o.startPhaseInternalImpl(ctx, campaignID, phase, opts)
}

// findRunningPhase returns the currently running phase for a campaign (status=in_progress) if any.
func (o *CampaignOrchestrator) findRunningPhase(ctx context.Context, exec store.Querier, campaignID uuid.UUID) (*models.CampaignPhase, error) {
	if o == nil || o.store == nil || exec == nil {
		return nil, fmt.Errorf("campaign store not initialized")
	}
	// Canonical source of truth for the currently running phase is the campaign row.
	// campaign_phases may not be updated for in-progress execution in all paths.
	if campaign, err := o.store.GetCampaignByID(ctx, exec, campaignID); err == nil && campaign != nil {
		if campaign.PhaseStatus != nil && *campaign.PhaseStatus == models.PhaseStatusInProgress && campaign.CurrentPhase != nil {
			return &models.CampaignPhase{PhaseType: *campaign.CurrentPhase, Status: models.PhaseStatusInProgress}, nil
		}
	}
	phases, err := o.store.GetCampaignPhases(ctx, exec, campaignID)
	if err != nil && !errors.Is(err, store.ErrNotFound) {
		return nil, fmt.Errorf("failed to load campaign phases: %w", err)
	}
	for _, phase := range phases {
		if phase == nil {
			continue
		}
		if phase.Status == models.PhaseStatusInProgress {
			return phase, nil
		}
	}
	return nil, nil
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
			if errors.Is(err, errRehydratePhaseConfigMissing) || errors.Is(err, errRehydratePhaseConfigInvalid) {
				continue
			}
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

func (o *CampaignOrchestrator) hydratePhaseConfigurationForRestore(ctx context.Context, exec store.Querier, campaignID uuid.UUID, phase models.PhaseTypeEnum, service domainservices.PhaseService) error {
	err := o.hydratePhaseConfiguration(ctx, exec, campaignID, phase, service)
	if err == nil {
		return nil
	}
	if errors.Is(err, errRehydratePhaseConfigMissing) {
		return err
	}
	// Missing persisted config should be skip-only during restore and never auto-start.
	if errors.Is(err, errPhaseConfigMissing) || errors.Is(err, store.ErrNotFound) {
		if o.deps.Logger != nil {
			o.deps.Logger.Warn(ctx, "campaign.rehydrate.phase.skip_config_missing", map[string]interface{}{
				"campaign_id": campaignID,
				"phase":       phase,
				"error":       err.Error(),
			})
		}
		return errRehydratePhaseConfigMissing
	}
	if isRestoreConfigValidationError(err) {
		if o.deps.Logger != nil {
			o.deps.Logger.Warn(ctx, "campaign.rehydrate.phase.skip_config_invalid", map[string]interface{}{
				"campaign_id": campaignID,
				"phase":       phase,
				"error":       err.Error(),
			})
		}
		return errRehydratePhaseConfigInvalid
	}
	return err
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
	// Reclaim ownership by cancelling any previously registered execution handle so stale goroutines stop emitting progress.
	cancelPhaseExecutionHandle(ctx, campaign.ID, phase, "restore_reclaim_execution", o.deps.Logger)
	originalStatus := models.PhaseStatusEnum("")
	if campaign.PhaseStatus != nil {
		originalStatus = *campaign.PhaseStatus
	}
	reason := "restore_state"
	if !o.autoResumeOnRestart.Load() {
		reason = "auto_resume_disabled"
	}
	if err := o.deferPhaseRestart(ctx, exec, campaign, phase, reason); err != nil {
		return err
	}
	service, err := o.getPhaseService(phase)
	if err != nil {
		return o.wrapPhaseError(phase, fmt.Errorf("failed to get service for phase %s during restore: %w", phase, err))
	}
	if err := o.hydratePhaseConfigurationForRestore(ctx, exec, campaign.ID, phase, service); err != nil {
		return err
	}
	o.attachControlChannel(ctx, campaign.ID, phase, service)
	if !o.autoResumeOnRestart.Load() {
		return nil
	}
	if originalStatus != models.PhaseStatusInProgress {
		if o.deps.Logger != nil {
			o.deps.Logger.Info(ctx, "campaign.rehydrate.autoresume.skip", map[string]interface{}{
				"campaign_id": campaign.ID,
				"phase":       phase,
				"reason":      "phase_not_in_progress",
				"status":      originalStatus,
			})
		}
		return nil
	}
	return o.resumePhaseAfterRestore(ctx, exec, campaign, phase)
}

func (o *CampaignOrchestrator) deferPhaseRestart(ctx context.Context, exec store.Querier, campaign *models.LeadGenerationCampaign, phase models.PhaseTypeEnum, reason string) error {
	if o == nil || campaign == nil {
		return nil
	}
	status := "unknown"
	if campaign.PhaseStatus != nil {
		status = string(*campaign.PhaseStatus)
	}
	if reason == "" {
		reason = "auto_resume_disabled"
	}
	if o.deps.Logger != nil {
		o.deps.Logger.Info(ctx, "campaign.rehydrate.phase.defer_resume", map[string]interface{}{
			"campaign_id": campaign.ID,
			"phase":       phase,
			"status":      status,
			"reason":      reason,
		})
	}
	paused := models.PhaseStatusPaused
	if o.store != nil && exec != nil {
		if err := o.store.UpdateCampaignPhaseFields(ctx, exec, campaign.ID, &phase, &paused); err != nil {
			return o.wrapPhaseError(phase, fmt.Errorf("failed to pause %s after restart: %w", phase, err))
		}
		if err := o.store.UpdateCampaignStatus(ctx, exec, campaign.ID, paused, sql.NullString{}); err != nil {
			return o.wrapPhaseError(phase, fmt.Errorf("failed to update campaign %s status after restart: %w", campaign.ID, err))
		}
		if err := o.persistCampaignState(ctx, exec, campaign.ID, models.CampaignStatePaused); err != nil && o.deps.Logger != nil {
			o.deps.Logger.Warn(ctx, "campaign.rehydrate.phase.defer.persist_state_failed", map[string]interface{}{
				"campaign_id": campaign.ID,
				"phase":       phase,
				"error":       err.Error(),
			})
		}
	}
	campaign.PhaseStatus = &paused
	pausedStatus := models.PhaseStatusPaused
	o.mu.Lock()
	execState, exists := o.campaignExecutions[campaign.ID]
	if !exists {
		execState = &CampaignExecution{
			CampaignID:    campaign.ID,
			CurrentPhase:  phase,
			PhaseStatuses: make(map[models.PhaseTypeEnum]*domainservices.PhaseStatus),
			OverallStatus: pausedStatus,
		}
		o.campaignExecutions[campaign.ID] = execState
	} else {
		execState.CurrentPhase = phase
		execState.OverallStatus = pausedStatus
	}
	if execState.PhaseStatuses == nil {
		execState.PhaseStatuses = make(map[models.PhaseTypeEnum]*domainservices.PhaseStatus)
	}
	execState.PhaseStatuses[phase] = &domainservices.PhaseStatus{Status: pausedStatus}
	execState.LastError = ""
	o.mu.Unlock()
	return nil
}

func (o *CampaignOrchestrator) resumePhaseAfterRestore(ctx context.Context, exec store.Querier, campaign *models.LeadGenerationCampaign, phase models.PhaseTypeEnum) error {
	if o.metrics != nil {
		o.metrics.IncPhaseResumeAttempts()
	}
	if phaseRequiresPersistedConfig(phase) {
		hasConfig, err := o.hasPersistedPhaseConfig(ctx, exec, campaign.ID, phase)
		if err != nil {
			if o.metrics != nil {
				o.metrics.IncPhaseResumeFailures()
			}
			return o.wrapPhaseError(phase, fmt.Errorf("failed to verify stored configuration for %s: %w", phase, err))
		}
		if !hasConfig {
			if o.deps.Logger != nil {
				o.deps.Logger.Warn(ctx, "campaign.rehydrate.phase.skip_config_missing", map[string]interface{}{
					"campaign_id": campaign.ID,
					"phase":       phase,
				})
			}
			if o.metrics != nil {
				o.metrics.IncPhaseResumeFailures()
			}
			return errRehydratePhaseConfigMissing
		}
	}
	if o.deps.Logger != nil {
		o.deps.Logger.Info(ctx, "campaign.rehydrate.autoresume.start", map[string]interface{}{
			"campaign_id": campaign.ID,
			"phase":       phase,
		})
	}
	if err := o.StartPhaseInternal(ctx, campaign.ID, phase); err != nil {
		if o.metrics != nil {
			o.metrics.IncPhaseResumeFailures()
		}
		return o.wrapPhaseError(phase, fmt.Errorf("failed to restart phase %s: %w", phase, err))
	}
	if o.metrics != nil {
		o.metrics.IncPhaseResumeSuccesses()
	}
	return nil
}

func phaseRequiresPersistedConfig(phase models.PhaseTypeEnum) bool {
	switch phase {
	case models.PhaseTypeDomainGeneration, models.PhaseTypeDNSValidation, models.PhaseTypeHTTPKeywordValidation:
		return true
	default:
		return false
	}
}

func (o *CampaignOrchestrator) hasPersistedPhaseConfig(ctx context.Context, exec store.Querier, campaignID uuid.UUID, phase models.PhaseTypeEnum) (bool, error) {
	payload, err := o.loadPhaseConfigurationPayload(ctx, exec, campaignID, phase)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) || errors.Is(err, errPhaseConfigMissing) {
			return false, nil
		}
		return false, err
	}
	return len(payload) > 0, nil
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
	runtimeStatus, runtimeErr := o.getPhaseStatusRuntime(ctx, campaignID, phase)

	// Prefer persisted campaign phase state when available (survives restarts).
	if o == nil || o.store == nil {
		return runtimeStatus, runtimeErr
	}
	if o.deps.DB == nil {
		return runtimeStatus, runtimeErr
	}
	querier, ok := o.deps.DB.(store.Querier)
	if !ok || querier == nil {
		return runtimeStatus, runtimeErr
	}

	row, err := o.store.GetCampaignPhase(ctx, querier, campaignID, phase)
	if err != nil || row == nil {
		return runtimeStatus, runtimeErr
	}

	storeStatus := phaseStatusFromRow(campaignID, row)
	if storeStatus != nil {
		// Hydrate persisted configuration so API clients can discover runtime control capabilities.
		if payload, cfgErr := o.loadPhaseConfigurationPayload(ctx, querier, campaignID, phase); cfgErr == nil && len(payload) > 0 {
			var cfg map[string]interface{}
			if jsonErr := json.Unmarshal(payload, &cfg); jsonErr == nil {
				storeStatus.Configuration = cfg
			}
		}
	}

	// Ensure runtime control capabilities are available even when a phase has no in-memory execution
	// and the persisted config payload doesn't include runtime_controls.
	if service, svcErr := o.getPhaseService(phase); svcErr == nil && service != nil {
		// Many services expose Capabilities() without implementing the full PhaseController
		// (pause/resume is handled via the orchestrator control bus).
		type capabilityProvider interface {
			Capabilities() domainservices.PhaseControlCapabilities
		}
		supported := true
		var caps domainservices.PhaseControlCapabilities
		switch v := service.(type) {
		case domainservices.PhaseController:
			caps = v.Capabilities()
		case capabilityProvider:
			caps = v.Capabilities()
		default:
			supported = false
		}
		if supported {
			if storeStatus != nil {
				if storeStatus.Configuration == nil {
					storeStatus.Configuration = make(map[string]interface{}, 1)
				}
				if _, ok := storeStatus.Configuration["runtime_controls"]; !ok {
					storeStatus.Configuration["runtime_controls"] = caps
				}
			}
			if runtimeStatus != nil {
				if runtimeStatus.Configuration == nil {
					runtimeStatus.Configuration = make(map[string]interface{}, 1)
				}
				if _, ok := runtimeStatus.Configuration["runtime_controls"]; !ok {
					runtimeStatus.Configuration["runtime_controls"] = caps
				}
			}
		}
	}

	// If runtime has no execution, don't let it hide a persisted pause/resume state.
	if runtimeStatus == nil {
		return storeStatus, nil
	}
	if storeStatus == nil {
		return runtimeStatus, runtimeErr
	}

	if runtimeStatus.Status == models.PhaseStatusNotStarted && storeStatus.Status != models.PhaseStatusNotStarted {
		return storeStatus, nil
	}

	// If the store says the phase is paused, respect that state even if the runtime
	// still reports in_progress (e.g. during shutdown or race condition).
	if storeStatus.Status == models.PhaseStatusPaused && runtimeStatus.Status == models.PhaseStatusInProgress {
		return storeStatus, nil
	}

	// Merge persisted runtime_controls into the runtime status when runtime is missing them.
	if storeStatus.Configuration != nil {
		if runtimeStatus.Configuration == nil {
			runtimeStatus.Configuration = make(map[string]interface{}, len(storeStatus.Configuration))
		}
		if _, ok := runtimeStatus.Configuration["runtime_controls"]; !ok {
			if rc, ok := storeStatus.Configuration["runtime_controls"]; ok {
				runtimeStatus.Configuration["runtime_controls"] = rc
			}
		}
	}

	return runtimeStatus, runtimeErr
}

// getPhaseStatusRuntime returns phase status from the in-memory phase service.
// This reflects the current process' view and may report "not_started" after a restart.
func (o *CampaignOrchestrator) getPhaseStatusRuntime(ctx context.Context, campaignID uuid.UUID, phase models.PhaseTypeEnum) (*domainservices.PhaseStatus, error) {
	service, err := o.getPhaseService(phase)
	if err != nil {
		return nil, fmt.Errorf("failed to get service for phase %s: %w", phase, err)
	}
	return service.GetStatus(ctx, campaignID)
}

// GetCampaignStatus returns the overall status of a campaign
func (o *CampaignOrchestrator) GetCampaignStatus(ctx context.Context, campaignID uuid.UUID) (*CampaignExecution, error) {
	snapshot, snapErr := o.snapshotExecutionFromStore(ctx, campaignID)
	if snapErr != nil && !errors.Is(snapErr, store.ErrNotFound) && !errors.Is(snapErr, sql.ErrNoRows) {
		return nil, snapErr
	}
	runtimeExec := o.runtimeExecutionSnapshot(campaignID)
	var execution *CampaignExecution
	switch {
	case snapshot != nil:
		execution = snapshot
	case runtimeExec != nil:
		execution = runtimeExec
	default:
		execution = &CampaignExecution{
			CampaignID:    campaignID,
			PhaseStatuses: make(map[models.PhaseTypeEnum]*domainservices.PhaseStatus),
			OverallStatus: models.PhaseStatusNotStarted,
		}
	}
	execution = mergeRuntimeState(execution, runtimeExec)
	o.refreshPhaseStatuses(ctx, execution)
	return execution, nil
}

// CancelPhase stops execution of a specific phase
func (o *CampaignOrchestrator) CancelPhase(ctx context.Context, campaignID uuid.UUID, phase models.PhaseTypeEnum) error {
	return o.cancelPhaseImpl(ctx, campaignID, phase, nil)
}

// cancelPhaseImpl is the internal implementation that accepts optional control options.
func (o *CampaignOrchestrator) cancelPhaseImpl(ctx context.Context, campaignID uuid.UUID, phase models.PhaseTypeEnum, opts *ControlOptions) error {
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

	// P3.3: Cache successful result for idempotency
	if opts != nil && opts.IdempotencyKey != "" && o.idempotencyCache != nil {
		o.idempotencyCache.Set(opts.IdempotencyKey, nil, nil)
		o.deps.Logger.Debug(ctx, "P3.3: Cached cancel result", map[string]interface{}{
			"campaign_id":     campaignID,
			"phase":           phase,
			"idempotency_key": opts.IdempotencyKey,
		})
	}

	return nil
}

// CancelPhaseWithOpts stops a phase with optional idempotency key (P3.3).
func (o *CampaignOrchestrator) CancelPhaseWithOpts(ctx context.Context, campaignID uuid.UUID, phase models.PhaseTypeEnum, opts *ControlOptions) error {
	// P3.3: Check idempotency cache first
	if opts != nil && opts.IdempotencyKey != "" && o.idempotencyCache != nil {
		if cached := o.idempotencyCache.Get(opts.IdempotencyKey); cached != nil {
			o.deps.Logger.Debug(ctx, "P3.3: Returning cached cancel result (idempotent)", map[string]interface{}{
				"campaign_id":     campaignID,
				"phase":           phase,
				"idempotency_key": opts.IdempotencyKey,
				"cached_at":       cached.CreatedAt,
			})
			return cached.Error // nil for success, error for failure
		}
	}

	// Delegate to implementation which caches at end
	return o.cancelPhaseImpl(ctx, campaignID, phase, opts)
}

// ControlOptions provides optional parameters for control operations (P3.2, P3.3).
type ControlOptions struct {
	// ExpectedState is the optional precondition. If set, the operation only proceeds
	// if current state matches. Returns 409 EXPECTED_STATE_MISMATCH on mismatch.
	// When nil, backward compatibility is maintained (no precondition check).
	ExpectedState *models.PhaseStatusEnum

	// IdempotencyKey is the optional key for duplicate request detection (P3.3).
	// If set and a cached result exists for this key, returns cached result without
	// emitting a new SSE sequence. Keys expire after 5 minutes.
	IdempotencyKey string
}

// IdempotentResult represents a cached control operation result (P3.3).
type IdempotentResult struct {
	Status     *domainservices.PhaseStatus
	FromCache  bool
	CachedAt   time.Time
	Idempotent bool
}

// PausePhase transitions an in-progress phase to paused and halts execution.
func (o *CampaignOrchestrator) PausePhase(ctx context.Context, campaignID uuid.UUID, phase models.PhaseTypeEnum) error {
	return o.PausePhaseWithOpts(ctx, campaignID, phase, nil)
}

// PausePhaseWithOpts transitions an in-progress phase to paused with optional expected_state (P3.2) and idempotency (P3.3).
func (o *CampaignOrchestrator) PausePhaseWithOpts(ctx context.Context, campaignID uuid.UUID, phase models.PhaseTypeEnum, opts *ControlOptions) error {
	// P3.3: Check idempotency cache first
	if opts != nil && opts.IdempotencyKey != "" && o.idempotencyCache != nil {
		if cached := o.idempotencyCache.Get(opts.IdempotencyKey); cached != nil {
			o.deps.Logger.Debug(ctx, "P3.3: Returning cached pause result (idempotent)", map[string]interface{}{
				"campaign_id":     campaignID,
				"phase":           phase,
				"idempotency_key": opts.IdempotencyKey,
				"cached_at":       cached.CreatedAt,
			})
			return cached.Error // nil for success, error for failure
		}
	}

	if o.store == nil {
		return fmt.Errorf("campaign store not initialized")
	}
	querier, ok := o.deps.DB.(store.Querier)
	if !ok {
		return fmt.Errorf("invalid database interface in dependencies")
	}

	// P2: State machine validation - check current state before attempting pause
	var currentStatus models.PhaseStatusEnum = models.PhaseStatusNotStarted
	var phaseInProgressInStore bool
	if row, err := o.store.GetCampaignPhase(ctx, querier, campaignID, phase); err == nil && row != nil {
		currentStatus = row.Status
		phaseInProgressInStore = row.Status == models.PhaseStatusInProgress
	}

	// P3.2: expected_state precondition check
	if opts != nil && opts.ExpectedState != nil {
		expectedState := *opts.ExpectedState
		if currentStatus != expectedState {
			o.deps.Logger.Warn(ctx, "P3.2: expected_state precondition failed for pause", map[string]interface{}{
				"campaign_id":    campaignID,
				"phase":          phase,
				"current_state":  currentStatus,
				"expected_state": expectedState,
			})
			if o.metrics != nil {
				o.metrics.IncTransitionBlocked()
			}
			return services.NewExpectedStateMismatchError409(currentStatus, expectedState, "pause")
		}
	}

	// P2: Idempotent - already paused is success
	if currentStatus == models.PhaseStatusPaused {
		o.deps.Logger.Debug(ctx, "Phase already paused (idempotent success)", map[string]interface{}{
			"campaign_id": campaignID,
			"phase":       phase,
		})
		return nil
	}

	// P2: Validate transition via state machine
	if err := services.ValidateTransition(currentStatus, models.PhaseStatusPaused, phase); err != nil {
		o.deps.Logger.Warn(ctx, "Invalid pause transition rejected by state machine", map[string]interface{}{
			"campaign_id":    campaignID,
			"phase":          phase,
			"current_status": currentStatus,
			"error":          err.Error(),
		})
		return err
	}

	o.deps.Logger.Info(ctx, "Pausing campaign phase", map[string]interface{}{
		"campaign_id":    campaignID,
		"phase":          phase,
		"current_status": currentStatus,
	})

	// Resolve user ID for SSE broadcasting (best-effort).
	var userID *uuid.UUID
	if o.sseService != nil {
		if querier, ok := o.deps.DB.(store.Querier); ok {
			if campaign, err := o.store.GetCampaignByID(ctx, querier, campaignID); err == nil && campaign.UserID != nil {
				userID = campaign.UserID
			}
		}
	}

	service, err := o.getPhaseService(phase)
	if err != nil {
		return fmt.Errorf("failed to get service for phase %s: %w", phase, err)
	}
	// Re-attach in case the prior control subscription was closed (e.g., orchestrator restart).
	o.attachControlChannel(ctx, campaignID, phase, service)

	ack := make(chan error, 1)
	controlErr := o.broadcastControlSignal(ctx, campaignID, phase, domainservices.ControlSignalPause, ack)
	var ackErr error
	if controlErr == nil {
		ackErr = awaitControlAck(ctx, ack, domainservices.ErrPhasePauseTimeout)
	} else {
		ackErr = controlErr
	}
	if ackErr != nil {
		// P0 Fix: ErrControlChannelFull MUST NOT be silently ignored.
		// If the channel is full, the phase runtime exists but is overloaded - pause was NOT delivered.
		// Return error so UI doesn't show paused while runtime keeps running.
		if errors.Is(ackErr, ErrControlChannelFull) {
			if o.deps.Logger != nil {
				o.deps.Logger.Error(ctx, "phase.pause.control_channel_full", ackErr, map[string]interface{}{
					"campaign_id": campaignID,
					"phase":       phase,
				})
			}
			return fmt.Errorf("pause signal could not be delivered (channel full): %w", ackErr)
		}
		// If runtime isn't available but DB shows the phase in progress, still persist the pause so
		// snapshot reads reflect user intent and UI doesn't get stuck.
		if !(phaseInProgressInStore && (errors.Is(ackErr, domainservices.ErrPhaseExecutionMissing) || errors.Is(ackErr, domainservices.ErrPhaseNotRunning))) {
			return ackErr
		}
		if o.deps.Logger != nil {
			o.deps.Logger.Warn(ctx, "phase.pause.runtime_unavailable.persisting", map[string]interface{}{
				"campaign_id": campaignID,
				"phase":       phase,
				"error":       ackErr.Error(),
			})
		}
	}

	if err := o.store.PausePhase(ctx, querier, campaignID, phase); err != nil {
		return err
	}

	// P2: Record lifecycle event and get sequence number for SSE
	var seqNum int64
	seqNum, seqErr := o.store.RecordLifecycleEvent(ctx, querier, campaignID, "phase_paused", phase, currentStatus, models.PhaseStatusPaused, map[string]interface{}{
		"trigger": "user_request",
	})
	if seqErr != nil && o.deps.Logger != nil {
		o.deps.Logger.Warn(ctx, "phase.pause.record_lifecycle_event_failed", map[string]interface{}{
			"campaign_id": campaignID,
			"phase":       phase,
			"error":       seqErr.Error(),
		})
		// Non-fatal: continue with sequence 0 if recording fails
	}

	// P0 Fix: Sync campaign row immediately so lead_generation_campaigns.phase_status = 'paused'.
	// Without this, the DB trigger may not prioritize paused status, and findRunningPhase/exclusivity
	// checks could see stale state.
	pausedStatus := models.PhaseStatusPaused
	if err := o.store.UpdateCampaignPhaseFields(ctx, querier, campaignID, &phase, &pausedStatus); err != nil {
		if o.deps.Logger != nil {
			o.deps.Logger.Warn(ctx, "campaign.pause.sync_campaign_row_failed", map[string]interface{}{
				"campaign_id": campaignID,
				"phase":       phase,
				"error":       err.Error(),
			})
		}
		// Non-fatal: phase row is paused, campaign row sync is best-effort
	}

	// P2: Emit SSE with sequence number
	if o.sseService != nil && userID != nil {
		evt := services.CreatePhasePausedEventWithSequence(campaignID, *userID, phase, seqNum)
		o.sseService.BroadcastToCampaign(campaignID, evt)
	}

	o.deps.Logger.Info(ctx, "Phase paused successfully", map[string]interface{}{
		"campaign_id": campaignID,
		"phase":       phase,
		"sequence":    seqNum,
	})

	// P3.3: Cache successful result for idempotency
	if opts != nil && opts.IdempotencyKey != "" && o.idempotencyCache != nil {
		o.idempotencyCache.Set(opts.IdempotencyKey, nil, nil)
		o.deps.Logger.Debug(ctx, "P3.3: Cached pause result", map[string]interface{}{
			"campaign_id":     campaignID,
			"phase":           phase,
			"idempotency_key": opts.IdempotencyKey,
		})
	}

	return nil
}

// ResumePhase transitions a paused phase back to in-progress execution when supported.
func (o *CampaignOrchestrator) ResumePhase(ctx context.Context, campaignID uuid.UUID, phase models.PhaseTypeEnum) error {
	return o.ResumePhaseWithOpts(ctx, campaignID, phase, nil)
}

// ResumePhaseWithOpts transitions a paused phase back to in-progress with optional expected_state (P3.2).
func (o *CampaignOrchestrator) ResumePhaseWithOpts(ctx context.Context, campaignID uuid.UUID, phase models.PhaseTypeEnum, opts *ControlOptions) error {
	if o.metrics != nil {
		o.metrics.IncPhaseResumeAttempts()
	}
	recordFailure := func() {
		if o.metrics != nil {
			o.metrics.IncPhaseResumeFailures()
		}
	}

	// P3.3: Check idempotency cache first
	if opts != nil && opts.IdempotencyKey != "" && o.idempotencyCache != nil {
		if cached := o.idempotencyCache.Get(opts.IdempotencyKey); cached != nil {
			o.deps.Logger.Debug(ctx, "P3.3: Returning cached resume result (idempotent)", map[string]interface{}{
				"campaign_id":     campaignID,
				"phase":           phase,
				"idempotency_key": opts.IdempotencyKey,
				"cached_at":       cached.CreatedAt,
			})
			return cached.Error // nil for success, error for failure
		}
	}

	if o.store == nil {
		recordFailure()
		return fmt.Errorf("campaign store not initialized")
	}
	querier, ok := o.deps.DB.(store.Querier)
	if !ok {
		recordFailure()
		return fmt.Errorf("invalid database interface in dependencies")
	}

	// P2: State machine validation - check current state before attempting resume
	var currentStatus models.PhaseStatusEnum = models.PhaseStatusNotStarted
	var phasePausedInStore bool
	if row, err := o.store.GetCampaignPhase(ctx, querier, campaignID, phase); err == nil && row != nil {
		currentStatus = row.Status
		phasePausedInStore = row.Status == models.PhaseStatusPaused
	}

	// P3.2: expected_state precondition check
	if opts != nil && opts.ExpectedState != nil {
		expectedState := *opts.ExpectedState
		if currentStatus != expectedState {
			o.deps.Logger.Warn(ctx, "P3.2: expected_state precondition failed for resume", map[string]interface{}{
				"campaign_id":    campaignID,
				"phase":          phase,
				"current_state":  currentStatus,
				"expected_state": expectedState,
			})
			if o.metrics != nil {
				o.metrics.IncTransitionBlocked()
			}
			recordFailure()
			return services.NewExpectedStateMismatchError409(currentStatus, expectedState, "resume")
		}
	}

	// P2: Idempotent - already in_progress is success
	if currentStatus == models.PhaseStatusInProgress {
		o.deps.Logger.Debug(ctx, "Phase already in progress (idempotent success)", map[string]interface{}{
			"campaign_id": campaignID,
			"phase":       phase,
		})
		return nil
	}

	// P2: Validate transition via state machine
	if err := services.ValidateTransition(currentStatus, models.PhaseStatusInProgress, phase); err != nil {
		o.deps.Logger.Warn(ctx, "Invalid resume transition rejected by state machine", map[string]interface{}{
			"campaign_id":    campaignID,
			"phase":          phase,
			"current_status": currentStatus,
			"error":          err.Error(),
		})
		recordFailure()
		return err
	}

	// Enforce campaign-level exclusivity: cannot resume a phase while another phase is running.
	if active, err := o.findRunningPhase(ctx, querier, campaignID); err != nil {
		recordFailure()
		return err
	} else if active != nil && active.PhaseType != phase {
		recordFailure()
		return fmt.Errorf("%w: campaign %s already running %s", ErrAnotherPhaseRunning, campaignID, active.PhaseType)
	}

	o.deps.Logger.Info(ctx, "Resuming campaign phase", map[string]interface{}{
		"campaign_id":    campaignID,
		"phase":          phase,
		"current_status": currentStatus,
	})

	// Resolve user ID for SSE broadcasting (best-effort).
	var userID *uuid.UUID
	if o.sseService != nil {
		if querier, ok := o.deps.DB.(store.Querier); ok {
			if campaign, err := o.store.GetCampaignByID(ctx, querier, campaignID); err == nil && campaign.UserID != nil {
				userID = campaign.UserID
			}
		}
	}

	// Re-attach control channel in case backend restarted or channel was closed
	service, err := o.getPhaseService(phase)
	if err != nil {
		recordFailure()
		return fmt.Errorf("failed to get service for phase %s: %w", phase, err)
	}
	o.attachControlChannel(ctx, campaignID, phase, service)

	ack := make(chan error, 1)
	controlErr := o.broadcastControlSignal(ctx, campaignID, phase, domainservices.ControlSignalResume, ack)
	var ackErr error
	if controlErr == nil {
		ackErr = awaitControlAck(ctx, ack, domainservices.ErrPhaseResumeTimeout)
	} else {
		ackErr = controlErr
	}
	if ackErr != nil {
		// If runtime isn't available but DB shows the phase paused, attempt a best-effort restart.
		if phasePausedInStore && (errors.Is(ackErr, domainservices.ErrPhaseExecutionMissing) || errors.Is(ackErr, domainservices.ErrPhaseNotRunning)) {
			if o.deps.Logger != nil {
				o.deps.Logger.Warn(ctx, "phase.resume.runtime_unavailable.restarting", map[string]interface{}{
					"campaign_id": campaignID,
					"phase":       phase,
					"error":       ackErr.Error(),
				})
			}
			if err := o.StartPhaseInternal(ctx, campaignID, phase); err != nil {
				recordFailure()
				return err
			}
			// Treat as successful resume.
			ackErr = nil
		} else {
			recordFailure()
			return ackErr
		}
	}
	if err := o.store.ResumePhase(ctx, querier, campaignID, phase); err != nil {
		recordFailure()
		return err
	}
	if o.metrics != nil {
		o.metrics.IncPhaseResumeSuccesses()
	}

	// P2: Record lifecycle event and get sequence number for SSE
	var seqNum int64
	seqNum, seqErr := o.store.RecordLifecycleEvent(ctx, querier, campaignID, "phase_resumed", phase, currentStatus, models.PhaseStatusInProgress, map[string]interface{}{
		"trigger": "user_request",
	})
	if seqErr != nil && o.deps.Logger != nil {
		o.deps.Logger.Warn(ctx, "phase.resume.record_lifecycle_event_failed", map[string]interface{}{
			"campaign_id": campaignID,
			"phase":       phase,
			"error":       seqErr.Error(),
		})
		// Non-fatal: continue with sequence 0 if recording fails
	}

	// P2: Emit SSE with sequence number
	if o.sseService != nil && userID != nil {
		evt := services.CreatePhaseResumedEventWithSequence(campaignID, *userID, phase, seqNum)
		o.sseService.BroadcastToCampaign(campaignID, evt)
	}

	o.deps.Logger.Info(ctx, "Phase resumed successfully", map[string]interface{}{
		"campaign_id": campaignID,
		"phase":       phase,
		"sequence":    seqNum,
	})

	// P3.3: Cache successful result for idempotency
	if opts != nil && opts.IdempotencyKey != "" && o.idempotencyCache != nil {
		o.idempotencyCache.Set(opts.IdempotencyKey, nil, nil)
		o.deps.Logger.Debug(ctx, "P3.3: Cached resume result", map[string]interface{}{
			"campaign_id":     campaignID,
			"phase":           phase,
			"idempotency_key": opts.IdempotencyKey,
		})
	}

	return nil
}

// StopCampaign cooperatively stops whichever phase is currently active for the campaign and
// marks the campaign as cancelled in centralized state tracking.
func (o *CampaignOrchestrator) StopCampaign(ctx context.Context, campaignID uuid.UUID) (*CampaignStopResult, error) {
	return o.StopCampaignWithOpts(ctx, campaignID, nil)
}

// StopCampaignWithOpts stops the campaign with optional idempotency key (P3.3).
func (o *CampaignOrchestrator) StopCampaignWithOpts(ctx context.Context, campaignID uuid.UUID, opts *ControlOptions) (*CampaignStopResult, error) {
	// P3.3: Check idempotency cache first
	if opts != nil && opts.IdempotencyKey != "" && o.idempotencyCache != nil {
		if cached := o.idempotencyCache.Get(opts.IdempotencyKey); cached != nil {
			o.deps.Logger.Debug(ctx, "P3.3: Returning cached stop campaign result (idempotent)", map[string]interface{}{
				"campaign_id":     campaignID,
				"idempotency_key": opts.IdempotencyKey,
				"cached_at":       cached.CreatedAt,
			})
			if cached.Error != nil {
				return nil, cached.Error
			}
			// For cached success, we need to return current status
			if querier, ok := o.deps.DB.(store.Querier); ok {
				if activePhase, err := o.findActivePhase(ctx, querier, campaignID); err == nil {
					status, _ := o.GetPhaseStatus(ctx, campaignID, activePhase.PhaseType)
					return &CampaignStopResult{Phase: activePhase.PhaseType, Status: status}, nil
				}
			}
			return nil, nil // Cache hit but can't determine phase
		}
	}

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

	// P3.3: Cache successful result for idempotency
	if opts != nil && opts.IdempotencyKey != "" && o.idempotencyCache != nil {
		o.idempotencyCache.Set(opts.IdempotencyKey, nil, nil)
		o.deps.Logger.Debug(ctx, "P3.3: Cached stop campaign result", map[string]interface{}{
			"campaign_id":     campaignID,
			"phase":           phase,
			"idempotency_key": opts.IdempotencyKey,
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
	if !o.allowPhaseMutation(ctx, campaignID, phase, uuid.Nil, "campaign_stop",
		models.PhaseStatusInProgress, models.PhaseStatusPaused) {
		return fmt.Errorf("campaign %s phase %s is no longer active; stop rejected", campaignID, phase)
	}

	// P3 Final: Get current status for transition
	var currentStatus models.PhaseStatusEnum
	if row, err := o.store.GetCampaignPhase(ctx, exec, campaignID, phase); err == nil && row != nil {
		currentStatus = row.Status
	} else {
		currentStatus = models.PhaseStatusInProgress // default assumption for stop
	}

	// P3 Final: Use transitionPhase for the core transition (validation + persistence + SSE)
	// This ensures all lifecycle mutations go through the canonical guard.
	result, err := o.transitionPhase(ctx, campaignID, phase, currentStatus, models.PhaseStatusFailed, services.TriggerFail)
	if err != nil {
		// Log but continue with stop - we want to record the failure even if transition was blocked
		if o.deps.Logger != nil {
			o.deps.Logger.Warn(ctx, "recordCampaignStop: transitionPhase failed, continuing with stop", map[string]interface{}{
				"campaign_id": campaignID,
				"phase":       phase,
				"error":       err.Error(),
			})
		}
	}
	_ = result // Sequence already emitted by transitionPhase

	// Additional persistence for campaign-level state (beyond phase transition)
	if err := o.store.FailPhase(ctx, exec, campaignID, phase, campaignStopMessage, map[string]interface{}{"code": "campaign_stopped"}); err != nil {
		return fmt.Errorf("failed to update phase state: %w", err)
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
	// Note: SSE already emitted by transitionPhase above
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
			reason := "config_not_found"
			if o.deps.Logger != nil {
				o.deps.Logger.Warn(ctx, "campaign.phase.config.rehydrate.skipped", map[string]interface{}{
					"campaign_id": campaignID,
					"phase":       phase,
					"reason":      reason,
				})
			}
			if phaseRequiresPersistedConfig(phase) {
				return o.wrapPhaseError(phase, fmt.Errorf("persisted configuration missing for %s: %w", phase, errPhaseConfigMissing))
			}
			return nil
		}
		return o.wrapPhaseError(phase, fmt.Errorf("failed to load configuration for %s: %w", phase, err))
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
		return o.wrapPhaseError(phase, fmt.Errorf("failed to decode stored configuration for %s: %w", phase, err))
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
		return o.wrapPhaseError(phase, fmt.Errorf("failed to rehydrate configuration for %s: %w", phase, err))
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

	trimConfig := func(raw []byte) ([]byte, error) {
		trimmed := bytes.TrimSpace(raw)
		if len(trimmed) == 0 || bytes.Equal(trimmed, []byte("null")) {
			return nil, errPhaseConfigMissing
		}
		copyBuf := make([]byte, len(trimmed))
		copy(copyBuf, trimmed)
		return copyBuf, nil
	}

	var payload []byte
	phaseRow, err := o.store.GetCampaignPhase(ctx, exec, campaignID, phase)
	switch {
	case err == nil && phaseRow != nil && phaseRow.Configuration != nil:
		if data, err := trimConfig([]byte(*phaseRow.Configuration)); err == nil {
			payload = data
		} else if !errors.Is(err, errPhaseConfigMissing) {
			return nil, err
		}
	case err != nil && !errors.Is(err, sql.ErrNoRows) && !errors.Is(err, store.ErrNotFound) && !strings.Contains(err.Error(), "not found"):
		return nil, err
	}

	if len(payload) == 0 {
		raw, cfgErr := o.store.GetPhaseConfig(ctx, exec, campaignID, phase)
		if cfgErr != nil {
			if errors.Is(cfgErr, store.ErrNotFound) {
				return nil, errPhaseConfigMissing
			}
			return nil, cfgErr
		}
		if raw == nil {
			return nil, errPhaseConfigMissing
		}
		data, err := trimConfig([]byte(*raw))
		if err != nil {
			return nil, err
		}
		payload = data
	}

	return payload, nil
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
		// Try to unmarshal as map first to handle legacy/test configs gracefully
		var m map[string]interface{}
		if err := json.Unmarshal(payload, &m); err != nil {
			return nil, err
		}
		// If it has required domain generation fields, unmarshal into typed config
		if _, hasPattern := m["patternType"]; hasPattern || m["pattern_type"] != nil {
			var cfg domainservices.DomainGenerationConfig
			if err := json.Unmarshal(payload, &cfg); err != nil {
				return nil, err
			}
			return &cfg, nil
		}
		// Otherwise return as map for Configure to handle gracefully
		return m, nil
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
func (o *CampaignOrchestrator) monitorPhaseProgress(ctx context.Context, campaignID uuid.UUID, phase models.PhaseTypeEnum, progressCh <-chan domainservices.PhaseProgress, runID uuid.UUID) {
	exitReason := "unknown"
	defer func() {
		clearPhaseExecutionHandle(campaignID, runID)
		o.mu.Lock()
		if exec, ok := o.campaignExecutions[campaignID]; ok && exec.PhaseRunID == runID {
			exec.PhaseRunID = uuid.Nil
		}
		o.mu.Unlock()
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
		if !isPhaseRunActive(campaignID, runID) {
			exitReason = "execution_run_ended"
			return
		}
		select {
		case <-ctx.Done():
			exitReason = fmt.Sprintf("context_done:%v", ctx.Err())
			return
		case progress, ok := <-progressCh:
			if !ok {
				exitReason = "progress_channel_closed"
				// Channel closed, phase execution completed
				o.handlePhaseCompletion(ctx, campaignID, phase, runID)
				return
			}

			if !isPhaseRunActive(campaignID, runID) {
				exitReason = "execution_run_ended"
				return
			}

			exitReason = "running"
			// Update campaign execution with progress
			o.updateCampaignProgress(ctx, campaignID, phase, progress, runID)

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
func (o *CampaignOrchestrator) updateCampaignProgress(ctx context.Context, campaignID uuid.UUID, phase models.PhaseTypeEnum, progress domainservices.PhaseProgress, runID uuid.UUID) {
	o.mu.Lock()
	defer o.mu.Unlock()

	execution, exists := o.campaignExecutions[campaignID]
	if !exists {
		return
	}

	if runID != uuid.Nil {
		if execution.PhaseRunID == uuid.Nil || execution.PhaseRunID != runID {
			return
		}
	}

	isPaused := execution.OverallStatus == models.PhaseStatusPaused
	if !isPaused && execution.PhaseStatuses != nil {
		if st, ok := execution.PhaseStatuses[phase]; ok && st != nil && st.Status == models.PhaseStatusPaused {
			isPaused = true
		}
	}
	if !isPaused && o.store != nil && o.deps.DB != nil {
		if querier, ok := o.deps.DB.(store.Querier); ok {
			if campaign, err := o.store.GetCampaignByID(context.Background(), querier, campaignID); err == nil && campaign.PhaseStatus != nil && *campaign.PhaseStatus == models.PhaseStatusPaused {
				isPaused = true
				if execution.PhaseStatuses == nil {
					execution.PhaseStatuses = make(map[models.PhaseTypeEnum]*domainservices.PhaseStatus)
				}
				execution.OverallStatus = models.PhaseStatusPaused
				execution.PhaseStatuses[phase] = &domainservices.PhaseStatus{Status: models.PhaseStatusPaused}
			}
		}
	}
	if isPaused {
		// Once a campaign is marked paused, no further progress from older executions should mutate state.
		return
	}
	if !o.allowPhaseMutation(ctx, campaignID, phase, runID, "progress_write") {
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
		// Also sync current phase and status unless we intentionally hold a paused marker
		if !isPaused {
			curPhase := phase
			curStatus := progress.Status
			_ = o.store.UpdateCampaignPhaseFields(context.Background(), querier, campaignID, &curPhase, &curStatus)
		}
	}
}

// handlePhaseCompletion handles the completion of a phase
func (o *CampaignOrchestrator) handlePhaseCompletion(ctx context.Context, campaignID uuid.UUID, phase models.PhaseTypeEnum, runID uuid.UUID) {
	o.closeControlChannel(campaignID, phase)
	if !o.allowPhaseMutation(ctx, campaignID, phase, runID, "completion_write", models.PhaseStatusInProgress, models.PhaseStatusCompleted, models.PhaseStatusFailed) {
		if o.deps.Logger != nil {
			o.deps.Logger.Debug(ctx, "Phase completion skipped due to inactive execution", map[string]interface{}{
				"campaign_id": campaignID,
				"phase":       phase,
			})
		}
		return
	}
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

	// Debug: Log the final status returned by the phase service for auto-advance decision
	if o.deps.Logger != nil {
		statusStr := "nil"
		if finalStatus != nil {
			statusStr = string(finalStatus.Status)
		}
		o.deps.Logger.Info(ctx, "handlePhaseCompletion.finalStatus", map[string]interface{}{
			"campaign_id":     campaignID,
			"phase":           phase,
			"final_status":    statusStr,
			"items_total":     finalStatus.ItemsTotal,
			"items_processed": finalStatus.ItemsProcessed,
			"progress_pct":    finalStatus.ProgressPct,
		})
	}

	// DEFENSIVE FIX: If service.GetStatus() returns NotStarted or InProgress but the
	// channel has closed (meaning the phase goroutine exited), cross-check with DB.
	// This handles edge cases where in-memory state is stale after fast completion.
	if finalStatus != nil && (finalStatus.Status == models.PhaseStatusNotStarted || finalStatus.Status == models.PhaseStatusInProgress) {
		if querier, ok := o.deps.DB.(store.Querier); ok {
			if dbPhase, err := o.store.GetCampaignPhase(ctx, querier, campaignID, phase); err == nil && dbPhase != nil {
				if dbPhase.Status == models.PhaseStatusCompleted || dbPhase.Status == models.PhaseStatusFailed {
					o.deps.Logger.Warn(ctx, "handlePhaseCompletion.status_mismatch_corrected", map[string]interface{}{
						"campaign_id":    campaignID,
						"phase":          phase,
						"service_status": string(finalStatus.Status),
						"db_status":      string(dbPhase.Status),
					})
					finalStatus.Status = dbPhase.Status
					if dbPhase.Status == models.PhaseStatusCompleted {
						finalStatus.ProgressPct = 100.0
					}
					if dbPhase.StartedAt != nil {
						finalStatus.StartedAt = dbPhase.StartedAt
					}
					if dbPhase.CompletedAt != nil {
						finalStatus.CompletedAt = dbPhase.CompletedAt
					}
				}
			}
		}
	}

	// Ensure the canonical campaign row never stays stuck in "in_progress" once a phase finishes.
	if finalStatus != nil {
		if querier, ok := o.deps.DB.(store.Querier); ok {
			phaseStatus := finalStatus.Status
			phaseRef := phase
			if err := o.store.UpdateCampaignPhaseFields(ctx, querier, campaignID, &phaseRef, &phaseStatus); err != nil && o.deps.Logger != nil {
				o.deps.Logger.Warn(ctx, "campaign.phase.sync_failed", map[string]interface{}{
					"campaign_id": campaignID,
					"phase":       phase,
					"status":      phaseStatus,
					"error":       err.Error(),
				})
			}
		}
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
		// P1 Fix: The phaseStartInProgress guard in StartPhaseInternal now handles the race.
		// No need for separate autoStartInProgress tracking here.
		o.deps.Logger.Info(ctx, "Auto-advancing to next phase (full_sequence mode)", map[string]interface{}{"campaign_id": campaignID, "from_phase": phase, "to_phase": next})
		if o.sseService != nil && cachedUserID != nil {
			evt := services.CreatePhaseAutoStartedEvent(campaignID, *cachedUserID, next)
			o.sseService.BroadcastToCampaign(campaignID, evt)
		}
		if err := o.StartPhaseInternal(ctx, campaignID, next); err != nil {
			// REQUIREMENT #3: Orchestrator contract - "completion ⇒ next or fail"
			// If a phase reaches Completed and auto-advance does not start the next phase,
			// log ERROR with campaignId, phase, and status sources (mem vs DB).
			// Silent stalls are UNACCEPTABLE.
			o.deps.Logger.Error(ctx, "PIPELINE_STALL_RISK: Failed to auto-advance after completion", err, map[string]interface{}{
				"campaign_id":    campaignID,
				"from_phase":     phase,
				"to_phase":       next,
				"service_status": string(finalStatus.Status),
				"invariant":      "completion_must_advance_or_fail",
			})
			// Metrics: track this critical failure
			o.metrics.IncPhaseFailures()
		} else {
			// Metrics: auto-start only on success
			o.metrics.IncPhaseAutoStarts()
		}
	} else if finalStatus != nil {
		// REQUIREMENT #3 (continued): Log when auto-advance is skipped and why.
		// If status is not Completed but phase channel closed, this is a potential stall.
		// Cross-check with DB to verify we're not silently stalling.
		var dbStatusStr string
		if querier, ok := o.deps.DB.(store.Querier); ok {
			if dbPhase, err := o.store.GetCampaignPhase(ctx, querier, campaignID, phase); err == nil && dbPhase != nil {
				dbStatusStr = string(dbPhase.Status)
				// CRITICAL: If DB says completed but service said otherwise, we have a stall
				if dbPhase.Status == models.PhaseStatusCompleted && finalStatus.Status != models.PhaseStatusCompleted {
					o.deps.Logger.Error(ctx, "PIPELINE_STALL_DETECTED: Service/DB status mismatch prevented auto-advance", nil, map[string]interface{}{
						"campaign_id":    campaignID,
						"phase":          phase,
						"service_status": string(finalStatus.Status),
						"db_status":      dbStatusStr,
						"invariant":      "db_completed_but_service_not",
					})
				}
			}
		}
		// Always log when auto-advance is skipped for observability
		o.deps.Logger.Warn(ctx, "handlePhaseCompletion.auto_advance_skipped", map[string]interface{}{
			"campaign_id":    campaignID,
			"phase":          phase,
			"service_status": string(finalStatus.Status),
			"db_status":      dbStatusStr,
			"reason":         "status_not_completed",
		})
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
