package services

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/google/uuid"

	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/fntelecomllc/studio/backend/internal/store"
)

// extractionPhaseService exposes the extraction-analysis pipeline as a campaign phase with
// runtime-control awareness and PhaseService semantics.
type extractionPhaseService struct {
	store        store.CampaignStore
	deps         Dependencies
	orchestrator *ExtractionAnalysisOrchestrator
	batchSvc     *BatchExtractionService
}

// NewExtractionPhaseService wires the batch extraction pipeline into a PhaseService wrapper.
func NewExtractionPhaseService(
	store store.CampaignStore,
	deps Dependencies,
	orchestrator *ExtractionAnalysisOrchestrator,
	batchSvc *BatchExtractionService,
) *extractionPhaseService {
	return &extractionPhaseService{
		store:        store,
		deps:         deps,
		orchestrator: orchestrator,
		batchSvc:     batchSvc,
	}
}

func (s *extractionPhaseService) Configure(ctx context.Context, campaignID uuid.UUID, config interface{}) error {
	// Extraction currently runs with dynamic configuration derived from upstream phases, so there
	// is nothing to persist beyond ensuring the phase row exists. Returning nil keeps the handler happy.
	return nil
}

func (s *extractionPhaseService) Execute(ctx context.Context, campaignID uuid.UUID) (<-chan PhaseProgress, error) {
	if s.orchestrator == nil || s.batchSvc == nil {
		return nil, fmt.Errorf("extraction pipeline unavailable")
	}
	progressCh := make(chan PhaseProgress, 16)
	go s.runExtraction(ctx, campaignID, progressCh)
	return progressCh, nil
}

func (s *extractionPhaseService) GetStatus(ctx context.Context, campaignID uuid.UUID) (*PhaseStatus, error) {
	status := &PhaseStatus{
		CampaignID:     campaignID,
		Phase:          models.PhaseTypeExtraction,
		Status:         models.PhaseStatusNotStarted,
		ProgressPct:    0,
		ItemsTotal:     0,
		ItemsProcessed: 0,
		Configuration: map[string]interface{}{
			"runtime_controls": s.Capabilities(),
		},
	}
	if s.batchSvc == nil {
		return status, nil
	}

	s.batchSvc.mu.RLock()
	if exec, ok := s.batchSvc.executions[campaignID]; ok && exec != nil {
		status.Status = exec.Status
		status.ProgressPct = exec.Progress
		status.ItemsTotal = int64(exec.ItemsTotal)
		status.ItemsProcessed = int64(exec.ItemsProcessed)
		if !exec.StartedAt.IsZero() {
			started := exec.StartedAt
			status.StartedAt = &started
		}
		if exec.CompletedAt != nil {
			status.CompletedAt = exec.CompletedAt
		}
		status.LastError = exec.LastError
	}
	s.batchSvc.mu.RUnlock()

	return status, nil
}

func (s *extractionPhaseService) Cancel(ctx context.Context, campaignID uuid.UUID) error {
	if s.batchSvc == nil {
		return fmt.Errorf("extraction batch service unavailable")
	}
	if err := s.batchSvc.StopCampaign(campaignID); err != nil {
		return err
	}
	s.persistPhaseFailure(ctx, campaignID, fmt.Errorf("extraction cancelled"))
	return nil
}

func (s *extractionPhaseService) Validate(ctx context.Context, config interface{}) error {
	// No user-supplied configuration is currently supported; accept nil only.
	if config != nil {
		return fmt.Errorf("extraction phase does not accept configuration")
	}
	return nil
}

func (s *extractionPhaseService) GetPhaseType() models.PhaseTypeEnum {
	return models.PhaseTypeExtraction
}

func (s *extractionPhaseService) Capabilities() PhaseControlCapabilities {
	if s.batchSvc == nil {
		return PhaseControlCapabilities{}
	}
	return s.batchSvc.Capabilities()
}

func (s *extractionPhaseService) AttachControlChannel(ctx context.Context, campaignID uuid.UUID, phase models.PhaseTypeEnum, commands <-chan ControlCommand) {
	if s.batchSvc == nil {
		return
	}
	s.batchSvc.AttachControlChannel(ctx, campaignID, phase, commands)
}

func (s *extractionPhaseService) runExtraction(ctx context.Context, campaignID uuid.UUID, progressCh chan<- PhaseProgress) {
	var (
		progressWG   sync.WaitGroup
		stopProgress chan struct{}
	)
	if s.batchSvc != nil {
		stopProgress = make(chan struct{})
		progressWG.Add(1)
		go func() {
			defer progressWG.Done()
			s.streamRuntimeProgress(ctx, campaignID, progressCh, stopProgress)
		}()
	}
	defer func() {
		if stopProgress != nil {
			close(stopProgress)
			progressWG.Wait()
		}
		close(progressCh)
	}()

	s.emitProgress(progressCh, campaignID, models.PhaseStatusInProgress, 0, 0, "extraction started", "")
	s.persistPhaseStart(ctx, campaignID)

	result, err := s.orchestrator.ProcessCampaign(ctx, campaignID)
	if err != nil {
		if s.deps.Logger != nil {
			s.deps.Logger.Error(ctx, "extraction.phase.execute.error", err, map[string]interface{}{
				"campaign_id": campaignID,
			})
		}
		s.persistPhaseFailure(ctx, campaignID, err)
		s.emitProgress(progressCh, campaignID, models.PhaseStatusFailed, 0, 0, "extraction failed", err.Error())
		return
	}

	total := int64(0)
	processed := int64(0)
	var message string
	if result != nil {
		total = int64(result.DomainsProcessed)
		processed = int64(result.DomainsSuccessful + result.DomainsFailed)
		if processed == 0 {
			processed = int64(result.DomainsProcessed)
		}
		message = fmt.Sprintf("processed %d domains (%d success, %d failed)", result.DomainsProcessed, result.DomainsSuccessful, result.DomainsFailed)
	} else {
		message = "extraction completed"
	}

	s.persistPhaseCompletion(ctx, campaignID)
	s.emitProgress(progressCh, campaignID, models.PhaseStatusCompleted, total, processed, message, "")
}

func (s *extractionPhaseService) streamRuntimeProgress(ctx context.Context, campaignID uuid.UUID, progressCh chan<- PhaseProgress, stop <-chan struct{}) {
	if s.batchSvc == nil {
		return
	}
	if snap, ok := s.snapshotBatchExecution(campaignID); ok {
		progress := snap.AsPhaseProgress(campaignID, models.PhaseTypeExtraction)
		select {
		case progressCh <- progress:
		default:
		}
	}
	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()
	var (
		last     PhaseExecutionSnapshot
		haveLast bool
	)
	for {
		select {
		case <-ctx.Done():
			return
		case <-stop:
			return
		case <-ticker.C:
			snap, ok := s.snapshotBatchExecution(campaignID)
			if !ok {
				continue
			}
			if haveLast && snap.Equal(last) {
				continue
			}
			haveLast = true
			last = snap
			progress := snap.AsPhaseProgress(campaignID, models.PhaseTypeExtraction)
			select {
			case progressCh <- progress:
			default:
			}
		}
	}
}

func (s *extractionPhaseService) snapshotBatchExecution(campaignID uuid.UUID) (PhaseExecutionSnapshot, bool) {
	if s.batchSvc == nil {
		return PhaseExecutionSnapshot{}, false
	}
	s.batchSvc.mu.RLock()
	exec, ok := s.batchSvc.executions[campaignID]
	if !ok || exec == nil {
		s.batchSvc.mu.RUnlock()
		return PhaseExecutionSnapshot{}, false
	}
	status := exec.Status
	itemsTotal := int64(exec.ItemsTotal)
	itemsProcessed := int64(exec.ItemsProcessed)
	progress := exec.Progress
	lastErr := exec.LastError
	s.batchSvc.mu.RUnlock()

	snap := PhaseExecutionSnapshot{
		Status:         status,
		ItemsTotal:     itemsTotal,
		ItemsProcessed: itemsProcessed,
		ProgressPct:    progress,
		Message:        s.describeBatchExecution(status, itemsProcessed, itemsTotal, lastErr),
		Error:          lastErr,
	}
	return snap, true
}

func (s *extractionPhaseService) describeBatchExecution(status models.PhaseStatusEnum, processed, total int64, lastErr string) string {
	switch status {
	case models.PhaseStatusPaused:
		return "extraction paused"
	case models.PhaseStatusInProgress:
		if total > 0 {
			return fmt.Sprintf("processing %d/%d domains", processed, total)
		}
		return "processing domains"
	case models.PhaseStatusFailed:
		if lastErr != "" {
			return lastErr
		}
		return "extraction failed"
	case models.PhaseStatusCompleted:
		return "extraction completed"
	default:
		return ""
	}
}

func (s *extractionPhaseService) emitProgress(ch chan<- PhaseProgress, campaignID uuid.UUID, status models.PhaseStatusEnum, total, processed int64, msg, errMsg string) {
	progress := 0.0
	if total > 0 {
		progress = float64(processed) / float64(total) * 100.0
	}
	update := PhaseProgress{
		CampaignID:     campaignID,
		Phase:          models.PhaseTypeExtraction,
		Status:         status,
		ProgressPct:    progress,
		ItemsTotal:     total,
		ItemsProcessed: processed,
		Message:        msg,
		Error:          errMsg,
		Timestamp:      time.Now(),
	}
	select {
	case ch <- update:
	default:
	}
}

func (s *extractionPhaseService) persistPhaseStart(ctx context.Context, campaignID uuid.UUID) {
	if s.store == nil || s.deps.DB == nil {
		return
	}
	exec, ok := s.deps.DB.(store.Querier)
	if !ok {
		return
	}
	if err := s.store.StartPhase(ctx, exec, campaignID, models.PhaseTypeExtraction); err != nil && s.deps.Logger != nil {
		s.deps.Logger.Warn(ctx, "extraction.phase.start.persist.failed", map[string]interface{}{
			"campaign_id": campaignID,
			"error":       err.Error(),
		})
	}
}

func (s *extractionPhaseService) persistPhaseCompletion(ctx context.Context, campaignID uuid.UUID) {
	if s.store == nil || s.deps.DB == nil {
		return
	}
	exec, ok := s.deps.DB.(store.Querier)
	if !ok {
		return
	}
	if err := s.store.CompletePhase(ctx, exec, campaignID, models.PhaseTypeExtraction); err != nil && s.deps.Logger != nil {
		s.deps.Logger.Warn(ctx, "extraction.phase.complete.persist.failed", map[string]interface{}{
			"campaign_id": campaignID,
			"error":       err.Error(),
		})
	}
}

func (s *extractionPhaseService) persistPhaseFailure(ctx context.Context, campaignID uuid.UUID, failure error) {
	if s.store == nil || s.deps.DB == nil {
		return
	}
	exec, ok := s.deps.DB.(store.Querier)
	if !ok {
		return
	}
	errMsg := "extraction failed"
	if failure != nil {
		errMsg = failure.Error()
	}
	if err := s.store.FailPhase(ctx, exec, campaignID, models.PhaseTypeExtraction, errMsg, nil); err != nil && s.deps.Logger != nil {
		s.deps.Logger.Warn(ctx, "extraction.phase.fail.persist.failed", map[string]interface{}{
			"campaign_id": campaignID,
			"error":       err.Error(),
		})
	}
}
