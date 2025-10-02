package main

import (
	"context"

	gen "github.com/fntelecomllc/studio/backend/internal/api/gen"
)

// CancelBulkOperation implements POST /campaigns/bulk/operations/{operationId}/cancel
func (h *strictHandlers) CancelBulkOperation(ctx context.Context, r gen.CancelBulkOperationRequestObject) (gen.CancelBulkOperationResponseObject, error) {
	st, _ := h.deps.BulkOps.Cancel(ctx, h.deps.Orchestrator, r.OperationId)
	var mapped gen.BulkOperationCancelStatus
	switch st {
	case BulkStatusCancelled:
		mapped = gen.BulkOperationCancelStatusCancelled
	default:
		mapped = gen.BulkOperationCancelStatusCancelling
	}
	return gen.CancelBulkOperation200JSONResponse{OperationId: &r.OperationId, Status: &mapped}, nil
}

// GetBulkOperationStatus implements GET /campaigns/bulk/operations/{operationId}/status
func (h *strictHandlers) GetBulkOperationStatus(ctx context.Context, r gen.GetBulkOperationStatusRequestObject) (gen.GetBulkOperationStatusResponseObject, error) {
	processed := float32(0)
	typ := ""
	status := "pending"
	if pct, st, t, ok := h.deps.BulkOps.Aggregate(ctx, h.deps.Orchestrator, r.OperationId); ok {
		processed = pct
		typ = t
		status = string(st)
	}
	return gen.GetBulkOperationStatus200JSONResponse{OperationId: r.OperationId, Progress: processed, Status: status, Type: typ}, nil
}
