package main

import (
	"context"
	"sync"
	"time"

	"github.com/fntelecomllc/studio/backend/internal/application"
	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/google/uuid"
	openapi_types "github.com/oapi-codegen/runtime/types"
)

type BulkOperationType string

const (
	BulkOpDomainGeneration BulkOperationType = "domain_generation"
	BulkOpDNSValidation    BulkOperationType = "dns_validation"
	BulkOpHTTPValidation   BulkOperationType = "http_validation"
	BulkOpAnalysis         BulkOperationType = "analysis"
)

type BulkOperationStatus string

const (
	BulkStatusPending   BulkOperationStatus = "pending"
	BulkStatusRunning   BulkOperationStatus = "running"
	BulkStatusCompleted BulkOperationStatus = "completed"
	BulkStatusFailed    BulkOperationStatus = "failed"
	BulkStatusCancelled BulkOperationStatus = "cancelled"
)

type BulkOperation struct {
	ID              openapi_types.UUID
	Type            BulkOperationType
	CampaignIDs     []uuid.UUID
	CreatedAt       time.Time
	UpdatedAt       time.Time
	Status          BulkOperationStatus
	CancelRequested bool
}

type BulkOpsTracker struct {
	mu  sync.RWMutex
	ops map[openapi_types.UUID]*BulkOperation
}

func NewBulkOpsTracker() *BulkOpsTracker {
	return &BulkOpsTracker{ops: make(map[openapi_types.UUID]*BulkOperation)}
}

func (t *BulkOpsTracker) NewOperation(opType BulkOperationType, campaignIDs []uuid.UUID) openapi_types.UUID {
	t.mu.Lock()
	defer t.mu.Unlock()
	id := openapi_types.UUID(uuid.New())
	now := time.Now()
	t.ops[id] = &BulkOperation{
		ID:          id,
		Type:        opType,
		CampaignIDs: campaignIDs,
		CreatedAt:   now,
		UpdatedAt:   now,
		Status:      BulkStatusPending,
	}
	return id
}

func (t *BulkOpsTracker) List() []*BulkOperation {
	t.mu.RLock()
	defer t.mu.RUnlock()
	out := make([]*BulkOperation, 0, len(t.ops))
	for _, op := range t.ops {
		out = append(out, op)
	}
	return out
}

func (t *BulkOpsTracker) Get(id openapi_types.UUID) (*BulkOperation, bool) {
	t.mu.RLock()
	defer t.mu.RUnlock()
	op, ok := t.ops[id]
	return op, ok
}

func (t *BulkOpsTracker) phaseFor(opType BulkOperationType) models.PhaseTypeEnum {
	switch opType {
	case BulkOpDomainGeneration:
		return models.PhaseTypeDomainGeneration
	case BulkOpDNSValidation:
		return models.PhaseTypeDNSValidation
	case BulkOpHTTPValidation:
		return models.PhaseTypeHTTPKeywordValidation
	case BulkOpAnalysis:
		return models.PhaseTypeAnalysis
	default:
		return models.PhaseTypeDomainGeneration
	}
}

// Aggregate computes overall progress and status from orchestrator per-campaign phase status.
func (t *BulkOpsTracker) Aggregate(ctx context.Context, orch *application.CampaignOrchestrator, id openapi_types.UUID) (progressPct float32, status BulkOperationStatus, typ string, found bool) {
	t.mu.RLock()
	op, ok := t.ops[id]
	t.mu.RUnlock()
	if !ok {
		return 0, BulkStatusPending, "", false
	}

	phase := t.phaseFor(op.Type)
	var totalProcessed int64
	var totalItems int64
	anyRunning := false
	anyFailed := false
	allCompleted := true

	for _, cid := range op.CampaignIDs {
		st, err := orch.GetPhaseStatus(ctx, cid, phase)
		if err != nil || st == nil {
			anyRunning = true
			allCompleted = false
			continue
		}
		totalProcessed += st.ItemsProcessed
		totalItems += st.ItemsTotal
		switch st.Status {
		case models.PhaseStatusCompleted:
			// keep allCompleted
		case models.PhaseStatusFailed:
			anyFailed = true
			allCompleted = false
		case models.PhaseStatusInProgress:
			anyRunning = true
			allCompleted = false
		default:
			allCompleted = false
		}
	}

	// Compute status
	switch {
	case op.CancelRequested:
		status = BulkStatusCancelled
	case anyFailed:
		status = BulkStatusFailed
	case allCompleted && len(op.CampaignIDs) > 0:
		status = BulkStatusCompleted
	case anyRunning:
		status = BulkStatusRunning
	default:
		status = BulkStatusPending
	}

	// Compute progress percentage (0..100)
	var pct float64
	if totalItems > 0 {
		pct = (float64(totalProcessed) / float64(totalItems)) * 100.0
	} else if status == BulkStatusCompleted {
		pct = 100
	} else {
		pct = 0
	}

	// Update operation record
	t.mu.Lock()
	op.Status = status
	op.UpdatedAt = time.Now()
	t.mu.Unlock()

	return float32(pct), status, string(op.Type), true
}

// Cancel requests cancellation and forwards to orchestrator for the phase across campaigns.
func (t *BulkOpsTracker) Cancel(ctx context.Context, orch *application.CampaignOrchestrator, id openapi_types.UUID) (BulkOperationStatus, bool) {
	t.mu.Lock()
	op, ok := t.ops[id]
	if !ok {
		t.mu.Unlock()
		return BulkStatusPending, false
	}
	op.CancelRequested = true
	op.Status = BulkStatusCancelled
	phase := t.phaseFor(op.Type)
	cids := append([]uuid.UUID(nil), op.CampaignIDs...)
	t.mu.Unlock()

	for _, cid := range cids {
		_ = orch.CancelPhase(ctx, cid, phase)
	}
	return BulkStatusCancelled, true
}
