package services

import (
    "context"
    "sync"
    "testing"

    "github.com/fntelecomllc/studio/backend/internal/httpvalidator"
    "github.com/fntelecomllc/studio/backend/internal/models"
    "github.com/google/uuid"
)

type stubHTTPBulkValidator struct {
    mu    sync.Mutex
    calls int
}

func (s *stubHTTPBulkValidator) ValidateDomainsBulk(ctx context.Context, domains []*models.GeneratedDomain, batchSize int, persona *models.Persona, proxy *models.Proxy) []*httpvalidator.ValidationResult {
    s.mu.Lock()
    s.calls += len(domains)
    s.mu.Unlock()
    results := make([]*httpvalidator.ValidationResult, len(domains))
    for i, d := range domains {
        results[i] = &httpvalidator.ValidationResult{
            Domain:    d.DomainName,
            Status:    "OK",
            IsSuccess: true,
            RawBody:   []byte("body"),
        }
    }
    return results
}

func (s *stubHTTPBulkValidator) CallCount() int {
    s.mu.Lock()
    defer s.mu.Unlock()
    return s.calls
}

func newHTTPRunContextService(t *testing.T, validator httpBulkValidator) *httpValidationService {
    t.Helper()
    return &httpValidationService{
        deps:            Dependencies{Logger: noopLogger{}},
        validator:       validator,
        executions:      make(map[uuid.UUID]*httpValidationExecution),
        controlWatchers: make(map[uuid.UUID]httpControlWatcher),
        disableMetrics:  true,
    }
}

func TestHTTPValidationService_RunContextMismatchStopsExecution(t *testing.T) {
    stub := &stubHTTPBulkValidator{}
    svc := newHTTPRunContextService(t, stub)
    campaignID := uuid.New()
    ctxWithRun := WithPhaseRun(context.Background(), PhaseRunContext{CampaignID: campaignID, Phase: models.PhaseTypeHTTPKeywordValidation, RunID: uuid.New()})
    ctx, cancel := context.WithCancel(ctxWithRun)
    defer cancel()

    execution := &httpValidationExecution{
        CampaignID:   campaignID,
        runID:        uuid.New(),
        Status:       models.PhaseStatusInProgress,
        Domains:      []string{"one.test"},
        ItemsTotal:   1,
        ProgressChan: make(chan PhaseProgress, 1),
        cancelCtx:    ctx,
        cancelFunc:   cancel,
    }
    svc.executions[campaignID] = execution

    svc.executeHTTPValidation(execution)

    if execution.Status != models.PhaseStatusFailed {
        t.Fatalf("expected failed status, got %s", execution.Status)
    }
    if execution.ErrorMessage != "stale execution context" {
        t.Fatalf("expected stale context error, got %s", execution.ErrorMessage)
    }
    if count := stub.CallCount(); count != 0 {
        t.Fatalf("expected validator not to run, got %d calls", count)
    }
}

func TestHTTPValidationService_RunContextMatchExecutes(t *testing.T) {
    stub := &stubHTTPBulkValidator{}
    svc := newHTTPRunContextService(t, stub)
    campaignID := uuid.New()
    runID := uuid.New()
    ctxWithRun := WithPhaseRun(context.Background(), PhaseRunContext{CampaignID: campaignID, Phase: models.PhaseTypeHTTPKeywordValidation, RunID: runID})
    ctx, cancel := context.WithCancel(ctxWithRun)
    defer cancel()

    execution := &httpValidationExecution{
        CampaignID:   campaignID,
        runID:        runID,
        Status:       models.PhaseStatusInProgress,
        Domains:      []string{"one.test"},
        ItemsTotal:   1,
        ProgressChan: make(chan PhaseProgress, 1),
        cancelCtx:    ctx,
        cancelFunc:   cancel,
    }
    svc.executions[campaignID] = execution

    svc.executeHTTPValidation(execution)

    if execution.Status != models.PhaseStatusCompleted {
        t.Fatalf("expected completed status, got %s", execution.Status)
    }
    if count := stub.CallCount(); count == 0 {
        t.Fatalf("expected validator to run at least once")
    }
}
