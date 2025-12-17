package services

import (
	"context"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/fntelecomllc/studio/backend/internal/models"
)

type stubBatchProcessor struct {
	mu    sync.Mutex
	calls int
}

func (s *stubBatchProcessor) process(ctx context.Context, execution *batchExtractionExecution, batch []DomainBatchItem) ([]BatchItemError, error) {
	s.mu.Lock()
	s.calls++
	s.mu.Unlock()
	results := make([]BatchItemError, len(batch))
	return results, nil
}

func (s *stubBatchProcessor) CallCount() int {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.calls
}

func TestBatchExtractionService_RunContextMismatchStopsProcessing(t *testing.T) {
	svc := NewBatchExtractionService(nil, noopLogger{}, nil, nil, nil, nil, BatchProcessingConfig{BatchSize: 5, WorkerCount: 2})
	stub := &stubBatchProcessor{}
	svc.processBatchFunc = stub.process

	campaignID := uuid.New()
	execution := svc.ensureExecution(campaignID)
	initialRunID := uuid.New()
	ctxWithRun := WithPhaseRun(context.Background(), PhaseRunContext{CampaignID: campaignID, Phase: models.PhaseTypeExtraction, RunID: initialRunID})
	svc.startExecution(ctxWithRun, execution, 1, time.Now())
	execCtx := execution.cancelCtx

	execution.runID = uuid.New()

	result := &BatchResult{CampaignID: campaignID, Errors: make([]BatchItemError, 0)}
	domains := []DomainBatchItem{{DomainID: uuid.New(), CampaignID: campaignID, DomainName: "one.test"}}

	if _, _, err := svc.executeDomainBatches(execCtx, execution, domains, result); err == nil || !strings.Contains(err.Error(), staleExecutionMessage) {
		t.Fatalf("expected stale execution error, got %v", err)
	}
	if calls := stub.CallCount(); calls != 0 {
		t.Fatalf("expected processor not invoked, got %d calls", calls)
	}
}

func TestBatchExtractionService_RunContextMatchProcessesBatches(t *testing.T) {
	svc := NewBatchExtractionService(nil, noopLogger{}, nil, nil, nil, nil, BatchProcessingConfig{BatchSize: 4, WorkerCount: 2})
	stub := &stubBatchProcessor{}
	svc.processBatchFunc = stub.process

	campaignID := uuid.New()
	runID := uuid.New()
	ctxWithRun := WithPhaseRun(context.Background(), PhaseRunContext{CampaignID: campaignID, Phase: models.PhaseTypeExtraction, RunID: runID})
	execution := svc.ensureExecution(campaignID)
	svc.startExecution(ctxWithRun, execution, 2, time.Now())
	execCtx := execution.cancelCtx

	result := &BatchResult{CampaignID: campaignID, Errors: make([]BatchItemError, 0)}
	domains := []DomainBatchItem{
		{DomainID: uuid.New(), CampaignID: campaignID, DomainName: "one.test"},
		{DomainID: uuid.New(), CampaignID: campaignID, DomainName: "two.test"},
	}

	successful, failed, err := svc.executeDomainBatches(execCtx, execution, domains, result)
	if err != nil {
		t.Fatalf("executeDomainBatches: %v", err)
	}
	if successful != len(domains) {
		t.Fatalf("expected %d successful domains, got %d", len(domains), successful)
	}
	if failed != 0 {
		t.Fatalf("expected zero failed domains, got %d", failed)
	}
	if calls := stub.CallCount(); calls == 0 {
		t.Fatalf("expected processor to be invoked at least once")
	}
}
