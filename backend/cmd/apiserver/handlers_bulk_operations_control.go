package main

import (
	"context"

	gen "github.com/fntelecomllc/studio/backend/internal/api/gen"
	openapi_types "github.com/oapi-codegen/runtime/types"
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
	return gen.CancelBulkOperation200JSONResponse{
		Data: &struct {
			OperationId *openapi_types.UUID            `json:"operationId,omitempty"`
			Status      *gen.BulkOperationCancelStatus `json:"status,omitempty"`
		}{OperationId: &r.OperationId, Status: &mapped},
		Metadata:  okMeta(),
		RequestId: reqID(),
		Success:   boolPtr(true),
	}, nil
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
	return gen.GetBulkOperationStatus200JSONResponse{
		Data: &struct {
			OperationId *openapi_types.UUID `json:"operationId,omitempty"`
			Progress    *float32            `json:"progress,omitempty"`
			Status      *string             `json:"status,omitempty"`
			Type        *string             `json:"type,omitempty"`
		}{OperationId: &r.OperationId, Progress: &processed, Status: &status, Type: &typ},
		Metadata:  okMeta(),
		RequestId: reqID(),
		Success:   boolPtr(true),
	}, nil
}
