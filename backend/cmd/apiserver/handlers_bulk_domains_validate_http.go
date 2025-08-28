package main

import (
	"context"
	"time"

	gen "github.com/fntelecomllc/studio/backend/internal/api/gen"
	"github.com/google/uuid"
	openapi_types "github.com/oapi-codegen/runtime/types"
)

// BulkValidateHTTP implements POST /campaigns/bulk/domains/validate-http
func (h *strictHandlers) BulkValidateHTTP(ctx context.Context, r gen.BulkValidateHTTPRequestObject) (gen.BulkValidateHTTPResponseObject, error) {
	if r.Body == nil {
		return gen.BulkValidateHTTP500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{
			Error:     gen.ApiError{Code: gen.INTERNALSERVERERROR, Message: "missing request body", Timestamp: time.Now()},
			RequestId: reqID(),
			Success:   boolPtr(false),
		}}, nil
	}
	opCampaigns := make([]uuid.UUID, 0, len(r.Body.Operations))
	for _, op := range r.Body.Operations {
		opCampaigns = append(opCampaigns, op.CampaignId)
	}
	opID := h.deps.BulkOps.NewOperation(BulkOpHTTPValidation, opCampaigns)
	resp := gen.BulkValidationResponse{
		EstimatedDuration: ptrString("PT5M"),
		OperationId:       opID,
		Operations: map[string]struct {
			CampaignId          *openapi_types.UUID `json:"campaignId,omitempty"`
			EstimatedCompletion *time.Time          `json:"estimatedCompletion"`
			Progress            *struct {
				Processed *int `json:"processed,omitempty"`
				Total     *int `json:"total,omitempty"`
			} `json:"progress,omitempty"`
			Status *gen.BulkValidationResponseOperationsStatus `json:"status,omitempty"`
		}{},
		Status:          gen.BulkValidationResponseStatusInitiated,
		TotalOperations: len(r.Body.Operations),
	}

	if h.deps != nil && h.deps.Orchestrator != nil {
		for _, op := range r.Body.Operations {
			key := uuid.NewString()
			cfg := map[string]interface{}{
				"stealth_enabled": r.Body.Stealth != nil && (r.Body.Stealth.Enabled != nil && *r.Body.Stealth.Enabled),
				"batch_size":      100,
			}
			status := gen.BulkValidationResponseOperationsStatusPending
			if err := h.deps.Orchestrator.ConfigurePhase(ctx, op.CampaignId, "http_validation", cfg); err == nil {
				_ = h.deps.Orchestrator.StartPhase(ctx, op.CampaignId, "http_validation")
				status = gen.BulkValidationResponseOperationsStatusRunning
			}
			processed := 0
			total := 0
			eta := time.Now().Add(5 * time.Minute)
			resp.Operations[key] = struct {
				CampaignId          *openapi_types.UUID `json:"campaignId,omitempty"`
				EstimatedCompletion *time.Time          `json:"estimatedCompletion"`
				Progress            *struct {
					Processed *int `json:"processed,omitempty"`
					Total     *int `json:"total,omitempty"`
				} `json:"progress,omitempty"`
				Status *gen.BulkValidationResponseOperationsStatus `json:"status,omitempty"`
			}{
				CampaignId:          &op.CampaignId,
				EstimatedCompletion: &eta,
				Progress: &struct {
					Processed *int `json:"processed,omitempty"`
					Total     *int `json:"total,omitempty"`
				}{
					Processed: &processed,
					Total:     &total,
				},
				Status: &status,
			}
		}
	}

	return gen.BulkValidateHTTP200JSONResponse{
		Data:      &resp,
		Metadata:  okMeta(),
		RequestId: reqID(),
		Success:   boolPtr(true),
	}, nil
}
