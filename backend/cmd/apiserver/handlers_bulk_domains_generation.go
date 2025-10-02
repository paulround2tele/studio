package main

import (
	"context"
	"time"

	gen "github.com/fntelecomllc/studio/backend/internal/api/gen"
	"github.com/google/uuid"
	openapi_types "github.com/oapi-codegen/runtime/types"
)

// BulkGenerateDomains implements POST /campaigns/bulk/domains/generate
func (h *strictHandlers) BulkGenerateDomains(ctx context.Context, r gen.BulkGenerateDomainsRequestObject) (gen.BulkGenerateDomainsResponseObject, error) {
	if r.Body == nil {
		return gen.BulkGenerateDomains500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{
			Error:     gen.ApiError{Code: gen.INTERNALSERVERERROR, Message: "missing request body", Timestamp: time.Now()},
			RequestId: reqID(),
			Success:   boolPtr(false),
		}}, nil
	}
	// Prepare response skeleton with tracked operation id
	opCampaigns := make([]uuid.UUID, 0, len(r.Body.Operations))
	for _, op := range r.Body.Operations {
		opCampaigns = append(opCampaigns, op.CampaignId)
	}
	opID := h.deps.BulkOps.NewOperation(BulkOpDomainGeneration, opCampaigns)
	_ = time.Now()
	resp := gen.BulkGenerationResponse{
		EstimatedDuration: ptrString("PT5M"),
		OperationId:       opID,
		Operations: map[string]struct {
			CampaignId       *openapi_types.UUID `json:"campaignId,omitempty"`
			DomainsGenerated *int                `json:"domainsGenerated,omitempty"`
			Progress         *struct {
				Processed *int `json:"processed,omitempty"`
				Total     *int `json:"total,omitempty"`
			} `json:"progress,omitempty"`
			Status *gen.BulkGenerationResponseOperationsStatus `json:"status,omitempty"`
		}{},
		Status:          gen.BulkGenerationResponseStatusInitiated,
		TotalOperations: len(r.Body.Operations),
	}

	if h.deps != nil && h.deps.Orchestrator != nil {
		// Iterate operations: configure and start async; fill optimistic progress
		for _, op := range r.Body.Operations {
			key := uuid.NewString()
			// Build config map from request
			cfg := map[string]interface{}{
				"max_domains": op.MaxDomains,
				"batch_size":  1000,
			}
			if op.Config.VariableLength > 0 || op.Config.ConstantString != "" || len(op.Config.Tlds) > 0 {
				cfg["operation_config"] = map[string]interface{}{
					"pattern_type":         op.Config.PatternType,
					"constantString":       op.Config.ConstantString,
					"variableLength":       op.Config.VariableLength,
					"tlds":                 op.Config.Tlds,
					"numDomainsToGenerate": op.Config.NumDomainsToGenerate,
				}
			}
			// Configure and start. Errors are tolerated per-op and reflected in status
			status := gen.BulkGenerationResponseOperationsStatusPending
			if err := h.deps.Orchestrator.ConfigurePhase(ctx, op.CampaignId, "domain_generation", cfg); err == nil {
				_ = h.deps.Orchestrator.StartPhase(ctx, op.CampaignId, "domain_generation")
				status = gen.BulkGenerationResponseOperationsStatusRunning
			}
			target := op.MaxDomains
			processed := 0
			resp.Operations[key] = struct {
				CampaignId       *openapi_types.UUID `json:"campaignId,omitempty"`
				DomainsGenerated *int                `json:"domainsGenerated,omitempty"`
				Progress         *struct {
					Processed *int `json:"processed,omitempty"`
					Total     *int `json:"total,omitempty"`
				} `json:"progress,omitempty"`
				Status *gen.BulkGenerationResponseOperationsStatus `json:"status,omitempty"`
			}{
				CampaignId: &op.CampaignId,
				Progress: &struct {
					Processed *int `json:"processed,omitempty"`
					Total     *int `json:"total,omitempty"`
				}{
					Processed: &processed,
					Total:     &target,
				},
				Status: &status,
			}
		}
	}

	return gen.BulkGenerateDomains200JSONResponse(resp), nil
}

func ptrString(s string) *string { return &s }
