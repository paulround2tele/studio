package main

import (
	"context"
	"time"

	gen "github.com/fntelecomllc/studio/backend/internal/api/gen"
	"github.com/google/uuid"
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
		Operations:        make(map[string]gen.ProxyOperationResult),
		Status:            gen.BulkValidationResponseStatusInitiated,
		TotalOperations:   len(r.Body.Operations),
	}

	if h.deps != nil && h.deps.Orchestrator != nil {
		for _, op := range r.Body.Operations {
			key := uuid.NewString()
			cfg := map[string]interface{}{
				"stealth_enabled": r.Body.Stealth != nil && (r.Body.Stealth.Enabled != nil && *r.Body.Stealth.Enabled),
				"batch_size":      100,
			}
			success := true
			errorMsg := ""
			if err := h.deps.Orchestrator.ConfigurePhase(ctx, op.CampaignId, "http_validation", cfg); err == nil {
				_ = h.deps.Orchestrator.StartPhase(ctx, op.CampaignId, "http_validation")
			} else {
				success = false
				errorMsg = err.Error()
			}

			metadata := make(map[string]*gen.FlexibleValue)
			metadata["campaign_id"] = flexibleValueFromString(op.CampaignId.String())
			metadata["status"] = flexibleValueFromString("pending")

			result := gen.ProxyOperationResult{
				ProxyId:  op.CampaignId,
				Success:  success,
				Metadata: &metadata,
			}
			if !success {
				result.Error = &errorMsg
			}

			resp.Operations[key] = result
		}
	}

	return gen.BulkValidateHTTP200JSONResponse(resp), nil
}
