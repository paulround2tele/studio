package services

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"
	"time"

	"github.com/google/uuid"

	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/fntelecomllc/studio/backend/internal/store"
)

type enrichmentService struct {
	store    store.CampaignStore
	deps     Dependencies
	mu       sync.RWMutex
	statuses map[uuid.UUID]*PhaseStatus
}

// NewEnrichmentService constructs the enrichment phase controller. The initial
// implementation emits immediate completion progress so the orchestrator can
// chain into analysis while the full enrichment engine is brought online.
func NewEnrichmentService(store store.CampaignStore, deps Dependencies) EnrichmentService {
	return &enrichmentService{
		store:    store,
		deps:     deps,
		statuses: make(map[uuid.UUID]*PhaseStatus),
	}
}

func (s *enrichmentService) GetPhaseType() models.PhaseTypeEnum {
	return models.PhaseTypeEnrichment
}

func (s *enrichmentService) Configure(ctx context.Context, campaignID uuid.UUID, config interface{}) error {
	if s.deps.Logger != nil {
		s.deps.Logger.Info(ctx, "Configuring enrichment service", map[string]interface{}{"campaign_id": campaignID})
	}

	raw, err := marshalEnrichmentConfig(config)
	if err != nil {
		return fmt.Errorf("failed to marshal enrichment config: %w", err)
	}

	if s.store != nil {
		var exec store.Querier
		if q, ok := s.deps.DB.(store.Querier); ok {
			exec = q
		}
		// Best-effort persistence; errors are surfaced to the caller.
		if err := s.store.UpdatePhaseConfiguration(ctx, exec, campaignID, models.PhaseTypeEnrichment, raw); err != nil {
			return fmt.Errorf("failed to persist enrichment config: %w", err)
		}
	}

	s.updateStatus(campaignID, func(st *PhaseStatus) {
		if st.Status == models.PhaseStatusNotStarted {
			st.Status = models.PhaseStatusConfigured
		}
	})

	return nil
}

func (s *enrichmentService) Execute(ctx context.Context, campaignID uuid.UUID) (<-chan PhaseProgress, error) {
	if s.deps.Logger != nil {
		s.deps.Logger.Info(ctx, "Starting enrichment execution", map[string]interface{}{"campaign_id": campaignID})
	}

	started := time.Now()
	s.updateStatus(campaignID, func(st *PhaseStatus) {
		st.Status = models.PhaseStatusInProgress
		st.StartedAt = &started
		st.CompletedAt = nil
		st.ProgressPct = 0
		st.ItemsTotal = 1
		st.ItemsProcessed = 0
		st.LastError = ""
	})

	progressCh := make(chan PhaseProgress, 2)

	go func() {
		defer close(progressCh)

		// Emit initial progress snapshot.
		select {
		case progressCh <- PhaseProgress{
			CampaignID:     campaignID,
			Phase:          models.PhaseTypeEnrichment,
			Status:         models.PhaseStatusInProgress,
			ProgressPct:    10,
			ItemsProcessed: 0,
			ItemsTotal:     1,
			Timestamp:      time.Now(),
		}:
		case <-ctx.Done():
			s.failWithContextError(campaignID, ctx.Err())
			return
		}

		// Simulate lightweight enrichment work; replace with real engine integration later.
		select {
		case <-ctx.Done():
			s.failWithContextError(campaignID, ctx.Err())
			return
		case <-time.After(5 * time.Millisecond):
		}

		completed := time.Now()
		s.updateStatus(campaignID, func(st *PhaseStatus) {
			st.Status = models.PhaseStatusCompleted
			st.CompletedAt = &completed
			st.ProgressPct = 100
			st.ItemsProcessed = 1
			st.LastError = ""
		})

		select {
		case progressCh <- PhaseProgress{
			CampaignID:     campaignID,
			Phase:          models.PhaseTypeEnrichment,
			Status:         models.PhaseStatusCompleted,
			ProgressPct:    100,
			ItemsProcessed: 1,
			ItemsTotal:     1,
			Timestamp:      completed,
		}:
		case <-ctx.Done():
			// Context cancelled after completion; status already marked completed.
		}

		if s.deps.Logger != nil {
			s.deps.Logger.Info(ctx, "Enrichment execution completed", map[string]interface{}{"campaign_id": campaignID})
		}
	}()

	return progressCh, nil
}

func (s *enrichmentService) GetStatus(ctx context.Context, campaignID uuid.UUID) (*PhaseStatus, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if st, ok := s.statuses[campaignID]; ok {
		cp := *st
		return &cp, nil
	}
	return &PhaseStatus{CampaignID: campaignID, Phase: models.PhaseTypeEnrichment, Status: models.PhaseStatusNotStarted}, nil
}

func (s *enrichmentService) Cancel(ctx context.Context, campaignID uuid.UUID) error {
	if s.deps.Logger != nil {
		s.deps.Logger.Warn(ctx, "Enrichment execution cancelled", map[string]interface{}{"campaign_id": campaignID})
	}
	s.updateStatus(campaignID, func(st *PhaseStatus) {
		st.Status = models.PhaseStatusFailed
		st.LastError = "enrichment cancelled"
	})
	return nil
}

func (s *enrichmentService) Validate(ctx context.Context, config interface{}) error {
	// Initial enrichment phase accepts any JSON-serializable payload.
	if _, err := marshalEnrichmentConfig(config); err != nil {
		return fmt.Errorf("invalid enrichment config: %w", err)
	}
	return nil
}

func (s *enrichmentService) failWithContextError(campaignID uuid.UUID, err error) {
	s.updateStatus(campaignID, func(st *PhaseStatus) {
		st.Status = models.PhaseStatusFailed
		st.LastError = err.Error()
	})
}

func (s *enrichmentService) updateStatus(campaignID uuid.UUID, mutate func(*PhaseStatus)) {
	s.mu.Lock()
	defer s.mu.Unlock()
	st, ok := s.statuses[campaignID]
	if !ok {
		st = &PhaseStatus{CampaignID: campaignID, Phase: models.PhaseTypeEnrichment, Status: models.PhaseStatusNotStarted}
		s.statuses[campaignID] = st
	}
	if mutate != nil {
		mutate(st)
	}
}

func marshalEnrichmentConfig(config interface{}) (json.RawMessage, error) {
	switch v := config.(type) {
	case nil:
		return json.RawMessage("null"), nil
	case json.RawMessage:
		cp := make([]byte, len(v))
		copy(cp, v)
		return json.RawMessage(cp), nil
	case []byte:
		cp := make([]byte, len(v))
		copy(cp, v)
		return json.RawMessage(cp), nil
	default:
		raw, err := json.Marshal(v)
		if err != nil {
			return nil, err
		}
		return json.RawMessage(raw), nil
	}
}
