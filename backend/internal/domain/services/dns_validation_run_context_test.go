package services

import (
	"context"
	"sync"
	"testing"
	"time"

	"github.com/fntelecomllc/studio/backend/internal/dnsvalidator"
	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/fntelecomllc/studio/backend/internal/store"
	"github.com/google/uuid"
)

type blockingValidator struct {
	mu    sync.Mutex
	calls int
}

func (b *blockingValidator) ValidateDomainsBulk(domains []string, ctx context.Context, batchSize int) []dnsvalidator.ValidationResult {
	b.mu.Lock()
	b.calls++
	b.mu.Unlock()
	<-ctx.Done()
	return nil
}

type dnsValidationStubStore struct {
	*stubCampaignStore
	domains      []string
	mu           sync.Mutex
	progressHits int
	bulkHits     int
}

func newDNSValidationStubStore(domains []string) *dnsValidationStubStore {
	return &dnsValidationStubStore{
		stubCampaignStore: &stubCampaignStore{},
		domains:           domains,
	}
}

func (s *dnsValidationStubStore) GetGeneratedDomainsWithCursor(ctx context.Context, exec store.Querier, filter store.ListGeneratedDomainsFilter) (*store.PaginatedResult[*models.GeneratedDomain], error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	data := make([]*models.GeneratedDomain, 0, len(s.domains))
	for idx, domain := range s.domains {
		d := domain
		data = append(data, &models.GeneratedDomain{DomainName: d, OffsetIndex: int64(idx)})
	}
	return &store.PaginatedResult[*models.GeneratedDomain]{
		Data: data,
		PageInfo: store.PageInfo{
			HasNextPage:     false,
			HasPreviousPage: false,
			StartCursor:     "",
			EndCursor:       "",
			TotalCount:      int64(len(data)),
		},
	}, nil
}

func (s *dnsValidationStubStore) UpdatePhaseProgress(ctx context.Context, exec store.Querier, id uuid.UUID, phase models.PhaseTypeEnum, progress float64, totalItems, processedItems, successfulItems, failedItems *int64) error {
	s.mu.Lock()
	s.progressHits++
	s.mu.Unlock()
	return nil
}

func (s *dnsValidationStubStore) UpdateDomainsBulkDNSStatus(ctx context.Context, exec store.Querier, results []models.DNSValidationResult) error {
	s.mu.Lock()
	s.bulkHits += len(results)
	s.mu.Unlock()
	return nil
}

func TestPhaseRunContextHelpers(t *testing.T) {
	t.Helper()
	base := context.Background()
	runCtx := PhaseRunContext{
		CampaignID: uuid.New(),
		Phase:      models.PhaseTypeDNSValidation,
		RunID:      uuid.New(),
	}
	derived := WithPhaseRun(base, runCtx)
	recovered, ok := PhaseRunFromContext(derived)
	if !ok {
		t.Fatalf("expected phase run context to be present")
	}
	if recovered != runCtx {
		t.Fatalf("expected run context to round-trip, got %+v want %+v", recovered, runCtx)
	}
	if _, ok := PhaseRunFromContext(base); ok {
		t.Fatalf("unexpected run context on base context")
	}
}

func TestDNSValidationService_ExecuteCancelsOnContextDone(t *testing.T) {
	campaignID := uuid.New()
	validator := &blockingValidator{}
	store := newDNSValidationStubStore([]string{"one.test", "two.test"})
	store.phase = &models.CampaignPhase{PhaseType: models.PhaseTypeDomainGeneration, Status: models.PhaseStatusCompleted}
	deps := Dependencies{Logger: noopLogger{}}
	svc := NewDNSValidationService(nil, store, deps).(*dnsValidationService)
	svc.validator = validator

	cfg := DNSValidationConfig{PersonaIDs: []uuid.UUID{uuid.New()}, BatchSize: 1, Timeout: 5, MaxRetries: 1}
	if err := svc.Configure(context.Background(), campaignID, cfg); err != nil {
		t.Fatalf("configure: %v", err)
	}

	baseCtx, cancelParent := context.WithCancel(context.Background())
	runCtx := PhaseRunContext{CampaignID: campaignID, Phase: models.PhaseTypeDNSValidation, RunID: uuid.New()}
	execCtx := WithPhaseRun(baseCtx, runCtx)

	progressCh, err := svc.Execute(execCtx, campaignID)
	if err != nil {
		t.Fatalf("execute: %v", err)
	}

	waited := waitForCondition(500*time.Millisecond, func() bool {
		validator.mu.Lock()
		defer validator.mu.Unlock()
		return validator.calls > 0
	})
	if !waited {
		t.Fatalf("validator never invoked before cancellation")
	}

	cancelParent()

	drained := make(chan struct{})
	go func() {
		for range progressCh {
		}
		close(drained)
	}()

	select {
	case <-drained:
	case <-time.After(2 * time.Second):
		t.Fatalf("timeout waiting for progress channel close")
	}

	svc.mu.RLock()
	exec, ok := svc.executions[campaignID]
	svc.mu.RUnlock()
	if !ok {
		t.Fatalf("execution state missing")
	}
	if exec.runID != runCtx.RunID {
		t.Fatalf("expected runID %s, got %s", runCtx.RunID, exec.runID)
	}
	if exec.status != models.PhaseStatusFailed {
		t.Fatalf("expected execution to fail after cancellation, got %s", exec.status)
	}

	store.mu.Lock()
	failed := store.failed
	store.mu.Unlock()
	if !failed {
		t.Fatalf("expected store.FailPhase to be invoked")
	}

	validator.mu.Lock()
	callCount := validator.calls
	validator.mu.Unlock()
	if callCount == 0 {
		t.Fatalf("expected validator to be invoked before cancellation")
	}
}

func waitForCondition(timeout time.Duration, cond func() bool) bool {
	deadline := time.After(timeout)
	ticker := time.NewTicker(5 * time.Millisecond)
	defer ticker.Stop()
	for {
		if cond() {
			return true
		}
		select {
		case <-deadline:
			return false
		case <-ticker.C:
		}
	}
}
