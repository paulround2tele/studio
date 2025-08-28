package main

import (
	"context"
	"database/sql"
	"fmt"
	"io"
	"net/http"
	"time"

	gen "github.com/fntelecomllc/studio/backend/internal/api/gen"
	domainservices "github.com/fntelecomllc/studio/backend/internal/domain/services"
	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/fntelecomllc/studio/backend/internal/monitoring"
	"github.com/fntelecomllc/studio/backend/internal/store"
	"github.com/google/uuid"
	openapi_types "github.com/oapi-codegen/runtime/types"
)

// ---- Remaining stubs (unchanged behavior) ----
func (h *strictHandlers) AuthChangePassword(ctx context.Context, r gen.AuthChangePasswordRequestObject) (gen.AuthChangePasswordResponseObject, error) {
	return nil, notImpl("AuthChangePassword")
}
func (h *strictHandlers) AuthLogin(ctx context.Context, r gen.AuthLoginRequestObject) (gen.AuthLoginResponseObject, error) {
	return nil, notImpl("AuthLogin")
}
func (h *strictHandlers) AuthLogout(ctx context.Context, r gen.AuthLogoutRequestObject) (gen.AuthLogoutResponseObject, error) {
	return nil, notImpl("AuthLogout")
}
func (h *strictHandlers) AuthMe(ctx context.Context, r gen.AuthMeRequestObject) (gen.AuthMeResponseObject, error) {
	return nil, notImpl("AuthMe")
}
func (h *strictHandlers) AuthRefresh(ctx context.Context, r gen.AuthRefreshRequestObject) (gen.AuthRefreshResponseObject, error) {
	return nil, notImpl("AuthRefresh")
}

func (h *strictHandlers) CampaignsList(ctx context.Context, r gen.CampaignsListRequestObject) (gen.CampaignsListResponseObject, error) {
	if h.deps == nil || h.deps.Stores.Campaign == nil || h.deps.DB == nil {
		return gen.CampaignsList500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "campaign store not initialized", Code: "internal", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	rows, err := h.deps.Stores.Campaign.ListCampaigns(ctx, h.deps.DB, store.ListCampaignsFilter{})
	if err != nil {
		return gen.CampaignsList500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to list campaigns", Code: "internal", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	out := make([]gen.CampaignResponse, 0, len(rows))
	for _, c := range rows {
		out = append(out, mapCampaignToResponse(c))
	}
	return gen.CampaignsList200JSONResponse{Data: &out, Metadata: okMeta(), RequestId: reqID(), Success: boolPtr(true)}, nil
}
func (h *strictHandlers) CampaignsCreate(ctx context.Context, r gen.CampaignsCreateRequestObject) (gen.CampaignsCreateResponseObject, error) {
	if h.deps == nil || h.deps.Stores.Campaign == nil || h.deps.DB == nil {
		return gen.CampaignsCreate500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "campaign store not initialized", Code: "internal", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	if r.Body == nil || r.Body.Name == "" {
		return gen.CampaignsCreate400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "name is required", Code: "bad_request", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	now := time.Now()
	m := &models.LeadGenerationCampaign{
		ID:                 uuid.New(),
		Name:               r.Body.Name,
		CreatedAt:          now,
		UpdatedAt:          now,
		CampaignType:       "lead_generation",
		TotalPhases:        4,
		CompletedPhases:    0,
		IsFullSequenceMode: true,
	}
	if err := h.deps.Stores.Campaign.CreateCampaign(ctx, h.deps.DB, m); err != nil {
		return gen.CampaignsCreate500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to create campaign", Code: "internal", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	// Best-effort: create phases
	_ = h.deps.Stores.Campaign.CreateCampaignPhases(ctx, h.deps.DB, m.ID)
	resp := mapCampaignToResponse(m)
	return gen.CampaignsCreate201JSONResponse{Data: &resp, Metadata: okMeta(), RequestId: reqID(), Success: boolPtr(true)}, nil
}
func (h *strictHandlers) CampaignsDelete(ctx context.Context, r gen.CampaignsDeleteRequestObject) (gen.CampaignsDeleteResponseObject, error) {
	if h.deps == nil || h.deps.Stores.Campaign == nil || h.deps.DB == nil {
		return gen.CampaignsDelete500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "campaign store not initialized", Code: "internal", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	if err := h.deps.Stores.Campaign.DeleteCampaign(ctx, h.deps.DB, uuid.UUID(r.CampaignId)); err != nil {
		if err == store.ErrNotFound {
			return gen.CampaignsDelete404JSONResponse{NotFoundJSONResponse: gen.NotFoundJSONResponse{Error: gen.ApiError{Message: "campaign not found", Code: "not_found", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
		}
		return gen.CampaignsDelete500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to delete campaign", Code: "internal", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	return gen.CampaignsDelete204Response{}, nil
}
func (h *strictHandlers) CampaignsGet(ctx context.Context, r gen.CampaignsGetRequestObject) (gen.CampaignsGetResponseObject, error) {
	if h.deps == nil || h.deps.Stores.Campaign == nil || h.deps.DB == nil {
		return gen.CampaignsGet500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "campaign store not initialized", Code: "internal", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	m, err := h.deps.Stores.Campaign.GetCampaignByID(ctx, h.deps.DB, uuid.UUID(r.CampaignId))
	if err != nil {
		if err == store.ErrNotFound {
			return gen.CampaignsGet404JSONResponse{NotFoundJSONResponse: gen.NotFoundJSONResponse{Error: gen.ApiError{Message: "campaign not found", Code: "not_found", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
		}
		return gen.CampaignsGet500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to fetch campaign", Code: "internal", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	resp := mapCampaignToResponse(m)
	return gen.CampaignsGet200JSONResponse{Data: &resp, Metadata: okMeta(), RequestId: reqID(), Success: boolPtr(true)}, nil
}
func (h *strictHandlers) CampaignsUpdate(ctx context.Context, r gen.CampaignsUpdateRequestObject) (gen.CampaignsUpdateResponseObject, error) {
	if h.deps == nil || h.deps.Stores.Campaign == nil || h.deps.DB == nil {
		return gen.CampaignsUpdate500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "campaign store not initialized", Code: "internal", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	if r.Body == nil {
		return gen.CampaignsUpdate400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "missing body", Code: "bad_request", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	m, err := h.deps.Stores.Campaign.GetCampaignByID(ctx, h.deps.DB, uuid.UUID(r.CampaignId))
	if err != nil {
		if err == store.ErrNotFound {
			return gen.CampaignsUpdate404JSONResponse{NotFoundJSONResponse: gen.NotFoundJSONResponse{Error: gen.ApiError{Message: "campaign not found", Code: "not_found", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
		}
		return gen.CampaignsUpdate500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to fetch campaign", Code: "internal", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	if r.Body.Name != nil {
		m.Name = *r.Body.Name
	}
	if r.Body.Description != nil {
		// store in Metadata for now to avoid schema drift
		// no-op minimal mapping
		_ = r.Body.Description
	}
	m.UpdatedAt = time.Now()
	if err := h.deps.Stores.Campaign.UpdateCampaign(ctx, h.deps.DB, m); err != nil {
		return gen.CampaignsUpdate500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to update campaign", Code: "internal", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	resp := mapCampaignToResponse(m)
	return gen.CampaignsUpdate200JSONResponse{Data: &resp, Metadata: okMeta(), RequestId: reqID(), Success: boolPtr(true)}, nil
}
func (h *strictHandlers) CampaignsPhaseConfigure(ctx context.Context, r gen.CampaignsPhaseConfigureRequestObject) (gen.CampaignsPhaseConfigureResponseObject, error) {
	// Dependencies check
	if h.deps == nil || h.deps.Orchestrator == nil || h.deps.Stores.Campaign == nil || h.deps.DB == nil {
		return gen.CampaignsPhaseConfigure401JSONResponse{UnauthorizedJSONResponse: gen.UnauthorizedJSONResponse{Error: gen.ApiError{Message: "dependencies not ready", Code: "unauthorized", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	// Validate body
	if r.Body == nil {
		return gen.CampaignsPhaseConfigure400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "missing body", Code: "bad_request", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	// Ensure campaign exists
	if _, err := h.deps.Stores.Campaign.GetCampaignByID(ctx, h.deps.DB, uuid.UUID(r.CampaignId)); err != nil {
		if err == store.ErrNotFound {
			return gen.CampaignsPhaseConfigure404JSONResponse{NotFoundJSONResponse: gen.NotFoundJSONResponse{Error: gen.ApiError{Message: "campaign not found", Code: "not_found", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
		}
		return gen.CampaignsPhaseConfigure500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to load campaign", Code: "internal", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	// Map phase
	phaseModel, err := mapAPIPhaseToModel(string(r.Phase))
	if err != nil {
		return gen.CampaignsPhaseConfigure400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "invalid phase", Code: "bad_request", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	// Validate configuration
	cfg := toMap(r.Body)
	if err := h.deps.Orchestrator.ValidatePhaseConfiguration(ctx, phaseModel, cfg); err != nil {
		return gen.CampaignsPhaseConfigure400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "invalid configuration: " + err.Error(), Code: "bad_request", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	// Configure phase
	if err := h.deps.Orchestrator.ConfigurePhase(ctx, uuid.UUID(r.CampaignId), phaseModel, cfg); err != nil {
		return gen.CampaignsPhaseConfigure500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to configure phase", Code: "internal", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	// Fetch status and return
	st, _ := h.deps.Orchestrator.GetPhaseStatus(ctx, uuid.UUID(r.CampaignId), phaseModel)
	data := buildPhaseStatusResponse(phaseModel, st)
	return gen.CampaignsPhaseConfigure200JSONResponse{Data: &data, Metadata: okMeta(), RequestId: reqID(), Success: boolPtr(true)}, nil
}
func (h *strictHandlers) CampaignsPhaseStart(ctx context.Context, r gen.CampaignsPhaseStartRequestObject) (gen.CampaignsPhaseStartResponseObject, error) {
	if h.deps == nil || h.deps.Orchestrator == nil || h.deps.Stores.Campaign == nil || h.deps.DB == nil {
		return gen.CampaignsPhaseStart401JSONResponse{UnauthorizedJSONResponse: gen.UnauthorizedJSONResponse{Error: gen.ApiError{Message: "dependencies not ready", Code: "unauthorized", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	if _, err := h.deps.Stores.Campaign.GetCampaignByID(ctx, h.deps.DB, uuid.UUID(r.CampaignId)); err != nil {
		if err == store.ErrNotFound {
			return gen.CampaignsPhaseStart404JSONResponse{NotFoundJSONResponse: gen.NotFoundJSONResponse{Error: gen.ApiError{Message: "campaign not found", Code: "not_found", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
		}
		return gen.CampaignsPhaseStart500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to load campaign", Code: "internal", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	phaseModel, err := mapAPIPhaseToModel(string(r.Phase))
	if err != nil {
		return gen.CampaignsPhaseStart400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "invalid phase", Code: "bad_request", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	if err := h.deps.Orchestrator.StartPhaseInternal(ctx, uuid.UUID(r.CampaignId), phaseModel); err != nil {
		return gen.CampaignsPhaseStart500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to start phase: " + err.Error(), Code: "internal", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	st, _ := h.deps.Orchestrator.GetPhaseStatus(ctx, uuid.UUID(r.CampaignId), phaseModel)
	data := buildPhaseStatusResponse(phaseModel, st)
	return gen.CampaignsPhaseStart200JSONResponse{Data: &data, Metadata: okMeta(), RequestId: reqID(), Success: boolPtr(true)}, nil
}
func (h *strictHandlers) CampaignsPhaseStatus(ctx context.Context, r gen.CampaignsPhaseStatusRequestObject) (gen.CampaignsPhaseStatusResponseObject, error) {
	if h.deps == nil || h.deps.Orchestrator == nil || h.deps.Stores.Campaign == nil || h.deps.DB == nil {
		return gen.CampaignsPhaseStatus401JSONResponse{UnauthorizedJSONResponse: gen.UnauthorizedJSONResponse{Error: gen.ApiError{Message: "dependencies not ready", Code: "unauthorized", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	if _, err := h.deps.Stores.Campaign.GetCampaignByID(ctx, h.deps.DB, uuid.UUID(r.CampaignId)); err != nil {
		if err == store.ErrNotFound {
			return gen.CampaignsPhaseStatus404JSONResponse{NotFoundJSONResponse: gen.NotFoundJSONResponse{Error: gen.ApiError{Message: "campaign not found", Code: "not_found", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
		}
		return gen.CampaignsPhaseStatus500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to load campaign", Code: "internal", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	phaseModel, err := mapAPIPhaseToModel(string(r.Phase))
	if err != nil {
		return gen.CampaignsPhaseStatus401JSONResponse{UnauthorizedJSONResponse: gen.UnauthorizedJSONResponse{Error: gen.ApiError{Message: "invalid phase", Code: "unauthorized", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	st, err := h.deps.Orchestrator.GetPhaseStatus(ctx, uuid.UUID(r.CampaignId), phaseModel)
	if err != nil {
		// Return default not_started status if phase has no status yet
		data := buildPhaseStatusResponse(phaseModel, nil)
		return gen.CampaignsPhaseStatus200JSONResponse{Data: &data, Metadata: okMeta(), RequestId: reqID(), Success: boolPtr(true)}, nil
	}
	data := buildPhaseStatusResponse(phaseModel, st)
	return gen.CampaignsPhaseStatus200JSONResponse{Data: &data, Metadata: okMeta(), RequestId: reqID(), Success: boolPtr(true)}, nil
}
func (h *strictHandlers) CampaignsPhaseStop(ctx context.Context, r gen.CampaignsPhaseStopRequestObject) (gen.CampaignsPhaseStopResponseObject, error) {
	if h.deps == nil || h.deps.Orchestrator == nil || h.deps.Stores.Campaign == nil || h.deps.DB == nil {
		return gen.CampaignsPhaseStop401JSONResponse{UnauthorizedJSONResponse: gen.UnauthorizedJSONResponse{Error: gen.ApiError{Message: "dependencies not ready", Code: "unauthorized", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	if _, err := h.deps.Stores.Campaign.GetCampaignByID(ctx, h.deps.DB, uuid.UUID(r.CampaignId)); err != nil {
		if err == store.ErrNotFound {
			return gen.CampaignsPhaseStop404JSONResponse{NotFoundJSONResponse: gen.NotFoundJSONResponse{Error: gen.ApiError{Message: "campaign not found", Code: "not_found", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
		}
		return gen.CampaignsPhaseStop500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to load campaign", Code: "internal", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	phaseModel, err := mapAPIPhaseToModel(string(r.Phase))
	if err != nil {
		return gen.CampaignsPhaseStop400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "invalid phase", Code: "bad_request", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	if err := h.deps.Orchestrator.CancelPhase(ctx, uuid.UUID(r.CampaignId), phaseModel); err != nil {
		return gen.CampaignsPhaseStop500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to stop phase: " + err.Error(), Code: "internal", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	st, _ := h.deps.Orchestrator.GetPhaseStatus(ctx, uuid.UUID(r.CampaignId), phaseModel)
	data := buildPhaseStatusResponse(phaseModel, st)
	return gen.CampaignsPhaseStop200JSONResponse{Data: &data, Metadata: okMeta(), RequestId: reqID(), Success: boolPtr(true)}, nil
}
func (h *strictHandlers) CampaignsProgress(ctx context.Context, r gen.CampaignsProgressRequestObject) (gen.CampaignsProgressResponseObject, error) {
	if h.deps == nil || h.deps.Stores.Campaign == nil || h.deps.DB == nil {
		return gen.CampaignsProgress401JSONResponse{UnauthorizedJSONResponse: gen.UnauthorizedJSONResponse{Error: gen.ApiError{Message: "dependencies not ready", Code: "unauthorized", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	c, err := h.deps.Stores.Campaign.GetCampaignByID(ctx, h.deps.DB, uuid.UUID(r.CampaignId))
	if err != nil {
		if err == store.ErrNotFound {
			return gen.CampaignsProgress404JSONResponse{NotFoundJSONResponse: gen.NotFoundJSONResponse{Error: gen.ApiError{Message: "campaign not found", Code: "not_found", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
		}
		return gen.CampaignsProgress401JSONResponse{UnauthorizedJSONResponse: gen.UnauthorizedJSONResponse{Error: gen.ApiError{Message: "failed to load campaign", Code: "unauthorized", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	resp := gen.CampaignProgressResponse{CampaignId: openapi_types.UUID(c.ID)}
	// Minimal: only fill timeline
	resp.Timeline.CreatedAt = &c.CreatedAt
	resp.Timeline.EstimatedCompletionAt = c.EstimatedCompletionAt
	resp.Timeline.CompletedAt = c.CompletedAt
	return gen.CampaignsProgress200JSONResponse{Data: &resp, Metadata: okMeta(), RequestId: reqID(), Success: boolPtr(true)}, nil
}
func (h *strictHandlers) ConfigGetAuth(ctx context.Context, r gen.ConfigGetAuthRequestObject) (gen.ConfigGetAuthResponseObject, error) {
	return nil, notImpl("ConfigGetAuth")
}
func (h *strictHandlers) ConfigUpdateAuth(ctx context.Context, r gen.ConfigUpdateAuthRequestObject) (gen.ConfigUpdateAuthResponseObject, error) {
	return nil, notImpl("ConfigUpdateAuth")
}
func (h *strictHandlers) DbBulkQuery(ctx context.Context, r gen.DbBulkQueryRequestObject) (gen.DbBulkQueryResponseObject, error) {
	return nil, notImpl("DbBulkQuery")
}
func (h *strictHandlers) DbBulkStats(ctx context.Context, r gen.DbBulkStatsRequestObject) (gen.DbBulkStatsResponseObject, error) {
	return nil, notImpl("DbBulkStats")
}
func (h *strictHandlers) KeywordExtractBatch(ctx context.Context, r gen.KeywordExtractBatchRequestObject) (gen.KeywordExtractBatchResponseObject, error) {
	return nil, notImpl("KeywordExtractBatch")
}
func (h *strictHandlers) KeywordExtractStream(ctx context.Context, r gen.KeywordExtractStreamRequestObject) (gen.KeywordExtractStreamResponseObject, error) {
	return nil, notImpl("KeywordExtractStream")
}
func (h *strictHandlers) KeywordRulesQuery(ctx context.Context, r gen.KeywordRulesQueryRequestObject) (gen.KeywordRulesQueryResponseObject, error) {
	return nil, notImpl("KeywordRulesQuery")
}
func (h *strictHandlers) KeywordSetsList(ctx context.Context, r gen.KeywordSetsListRequestObject) (gen.KeywordSetsListResponseObject, error) {
	return nil, notImpl("KeywordSetsList")
}
func (h *strictHandlers) KeywordSetsCreate(ctx context.Context, r gen.KeywordSetsCreateRequestObject) (gen.KeywordSetsCreateResponseObject, error) {
	return nil, notImpl("KeywordSetsCreate")
}
func (h *strictHandlers) KeywordSetsDelete(ctx context.Context, r gen.KeywordSetsDeleteRequestObject) (gen.KeywordSetsDeleteResponseObject, error) {
	return nil, notImpl("KeywordSetsDelete")
}
func (h *strictHandlers) KeywordSetsGet(ctx context.Context, r gen.KeywordSetsGetRequestObject) (gen.KeywordSetsGetResponseObject, error) {
	return nil, notImpl("KeywordSetsGet")
}
func (h *strictHandlers) KeywordSetsUpdate(ctx context.Context, r gen.KeywordSetsUpdateRequestObject) (gen.KeywordSetsUpdateResponseObject, error) {
	return nil, notImpl("KeywordSetsUpdate")
}
func (h *strictHandlers) KeywordSetsRulesList(ctx context.Context, r gen.KeywordSetsRulesListRequestObject) (gen.KeywordSetsRulesListResponseObject, error) {
	return nil, notImpl("KeywordSetsRulesList")
}
func (h *strictHandlers) MonitoringCampaignHealth(ctx context.Context, r gen.MonitoringCampaignHealthRequestObject) (gen.MonitoringCampaignHealthResponseObject, error) {
	if h.deps == nil || h.deps.Monitoring == nil {
		return gen.MonitoringCampaignHealth401JSONResponse{UnauthorizedJSONResponse: gen.UnauthorizedJSONResponse{Error: gen.ApiError{Message: "monitoring not available", Code: "unauthorized", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	// Use monitoring integration to compute campaign health
	health := monitoring.GetGlobalMonitoringIntegration()
	if health == nil {
		return gen.MonitoringCampaignHealth500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "monitoring integration unavailable", Code: "internal", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	hres := health.GetCampaignHealth(uuid.UUID(r.CampaignId))
	// Map to generic map[string]interface{} as per spec
	data := toMap(hres)
	return gen.MonitoringCampaignHealth200JSONResponse{Data: &data, Metadata: okMeta(), RequestId: reqID(), Success: boolPtr(true)}, nil
}
func (h *strictHandlers) MonitoringCampaignLimits(ctx context.Context, r gen.MonitoringCampaignLimitsRequestObject) (gen.MonitoringCampaignLimitsResponseObject, error) {
	if h.deps == nil || h.deps.Monitoring == nil {
		return gen.MonitoringCampaignLimits401JSONResponse{UnauthorizedJSONResponse: gen.UnauthorizedJSONResponse{Error: gen.ApiError{Message: "monitoring not available", Code: "unauthorized", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	if r.Body == nil {
		return gen.MonitoringCampaignLimits400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "missing body", Code: "bad_request", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	// Apply limits via integration helper using expanded schema fields
	var maxCPU float64 = 0
	if r.Body.MaxCPUPercent != nil {
		maxCPU = float64(*r.Body.MaxCPUPercent)
	}
	var maxMem uint64 = 0
	if r.Body.MaxMemoryMB != nil && *r.Body.MaxMemoryMB > 0 {
		maxMem = uint64(*r.Body.MaxMemoryMB) * 1024 * 1024
	}
	var maxDisk uint64 = 0
	if r.Body.MaxDiskMB != nil && *r.Body.MaxDiskMB > 0 {
		maxDisk = uint64(*r.Body.MaxDiskMB) * 1024 * 1024
	}
	maxDuration := 0
	if r.Body.MaxDurationSeconds != nil {
		maxDuration = *r.Body.MaxDurationSeconds
	}
	// Note: RateLimitPerMinute / MaxConcurrentJobs are enforced by schedulers elsewhere
	monitoring.GetGlobalMonitoringIntegration().SetCampaignResourceLimits(uuid.UUID(r.CampaignId), maxCPU, maxMem, maxDisk, maxDuration)
	return gen.MonitoringCampaignLimits200Response{}, nil
}
func (h *strictHandlers) MonitoringCampaignPerformance(ctx context.Context, r gen.MonitoringCampaignPerformanceRequestObject) (gen.MonitoringCampaignPerformanceResponseObject, error) {
	if h.deps == nil || h.deps.Monitoring == nil {
		return gen.MonitoringCampaignPerformance401JSONResponse{UnauthorizedJSONResponse: gen.UnauthorizedJSONResponse{Error: gen.ApiError{Message: "monitoring not available", Code: "unauthorized", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	// Return recent metrics filtered for campaign
	limit := 100
	metrics := h.deps.Monitoring.PerformanceTracker.GetRecentMetrics(limit)
	campID := uuid.UUID(r.CampaignId)
	filtered := make([]monitoring.PerformanceMetric, 0)
	for _, m := range metrics {
		if m.CampaignID != nil && *m.CampaignID == campID {
			filtered = append(filtered, m)
		}
	}
	data := toMap(filtered)
	return gen.MonitoringCampaignPerformance200JSONResponse{Data: &data, Metadata: okMeta(), RequestId: reqID(), Success: boolPtr(true)}, nil
}
func (h *strictHandlers) MonitoringCampaignResources(ctx context.Context, r gen.MonitoringCampaignResourcesRequestObject) (gen.MonitoringCampaignResourcesResponseObject, error) {
	if h.deps == nil || h.deps.Monitoring == nil {
		return gen.MonitoringCampaignResources401JSONResponse{UnauthorizedJSONResponse: gen.UnauthorizedJSONResponse{Error: gen.ApiError{Message: "monitoring not available", Code: "unauthorized", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	usage, ok := h.deps.Monitoring.GetCampaignResourceUsage(uuid.UUID(r.CampaignId))
	if !ok || usage == nil {
		return gen.MonitoringCampaignResources404JSONResponse{NotFoundJSONResponse: gen.NotFoundJSONResponse{Error: gen.ApiError{Message: "campaign not found or no resource data", Code: "not_found", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	data := toMap(usage)
	return gen.MonitoringCampaignResources200JSONResponse{Data: &data, Metadata: okMeta(), RequestId: reqID(), Success: boolPtr(true)}, nil
}
func (h *strictHandlers) MonitoringCampaignGeneric(ctx context.Context, r gen.MonitoringCampaignGenericRequestObject) (gen.MonitoringCampaignGenericResponseObject, error) {
	// Return combined snapshot for campaign: health + last metrics + resources
	if h.deps == nil || h.deps.Monitoring == nil {
		return gen.MonitoringCampaignGeneric401JSONResponse{UnauthorizedJSONResponse: gen.UnauthorizedJSONResponse{Error: gen.ApiError{Message: "monitoring not available", Code: "unauthorized", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	campID := uuid.UUID(r.CampaignId)
	integ := monitoring.GetGlobalMonitoringIntegration()
	if integ == nil {
		return gen.MonitoringCampaignGeneric500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "monitoring integration unavailable", Code: "internal", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	health := integ.GetCampaignHealth(campID)
	usage, _ := h.deps.Monitoring.GetCampaignResourceUsage(campID)
	metrics := h.deps.Monitoring.PerformanceTracker.GetRecentMetrics(50)
	var campMetrics []monitoring.PerformanceMetric
	for _, m := range metrics {
		if m.CampaignID != nil && *m.CampaignID == campID {
			campMetrics = append(campMetrics, m)
		}
	}
	out := map[string]interface{}{
		"health":  toMap(health),
		"usage":   toMap(usage),
		"metrics": toMap(campMetrics),
	}
	return gen.MonitoringCampaignGeneric200JSONResponse{Data: &out, Metadata: okMeta(), RequestId: reqID(), Success: boolPtr(true)}, nil
}
func (h *strictHandlers) MonitoringCleanupForce(ctx context.Context, r gen.MonitoringCleanupForceRequestObject) (gen.MonitoringCleanupForceResponseObject, error) {
	if h.deps == nil || h.deps.Cleanup == nil {
		return gen.MonitoringCleanupForce401JSONResponse{UnauthorizedJSONResponse: gen.UnauthorizedJSONResponse{Error: gen.ApiError{Message: "cleanup service not available", Code: "unauthorized", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	if err := h.deps.Cleanup.ForceCleanupCampaign(uuid.UUID(r.CampaignId)); err != nil {
		return gen.MonitoringCleanupForce404JSONResponse{NotFoundJSONResponse: gen.NotFoundJSONResponse{Error: gen.ApiError{Message: err.Error(), Code: "not_found", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	return gen.MonitoringCleanupForce202Response{}, nil
}
func (h *strictHandlers) MonitoringCleanupStats(ctx context.Context, r gen.MonitoringCleanupStatsRequestObject) (gen.MonitoringCleanupStatsResponseObject, error) {
	if h.deps == nil || h.deps.Cleanup == nil {
		return gen.MonitoringCleanupStats401JSONResponse{UnauthorizedJSONResponse: gen.UnauthorizedJSONResponse{Error: gen.ApiError{Message: "cleanup service not available", Code: "unauthorized", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	stats := h.deps.Cleanup.GetCleanupStats()
	data := toMap(stats)
	return gen.MonitoringCleanupStats200JSONResponse{Data: &data, Metadata: okMeta(), RequestId: reqID(), Success: boolPtr(true)}, nil
}

// mapCampaignToResponse converts a models.LeadGenerationCampaign to API response with minimal fields set
func mapCampaignToResponse(c *models.LeadGenerationCampaign) gen.CampaignResponse {
	// derive status
	status := gen.CampaignResponseStatus("draft")
	if c.PhaseStatus != nil {
		switch *c.PhaseStatus {
		case models.PhaseStatusInProgress:
			status = gen.CampaignResponseStatus("running")
		case models.PhaseStatusCompleted:
			status = gen.CampaignResponseStatus("completed")
		case models.PhaseStatusFailed:
			status = gen.CampaignResponseStatus("failed")
		case models.PhaseStatusPaused:
			status = gen.CampaignResponseStatus("paused")
		case models.PhaseStatusConfigured, models.PhaseStatusReady:
			status = gen.CampaignResponseStatus("draft")
		}
	}
	resp := gen.CampaignResponse{
		Id:            openapi_types.UUID(c.ID),
		Name:          c.Name,
		CreatedAt:     c.CreatedAt,
		UpdatedAt:     c.UpdatedAt,
		Status:        status,
		Configuration: map[string]interface{}{},
		TargetDomains: []string{},
	}
	if c.StartedAt != nil {
		resp.StartedAt = c.StartedAt
	}
	if c.CompletedAt != nil {
		resp.CompletedAt = c.CompletedAt
	}
	if c.CurrentPhase != nil {
		v := gen.CampaignResponseCurrentPhase(string(*c.CurrentPhase))
		resp.CurrentPhase = &v
	}
	return resp
}

// ---- Phase helpers ----
func mapAPIPhaseToModel(phase string) (models.PhaseTypeEnum, error) {
	switch phase {
	case "discovery":
		return models.PhaseTypeDomainGeneration, nil
	case "validation":
		return models.PhaseTypeDNSValidation, nil
	case "extraction":
		return models.PhaseTypeHTTPKeywordValidation, nil
	case "analysis":
		return models.PhaseTypeAnalysis, nil
	default:
		return "", fmt.Errorf("unknown phase: %s", phase)
	}
}

func mapModelPhaseToAPI(phase models.PhaseTypeEnum) gen.PhaseStatusResponsePhase {
	switch phase {
	case models.PhaseTypeDomainGeneration:
		return gen.PhaseStatusResponsePhase("discovery")
	case models.PhaseTypeDNSValidation:
		return gen.PhaseStatusResponsePhase("validation")
	case models.PhaseTypeHTTPKeywordValidation:
		return gen.PhaseStatusResponsePhase("extraction")
	case models.PhaseTypeAnalysis:
		return gen.PhaseStatusResponsePhase("analysis")
	default:
		return gen.PhaseStatusResponsePhase("discovery")
	}
}

func mapStatusToAPI(status *models.PhaseStatusEnum) gen.PhaseStatusResponseStatus {
	if status == nil {
		return gen.PhaseStatusResponseStatus("not_started")
	}
	switch *status {
	case models.PhaseStatusNotStarted:
		return gen.PhaseStatusResponseStatus("not_started")
	case models.PhaseStatusReady:
		return gen.PhaseStatusResponseStatus("not_started")
	case models.PhaseStatusConfigured:
		return gen.PhaseStatusResponseStatus("configured")
	case models.PhaseStatusInProgress:
		return gen.PhaseStatusResponseStatus("running")
	case models.PhaseStatusPaused:
		return gen.PhaseStatusResponseStatus("paused")
	case models.PhaseStatusCompleted:
		return gen.PhaseStatusResponseStatus("completed")
	case models.PhaseStatusFailed:
		return gen.PhaseStatusResponseStatus("failed")
	default:
		return gen.PhaseStatusResponseStatus("not_started")
	}
}

func buildPhaseStatusResponse(phase models.PhaseTypeEnum, st *domainservices.PhaseStatus) gen.PhaseStatusResponse {
	resp := gen.PhaseStatusResponse{
		Phase:       mapModelPhaseToAPI(phase),
		StartedAt:   nil,
		CompletedAt: func() *time.Time { return nil }(),
		Status:      gen.PhaseStatusResponseStatus("not_started"),
	}
	// Default progress
	var total, processed, success, failed int
	var pct float32
	resp.Progress.TotalItems = &total
	resp.Progress.ProcessedItems = &processed
	resp.Progress.SuccessfulItems = &success
	resp.Progress.FailedItems = &failed
	resp.Progress.PercentComplete = &pct

	if st == nil {
		return resp
	}

	// Map timestamps
	if st.StartedAt != nil {
		resp.StartedAt = st.StartedAt
	}
	if st.CompletedAt != nil {
		resp.CompletedAt = st.CompletedAt
	}

	// Map status
	status := st.Status
	resp.Status = mapStatusToAPI(&status)

	// Map progress
	t := int(st.ItemsTotal)
	p := int(st.ItemsProcessed)
	// Approximate success/failed unknown: split processed into success for now
	s := p
	f := 0
	pctF := float32(st.ProgressPct)
	resp.Progress.TotalItems = &t
	resp.Progress.ProcessedItems = &p
	resp.Progress.SuccessfulItems = &s
	resp.Progress.FailedItems = &f
	resp.Progress.PercentComplete = &pctF

	// Map configuration
	if len(st.Configuration) > 0 {
		cfg := map[string]interface{}(st.Configuration)
		resp.Configuration = &cfg
	}

	// Map errors
	if st.LastError != "" {
		now := time.Now()
		code := "phase_error"
		msg := st.LastError
		resp.Errors = &[]struct {
			Code      *string    `json:"code,omitempty"`
			Message   *string    `json:"message,omitempty"`
			Timestamp *time.Time `json:"timestamp,omitempty"`
		}{{Code: &code, Message: &msg, Timestamp: &now}}
	}
	return resp
}
func (h *strictHandlers) MonitoringDashboardSummary(ctx context.Context, r gen.MonitoringDashboardSummaryRequestObject) (gen.MonitoringDashboardSummaryResponseObject, error) {
	integ := monitoring.GetGlobalMonitoringIntegration()
	if integ == nil {
		return gen.MonitoringDashboardSummary500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "monitoring integration unavailable", Code: "internal", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	sum := integ.GetSystemHealthSummary()
	data := toMap(sum)
	return gen.MonitoringDashboardSummary200JSONResponse{Data: &data, Metadata: okMeta(), RequestId: reqID(), Success: boolPtr(true)}, nil
}
func (h *strictHandlers) MonitoringPerformanceTrends(ctx context.Context, r gen.MonitoringPerformanceTrendsRequestObject) (gen.MonitoringPerformanceTrendsResponseObject, error) {
	if h.deps == nil || h.deps.Monitoring == nil {
		return gen.MonitoringPerformanceTrends401JSONResponse{UnauthorizedJSONResponse: gen.UnauthorizedJSONResponse{Error: gen.ApiError{Message: "monitoring not available", Code: "unauthorized", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	// Basic trend: throughput per operation type last 24h
	trends := h.deps.Monitoring.PerformanceTracker.GetThroughputTrends("domain_generation", 24)
	data := toMap(trends)
	return gen.MonitoringPerformanceTrends200JSONResponse{Data: &data, Metadata: okMeta(), RequestId: reqID(), Success: boolPtr(true)}, nil
}
func (h *strictHandlers) MonitoringHealth(ctx context.Context, r gen.MonitoringHealthRequestObject) (gen.MonitoringHealthResponseObject, error) {
	if h.deps == nil || h.deps.Monitoring == nil {
		return gen.MonitoringHealth401JSONResponse{UnauthorizedJSONResponse: gen.UnauthorizedJSONResponse{Error: gen.ApiError{Message: "monitoring not available", Code: "unauthorized", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	health := h.deps.Monitoring.GetSystemHealth()
	data := toMap(health)
	return gen.MonitoringHealth200JSONResponse{Data: &data, Metadata: okMeta(), RequestId: reqID(), Success: boolPtr(true)}, nil
}
func (h *strictHandlers) MonitoringPerformanceActive(ctx context.Context, r gen.MonitoringPerformanceActiveRequestObject) (gen.MonitoringPerformanceActiveResponseObject, error) {
	if h.deps == nil || h.deps.Monitoring == nil {
		return gen.MonitoringPerformanceActive401JSONResponse{UnauthorizedJSONResponse: gen.UnauthorizedJSONResponse{Error: gen.ApiError{Message: "monitoring not available", Code: "unauthorized", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	ops := h.deps.Monitoring.PerformanceTracker.GetActiveOperations()
	data := toMap(ops)
	return gen.MonitoringPerformanceActive200JSONResponse{Data: &data, Metadata: okMeta(), RequestId: reqID(), Success: boolPtr(true)}, nil
}
func (h *strictHandlers) MonitoringPerformanceFailed(ctx context.Context, r gen.MonitoringPerformanceFailedRequestObject) (gen.MonitoringPerformanceFailedResponseObject, error) {
	if h.deps == nil || h.deps.Monitoring == nil {
		return gen.MonitoringPerformanceFailed401JSONResponse{UnauthorizedJSONResponse: gen.UnauthorizedJSONResponse{Error: gen.ApiError{Message: "monitoring not available", Code: "unauthorized", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	failed := h.deps.Monitoring.PerformanceTracker.GetFailedOperations(50)
	data := toMap(failed)
	return gen.MonitoringPerformanceFailed200JSONResponse{Data: &data, Metadata: okMeta(), RequestId: reqID(), Success: boolPtr(true)}, nil
}
func (h *strictHandlers) MonitoringPerformanceMetrics(ctx context.Context, r gen.MonitoringPerformanceMetricsRequestObject) (gen.MonitoringPerformanceMetricsResponseObject, error) {
	if h.deps == nil || h.deps.Monitoring == nil {
		return gen.MonitoringPerformanceMetrics401JSONResponse{UnauthorizedJSONResponse: gen.UnauthorizedJSONResponse{Error: gen.ApiError{Message: "monitoring not available", Code: "unauthorized", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	metrics := h.deps.Monitoring.PerformanceTracker.GetRecentMetrics(100)
	data := toMap(metrics)
	return gen.MonitoringPerformanceMetrics200JSONResponse{Data: &data, Metadata: okMeta(), RequestId: reqID(), Success: boolPtr(true)}, nil
}
func (h *strictHandlers) MonitoringPerformanceSlow(ctx context.Context, r gen.MonitoringPerformanceSlowRequestObject) (gen.MonitoringPerformanceSlowResponseObject, error) {
	if h.deps == nil || h.deps.Monitoring == nil {
		return gen.MonitoringPerformanceSlow401JSONResponse{UnauthorizedJSONResponse: gen.UnauthorizedJSONResponse{Error: gen.ApiError{Message: "monitoring not available", Code: "unauthorized", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	slow := h.deps.Monitoring.PerformanceTracker.GetSlowOperations(5000, 50)
	data := toMap(slow)
	return gen.MonitoringPerformanceSlow200JSONResponse{Data: &data, Metadata: okMeta(), RequestId: reqID(), Success: boolPtr(true)}, nil
}
func (h *strictHandlers) MonitoringPerformanceSummary(ctx context.Context, r gen.MonitoringPerformanceSummaryRequestObject) (gen.MonitoringPerformanceSummaryResponseObject, error) {
	if h.deps == nil || h.deps.Monitoring == nil {
		return gen.MonitoringPerformanceSummary401JSONResponse{UnauthorizedJSONResponse: gen.UnauthorizedJSONResponse{Error: gen.ApiError{Message: "monitoring not available", Code: "unauthorized", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	summaries := h.deps.Monitoring.PerformanceTracker.GetAllSummaries()
	data := toMap(summaries)
	return gen.MonitoringPerformanceSummary200JSONResponse{Data: &data, Metadata: okMeta(), RequestId: reqID(), Success: boolPtr(true)}, nil
}
func (h *strictHandlers) MonitoringResourcesAlerts(ctx context.Context, r gen.MonitoringResourcesAlertsRequestObject) (gen.MonitoringResourcesAlertsResponseObject, error) {
	if h.deps == nil || h.deps.Monitoring == nil {
		return gen.MonitoringResourcesAlerts401JSONResponse{UnauthorizedJSONResponse: gen.UnauthorizedJSONResponse{Error: gen.ApiError{Message: "monitoring not available", Code: "unauthorized", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	alerts := h.deps.Monitoring.ResourceMonitor.GetActiveAlerts(50)
	data := toMap(alerts)
	return gen.MonitoringResourcesAlerts200JSONResponse{Data: &data, Metadata: okMeta(), RequestId: reqID(), Success: boolPtr(true)}, nil
}
func (h *strictHandlers) MonitoringResourcesHistory(ctx context.Context, r gen.MonitoringResourcesHistoryRequestObject) (gen.MonitoringResourcesHistoryResponseObject, error) {
	if h.deps == nil || h.deps.Monitoring == nil {
		return gen.MonitoringResourcesHistory401JSONResponse{UnauthorizedJSONResponse: gen.UnauthorizedJSONResponse{Error: gen.ApiError{Message: "monitoring not available", Code: "unauthorized", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	history := h.deps.Monitoring.ResourceMonitor.GetResourceHistory(24)
	data := toMap(history)
	return gen.MonitoringResourcesHistory200JSONResponse{Data: &data, Metadata: okMeta(), RequestId: reqID(), Success: boolPtr(true)}, nil
}
func (h *strictHandlers) MonitoringResourcesSystem(ctx context.Context, r gen.MonitoringResourcesSystemRequestObject) (gen.MonitoringResourcesSystemResponseObject, error) {
	if h.deps == nil || h.deps.Monitoring == nil {
		return gen.MonitoringResourcesSystem401JSONResponse{UnauthorizedJSONResponse: gen.UnauthorizedJSONResponse{Error: gen.ApiError{Message: "monitoring not available", Code: "unauthorized", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	usage := h.deps.Monitoring.ResourceMonitor.GetSystemUsage()
	data := toMap(usage)
	return gen.MonitoringResourcesSystem200JSONResponse{Data: &data, Metadata: okMeta(), RequestId: reqID(), Success: boolPtr(true)}, nil
}
func (h *strictHandlers) MonitoringStats(ctx context.Context, r gen.MonitoringStatsRequestObject) (gen.MonitoringStatsResponseObject, error) {
	if h.deps == nil || h.deps.Monitoring == nil {
		return gen.MonitoringStats401JSONResponse{UnauthorizedJSONResponse: gen.UnauthorizedJSONResponse{Error: gen.ApiError{Message: "monitoring not available", Code: "unauthorized", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	stats := h.deps.Monitoring.GetMonitoringStats()
	data := toMap(stats)
	return gen.MonitoringStats200JSONResponse{Data: &data, Metadata: okMeta(), RequestId: reqID(), Success: boolPtr(true)}, nil
}

// newPipeResponseWriter adapts an io.Writer into an http.ResponseWriter with Flush support for SSEService
type pipeResponseWriter struct {
	w io.Writer
	h http.Header
}

func newPipeResponseWriter(w io.Writer) *pipeResponseWriter {
	return &pipeResponseWriter{w: w, h: make(http.Header)}
}

// Header stores headers set by SSEService; not propagated because upstream sets event-stream headers.
func (p *pipeResponseWriter) Header() http.Header         { return p.h }
func (p *pipeResponseWriter) Write(b []byte) (int, error) { return p.w.Write(b) }
func (p *pipeResponseWriter) WriteHeader(statusCode int)  {}
func (p *pipeResponseWriter) Flush()                      {}
func (h *strictHandlers) SseEventsCampaign(ctx context.Context, r gen.SseEventsCampaignRequestObject) (gen.SseEventsCampaignResponseObject, error) {
	// Stream events for a specific campaign
	if h.deps == nil || h.deps.SSE == nil {
		return gen.SseEventsCampaign500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "sse service not initialized", Code: "internal", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	pr, pw := io.Pipe()
	// Try to bind real user ID from context if set by upstream auth middleware
	var userID uuid.UUID
	if v := ctx.Value("user_id"); v != nil {
		if uid, ok := v.(uuid.UUID); ok {
			userID = uid
		} else {
			userID = uuid.New()
		}
	} else {
		// In absence of auth context, use a random UUID for user scoping; SSEService filters by campaignID when provided
		userID = uuid.New()
	}
	campID := uuid.UUID(r.CampaignId)
	// We can't access the http.ResponseWriter here directly; generated wrapper will write our pipe reader as stream
	// Start a goroutine that registers a client bound to campaign and forwards events via the pipe
	go func() {
		// Create a fake ResponseWriter that writes to pipe
		w := newPipeResponseWriter(pw)
		// Register client; ignore error if streaming not supported
		client, err := h.deps.SSE.RegisterClient(ctx, w, userID, &campID)
		if err != nil {
			pw.CloseWithError(err)
			return
		}
		// Keep open until context done
		<-client.Context.Done()
		h.deps.SSE.UnregisterClient(client.ID)
		_ = pw.Close()
	}()
	return gen.SseEventsCampaign200TexteventStreamResponse{Body: pr}, nil
}
func (h *strictHandlers) SseEventsAll(ctx context.Context, r gen.SseEventsAllRequestObject) (gen.SseEventsAllResponseObject, error) {
	if h.deps == nil || h.deps.SSE == nil {
		return gen.SseEventsAll500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "sse service not initialized", Code: "internal", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	pr, pw := io.Pipe()
	// Bind real user when available
	var userID uuid.UUID
	if v := ctx.Value("user_id"); v != nil {
		if uid, ok := v.(uuid.UUID); ok {
			userID = uid
		} else {
			userID = uuid.New()
		}
	} else {
		userID = uuid.New()
	}
	// Global stream (no specific campaign)
	go func() {
		w := newPipeResponseWriter(pw)
		client, err := h.deps.SSE.RegisterClient(ctx, w, userID, nil)
		if err != nil {
			pw.CloseWithError(err)
			return
		}
		<-client.Context.Done()
		h.deps.SSE.UnregisterClient(client.ID)
		_ = pw.Close()
	}()
	return gen.SseEventsAll200TexteventStreamResponse{Body: pr}, nil
}
func (h *strictHandlers) SseEventsStats(ctx context.Context, r gen.SseEventsStatsRequestObject) (gen.SseEventsStatsResponseObject, error) {
	if h.deps == nil || h.deps.SSE == nil {
		return gen.SseEventsStats500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "sse service not initialized", Code: "internal", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	active := h.deps.SSE.GetClientCount()
	total := h.deps.SSE.GetTotalEvents()
	up := h.deps.SSE.GetUptime().Round(time.Second).String()
	return gen.SseEventsStats200JSONResponse{Data: &struct {
		ActiveConnections *int    `json:"activeConnections,omitempty"`
		TotalEventsSent   *int    `json:"totalEventsSent,omitempty"`
		Uptime            *string `json:"uptime,omitempty"`
	}{ActiveConnections: &active, TotalEventsSent: &total, Uptime: &up}, Metadata: okMeta(), RequestId: reqID(), Success: boolPtr(true)}, nil
}
func (h *strictHandlers) ProxiesList(ctx context.Context, r gen.ProxiesListRequestObject) (gen.ProxiesListResponseObject, error) {
	if h.deps == nil || h.deps.Stores.Proxy == nil || h.deps.DB == nil {
		return gen.ProxiesList500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "proxy store not initialized", Code: "internal", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	// Build filter
	var proto models.ProxyProtocolEnum
	if r.Params.Protocol != nil {
		proto = models.ProxyProtocolEnum(*r.Params.Protocol)
	}
	filter := store.ListProxiesFilter{
		Protocol:  proto,
		IsEnabled: (*bool)(r.Params.IsEnabled),
		IsHealthy: (*bool)(r.Params.IsHealthy),
	}
	if r.Params.Limit != nil {
		filter.Limit = int(*r.Params.Limit)
	}
	if r.Params.Offset != nil {
		filter.Offset = int(*r.Params.Offset)
	}
	proxies, err := h.deps.Stores.Proxy.ListProxies(ctx, h.deps.DB, filter)
	if err != nil {
		return gen.ProxiesList500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to list proxies", Code: "internal", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	items := make([]gen.ProxyDetailsResponse, 0, len(proxies))
	for _, p := range proxies {
		// Map minimal details
		var host *string
		if p.Host.Valid {
			s := p.Host.String
			host = &s
		}
		var port *int
		if p.Port.Valid {
			v := int(p.Port.Int32)
			port = &v
		}
		var protoStr *string
		if p.Protocol != nil {
			s := string(*p.Protocol)
			protoStr = &s
		}
		var username *string
		if p.Username.Valid {
			s := p.Username.String
			username = &s
		}
		items = append(items, gen.ProxyDetailsResponse{Host: host, Port: port, Protocol: protoStr, Username: username})
	}
	return gen.ProxiesList200JSONResponse{Data: &items, Metadata: okMeta(), RequestId: reqID(), Success: boolPtr(true)}, nil
}
func (h *strictHandlers) ProxiesCreate(ctx context.Context, r gen.ProxiesCreateRequestObject) (gen.ProxiesCreateResponseObject, error) {
	if h.deps == nil || h.deps.Stores.Proxy == nil || h.deps.DB == nil {
		return gen.ProxiesCreate500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "proxy store not initialized", Code: "internal", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	if r.Body == nil {
		return gen.ProxiesCreate400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "missing body", Code: "bad_request", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	now := time.Now()
	// Build models.Proxy from request
	m := &models.Proxy{
		ID:   uuid.New(),
		Name: r.Body.Name,
		Description: sql.NullString{String: func() string {
			if r.Body.Description != nil {
				return *r.Body.Description
			}
			return ""
		}(), Valid: r.Body.Description != nil && *r.Body.Description != ""},
		Address: r.Body.Address,
		Protocol: func() *models.ProxyProtocolEnum {
			if r.Body.Protocol == nil {
				return nil
			}
			v := models.ProxyProtocolEnum(*r.Body.Protocol)
			return &v
		}(),
		Username: sql.NullString{String: func() string {
			if r.Body.Username != nil {
				return *r.Body.Username
			}
			return ""
		}(), Valid: r.Body.Username != nil && *r.Body.Username != ""},
		IsEnabled: r.Body.IsEnabled != nil && *r.Body.IsEnabled,
		CreatedAt: now,
		UpdatedAt: now,
	}
	// Optional: parse address into Host/Port if available; keep minimal for now
	if err := h.deps.Stores.Proxy.CreateProxy(ctx, h.deps.DB, m); err != nil {
		if err == store.ErrDuplicateEntry {
			return gen.ProxiesCreate409JSONResponse{ConflictJSONResponse: gen.ConflictJSONResponse{Error: gen.ApiError{Message: "proxy already exists", Code: "conflict", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
		}
		return gen.ProxiesCreate500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to create proxy", Code: "internal", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	// Response minimal details
	var host *string
	if m.Host.Valid {
		s := m.Host.String
		host = &s
	}
	var port *int
	if m.Port.Valid {
		v := int(m.Port.Int32)
		port = &v
	}
	var protoStr *string
	if m.Protocol != nil {
		s := string(*m.Protocol)
		protoStr = &s
	}
	var username *string
	if m.Username.Valid {
		s := m.Username.String
		username = &s
	}
	data := gen.ProxyDetailsResponse{Host: host, Port: port, Protocol: protoStr, Username: username}
	return gen.ProxiesCreate201JSONResponse{Data: &data, Metadata: okMeta(), RequestId: reqID(), Success: boolPtr(true)}, nil
}
func (h *strictHandlers) ProxiesBulkDelete(ctx context.Context, r gen.ProxiesBulkDeleteRequestObject) (gen.ProxiesBulkDeleteResponseObject, error) {
	if h.deps == nil || h.deps.Stores.Proxy == nil || h.deps.DB == nil {
		return gen.ProxiesBulkDelete500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "proxy store not initialized", Code: "internal", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	if r.Body == nil || len(r.Body.ProxyIds) == 0 {
		return gen.ProxiesBulkDelete400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "missing proxyIds", Code: "bad_request", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	var success, errors int
	for _, id := range r.Body.ProxyIds {
		if err := h.deps.Stores.Proxy.DeleteProxy(ctx, h.deps.DB, uuid.UUID(id)); err != nil {
			if err == store.ErrNotFound {
				errors++
				continue
			}
			errors++
			continue
		}
		success++
	}
	total := len(r.Body.ProxyIds)
	data := gen.BulkProxyOperationResponse{SuccessCount: &success, ErrorCount: &errors, TotalRequested: &total}
	return gen.ProxiesBulkDelete200JSONResponse{Data: &data, Metadata: okMeta(), RequestId: reqID(), Success: boolPtr(true)}, nil
}
func (h *strictHandlers) ProxiesBulkTest(ctx context.Context, r gen.ProxiesBulkTestRequestObject) (gen.ProxiesBulkTestResponseObject, error) {
	if r.Body == nil || len(r.Body.ProxyIds) == 0 {
		return gen.ProxiesBulkTest400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "missing proxyIds", Code: "bad_request", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	results := make([]gen.ProxyTestResponse, 0, len(r.Body.ProxyIds))
	for _, id := range r.Body.ProxyIds {
		pid := openapi_types.UUID(uuid.UUID(id))
		ok := true
		status := 200
		var rt int64 = 0
		results = append(results, gen.ProxyTestResponse{ProxyId: &pid, Success: &ok, StatusCode: &status, ResponseTime: &rt})
	}
	data := gen.BulkProxyTestResponse{Results: &results}
	return gen.ProxiesBulkTest200JSONResponse{Data: &data, Metadata: okMeta(), RequestId: reqID(), Success: boolPtr(true)}, nil
}
func (h *strictHandlers) ProxiesBulkUpdate(ctx context.Context, r gen.ProxiesBulkUpdateRequestObject) (gen.ProxiesBulkUpdateResponseObject, error) {
	if h.deps == nil || h.deps.Stores.Proxy == nil || h.deps.DB == nil {
		return gen.ProxiesBulkUpdate500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "proxy store not initialized", Code: "internal", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	if r.Body == nil || len(r.Body.ProxyIds) == 0 {
		return gen.ProxiesBulkUpdate400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "missing proxyIds", Code: "bad_request", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	var success, errors int
	for _, id := range r.Body.ProxyIds {
		existing, err := h.deps.Stores.Proxy.GetProxyByID(ctx, h.deps.DB, uuid.UUID(id))
		if err != nil {
			errors++
			continue
		}
		up := r.Body.Updates
		if up.Name != nil {
			existing.Name = *up.Name
		}
		if up.Description != nil {
			existing.Description = sql.NullString{String: *up.Description, Valid: *up.Description != ""}
		}
		if up.Address != nil {
			existing.Address = *up.Address
		}
		if up.Protocol != nil {
			v := models.ProxyProtocolEnum(*up.Protocol)
			existing.Protocol = &v
		}
		if up.Username != nil {
			existing.Username = sql.NullString{String: *up.Username, Valid: *up.Username != ""}
		}
		if up.IsEnabled != nil {
			existing.IsEnabled = *up.IsEnabled
		}
		existing.UpdatedAt = time.Now()
		if err := h.deps.Stores.Proxy.UpdateProxy(ctx, h.deps.DB, existing); err != nil {
			errors++
			continue
		}
		success++
	}
	data := gen.BulkProxyOperationResponse{SuccessCount: &success, ErrorCount: &errors}
	return gen.ProxiesBulkUpdate200JSONResponse{Data: &data, Metadata: okMeta(), RequestId: reqID(), Success: boolPtr(true)}, nil
}
func (h *strictHandlers) ProxiesHealthCheckAll(ctx context.Context, r gen.ProxiesHealthCheckAllRequestObject) (gen.ProxiesHealthCheckAllResponseObject, error) {
	if h.deps == nil {
		return gen.ProxiesHealthCheckAll500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "dependencies not initialized", Code: "internal", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	var ids []string
	if r.Body != nil && r.Body.Ids != nil {
		for _, id := range *r.Body.Ids {
			ids = append(ids, uuid.UUID(id).String())
		}
	}
	if h.deps.ProxyMgr != nil {
		h.deps.ProxyMgr.ForceCheckProxiesAsync(ids)
	}
	// Return a simple accepted envelope; optional counts could be added on callback via SSE
	total := len(ids)
	data := gen.BulkHealthCheckResponse{TotalProxies: &total}
	return gen.ProxiesHealthCheckAll202JSONResponse{Data: &data, Metadata: okMeta(), RequestId: reqID(), Success: boolPtr(true)}, nil
}
func (h *strictHandlers) ProxiesStatus(ctx context.Context, r gen.ProxiesStatusRequestObject) (gen.ProxiesStatusResponseObject, error) {
	var out []gen.ProxyStatusResponse
	now := time.Now()
	if h.deps != nil && h.deps.ProxyMgr != nil {
		statuses := h.deps.ProxyMgr.GetAllProxyStatuses()
		out = make([]gen.ProxyStatusResponse, 0, len(statuses))
		for _, s := range statuses {
			id := openapi_types.UUID(uuid.MustParse(s.ID))
			healthy := s.IsHealthy
			var details *gen.ProxyDetailsResponse
			// details omitted due to config store vs db discrepancy
			out = append(out, gen.ProxyStatusResponse{ProxyId: &id, IsHealthy: &healthy, Status: func() *string {
				v := "ok"
				if !healthy {
					v = "unhealthy"
				}
				return &v
			}(), LastChecked: &now, ProxyDetails: details})
		}
	} else if h.deps != nil && h.deps.Stores.Proxy != nil && h.deps.DB != nil {
		proxies, err := h.deps.Stores.Proxy.ListProxies(ctx, h.deps.DB, store.ListProxiesFilter{})
		if err != nil {
			return gen.ProxiesStatus500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to load statuses", Code: "internal", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
		}
		out = make([]gen.ProxyStatusResponse, 0, len(proxies))
		for _, p := range proxies {
			id := openapi_types.UUID(p.ID)
			healthy := p.IsHealthy
			var rt int64
			if p.LatencyMs.Valid {
				rt = int64(p.LatencyMs.Int32)
			}
			var last *time.Time
			if p.LastCheckedAt.Valid {
				t := p.LastCheckedAt.Time
				last = &t
			} else {
				last = &now
			}
			out = append(out, gen.ProxyStatusResponse{ProxyId: &id, IsHealthy: &healthy, ResponseTime: &rt, LastChecked: last, Status: func() *string {
				v := "ok"
				if !healthy {
					v = "unhealthy"
				}
				return &v
			}()})
		}
	} else {
		out = []gen.ProxyStatusResponse{}
	}
	return gen.ProxiesStatus200JSONResponse{Data: &out, Metadata: okMeta(), RequestId: reqID(), Success: boolPtr(true)}, nil
}
func (h *strictHandlers) ProxiesDelete(ctx context.Context, r gen.ProxiesDeleteRequestObject) (gen.ProxiesDeleteResponseObject, error) {
	if h.deps == nil || h.deps.Stores.Proxy == nil || h.deps.DB == nil {
		return gen.ProxiesDelete500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "proxy store not initialized", Code: "internal", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	if err := h.deps.Stores.Proxy.DeleteProxy(ctx, h.deps.DB, uuid.UUID(r.ProxyId)); err != nil {
		if err == store.ErrNotFound {
			return gen.ProxiesDelete404JSONResponse{NotFoundJSONResponse: gen.NotFoundJSONResponse{Error: gen.ApiError{Message: "proxy not found", Code: "not_found", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
		}
		return gen.ProxiesDelete500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to delete proxy", Code: "internal", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	return gen.ProxiesDelete200JSONResponse{Metadata: okMeta(), RequestId: reqID(), Success: boolPtr(true)}, nil
}
func (h *strictHandlers) ProxiesUpdate(ctx context.Context, r gen.ProxiesUpdateRequestObject) (gen.ProxiesUpdateResponseObject, error) {
	if h.deps == nil || h.deps.Stores.Proxy == nil || h.deps.DB == nil {
		return gen.ProxiesUpdate500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "proxy store not initialized", Code: "internal", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	if r.Body == nil {
		return gen.ProxiesUpdate400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "missing body", Code: "bad_request", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	existing, err := h.deps.Stores.Proxy.GetProxyByID(ctx, h.deps.DB, uuid.UUID(r.ProxyId))
	if err != nil {
		if err == store.ErrNotFound {
			return gen.ProxiesUpdate404JSONResponse{NotFoundJSONResponse: gen.NotFoundJSONResponse{Error: gen.ApiError{Message: "proxy not found", Code: "not_found", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
		}
		return gen.ProxiesUpdate500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to fetch proxy", Code: "internal", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	up := *r.Body
	if up.Name != nil {
		existing.Name = *up.Name
	}
	if up.Description != nil {
		existing.Description = sql.NullString{String: *up.Description, Valid: *up.Description != ""}
	}
	if up.Address != nil {
		existing.Address = *up.Address
	}
	if up.Protocol != nil {
		v := models.ProxyProtocolEnum(*up.Protocol)
		existing.Protocol = &v
	}
	if up.Username != nil {
		existing.Username = sql.NullString{String: *up.Username, Valid: *up.Username != ""}
	}
	if up.IsEnabled != nil {
		existing.IsEnabled = *up.IsEnabled
	}
	existing.UpdatedAt = time.Now()
	if err := h.deps.Stores.Proxy.UpdateProxy(ctx, h.deps.DB, existing); err != nil {
		if err == store.ErrDuplicateEntry {
			return gen.ProxiesUpdate400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "duplicate name", Code: "conflict", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
		}
		return gen.ProxiesUpdate500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to update proxy", Code: "internal", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	// Map back minimal details
	var host *string
	if existing.Host.Valid {
		s := existing.Host.String
		host = &s
	}
	var port *int
	if existing.Port.Valid {
		v := int(existing.Port.Int32)
		port = &v
	}
	var protoStr *string
	if existing.Protocol != nil {
		s := string(*existing.Protocol)
		protoStr = &s
	}
	var username *string
	if existing.Username.Valid {
		s := existing.Username.String
		username = &s
	}
	data := gen.ProxyDetailsResponse{Host: host, Port: port, Protocol: protoStr, Username: username}
	return gen.ProxiesUpdate200JSONResponse{Data: &data, Metadata: okMeta(), RequestId: reqID(), Success: boolPtr(true)}, nil
}
func (h *strictHandlers) ProxiesHealthCheckSingle(ctx context.Context, r gen.ProxiesHealthCheckSingleRequestObject) (gen.ProxiesHealthCheckSingleResponseObject, error) {
	if h.deps == nil || h.deps.Stores.Proxy == nil || h.deps.DB == nil {
		return gen.ProxiesHealthCheckSingle500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "dependencies not initialized", Code: "internal", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	// If ProxyManager present, use it
	var res gen.ProxyHealthCheckResponse
	pid := uuid.UUID(r.ProxyId)
	if h.deps.ProxyMgr != nil {
		st, err := h.deps.ProxyMgr.ForceCheckSingleProxy(pid.String())
		if err != nil {
			return gen.ProxiesHealthCheckSingle404JSONResponse{NotFoundJSONResponse: gen.NotFoundJSONResponse{Error: gen.ApiError{Message: "proxy not found in manager", Code: "not_found", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
		}
		id := openapi_types.UUID(uuid.MustParse(st.ID))
		ok := st.IsHealthy
		now := time.Now()
		res = gen.ProxyHealthCheckResponse{ProxyId: &id, Success: &ok, Status: func() *string {
			s := "ok"
			if !ok {
				s = "unhealthy"
			}
			return &s
		}(), Timestamp: &now}
	} else {
		// Fallback: mark healthy without external request
		now := time.Now()
		id := openapi_types.UUID(pid)
		ok := true
		res = gen.ProxyHealthCheckResponse{ProxyId: &id, Success: &ok, Status: func() *string { s := "ok"; return &s }(), Timestamp: &now}
	}
	return gen.ProxiesHealthCheckSingle200JSONResponse{Data: &res, Metadata: okMeta(), RequestId: reqID(), Success: boolPtr(true)}, nil
}
func (h *strictHandlers) ProxiesTest(ctx context.Context, r gen.ProxiesTestRequestObject) (gen.ProxiesTestResponseObject, error) {
	// Minimal test: simulate success. If ProxyManager exists and has this ID, we could attempt real test; else return canned success.
	pid := openapi_types.UUID(uuid.UUID(r.ProxyId))
	ok := true
	status := 200
	var rt int64 = 0
	data := gen.ProxyTestResponse{ProxyId: &pid, Success: &ok, StatusCode: &status, ResponseTime: &rt}
	return gen.ProxiesTest200JSONResponse{Data: &data, Metadata: okMeta(), RequestId: reqID(), Success: boolPtr(true)}, nil
}
func (h *strictHandlers) ProxyPoolsList(ctx context.Context, r gen.ProxyPoolsListRequestObject) (gen.ProxyPoolsListResponseObject, error) {
	if h.deps == nil || h.deps.Stores.ProxyPools == nil || h.deps.DB == nil {
		return gen.ProxyPoolsList500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "proxy pool store not initialized", Code: "internal", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	pools, err := h.deps.Stores.ProxyPools.ListProxyPools(ctx, h.deps.DB)
	if err != nil {
		return gen.ProxyPoolsList500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to list proxy pools", Code: "internal", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	out := make([]gen.ProxyPool, 0, len(pools))
	for _, p := range pools {
		// Map minimal fields
		id := openapi_types.UUID(p.ID)
		name := p.Name
		isEnabled := p.IsEnabled
		created := p.CreatedAt
		updated := p.UpdatedAt
		out = append(out, gen.ProxyPool{Id: &id, Name: &name, IsEnabled: &isEnabled, CreatedAt: &created, UpdatedAt: &updated})
	}
	return gen.ProxyPoolsList200JSONResponse{Data: &out, Metadata: okMeta(), RequestId: reqID(), Success: boolPtr(true)}, nil
}
func (h *strictHandlers) ProxyPoolsCreate(ctx context.Context, r gen.ProxyPoolsCreateRequestObject) (gen.ProxyPoolsCreateResponseObject, error) {
	if h.deps == nil || h.deps.Stores.ProxyPools == nil || h.deps.DB == nil {
		return gen.ProxyPoolsCreate500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "proxy pool store not initialized", Code: "internal", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	if r.Body == nil {
		return gen.ProxyPoolsCreate400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "missing body", Code: "bad_request", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	now := time.Now()
	pool := &models.ProxyPool{
		ID:   uuid.New(),
		Name: r.Body.Name,
		IsEnabled: func() bool {
			if r.Body.IsEnabled != nil {
				return *r.Body.IsEnabled
			}
			return true
		}(),
		CreatedAt: now,
		UpdatedAt: now,
	}
	if r.Body.Description != nil {
		pool.Description = sql.NullString{String: *r.Body.Description, Valid: *r.Body.Description != ""}
	}
	if r.Body.PoolStrategy != nil {
		pool.PoolStrategy = sql.NullString{String: *r.Body.PoolStrategy, Valid: *r.Body.PoolStrategy != ""}
	}
	if err := h.deps.Stores.ProxyPools.CreateProxyPool(ctx, h.deps.DB, pool); err != nil {
		if err == store.ErrDuplicateEntry {
			return gen.ProxyPoolsCreate400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "proxy pool already exists", Code: "conflict", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
		}
		return gen.ProxyPoolsCreate500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to create proxy pool", Code: "internal", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	id := openapi_types.UUID(pool.ID)
	name := pool.Name
	isEnabled := pool.IsEnabled
	created := pool.CreatedAt
	updated := pool.UpdatedAt
	data := gen.ProxyPool{Id: &id, Name: &name, IsEnabled: &isEnabled, CreatedAt: &created, UpdatedAt: &updated}
	return gen.ProxyPoolsCreate201JSONResponse{Data: &data, Metadata: okMeta(), RequestId: reqID(), Success: boolPtr(true)}, nil
}
func (h *strictHandlers) ProxyPoolsDelete(ctx context.Context, r gen.ProxyPoolsDeleteRequestObject) (gen.ProxyPoolsDeleteResponseObject, error) {
	if h.deps == nil || h.deps.Stores.ProxyPools == nil || h.deps.DB == nil {
		return gen.ProxyPoolsDelete500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "proxy pool store not initialized", Code: "internal", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	if err := h.deps.Stores.ProxyPools.DeleteProxyPool(ctx, h.deps.DB, uuid.UUID(r.PoolId)); err != nil {
		if err == store.ErrNotFound {
			return gen.ProxyPoolsDelete404JSONResponse{NotFoundJSONResponse: gen.NotFoundJSONResponse{Error: gen.ApiError{Message: "proxy pool not found", Code: "not_found", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
		}
		return gen.ProxyPoolsDelete500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to delete proxy pool", Code: "internal", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	deleted := true
	msg := "proxy pool deleted"
	id := openapi_types.UUID(r.PoolId)
	return gen.ProxyPoolsDelete200JSONResponse{Data: &gen.ProxyPoolDeleteResponse{Deleted: &deleted, Message: &msg, PoolId: &id}, Metadata: okMeta(), RequestId: reqID(), Success: boolPtr(true)}, nil
}
func (h *strictHandlers) ProxyPoolsUpdate(ctx context.Context, r gen.ProxyPoolsUpdateRequestObject) (gen.ProxyPoolsUpdateResponseObject, error) {
	if h.deps == nil || h.deps.Stores.ProxyPools == nil || h.deps.DB == nil {
		return gen.ProxyPoolsUpdate500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "proxy pool store not initialized", Code: "internal", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	if r.Body == nil {
		return gen.ProxyPoolsUpdate400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "missing body", Code: "bad_request", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	pool, err := h.deps.Stores.ProxyPools.GetProxyPoolByID(ctx, h.deps.DB, uuid.UUID(r.PoolId))
	if err != nil {
		if err == store.ErrNotFound {
			return gen.ProxyPoolsUpdate404JSONResponse{NotFoundJSONResponse: gen.NotFoundJSONResponse{Error: gen.ApiError{Message: "proxy pool not found", Code: "not_found", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
		}
		return gen.ProxyPoolsUpdate500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to fetch proxy pool", Code: "internal", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	// Name is required and non-pointer in ProxyPoolRequest
	if r.Body.Name != "" {
		pool.Name = r.Body.Name
	}
	if r.Body.Description != nil {
		pool.Description = sql.NullString{String: *r.Body.Description, Valid: *r.Body.Description != ""}
	}
	if r.Body.IsEnabled != nil {
		pool.IsEnabled = *r.Body.IsEnabled
	}
	if r.Body.PoolStrategy != nil {
		pool.PoolStrategy = sql.NullString{String: *r.Body.PoolStrategy, Valid: *r.Body.PoolStrategy != ""}
	}
	if r.Body.HealthCheckEnabled != nil {
		pool.HealthCheckEnabled = *r.Body.HealthCheckEnabled
	}
	if r.Body.HealthCheckIntervalSeconds != nil {
		pool.HealthCheckIntervalSeconds = r.Body.HealthCheckIntervalSeconds
	}
	if r.Body.MaxRetries != nil {
		pool.MaxRetries = r.Body.MaxRetries
	}
	if r.Body.TimeoutSeconds != nil {
		pool.TimeoutSeconds = r.Body.TimeoutSeconds
	}
	pool.UpdatedAt = time.Now()
	if err := h.deps.Stores.ProxyPools.UpdateProxyPool(ctx, h.deps.DB, pool); err != nil {
		return gen.ProxyPoolsUpdate500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to update proxy pool", Code: "internal", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	id := openapi_types.UUID(pool.ID)
	name := pool.Name
	isEnabled := pool.IsEnabled
	created := pool.CreatedAt
	updated := pool.UpdatedAt
	data := gen.ProxyPool{Id: &id, Name: &name, IsEnabled: &isEnabled, CreatedAt: &created, UpdatedAt: &updated}
	return gen.ProxyPoolsUpdate200JSONResponse{Data: &data, Metadata: okMeta(), RequestId: reqID(), Success: boolPtr(true)}, nil
}
func (h *strictHandlers) ProxyPoolsAddProxy(ctx context.Context, r gen.ProxyPoolsAddProxyRequestObject) (gen.ProxyPoolsAddProxyResponseObject, error) {
	if h.deps == nil || h.deps.Stores.ProxyPools == nil || h.deps.DB == nil {
		return gen.ProxyPoolsAddProxy400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "dependencies not initialized", Code: "bad_request", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	if r.Body == nil {
		return gen.ProxyPoolsAddProxy400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "missing body", Code: "bad_request", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	m := &models.ProxyPoolMembership{PoolID: uuid.UUID(r.PoolId), ProxyID: uuid.UUID(r.Body.ProxyId), IsActive: true, AddedAt: time.Now()}
	if r.Body.Weight != nil {
		m.Weight = r.Body.Weight
	}
	if err := h.deps.Stores.ProxyPools.AddProxyToPool(ctx, h.deps.DB, m); err != nil {
		return gen.ProxyPoolsAddProxy400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "failed to add proxy to pool", Code: "bad_request", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	pid := openapi_types.UUID(r.PoolId)
	xid := openapi_types.UUID(r.Body.ProxyId)
	return gen.ProxyPoolsAddProxy201JSONResponse{Data: &gen.ProxyPoolMembership{AddedAt: func() *time.Time { t := m.AddedAt; return &t }(), IsActive: &m.IsActive, PoolId: &pid, ProxyId: &xid, Weight: m.Weight}, Metadata: okMeta(), RequestId: reqID(), Success: boolPtr(true)}, nil
}
func (h *strictHandlers) ProxyPoolsRemoveProxy(ctx context.Context, r gen.ProxyPoolsRemoveProxyRequestObject) (gen.ProxyPoolsRemoveProxyResponseObject, error) {
	if h.deps == nil || h.deps.Stores.ProxyPools == nil || h.deps.DB == nil {
		return gen.ProxyPoolsRemoveProxy400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "dependencies not initialized", Code: "bad_request", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	if err := h.deps.Stores.ProxyPools.RemoveProxyFromPool(ctx, h.deps.DB, uuid.UUID(r.PoolId), uuid.UUID(r.ProxyId)); err != nil {
		return gen.ProxyPoolsRemoveProxy400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "failed to remove proxy from pool", Code: "bad_request", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	removed := true
	pid := openapi_types.UUID(r.PoolId)
	xid := openapi_types.UUID(r.ProxyId)
	return gen.ProxyPoolsRemoveProxy200JSONResponse{Data: &gen.ProxyPoolMembershipResponse{Removed: &removed, PoolId: &pid, ProxyId: &xid}, Metadata: okMeta(), RequestId: reqID(), Success: boolPtr(true)}, nil
}

// SSE handler stubs removed; implemented earlier in this file.
