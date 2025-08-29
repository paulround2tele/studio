package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	gen "github.com/fntelecomllc/studio/backend/internal/api/gen"
	domainservices "github.com/fntelecomllc/studio/backend/internal/domain/services"
	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/fntelecomllc/studio/backend/internal/store"
	"github.com/google/uuid"
	openapi_types "github.com/oapi-codegen/runtime/types"
)

// CampaignsList implements GET /campaigns
func (h *strictHandlers) CampaignsList(ctx context.Context, r gen.CampaignsListRequestObject) (gen.CampaignsListResponseObject, error) {
	if h.deps == nil || h.deps.DB == nil || h.deps.Stores.Campaign == nil {
		return gen.CampaignsList500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "dependencies not initialized", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	// Basic list with sane defaults; could be extended with query params later
	filter := store.ListCampaignsFilter{Limit: 50, Offset: 0}
	// If user_id context present, filter by it
	if v := ctx.Value("user_id"); v != nil {
		if s, ok := v.(string); ok && s != "" {
			filter.UserID = s
		}
	}
	rows, err := h.deps.Stores.Campaign.ListCampaigns(ctx, h.deps.DB, filter)
	if err != nil {
		return gen.CampaignsList500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to list campaigns", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	out := make([]gen.CampaignResponse, 0, len(rows))
	for _, c := range rows {
		resp := mapCampaignToResponse(c)
		out = append(out, resp)
	}
	return gen.CampaignsList200JSONResponse{Data: &out, Metadata: okMeta(), RequestId: reqID(), Success: boolPtr(true)}, nil
}

// CampaignsCreate implements POST /campaigns
func (h *strictHandlers) CampaignsCreate(ctx context.Context, r gen.CampaignsCreateRequestObject) (gen.CampaignsCreateResponseObject, error) {
	if h.deps == nil || h.deps.DB == nil || h.deps.Stores.Campaign == nil {
		return gen.CampaignsCreate500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "dependencies not initialized", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	if r.Body == nil || r.Body.Name == "" {
		return gen.CampaignsCreate400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "name is required", Code: gen.BADREQUEST, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}

	now := time.Now().UTC()
	// Default initial phase and status
	phase := models.PhaseTypeDomainGeneration
	status := models.PhaseStatusNotStarted

	// Attach user if available
	var userIDPtr *uuid.UUID
	if v := ctx.Value("user_id"); v != nil {
		if s, ok := v.(string); ok && s != "" {
			if uid, err := uuid.Parse(s); err == nil {
				userIDPtr = &uid
			}
		}
	}

	// Store configuration (if provided) into metadata JSON for now
	var metadata *json.RawMessage
	if r.Body.Configuration != nil {
		if b, err := json.Marshal(r.Body.Configuration); err == nil {
			raw := json.RawMessage(b)
			metadata = &raw
		}
	}

	campaign := &models.LeadGenerationCampaign{
		ID:           uuid.New(),
		Name:         r.Body.Name,
		UserID:       userIDPtr,
		CreatedAt:    now,
		UpdatedAt:    now,
		CurrentPhase: &phase,
		PhaseStatus:  &status,
		Metadata:     metadata,
	}

	if err := h.deps.Stores.Campaign.CreateCampaign(ctx, h.deps.DB, campaign); err != nil {
		// Best-effort conflict detection
		return gen.CampaignsCreate500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to create campaign", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}

	resp := mapCampaignToResponse(campaign)
	return gen.CampaignsCreate201JSONResponse{Data: &resp, Metadata: okMeta(), RequestId: reqID(), Success: boolPtr(true)}, nil
}

// CampaignsGet implements GET /campaigns/{campaignId}
func (h *strictHandlers) CampaignsGet(ctx context.Context, r gen.CampaignsGetRequestObject) (gen.CampaignsGetResponseObject, error) {
	if h.deps == nil || h.deps.DB == nil || h.deps.Stores.Campaign == nil {
		return gen.CampaignsGet500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "dependencies not initialized", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	c, err := h.deps.Stores.Campaign.GetCampaignByID(ctx, h.deps.DB, uuid.UUID(r.CampaignId))
	if err != nil {
		if err == store.ErrNotFound {
			return gen.CampaignsGet404JSONResponse{NotFoundJSONResponse: gen.NotFoundJSONResponse{Error: gen.ApiError{Message: "campaign not found", Code: gen.NOTFOUND, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
		}
		return gen.CampaignsGet500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to fetch campaign", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	resp := mapCampaignToResponse(c)
	return gen.CampaignsGet200JSONResponse{Data: &resp, Metadata: okMeta(), RequestId: reqID(), Success: boolPtr(true)}, nil
}

// CampaignsUpdate implements PATCH /campaigns/{campaignId}
func (h *strictHandlers) CampaignsUpdate(ctx context.Context, r gen.CampaignsUpdateRequestObject) (gen.CampaignsUpdateResponseObject, error) {
	if h.deps == nil || h.deps.DB == nil || h.deps.Stores.Campaign == nil {
		return gen.CampaignsUpdate500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "dependencies not initialized", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	if r.Body == nil {
		return gen.CampaignsUpdate400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "missing body", Code: gen.BADREQUEST, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	existing, err := h.deps.Stores.Campaign.GetCampaignByID(ctx, h.deps.DB, uuid.UUID(r.CampaignId))
	if err != nil {
		if err == store.ErrNotFound {
			return gen.CampaignsUpdate404JSONResponse{NotFoundJSONResponse: gen.NotFoundJSONResponse{Error: gen.ApiError{Message: "campaign not found", Code: gen.NOTFOUND, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
		}
		return gen.CampaignsUpdate500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to fetch campaign", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}

	up := r.Body
	if up.Name != nil {
		existing.Name = *up.Name
	}
	if up.Description != nil {
		// store description in metadata as { description: "..." } merged into existing metadata
		var m map[string]interface{}
		if existing.Metadata != nil {
			_ = json.Unmarshal(*existing.Metadata, &m)
		}
		if m == nil {
			m = map[string]interface{}{}
		}
		if up.Description != nil {
			m["description"] = *up.Description
		}
		b, _ := json.Marshal(m)
		raw := json.RawMessage(b)
		existing.Metadata = &raw
	}
	if up.Configuration != nil {
		b, _ := json.Marshal(up.Configuration)
		raw := json.RawMessage(b)
		existing.Metadata = &raw
	}
	if up.TargetDomains != nil {
		// Persist target domains into metadata until dedicated columns exist
		var m map[string]interface{}
		if existing.Metadata != nil {
			_ = json.Unmarshal(*existing.Metadata, &m)
		}
		if m == nil {
			m = map[string]interface{}{}
		}
		m["targetDomains"] = *up.TargetDomains
		b, _ := json.Marshal(m)
		raw := json.RawMessage(b)
		existing.Metadata = &raw
	}
	existing.UpdatedAt = time.Now().UTC()

	if err := h.deps.Stores.Campaign.UpdateCampaign(ctx, h.deps.DB, existing); err != nil {
		// Try to detect duplicate
		if err == sql.ErrNoRows {
			return gen.CampaignsUpdate404JSONResponse{NotFoundJSONResponse: gen.NotFoundJSONResponse{Error: gen.ApiError{Message: "campaign not found", Code: gen.NOTFOUND, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
		}
		return gen.CampaignsUpdate500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to update campaign", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}

	resp := mapCampaignToResponse(existing)
	return gen.CampaignsUpdate200JSONResponse{Data: &resp, Metadata: okMeta(), RequestId: reqID(), Success: boolPtr(true)}, nil
}

// CampaignsDelete implements DELETE /campaigns/{campaignId}
func (h *strictHandlers) CampaignsDelete(ctx context.Context, r gen.CampaignsDeleteRequestObject) (gen.CampaignsDeleteResponseObject, error) {
	if h.deps == nil || h.deps.DB == nil || h.deps.Stores.Campaign == nil {
		return gen.CampaignsDelete500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "dependencies not initialized", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	if err := h.deps.Stores.Campaign.DeleteCampaign(ctx, h.deps.DB, uuid.UUID(r.CampaignId)); err != nil {
		if err == store.ErrNotFound {
			return gen.CampaignsDelete404JSONResponse{NotFoundJSONResponse: gen.NotFoundJSONResponse{Error: gen.ApiError{Message: "campaign not found", Code: gen.NOTFOUND, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
		}
		return gen.CampaignsDelete500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to delete campaign", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	return gen.CampaignsDelete204Response{}, nil
}

// CampaignsPhaseConfigure implements POST /campaigns/{campaignId}/phase/{phase}/configure
func (h *strictHandlers) CampaignsPhaseConfigure(ctx context.Context, r gen.CampaignsPhaseConfigureRequestObject) (gen.CampaignsPhaseConfigureResponseObject, error) {
	if h.deps == nil || h.deps.Orchestrator == nil || h.deps.Stores.Campaign == nil || h.deps.DB == nil {
		return gen.CampaignsPhaseConfigure401JSONResponse{UnauthorizedJSONResponse: gen.UnauthorizedJSONResponse{Error: gen.ApiError{Message: "dependencies not ready", Code: gen.UNAUTHORIZED, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	// Ensure campaign exists
	if _, err := h.deps.Stores.Campaign.GetCampaignByID(ctx, h.deps.DB, uuid.UUID(r.CampaignId)); err != nil {
		if err == store.ErrNotFound {
			return gen.CampaignsPhaseConfigure404JSONResponse{NotFoundJSONResponse: gen.NotFoundJSONResponse{Error: gen.ApiError{Message: "campaign not found", Code: gen.NOTFOUND, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
		}
		return gen.CampaignsPhaseConfigure500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to fetch campaign", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	phaseModel, err := mapAPIPhaseToModel(string(r.Phase))
	if err != nil {
		return gen.CampaignsPhaseConfigure400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "invalid phase", Code: gen.BADREQUEST, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	var cfg interface{}
	if r.Body != nil {
		// Pass through the phase-specific configuration map when present
		cfg = r.Body.Configuration
	}
	if err := h.deps.Orchestrator.ConfigurePhase(ctx, uuid.UUID(r.CampaignId), phaseModel, cfg); err != nil {
		return gen.CampaignsPhaseConfigure500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to configure phase: " + err.Error(), Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	st, _ := h.deps.Orchestrator.GetPhaseStatus(ctx, uuid.UUID(r.CampaignId), phaseModel)
	data := buildPhaseStatusResponse(phaseModel, st)
	return gen.CampaignsPhaseConfigure200JSONResponse{Data: &data, Metadata: okMeta(), RequestId: reqID(), Success: boolPtr(true)}, nil
}

// CampaignsPhaseStart implements POST /campaigns/{campaignId}/phase/{phase}/start
func (h *strictHandlers) CampaignsPhaseStart(ctx context.Context, r gen.CampaignsPhaseStartRequestObject) (gen.CampaignsPhaseStartResponseObject, error) {
	if h.deps == nil || h.deps.Orchestrator == nil || h.deps.Stores.Campaign == nil || h.deps.DB == nil {
		return gen.CampaignsPhaseStart401JSONResponse{UnauthorizedJSONResponse: gen.UnauthorizedJSONResponse{Error: gen.ApiError{Message: "dependencies not ready", Code: gen.UNAUTHORIZED, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	if _, err := h.deps.Stores.Campaign.GetCampaignByID(ctx, h.deps.DB, uuid.UUID(r.CampaignId)); err != nil {
		if err == store.ErrNotFound {
			return gen.CampaignsPhaseStart404JSONResponse{NotFoundJSONResponse: gen.NotFoundJSONResponse{Error: gen.ApiError{Message: "campaign not found", Code: gen.NOTFOUND, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
		}
		return gen.CampaignsPhaseStart500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to fetch campaign", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	phaseModel, err := mapAPIPhaseToModel(string(r.Phase))
	if err != nil {
		return gen.CampaignsPhaseStart400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "invalid phase", Code: gen.BADREQUEST, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	if err := h.deps.Orchestrator.StartPhaseInternal(ctx, uuid.UUID(r.CampaignId), phaseModel); err != nil {
		return gen.CampaignsPhaseStart500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to start phase: " + err.Error(), Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	st, _ := h.deps.Orchestrator.GetPhaseStatus(ctx, uuid.UUID(r.CampaignId), phaseModel)
	data := buildPhaseStatusResponse(phaseModel, st)
	return gen.CampaignsPhaseStart200JSONResponse{Data: &data, Metadata: okMeta(), RequestId: reqID(), Success: boolPtr(true)}, nil
}

// CampaignsPhaseStatus implements GET /campaigns/{campaignId}/phase/{phase}/status
func (h *strictHandlers) CampaignsPhaseStatus(ctx context.Context, r gen.CampaignsPhaseStatusRequestObject) (gen.CampaignsPhaseStatusResponseObject, error) {
	if h.deps == nil || h.deps.Orchestrator == nil || h.deps.Stores.Campaign == nil || h.deps.DB == nil {
		return gen.CampaignsPhaseStatus401JSONResponse{UnauthorizedJSONResponse: gen.UnauthorizedJSONResponse{Error: gen.ApiError{Message: "dependencies not ready", Code: gen.UNAUTHORIZED, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	if _, err := h.deps.Stores.Campaign.GetCampaignByID(ctx, h.deps.DB, uuid.UUID(r.CampaignId)); err != nil {
		if err == store.ErrNotFound {
			return gen.CampaignsPhaseStatus404JSONResponse{NotFoundJSONResponse: gen.NotFoundJSONResponse{Error: gen.ApiError{Message: "campaign not found", Code: gen.NOTFOUND, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
		}
		return gen.CampaignsPhaseStatus500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to fetch campaign", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	phaseModel, err := mapAPIPhaseToModel(string(r.Phase))
	if err != nil {
		return gen.CampaignsPhaseStatus404JSONResponse{NotFoundJSONResponse: gen.NotFoundJSONResponse{Error: gen.ApiError{Message: "invalid phase", Code: gen.NOTFOUND, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	st, _ := h.deps.Orchestrator.GetPhaseStatus(ctx, uuid.UUID(r.CampaignId), phaseModel)
	data := buildPhaseStatusResponse(phaseModel, st)
	return gen.CampaignsPhaseStatus200JSONResponse{Data: &data, Metadata: okMeta(), RequestId: reqID(), Success: boolPtr(true)}, nil
}

// mapCampaignToResponse converts a models.LeadGenerationCampaign to API response
func mapCampaignToResponse(c *models.LeadGenerationCampaign) gen.CampaignResponse {
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

// CampaignsPhaseStop implements POST /campaigns/{campaignId}/phase/{phase}/stop
func (h *strictHandlers) CampaignsPhaseStop(ctx context.Context, r gen.CampaignsPhaseStopRequestObject) (gen.CampaignsPhaseStopResponseObject, error) {
	if h.deps == nil || h.deps.Orchestrator == nil || h.deps.Stores.Campaign == nil || h.deps.DB == nil {
		return gen.CampaignsPhaseStop401JSONResponse{UnauthorizedJSONResponse: gen.UnauthorizedJSONResponse{Error: gen.ApiError{Message: "dependencies not ready", Code: gen.UNAUTHORIZED, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	if _, err := h.deps.Stores.Campaign.GetCampaignByID(ctx, h.deps.DB, uuid.UUID(r.CampaignId)); err != nil {
		if err == store.ErrNotFound {
			return gen.CampaignsPhaseStop404JSONResponse{NotFoundJSONResponse: gen.NotFoundJSONResponse{Error: gen.ApiError{Message: "campaign not found", Code: gen.NOTFOUND, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
		}
		return gen.CampaignsPhaseStop500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to load campaign", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	phaseModel, err := mapAPIPhaseToModel(string(r.Phase))
	if err != nil {
		return gen.CampaignsPhaseStop400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "invalid phase", Code: gen.BADREQUEST, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	if err := h.deps.Orchestrator.CancelPhase(ctx, uuid.UUID(r.CampaignId), phaseModel); err != nil {
		return gen.CampaignsPhaseStop500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to stop phase: " + err.Error(), Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	st, _ := h.deps.Orchestrator.GetPhaseStatus(ctx, uuid.UUID(r.CampaignId), phaseModel)
	data := buildPhaseStatusResponse(phaseModel, st)
	return gen.CampaignsPhaseStop200JSONResponse{Data: &data, Metadata: okMeta(), RequestId: reqID(), Success: boolPtr(true)}, nil
}

// CampaignsProgress implements GET /campaigns/{campaignId}/progress
func (h *strictHandlers) CampaignsProgress(ctx context.Context, r gen.CampaignsProgressRequestObject) (gen.CampaignsProgressResponseObject, error) {
	if h.deps == nil || h.deps.Stores.Campaign == nil || h.deps.DB == nil {
		return gen.CampaignsProgress401JSONResponse{UnauthorizedJSONResponse: gen.UnauthorizedJSONResponse{Error: gen.ApiError{Message: "dependencies not ready", Code: gen.UNAUTHORIZED, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	c, err := h.deps.Stores.Campaign.GetCampaignByID(ctx, h.deps.DB, uuid.UUID(r.CampaignId))
	if err != nil {
		if err == store.ErrNotFound {
			return gen.CampaignsProgress404JSONResponse{NotFoundJSONResponse: gen.NotFoundJSONResponse{Error: gen.ApiError{Message: "campaign not found", Code: gen.NOTFOUND, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
		}
		return gen.CampaignsProgress401JSONResponse{UnauthorizedJSONResponse: gen.UnauthorizedJSONResponse{Error: gen.ApiError{Message: "failed to load campaign", Code: gen.UNAUTHORIZED, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	resp := gen.CampaignProgressResponse{CampaignId: openapi_types.UUID(c.ID)}
	// Minimal: only fill timeline
	resp.Timeline.CreatedAt = &c.CreatedAt
	resp.Timeline.EstimatedCompletionAt = c.EstimatedCompletionAt
	resp.Timeline.CompletedAt = c.CompletedAt
	return gen.CampaignsProgress200JSONResponse{Data: &resp, Metadata: okMeta(), RequestId: reqID(), Success: boolPtr(true)}, nil
}
