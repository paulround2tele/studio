package main

import (
	"context"

	gen "github.com/fntelecomllc/studio/backend/internal/api/gen"
	openapi_types "github.com/oapi-codegen/runtime/types"
)

// CampaignsBulkOperationsList implements GET /campaigns/bulk/operations
func (h *strictHandlers) CampaignsBulkOperationsList(ctx context.Context, r gen.CampaignsBulkOperationsListRequestObject) (gen.CampaignsBulkOperationsListResponseObject, error) {
	ops := []struct {
		OperationId *openapi_types.UUID `json:"operationId,omitempty"`
		Status      *string             `json:"status,omitempty"`
		Type        *string             `json:"type,omitempty"`
	}{}
	if h.deps != nil && h.deps.BulkOps != nil {
		for _, op := range h.deps.BulkOps.List() {
			id := op.ID
			st := string(op.Status)
			typ := string(op.Type)
			ops = append(ops, struct {
				OperationId *openapi_types.UUID `json:"operationId,omitempty"`
				Status      *string             `json:"status,omitempty"`
				Type        *string             `json:"type,omitempty"`
			}{OperationId: &id, Status: &st, Type: &typ})
		}
	}
	return gen.CampaignsBulkOperationsList200JSONResponse(ops), nil
}
func strPtr(s string) *string { return &s }
