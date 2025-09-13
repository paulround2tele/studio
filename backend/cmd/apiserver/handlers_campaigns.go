package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	gen "github.com/fntelecomllc/studio/backend/internal/api/gen"
	application "github.com/fntelecomllc/studio/backend/internal/application"
	domainservices "github.com/fntelecomllc/studio/backend/internal/domain/services"
	"github.com/fntelecomllc/studio/backend/internal/domainexpert"
	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/fntelecomllc/studio/backend/internal/services"
	"github.com/fntelecomllc/studio/backend/internal/store"
	"github.com/google/uuid"
	openapi_types "github.com/oapi-codegen/runtime/types"
)

// CampaignsEnrichedGet implements GET /campaigns/{campaignId}/enriched (strict)
func (h *strictHandlers) CampaignsEnrichedGet(ctx context.Context, r gen.CampaignsEnrichedGetRequestObject) (gen.CampaignsEnrichedGetResponseObject, error) {
	if h.deps == nil || h.deps.DB == nil || h.deps.Stores.Campaign == nil {
		return gen.CampaignsEnrichedGet500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "dependencies not initialized", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	if h.deps.Logger != nil {
		h.deps.Logger.Info(ctx, "campaigns.enriched.get", map[string]interface{}{"campaign_id": r.CampaignId})
	}
	// Load campaign
	c, err := h.deps.Stores.Campaign.GetCampaignByID(ctx, h.deps.DB, uuid.UUID(r.CampaignId))
	if err != nil {
		if err == store.ErrNotFound {
			return gen.CampaignsEnrichedGet404JSONResponse{NotFoundJSONResponse: gen.NotFoundJSONResponse{Error: gen.ApiError{Message: "campaign not found", Code: gen.NOTFOUND, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
		}
		return gen.CampaignsEnrichedGet500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to fetch campaign", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	campaignResp := mapCampaignToResponse(c)

	// State and executions
	var apiState *gen.CampaignState
	if st, stErr := h.deps.Stores.Campaign.GetCampaignState(ctx, h.deps.DB, uuid.UUID(r.CampaignId)); stErr == nil && st != nil {
		s := gen.CampaignState{CampaignId: openapi_types.UUID(st.CampaignID), CurrentState: gen.CampaignStateEnum(st.CurrentState), Mode: gen.CampaignModeEnum(st.Mode), Version: st.Version, CreatedAt: st.CreatedAt, UpdatedAt: st.UpdatedAt}
		if len(st.Configuration) > 0 {
			var m map[string]interface{}
			_ = json.Unmarshal(st.Configuration, &m)
			s.Configuration = &m
		}
		apiState = &s
	}
	execs := []gen.PhaseExecution{}
	if list, peErr := h.deps.Stores.Campaign.GetPhaseExecutionsByCampaign(ctx, h.deps.DB, uuid.UUID(r.CampaignId)); peErr == nil {
		for _, pe := range list {
			if pe != nil {
				execs = append(execs, mapPhaseExecutionToAPI(*pe))
			}
		}
	}
	enriched := gen.EnrichedCampaignResponse{Campaign: campaignResp}

	// Add configsPresent map (phase -> bool) for UI readiness
	if h.deps.Stores.Campaign != nil {
		if cfgs, err := h.deps.Stores.Campaign.ListPhaseConfigs(ctx, h.deps.DB, uuid.UUID(r.CampaignId)); err == nil {
			present := map[string]bool{}
			for p := range cfgs {
				present[string(p)] = true
			}
			// inject via State.Configuration.extra or create metadata
			if enriched.State == nil {
				// create minimal state placeholder if absent to carry configsPresent
				mode := gen.CampaignModeEnum("step_by_step")
				st := gen.CampaignState{CampaignId: openapi_types.UUID(c.ID), Mode: mode, CurrentState: gen.CampaignStateEnum("draft"), Version: 1, CreatedAt: c.CreatedAt, UpdatedAt: c.UpdatedAt}
				enriched.State = &st
			}
			if enriched.State.Configuration == nil {
				m := map[string]interface{}{}
				enriched.State.Configuration = &m
			}
			(*enriched.State.Configuration)["configsPresent"] = present
		}
	}
	if apiState != nil {
		enriched.State = apiState
	}
	if len(execs) > 0 {
		enriched.PhaseExecutions = &execs
	}
	return gen.CampaignsEnrichedGet200JSONResponse{Data: &enriched, Metadata: okMeta(), RequestId: reqID(), Success: boolPtr(true)}, nil
}

// mapToDomainGenerationConfig converts a generic map into the typed DomainGenerationConfig expected by the domain generation service
func mapToDomainGenerationConfig(in map[string]interface{}) (domainservices.DomainGenerationConfig, error) {
	var cfg domainservices.DomainGenerationConfig
	if in == nil {
		return cfg, fmt.Errorf("missing configuration")
	}
	// Helper to get string
	getString := func(key string) string {
		if v, ok := in[key]; ok {
			if s, ok2 := v.(string); ok2 {
				return s
			}
		}
		return ""
	}
	// Helper to get int (from float64 JSON numbers)
	getInt := func(key string, def int) int {
		if v, ok := in[key]; ok {
			switch t := v.(type) {
			case float64:
				return int(t)
			case int:
				return t
			case int32:
				return int(t)
			case int64:
				return int(t)
			}
		}
		return def
	}
	// Helper to get int64
	getInt64 := func(key string, def int64) int64 {
		if v, ok := in[key]; ok {
			switch t := v.(type) {
			case float64:
				return int64(t)
			case int:
				return int64(t)
			case int32:
				return int64(t)
			case int64:
				return t
			}
		}
		return def
	}
	// Helper to get first TLD from array under key "tlds" or key "tld"
	getTLD := func() string {
		if v, ok := in["tld"]; ok {
			if s, ok2 := v.(string); ok2 && s != "" {
				return s
			}
		}
		if v, ok := in["tlds"]; ok {
			if arr, ok2 := v.([]interface{}); ok2 && len(arr) > 0 {
				if s, ok3 := arr[0].(string); ok3 {
					return s
				}
			}
			if arrS, ok2 := v.([]string); ok2 && len(arrS) > 0 {
				return arrS[0]
			}
		}
		return ""
	}

	cfg.PatternType = getString("patternType")
	if cfg.PatternType == "" {
		// accept snake_case too
		if v := getString("pattern_type"); v != "" {
			cfg.PatternType = v
		}
	}
	cfg.VariableLength = getInt("variableLength", 0)
	if cfg.VariableLength == 0 {
		cfg.VariableLength = getInt("variable_length", 0)
	}
	cfg.CharacterSet = getString("characterSet")
	if cfg.CharacterSet == "" {
		cfg.CharacterSet = getString("character_set")
	}
	cfg.ConstantString = getString("constantString")
	if cfg.ConstantString == "" {
		cfg.ConstantString = getString("constant_string")
	}
	cfg.TLD = getTLD()
	cfg.NumDomains = getInt64("numDomainsToGenerate", 0)
	if cfg.NumDomains == 0 {
		cfg.NumDomains = getInt64("num_domains", 0)
	}
	cfg.BatchSize = getInt("batchSize", 1000)
	if cfg.BatchSize == 0 {
		cfg.BatchSize = getInt("batch_size", 1000)
	}
	cfg.OffsetStart = getInt64("offsetStart", 0)
	if cfg.OffsetStart == 0 {
		cfg.OffsetStart = getInt64("offset_start", 0)
	}

	// Basic required checks mirroring service.Validate (allow 0 to enable constant-only domain e.g. example.com)
	if cfg.VariableLength < 0 {
		return cfg, fmt.Errorf("variableLength must be >= 0")
	}
	if cfg.CharacterSet == "" {
		return cfg, fmt.Errorf("characterSet cannot be empty")
	}
	if cfg.TLD == "" {
		return cfg, fmt.Errorf("tld cannot be empty")
	}
	if cfg.NumDomains <= 0 {
		return cfg, fmt.Errorf("numDomains must be positive")
	}
	if cfg.PatternType == "" {
		cfg.PatternType = "prefix"
	}
	return cfg, nil
}

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
		// Added diagnostic logging to surface underlying store error while keeping generic API response
		log.Printf("ERROR CampaignsList: failed to list campaigns filter=%+v err=%v", filter, err)
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

	// Attach user if available (record raw for diagnostics)
	var userIDPtr *uuid.UUID
	var rawUserID string
	if v := ctx.Value("user_id"); v != nil {
		if s, ok := v.(string); ok && s != "" {
			rawUserID = s
			if uid, err := uuid.Parse(s); err == nil {
				userIDPtr = &uid
				log.Printf("DEBUG CampaignsCreate: context user_id raw=%s parsed=%s", s, uid)
			} else {
				log.Printf("DEBUG CampaignsCreate: failed to parse context user_id=%s: %v", s, err)
			}
		}
	}

	// Defensive: verify referenced user exists to avoid FK violation if session is stale
	if userIDPtr != nil {
		var exists bool
		if err := h.deps.DB.GetContext(ctx, &exists, "SELECT EXISTS (SELECT 1 FROM users WHERE id = $1)", *userIDPtr); err == nil {
			if !exists {
				log.Printf("WARN CampaignsCreate: user %s (raw=%s) not found, clearing user_id to avoid FK error", userIDPtr.String(), rawUserID)
				userIDPtr = nil
			} else {
				log.Printf("DEBUG CampaignsCreate: verified user %s exists", userIDPtr.String())
			}
		} else {
			log.Printf("WARN CampaignsCreate: user existence check failed (%v) for raw=%s, proceeding without user_id", err, rawUserID)
			userIDPtr = nil
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
		log.Printf("ERROR CampaignsCreate: store insert error=%v user_id=%v raw_user_id=%s", err, campaign.UserID, rawUserID)
		if strings.Contains(err.Error(), "foreign key constraint \"lead_generation_campaigns_user_id_fkey\"") && campaign.UserID != nil {
			log.Printf("INFO CampaignsCreate: retrying without user_id after FK violation (user %s)", campaign.UserID.String())
			campaign.UserID = nil
			if rerr := h.deps.Stores.Campaign.CreateCampaign(ctx, h.deps.DB, campaign); rerr == nil {
				resp := mapCampaignToResponse(campaign)
				return gen.CampaignsCreate201JSONResponse{Data: &resp, Metadata: okMeta(), RequestId: reqID(), Success: boolPtr(true)}, nil
			} else {
				log.Printf("ERROR CampaignsCreate: retry without user_id failed: %v", rerr)
			}
		}
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

// CampaignsModeUpdate implements PATCH /campaigns/{campaignId}/mode (strict spec)
func (h *strictHandlers) CampaignsModeUpdate(ctx context.Context, r gen.CampaignsModeUpdateRequestObject) (gen.CampaignsModeUpdateResponseObject, error) {
	if h.deps == nil || h.deps.Stores.Campaign == nil || h.deps.DB == nil {
		return gen.CampaignsModeUpdate500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "dependencies not initialized", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	if r.Body == nil || r.Body.Mode == "" {
		return gen.CampaignsModeUpdate400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "mode is required", Code: gen.BADREQUEST, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	mode := string(r.Body.Mode)
	if mode != "full_sequence" && mode != "step_by_step" {
		return gen.CampaignsModeUpdate400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "invalid mode", Code: gen.BADREQUEST, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	campaignID := uuid.UUID(r.CampaignId)
	c, err := h.deps.Stores.Campaign.GetCampaignByID(ctx, h.deps.DB, campaignID)
	if err != nil {
		if err == store.ErrNotFound {
			return gen.CampaignsModeUpdate404JSONResponse{NotFoundJSONResponse: gen.NotFoundJSONResponse{Error: gen.ApiError{Message: "campaign not found", Code: gen.NOTFOUND, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
		}
		return gen.CampaignsModeUpdate500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to fetch campaign", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	if err := h.deps.Stores.Campaign.UpdateCampaignMode(ctx, h.deps.DB, campaignID, mode); err != nil {
		return gen.CampaignsModeUpdate500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to update mode", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	if h.deps.Metrics != nil {
		h.deps.Metrics.IncModeChanges()
	}
	if h.deps.Logger != nil {
		h.deps.Logger.Info(ctx, "campaign.mode.updated", map[string]interface{}{"campaign_id": campaignID, "mode": mode})
	}
	if h.deps.SSE != nil && c.UserID != nil {
		evt := services.CreateModeChangedEvent(campaignID, *c.UserID, mode)
		h.deps.SSE.BroadcastToCampaign(campaignID, evt)
	}
	// Successful response: data.mode per spec
	// build mode pointer
	modeEnum := gen.CampaignModeEnum(mode)
	resp := gen.CampaignsModeUpdate200JSONResponse{Data: &struct {
		Mode *gen.CampaignModeEnum `json:"mode,omitempty"`
	}{Mode: &modeEnum}, Metadata: okMeta(), RequestId: reqID(), Success: boolPtr(true)}
	return resp, nil
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
	var rawToPersist []byte
	if r.Body != nil {
		incoming := r.Body.Configuration
		if incoming == nil {
			incoming = map[string]interface{}{}
		}
		// Minimal validation per phase
		switch phaseModel {
		case models.PhaseTypeDomainGeneration:
			if typed, err := mapToDomainGenerationConfig(incoming); err == nil {
				cfg = typed
			} else {
				return gen.CampaignsPhaseConfigure400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "invalid domain generation configuration: " + err.Error(), Code: gen.BADREQUEST, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
			}
		case models.PhaseTypeDNSValidation:
			// Build typed DNSValidationConfig
			idsRaw, ok := incoming["personaIds"]
			if !ok {
				return gen.CampaignsPhaseConfigure400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "personaIds required", Code: gen.BADREQUEST, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
			}
			arrIfc, ok := idsRaw.([]interface{})
			if !ok || len(arrIfc) == 0 {
				return gen.CampaignsPhaseConfigure400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "personaIds must be a non-empty array", Code: gen.BADREQUEST, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
			}
			personaIDs := make([]uuid.UUID, 0, len(arrIfc))
			for _, v := range arrIfc {
				if s, ok := v.(string); ok {
					if id, err := uuid.Parse(s); err == nil {
						personaIDs = append(personaIDs, id)
					}
				}
			}
			if len(personaIDs) == 0 {
				return gen.CampaignsPhaseConfigure400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "no valid persona UUIDs provided", Code: gen.BADREQUEST, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
			}
			cfg = &domainservices.DNSValidationConfig{
				PersonaIDs:      personaIDs,
				BatchSize:       intFromAny(incoming["batchSize"], 100),
				Timeout:         intFromAny(incoming["timeout"], 30),
				MaxRetries:      intFromAny(incoming["maxRetries"], 2),
				ValidationTypes: sliceString(incoming["validation_types"]),
				RequiredRecords: sliceString(incoming["required_records"]),
			}
		case models.PhaseTypeHTTPKeywordValidation:
			// HTTP validation expects *models.HTTPPhaseConfigRequest
			idsRaw, ok := incoming["personaIds"]
			if !ok {
				return gen.CampaignsPhaseConfigure400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "personaIds required", Code: gen.BADREQUEST, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
			}
			arrIfc, ok := idsRaw.([]interface{})
			if !ok || len(arrIfc) == 0 {
				return gen.CampaignsPhaseConfigure400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "personaIds must be a non-empty array", Code: gen.BADREQUEST, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
			}
			personaIDs := make([]uuid.UUID, 0, len(arrIfc))
			for _, v := range arrIfc {
				if s, ok := v.(string); ok {
					if id, err := uuid.Parse(s); err == nil {
						personaIDs = append(personaIDs, id)
					}
				}
			}
			if len(personaIDs) == 0 {
				return gen.CampaignsPhaseConfigure400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "no valid persona UUIDs provided", Code: gen.BADREQUEST, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
			}
			// HTTPPhaseConfigRequest expects []string PersonaIDs; convert UUIDs to strings
			personaStrs := make([]string, 0, len(personaIDs))
			for _, id := range personaIDs {
				personaStrs = append(personaStrs, id.String())
			}
			httpCfg := &models.HTTPPhaseConfigRequest{PersonaIDs: personaStrs}
			// Optional keyword arrays
			httpCfg.Keywords = sliceString(incoming["keywords"])
			httpCfg.AdHocKeywords = sliceString(incoming["adHocKeywords"])
			cfg = httpCfg
		case models.PhaseTypeAnalysis:
			// Build typed AnalysisConfig
			idsRaw, ok := incoming["personaIds"]
			if !ok {
				return gen.CampaignsPhaseConfigure400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "personaIds required", Code: gen.BADREQUEST, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
			}
			arrIfc, ok := idsRaw.([]interface{})
			if !ok || len(arrIfc) == 0 {
				return gen.CampaignsPhaseConfigure400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "personaIds must be a non-empty array", Code: gen.BADREQUEST, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
			}
			personaIDs := make([]string, 0, len(arrIfc))
			for _, v := range arrIfc {
				if s, ok := v.(string); ok && strings.TrimSpace(s) != "" {
					personaIDs = append(personaIDs, s)
				}
			}
			if len(personaIDs) == 0 {
				return gen.CampaignsPhaseConfigure400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "no valid persona IDs provided", Code: gen.BADREQUEST, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
			}
			analysisCfg := &domainservices.AnalysisConfig{PersonaIDs: personaIDs}
			if inc, ok := incoming["includeExternal"].(bool); ok {
				analysisCfg.IncludeExternal = inc
			}
			cfg = analysisCfg
		default:
			cfg = incoming
		}
		// Marshal original (possibly normalized) config for persistence
		if b, err := json.Marshal(incoming); err == nil {
			rawToPersist = b
		}
	}
	// Persist config JSON if available
	if len(rawToPersist) > 0 {
		rawMsg := json.RawMessage(rawToPersist)
		if err := h.deps.Stores.Campaign.UpsertPhaseConfig(ctx, h.deps.DB, uuid.UUID(r.CampaignId), phaseModel, rawMsg); err != nil {
			return gen.CampaignsPhaseConfigure500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to persist phase configuration", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
		}
		if h.deps.Metrics != nil {
			h.deps.Metrics.IncPhaseConfigUpdates()
		}
	}
	if err := h.deps.Orchestrator.ConfigurePhase(ctx, uuid.UUID(r.CampaignId), phaseModel, cfg); err != nil {
		// Map known validation/precondition errors to 400
		if strings.Contains(err.Error(), "invalid") || strings.Contains(err.Error(), "cannot ") || strings.Contains(err.Error(), "must ") {
			return gen.CampaignsPhaseConfigure400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "failed to configure phase: " + err.Error(), Code: gen.BADREQUEST, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
		}
		return gen.CampaignsPhaseConfigure500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to configure phase: " + err.Error(), Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	// Immediately fetch updated status to ensure configured response reflects new configuration
	st, _ := h.deps.Orchestrator.GetPhaseStatus(ctx, uuid.UUID(r.CampaignId), phaseModel)
	data := buildPhaseStatusResponse(phaseModel, st)
	return gen.CampaignsPhaseConfigure200JSONResponse{Data: &data, Metadata: okMeta(), RequestId: reqID(), Success: boolPtr(true)}, nil
}

// intFromAny attempts to coerce an interface{} numeric to int with fallback default.
func intFromAny(v interface{}, def int) int {
	switch t := v.(type) {
	case int:
		return t
	case int32:
		return int(t)
	case int64:
		return int(t)
	case float64:
		return int(t)
	case float32:
		return int(t)
	default:
		return def
	}
}

// sliceString converts an interface (array) into []string if possible.
func sliceString(v interface{}) []string {
	if v == nil {
		return []string{}
	}
	out := []string{}
	switch arr := v.(type) {
	case []string:
		return arr
	case []interface{}:
		for _, elem := range arr {
			if s, ok := elem.(string); ok && strings.TrimSpace(s) != "" {
				out = append(out, s)
			}
		}
	}
	return out
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
		if errors.Is(err, application.ErrMissingPhaseConfigs) {
			missing := []string{}
			// Attempt typed extraction using concrete error type
			var mpe *application.MissingPhaseConfigsError
			if errors.As(err, &mpe) && mpe != nil {
				missing = mpe.Missing
			}
			conflict := gen.CampaignsPhaseStart409JSONResponse{Error: gen.ApiError{Message: "missing required phase configurations", Code: gen.CONFLICT, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}
			if len(missing) > 0 {
				conflict.MissingPhases = &missing
			}
			if h.deps.Logger != nil {
				h.deps.Logger.Warn(ctx, "campaign.phase.start.blocked_missing_configs", map[string]interface{}{"campaign_id": r.CampaignId, "phase": phaseModel, "missing": missing})
			}
			return conflict, nil
		}
		if strings.Contains(err.Error(), "not configured") || strings.Contains(err.Error(), "cannot start") {
			return gen.CampaignsPhaseStart400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "failed to start phase: " + err.Error(), Code: gen.BADREQUEST, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
		}
		return gen.CampaignsPhaseStart500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to start phase: " + err.Error(), Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	if h.deps.Logger != nil {
		h.deps.Logger.Info(ctx, "campaign.phase.start", map[string]interface{}{"campaign_id": r.CampaignId, "phase": phaseModel})
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

// CampaignsPhaseConfigsList implements GET /campaigns/{campaignId}/configs
func (h *strictHandlers) CampaignsPhaseConfigsList(ctx context.Context, r gen.CampaignsPhaseConfigsListRequestObject) (gen.CampaignsPhaseConfigsListResponseObject, error) {
	if h.deps == nil || h.deps.Stores.Campaign == nil || h.deps.DB == nil {
		return gen.CampaignsPhaseConfigsList500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "dependencies not initialized", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	// Ensure campaign exists
	if _, err := h.deps.Stores.Campaign.GetCampaignByID(ctx, h.deps.DB, uuid.UUID(r.CampaignId)); err != nil {
		if err == store.ErrNotFound {
			return gen.CampaignsPhaseConfigsList404JSONResponse{NotFoundJSONResponse: gen.NotFoundJSONResponse{Error: gen.ApiError{Message: "campaign not found", Code: gen.NOTFOUND, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
		}
		return gen.CampaignsPhaseConfigsList500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to load campaign", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	cfgs, err := h.deps.Stores.Campaign.ListPhaseConfigs(ctx, h.deps.DB, uuid.UUID(r.CampaignId))
	if err != nil {
		return gen.CampaignsPhaseConfigsList500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to list configs", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	present := map[string]bool{}
	configsOut := map[string]map[string]interface{}{}
	for p, raw := range cfgs {
		present[string(p)] = true
		if len(raw) > 0 {
			var m map[string]interface{}
			if err := json.Unmarshal(raw, &m); err == nil {
				configsOut[string(p)] = m
			}
		}
	}
	cid := openapi_types.UUID(r.CampaignId)
	if h.deps.Logger != nil {
		h.deps.Logger.Info(ctx, "campaign.phase.configs.list", map[string]interface{}{"campaign_id": r.CampaignId, "configs_present_count": len(present)})
	}
	data := &struct {
		CampaignId     *openapi_types.UUID                `json:"campaignId,omitempty"`
		Configs        *map[string]map[string]interface{} `json:"configs,omitempty"`
		ConfigsPresent *map[string]bool                   `json:"configsPresent,omitempty"`
	}{CampaignId: &cid, Configs: &configsOut, ConfigsPresent: &present}
	return gen.CampaignsPhaseConfigsList200JSONResponse{Data: data, Metadata: okMeta(), RequestId: reqID(), Success: boolPtr(true)}, nil
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
		CompletedAt: nil,
		Status:      gen.PhaseStatusResponseStatus("not_started"),
	}
	// Default progress (all zero pointers so JSON shape stable)
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

	// Map timestamps only if non-nil and not zero to avoid 0001-01-01 sentinel values
	if st.StartedAt != nil && !st.StartedAt.IsZero() {
		resp.StartedAt = st.StartedAt
	}
	if st.CompletedAt != nil && !st.CompletedAt.IsZero() {
		resp.CompletedAt = st.CompletedAt
	}

	// Map status
	status := st.Status
	resp.Status = mapStatusToAPI(&status)

	// Map progress
	t := int(st.ItemsTotal)
	p := int(st.ItemsProcessed)
	// With no granular success/failure counts yet, treat processed as success
	s := p
	f := 0
	pctF := float32(st.ProgressPct)
	resp.Progress.TotalItems = &t
	resp.Progress.ProcessedItems = &p
	resp.Progress.SuccessfulItems = &s
	resp.Progress.FailedItems = &f
	resp.Progress.PercentComplete = &pctF

	// Always include configuration snapshot if available
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
		return gen.CampaignsPhaseStop500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to fetch campaign", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
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

// CampaignsDomainsList implements GET /campaigns/{campaignId}/domains
func (h *strictHandlers) CampaignsDomainsList(ctx context.Context, r gen.CampaignsDomainsListRequestObject) (gen.CampaignsDomainsListResponseObject, error) {
	if h.deps == nil || h.deps.Stores.Campaign == nil || h.deps.DB == nil {
		return gen.CampaignsDomainsList500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "dependencies not ready", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	// Ensure campaign exists (fast fail for 404)
	_, err := h.deps.Stores.Campaign.GetCampaignByID(ctx, h.deps.DB, uuid.UUID(r.CampaignId))
	if err != nil {
		if err == store.ErrNotFound {
			return gen.CampaignsDomainsList404JSONResponse{NotFoundJSONResponse: gen.NotFoundJSONResponse{Error: gen.ApiError{Message: "campaign not found", Code: gen.NOTFOUND, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
		}
		return gen.CampaignsDomainsList500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to load campaign", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}

	// Pagination params (legacy offset path defaults)
	limit := 100
	if r.Params.Limit != nil && *r.Params.Limit > 0 {
		if *r.Params.Limit > 1000 {
			limit = 1000
		} else {
			limit = int(*r.Params.Limit)
		}
	}
	startOffset := int64(0)
	if r.Params.Offset != nil && *r.Params.Offset > 0 {
		startOffset = int64(*r.Params.Offset)
	}

	// Phase 2: Advanced filtering & cursor mode (typed params via OpenAPI)
	var (
		advancedRequested bool
		minScorePtr       *float64
		notParkedPtr      *bool
		hasContactPtr     *bool
		keywordPtr        *string
		firstParam        *int
		afterParam        *string
		sortBy            string
		sortOrder         string
	)
	featureFlag := strings.EqualFold(os.Getenv("ENABLE_ADVANCED_FILTERS"), "true") || os.Getenv("ENABLE_ADVANCED_FILTERS") == "1"
	if featureFlag {
		if r.Params.MinScore != nil {
			f := float64(*r.Params.MinScore)
			minScorePtr = &f
		}
		if r.Params.NotParked != nil {
			notParkedPtr = r.Params.NotParked
		}
		if r.Params.HasContact != nil {
			hasContactPtr = r.Params.HasContact
		}
		if r.Params.Keyword != nil && *r.Params.Keyword != "" {
			keywordPtr = r.Params.Keyword
		}
		if r.Params.First != nil && *r.Params.First > 0 {
			firstParam = r.Params.First
		}
		if r.Params.After != nil && *r.Params.After != "" {
			afterParam = r.Params.After
		}
		if r.Params.Sort != nil {
			switch *r.Params.Sort {
			case gen.ScoreDesc:
				sortBy = "domain_score"
				sortOrder = "DESC"
			case gen.ScoreAsc:
				sortBy = "domain_score"
				sortOrder = "ASC"
			case gen.LastHttpFetchedAtDesc:
				sortBy = "last_http_fetched_at"
				sortOrder = "DESC"
			}
		}
		if minScorePtr != nil || notParkedPtr != nil || hasContactPtr != nil || keywordPtr != nil || firstParam != nil || afterParam != nil || sortBy != "" {
			advancedRequested = true
		}
	}

	// Fetch current counters (for total + aggregates). Continue on error.
	var counters *models.CampaignDomainCounters
	if c, cerr := h.deps.Stores.Campaign.GetCampaignDomainCounters(ctx, h.deps.DB, uuid.UUID(r.CampaignId)); cerr == nil {
		counters = c
	}

	// Build optional filter
	var domainFilter *store.ListCampaignDomainsFilter
	if r.Params.DnsStatus != nil || r.Params.HttpStatus != nil || r.Params.DnsReason != nil || r.Params.HttpReason != nil {
		f := &store.ListCampaignDomainsFilter{}
		if r.Params.DnsStatus != nil {
			v := string(*r.Params.DnsStatus)
			f.DNSStatus = &v
		}
		if r.Params.HttpStatus != nil {
			v := string(*r.Params.HttpStatus)
			f.HTTPStatus = &v
		}
		if r.Params.DnsReason != nil {
			f.DNSReason = r.Params.DnsReason
		}
		if r.Params.HttpReason != nil {
			f.HTTPReason = r.Params.HttpReason
		}
		domainFilter = f
	}
	// Advanced path (cursor-based)
	if advancedRequested {
		lf := store.ListGeneratedDomainsFilter{CampaignID: uuid.UUID(r.CampaignId)}
		if firstParam != nil {
			lf.First = *firstParam
		} else {
			lf.First = limit
		}
		if afterParam != nil {
			lf.After = *afterParam
		}
		if sortBy != "" {
			lf.SortBy = sortBy
		}
		if sortOrder != "" {
			lf.SortOrder = sortOrder
		}
		lf.MinScore = minScorePtr
		lf.NotParked = notParkedPtr
		lf.HasContact = hasContactPtr
		lf.Keyword = keywordPtr
		page, derr := h.deps.Stores.Campaign.GetGeneratedDomainsWithCursor(ctx, h.deps.DB, lf)
		if derr != nil {
			return gen.CampaignsDomainsList500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed advanced domain listing", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
		}
		items := make([]gen.DomainListItem, 0, len(page.Data))
		for _, gd := range page.Data {
			if gd == nil {
				continue
			}
			var offsetPtr *int64
			if gd.OffsetIndex >= 0 {
				tmp := gd.OffsetIndex
				offsetPtr = &tmp
			}
			var dnsStatusPtr, httpStatusPtr, leadStatusPtr *string
			if gd.DNSStatus != nil {
				v := string(*gd.DNSStatus)
				dnsStatusPtr = &v
			}
			if gd.HTTPStatus != nil {
				v := string(*gd.HTTPStatus)
				httpStatusPtr = &v
			}
			if gd.LeadStatus != nil {
				v := string(*gd.LeadStatus)
				leadStatusPtr = &v
			}
			var dnsReasonPtr, httpReasonPtr *string
			if gd.DNSReason.Valid {
				dnsReasonPtr = &gd.DNSReason.String
			}
			if gd.HTTPReason.Valid {
				httpReasonPtr = &gd.HTTPReason.String
			}
			id := openapi_types.UUID(gd.ID)
			createdAt := gd.CreatedAt
			domainCopy := gd.DomainName
			items = append(items, gen.DomainListItem{Id: &id, Domain: &domainCopy, Offset: offsetPtr, CreatedAt: &createdAt, DnsStatus: dnsStatusPtr, HttpStatus: httpStatusPtr, LeadStatus: leadStatusPtr, DnsReason: dnsReasonPtr, HttpReason: httpReasonPtr})
		}
		resp := gen.CampaignDomainsListResponse{CampaignId: openapi_types.UUID(r.CampaignId), Items: items}
		if counters != nil {
			resp.Total = int(counters.Total)
			resp.Aggregates = buildDomainAggregates(counters)
		} else {
			resp.Total = len(items)
		}
		return gen.CampaignsDomainsList200JSONResponse{Data: &resp, Metadata: okMeta(), RequestId: reqID(), Success: boolPtr(true)}, nil
	}

	rows, derr := h.deps.Stores.Campaign.GetGeneratedDomainsByCampaign(ctx, h.deps.DB, uuid.UUID(r.CampaignId), limit, startOffset, domainFilter)
	if derr != nil {
		return gen.CampaignsDomainsList500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed domain listing", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}

	items := make([]gen.DomainListItem, 0, len(rows))
	for _, gd := range rows {
		if gd == nil {
			continue
		}
		var offsetPtr *int64
		if gd.OffsetIndex >= 0 {
			tmp := gd.OffsetIndex
			offsetPtr = &tmp
		}
		var dnsStatusPtr, httpStatusPtr, leadStatusPtr *string
		if gd.DNSStatus != nil {
			v := string(*gd.DNSStatus)
			dnsStatusPtr = &v
		}
		if gd.HTTPStatus != nil {
			v := string(*gd.HTTPStatus)
			httpStatusPtr = &v
		}
		if gd.LeadStatus != nil {
			v := string(*gd.LeadStatus)
			leadStatusPtr = &v
		}
		var dnsReasonPtr, httpReasonPtr *string
		if gd.DNSReason.Valid {
			dnsReasonPtr = &gd.DNSReason.String
		}
		if gd.HTTPReason.Valid {
			httpReasonPtr = &gd.HTTPReason.String
		}
		id := openapi_types.UUID(gd.ID)
		createdAt := gd.CreatedAt
		domainCopy := gd.DomainName
		items = append(items, gen.DomainListItem{Id: &id, Domain: &domainCopy, Offset: offsetPtr, CreatedAt: &createdAt, DnsStatus: dnsStatusPtr, HttpStatus: httpStatusPtr, LeadStatus: leadStatusPtr, DnsReason: dnsReasonPtr, HttpReason: httpReasonPtr})
	}

	resp := gen.CampaignDomainsListResponse{CampaignId: openapi_types.UUID(r.CampaignId), Items: items}
	if counters != nil { // prefer counters total; fallback to len(items)
		resp.Total = int(counters.Total)
		resp.Aggregates = buildDomainAggregates(counters)
	} else {
		resp.Total = len(items)
	}
	return gen.CampaignsDomainsList200JSONResponse{Data: &resp, Metadata: okMeta(), RequestId: reqID(), Success: boolPtr(true)}, nil
}

// CampaignsDomainGenerationPatternOffset implements POST /campaigns/domain-generation/pattern-offset
func (h *strictHandlers) CampaignsDomainGenerationPatternOffset(ctx context.Context, r gen.CampaignsDomainGenerationPatternOffsetRequestObject) (gen.CampaignsDomainGenerationPatternOffsetResponseObject, error) {
	if h.deps == nil || h.deps.Stores.Campaign == nil || h.deps.DB == nil {
		return gen.CampaignsDomainGenerationPatternOffset500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "dependencies not ready", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	if r.Body == nil {
		return gen.CampaignsDomainGenerationPatternOffset400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "missing body", Code: gen.BADREQUEST, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	// Build params and hash using domainexpert to compute config hash
	constant := r.Body.ConstantString
	if constant == nil {
		s := ""
		constant = &s
	}
	// Normalize TLD: accept with or without dot, store without dot in hash params
	tld := ""
	if r.Body.Tld != nil {
		tld = *r.Body.Tld
		tld = strings.TrimPrefix(tld, ".")
	}
	params := models.DomainGenerationCampaignParams{
		PatternType:    string(r.Body.PatternType),
		VariableLength: int(r.Body.VariableLength),
		CharacterSet:   r.Body.CharacterSet,
		ConstantString: models.StringPtr(*constant),
		TLD:            tld,
	}
	hashRes, err := domainexpert.GenerateDomainGenerationPhaseConfigHash(params)
	if err != nil {
		return gen.CampaignsDomainGenerationPatternOffset500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to compute pattern hash", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	cfgHash := hashRes.HashString
	// Prefer config manager path when available via services, else store fallback
	var current int64
	// Try via store
	st, getErr := h.deps.Stores.Campaign.GetDomainGenerationPhaseConfigStateByHash(ctx, h.deps.DB, cfgHash)
	if getErr == nil && st != nil {
		current = st.LastOffset
	} else if getErr == store.ErrNotFound {
		current = 0
	} else if getErr != nil {
		log.Printf("pattern-offset: failed to get state by hash: %v", getErr)
		current = 0
	}
	data := gen.PatternOffsetResponse{CurrentOffset: &current}
	return gen.CampaignsDomainGenerationPatternOffset200JSONResponse{Data: &data, Metadata: okMeta(), RequestId: reqID(), Success: boolPtr(true)}, nil
}

// CampaignsStateGet implements GET /campaigns/{campaignId}/state
func (h *strictHandlers) CampaignsStateGet(ctx context.Context, r gen.CampaignsStateGetRequestObject) (gen.CampaignsStateGetResponseObject, error) {
	if h.deps == nil || h.deps.Stores.Campaign == nil || h.deps.DB == nil {
		return gen.CampaignsStateGet500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "dependencies not ready", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	st, err := h.deps.Stores.Campaign.GetCampaignState(ctx, h.deps.DB, uuid.UUID(r.CampaignId))
	if err != nil {
		if err == store.ErrNotFound {
			return gen.CampaignsStateGet404JSONResponse{NotFoundJSONResponse: gen.NotFoundJSONResponse{Error: gen.ApiError{Message: "campaign state not found", Code: gen.NOTFOUND, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
		}
		return gen.CampaignsStateGet500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to load campaign state", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	// Map models.CampaignState to API CampaignState
	api := gen.CampaignState{
		CampaignId:   openapi_types.UUID(st.CampaignID),
		CurrentState: gen.CampaignStateEnum(st.CurrentState),
		Mode:         gen.CampaignModeEnum(st.Mode),
		Version:      st.Version,
		CreatedAt:    st.CreatedAt,
		UpdatedAt:    st.UpdatedAt,
	}
	// configuration JSON -> map
	if len(st.Configuration) > 0 {
		var m map[string]interface{}
		if err := json.Unmarshal(st.Configuration, &m); err == nil {
			api.Configuration = &m
		}
	}
	return gen.CampaignsStateGet200JSONResponse{Data: &api, Metadata: okMeta(), RequestId: reqID(), Success: boolPtr(true)}, nil
}

// CampaignsStatePut implements PUT /campaigns/{campaignId}/state
func (h *strictHandlers) CampaignsStatePut(ctx context.Context, r gen.CampaignsStatePutRequestObject) (gen.CampaignsStatePutResponseObject, error) {
	if h.deps == nil || h.deps.Stores.Campaign == nil || h.deps.DB == nil {
		return gen.CampaignsStatePut500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "dependencies not ready", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	if r.Body == nil {
		return gen.CampaignsStatePut400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "missing body", Code: gen.BADREQUEST, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	// Build models.CampaignState from request
	var cfg json.RawMessage
	if r.Body.Configuration != nil {
		b, _ := json.Marshal(r.Body.Configuration)
		cfg = b
	}
	// Try to read existing to keep immutable fields
	existing, _ := h.deps.Stores.Campaign.GetCampaignState(ctx, h.deps.DB, uuid.UUID(r.CampaignId))
	st := &models.CampaignState{
		CampaignID: uuid.UUID(r.CampaignId),
		CurrentState: func() models.CampaignStateEnum {
			if r.Body.CurrentState != nil {
				return models.CampaignStateEnum(*r.Body.CurrentState)
			}
			if existing != nil {
				return existing.CurrentState
			}
			return models.CampaignStateDraft
		}(),
		Mode: func() models.CampaignModeEnum {
			if r.Body.Mode != nil {
				return models.CampaignModeEnum(*r.Body.Mode)
			}
			if existing != nil {
				return existing.Mode
			}
			return models.CampaignModeStepByStep
		}(),
		Configuration: cfg,
		Version:       int(0),
		CreatedAt:     time.Now().UTC(),
		UpdatedAt:     time.Now().UTC(),
	}
	if r.Body.Version != nil {
		st.Version = int(*r.Body.Version)
	} else if existing != nil {
		st.Version = existing.Version
	}
	// Upsert via CreateCampaignState implementation (conflict updates)
	if err := h.deps.Stores.Campaign.CreateCampaignState(ctx, h.deps.DB, st); err != nil {
		return gen.CampaignsStatePut500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to save campaign state", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	// Return fresh copy
	fresh, _ := h.deps.Stores.Campaign.GetCampaignState(ctx, h.deps.DB, uuid.UUID(r.CampaignId))
	api := gen.CampaignState{
		CampaignId:   openapi_types.UUID(fresh.CampaignID),
		CurrentState: gen.CampaignStateEnum(fresh.CurrentState),
		Mode:         gen.CampaignModeEnum(fresh.Mode),
		Version:      fresh.Version,
		CreatedAt:    fresh.CreatedAt,
		UpdatedAt:    fresh.UpdatedAt,
	}
	if len(fresh.Configuration) > 0 {
		var m map[string]interface{}
		if err := json.Unmarshal(fresh.Configuration, &m); err == nil {
			api.Configuration = &m
		}
	}
	return gen.CampaignsStatePut200JSONResponse{Data: &api, Metadata: okMeta(), RequestId: reqID(), Success: boolPtr(true)}, nil
}

// CampaignsStateDelete implements DELETE /campaigns/{campaignId}/state
func (h *strictHandlers) CampaignsStateDelete(ctx context.Context, r gen.CampaignsStateDeleteRequestObject) (gen.CampaignsStateDeleteResponseObject, error) {
	if h.deps == nil || h.deps.Stores.Campaign == nil || h.deps.DB == nil {
		return gen.CampaignsStateDelete500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "dependencies not ready", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	if err := h.deps.Stores.Campaign.DeleteCampaignState(ctx, h.deps.DB, uuid.UUID(r.CampaignId)); err != nil {
		if err == store.ErrNotFound {
			return gen.CampaignsStateDelete404JSONResponse{NotFoundJSONResponse: gen.NotFoundJSONResponse{Error: gen.ApiError{Message: "campaign state not found", Code: gen.NOTFOUND, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
		}
		return gen.CampaignsStateDelete500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to delete campaign state", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	return gen.CampaignsStateDelete204Response{}, nil
}

// CampaignsPhaseExecutionsList implements GET /campaigns/{campaignId}/phase-executions
func (h *strictHandlers) CampaignsPhaseExecutionsList(ctx context.Context, r gen.CampaignsPhaseExecutionsListRequestObject) (gen.CampaignsPhaseExecutionsListResponseObject, error) {
	if h.deps == nil || h.deps.Stores.Campaign == nil || h.deps.DB == nil {
		return gen.CampaignsPhaseExecutionsList500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "dependencies not ready", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	list, err := h.deps.Stores.Campaign.GetPhaseExecutionsByCampaign(ctx, h.deps.DB, uuid.UUID(r.CampaignId))
	if err != nil {
		return gen.CampaignsPhaseExecutionsList500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to list phase executions", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	// Load state if available
	st, stErr := h.deps.Stores.Campaign.GetCampaignState(ctx, h.deps.DB, uuid.UUID(r.CampaignId))
	if stErr != nil && stErr != store.ErrNotFound {
		return gen.CampaignsPhaseExecutionsList500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to load campaign state", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	apiState := gen.CampaignState{}
	if st != nil {
		apiState = gen.CampaignState{CampaignId: openapi_types.UUID(st.CampaignID), CurrentState: gen.CampaignStateEnum(st.CurrentState), Mode: gen.CampaignModeEnum(st.Mode), Version: st.Version, CreatedAt: st.CreatedAt, UpdatedAt: st.UpdatedAt}
		if len(st.Configuration) > 0 {
			var m map[string]interface{}
			_ = json.Unmarshal(st.Configuration, &m)
			apiState.Configuration = &m
		}
	}
	execs := make([]gen.PhaseExecution, 0, len(list))
	for _, pe := range list {
		if pe != nil {
			execs = append(execs, mapPhaseExecutionToAPI(*pe))
		}
	}
	composite := gen.CampaignStateWithExecutions{CampaignState: apiState, PhaseExecutions: execs}
	return gen.CampaignsPhaseExecutionsList200JSONResponse{Data: &composite, Metadata: okMeta(), RequestId: reqID(), Success: boolPtr(true)}, nil
}

// CampaignsPhaseExecutionGet implements GET /campaigns/{campaignId}/phase-executions/{phaseType}
func (h *strictHandlers) CampaignsPhaseExecutionGet(ctx context.Context, r gen.CampaignsPhaseExecutionGetRequestObject) (gen.CampaignsPhaseExecutionGetResponseObject, error) {
	if h.deps == nil || h.deps.Stores.Campaign == nil || h.deps.DB == nil {
		return gen.CampaignsPhaseExecutionGet500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "dependencies not ready", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	// Map API phaseType to models.PhaseTypeEnum using existing map
	phaseModel, err := mapAPIPhaseToModel(string(r.PhaseType))
	if err != nil {
		return gen.CampaignsPhaseExecutionGet404JSONResponse{NotFoundJSONResponse: gen.NotFoundJSONResponse{Error: gen.ApiError{Message: "invalid phase type", Code: gen.NOTFOUND, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	pe, err := h.deps.Stores.Campaign.GetPhaseExecution(ctx, h.deps.DB, uuid.UUID(r.CampaignId), phaseModel)
	if err != nil {
		if err == store.ErrNotFound {
			return gen.CampaignsPhaseExecutionGet404JSONResponse{NotFoundJSONResponse: gen.NotFoundJSONResponse{Error: gen.ApiError{Message: "phase execution not found", Code: gen.NOTFOUND, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
		}
		return gen.CampaignsPhaseExecutionGet500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to get phase execution", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	api := mapPhaseExecutionToAPI(*pe)
	return gen.CampaignsPhaseExecutionGet200JSONResponse{Data: &api, Metadata: okMeta(), RequestId: reqID(), Success: boolPtr(true)}, nil
}

// CampaignsPhaseExecutionPut implements PUT /campaigns/{campaignId}/phase-executions/{phaseType}
func (h *strictHandlers) CampaignsPhaseExecutionPut(ctx context.Context, r gen.CampaignsPhaseExecutionPutRequestObject) (gen.CampaignsPhaseExecutionPutResponseObject, error) {
	if h.deps == nil || h.deps.Stores.Campaign == nil || h.deps.DB == nil {
		return gen.CampaignsPhaseExecutionPut500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "dependencies not ready", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	// Map phase type
	phaseModel, err := mapAPIPhaseToModel(string(r.PhaseType))
	if err != nil {
		return gen.CampaignsPhaseExecutionPut404JSONResponse{NotFoundJSONResponse: gen.NotFoundJSONResponse{Error: gen.ApiError{Message: "invalid phase type", Code: gen.NOTFOUND, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	// Fetch existing if any
	existing, err := h.deps.Stores.Campaign.GetPhaseExecution(ctx, h.deps.DB, uuid.UUID(r.CampaignId), phaseModel)
	if err != nil && err != store.ErrNotFound {
		return gen.CampaignsPhaseExecutionPut500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to load phase execution", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}

	// Build model entity by applying updates (partial update semantics)
	applyUpdate := func(dst *models.PhaseExecution, body *gen.PhaseExecutionUpdate) {
		if body == nil {
			return
		}
		if body.Status != nil {
			dst.Status = models.ExecutionStatusEnum(*body.Status)
		}
		if body.StartedAt != nil {
			dst.StartedAt = body.StartedAt
		}
		if body.CompletedAt != nil {
			dst.CompletedAt = body.CompletedAt
		}
		if body.PausedAt != nil {
			dst.PausedAt = body.PausedAt
		}
		if body.FailedAt != nil {
			dst.FailedAt = body.FailedAt
		}
		if body.ProgressPercentage != nil {
			f := float64(*body.ProgressPercentage)
			dst.ProgressPercentage = &f
		}
		if body.TotalItems != nil {
			dst.TotalItems = body.TotalItems
		}
		if body.ProcessedItems != nil {
			dst.ProcessedItems = body.ProcessedItems
		}
		if body.SuccessfulItems != nil {
			dst.SuccessfulItems = body.SuccessfulItems
		}
		if body.FailedItems != nil {
			dst.FailedItems = body.FailedItems
		}
		if body.Configuration != nil {
			if b, err := json.Marshal(body.Configuration); err == nil {
				raw := json.RawMessage(b)
				dst.Configuration = &raw
			}
		}
		if body.ErrorDetails != nil {
			if b, err := json.Marshal(body.ErrorDetails); err == nil {
				raw := json.RawMessage(b)
				dst.ErrorDetails = &raw
			}
		}
		if body.Metrics != nil {
			if b, err := json.Marshal(body.Metrics); err == nil {
				raw := json.RawMessage(b)
				dst.Metrics = &raw
			}
		}
		// updated_at handled by DB
	}

	if existing != nil {
		// Update path
		e := *existing
		applyUpdate(&e, r.Body)
		if err := h.deps.Stores.Campaign.UpdatePhaseExecution(ctx, h.deps.DB, &e); err != nil {
			if err == store.ErrNotFound {
				return gen.CampaignsPhaseExecutionPut404JSONResponse{NotFoundJSONResponse: gen.NotFoundJSONResponse{Error: gen.ApiError{Message: "phase execution not found", Code: gen.NOTFOUND, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
			}
			return gen.CampaignsPhaseExecutionPut500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to update phase execution", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
		}
	} else {
		// Create path (upsert) with sensible defaults
		e := &models.PhaseExecution{
			CampaignID: uuid.UUID(r.CampaignId),
			PhaseType:  phaseModel,
			Status:     models.ExecutionStatusNotStarted,
		}
		// Apply body fields
		applyUpdate(e, r.Body)
		if err := h.deps.Stores.Campaign.CreatePhaseExecution(ctx, h.deps.DB, e); err != nil {
			return gen.CampaignsPhaseExecutionPut500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to create phase execution", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
		}
	}

	// Load fresh and return
	fresh, err := h.deps.Stores.Campaign.GetPhaseExecution(ctx, h.deps.DB, uuid.UUID(r.CampaignId), phaseModel)
	if err != nil {
		if err == store.ErrNotFound {
			return gen.CampaignsPhaseExecutionPut404JSONResponse{NotFoundJSONResponse: gen.NotFoundJSONResponse{Error: gen.ApiError{Message: "phase execution not found after save", Code: gen.NOTFOUND, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
		}
		return gen.CampaignsPhaseExecutionPut500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to load phase execution after save", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	api := mapPhaseExecutionToAPI(*fresh)
	return gen.CampaignsPhaseExecutionPut200JSONResponse{Data: &api, Metadata: okMeta(), RequestId: reqID(), Success: boolPtr(true)}, nil
}

// CampaignsPhaseExecutionDelete implements DELETE /campaigns/{campaignId}/phase-executions/{phaseType}
func (h *strictHandlers) CampaignsPhaseExecutionDelete(ctx context.Context, r gen.CampaignsPhaseExecutionDeleteRequestObject) (gen.CampaignsPhaseExecutionDeleteResponseObject, error) {
	if h.deps == nil || h.deps.Stores.Campaign == nil || h.deps.DB == nil {
		return gen.CampaignsPhaseExecutionDelete500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "dependencies not ready", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	phaseModel, err := mapAPIPhaseToModel(string(r.PhaseType))
	if err != nil {
		return gen.CampaignsPhaseExecutionDelete404JSONResponse{NotFoundJSONResponse: gen.NotFoundJSONResponse{Error: gen.ApiError{Message: "invalid phase type", Code: gen.NOTFOUND, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	// Find existing to get ID
	pe, err := h.deps.Stores.Campaign.GetPhaseExecution(ctx, h.deps.DB, uuid.UUID(r.CampaignId), phaseModel)
	if err != nil {
		if err == store.ErrNotFound {
			return gen.CampaignsPhaseExecutionDelete404JSONResponse{NotFoundJSONResponse: gen.NotFoundJSONResponse{Error: gen.ApiError{Message: "phase execution not found", Code: gen.NOTFOUND, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
		}
		return gen.CampaignsPhaseExecutionDelete500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to load phase execution", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	if err := h.deps.Stores.Campaign.DeletePhaseExecution(ctx, h.deps.DB, pe.ID); err != nil {
		if err == store.ErrNotFound {
			return gen.CampaignsPhaseExecutionDelete404JSONResponse{NotFoundJSONResponse: gen.NotFoundJSONResponse{Error: gen.ApiError{Message: "phase execution not found", Code: gen.NOTFOUND, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
		}
		return gen.CampaignsPhaseExecutionDelete500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to delete phase execution", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	return gen.CampaignsPhaseExecutionDelete204Response{}, nil
}

// mapPhaseExecutionToAPI converts models.PhaseExecution to API PhaseExecution
func mapPhaseExecutionToAPI(pe models.PhaseExecution) gen.PhaseExecution {
	api := gen.PhaseExecution{
		Id:         openapi_types.UUID(pe.ID),
		CampaignId: openapi_types.UUID(pe.CampaignID),
		PhaseType:  gen.PhaseExecutionPhaseType(mapModelPhaseToAPI(pe.PhaseType)),
		Status:     gen.ExecutionStatusEnum(pe.Status),
		CreatedAt:  pe.CreatedAt,
		UpdatedAt:  pe.UpdatedAt,
	}
	api.StartedAt = pe.StartedAt
	api.CompletedAt = pe.CompletedAt
	api.PausedAt = pe.PausedAt
	api.FailedAt = pe.FailedAt
	if pe.ProgressPercentage != nil {
		v := float32(*pe.ProgressPercentage)
		api.ProgressPercentage = &v
	}
	if pe.TotalItems != nil {
		vv := int64(*pe.TotalItems)
		api.TotalItems = &vv
	}
	if pe.ProcessedItems != nil {
		vv := int64(*pe.ProcessedItems)
		api.ProcessedItems = &vv
	}
	if pe.SuccessfulItems != nil {
		vv := int64(*pe.SuccessfulItems)
		api.SuccessfulItems = &vv
	}
	if pe.FailedItems != nil {
		vv := int64(*pe.FailedItems)
		api.FailedItems = &vv
	}
	// JSON fields
	if pe.Configuration != nil && len(*pe.Configuration) > 0 {
		var m map[string]interface{}
		if err := json.Unmarshal(*pe.Configuration, &m); err == nil {
			api.Configuration = &m
		}
	}
	if pe.ErrorDetails != nil && len(*pe.ErrorDetails) > 0 {
		var m map[string]interface{}
		if err := json.Unmarshal(*pe.ErrorDetails, &m); err == nil {
			api.ErrorDetails = &m
		}
	}
	if pe.Metrics != nil && len(*pe.Metrics) > 0 {
		var m map[string]interface{}
		if err := json.Unmarshal(*pe.Metrics, &m); err == nil {
			api.Metrics = &m
		}
	}
	return api
}

func toStringPtr(v interface{}) *string {
	if v == nil {
		return nil
	}
	s, ok := v.(string)
	if !ok {
		return nil
	}
	return &s
}

func toStringVal(v interface{}) string {
	if v == nil {
		return ""
	}
	if s, ok := v.(string); ok {
		return s
	}
	return ""
}

// aggregateHelper builds the aggregates payload for CampaignDomainsListResponse
func buildDomainAggregates(counters *models.CampaignDomainCounters) *struct {
	Dns *struct {
		Error   *int `json:"error,omitempty"`
		Ok      *int `json:"ok,omitempty"`
		Pending *int `json:"pending,omitempty"`
		Timeout *int `json:"timeout,omitempty"`
	} `json:"dns,omitempty"`
	Http *struct {
		Error   *int `json:"error,omitempty"`
		Ok      *int `json:"ok,omitempty"`
		Pending *int `json:"pending,omitempty"`
		Timeout *int `json:"timeout,omitempty"`
	} `json:"http,omitempty"`
	Lead *struct {
		Error   *int `json:"error,omitempty"`
		Match   *int `json:"match,omitempty"`
		NoMatch *int `json:"noMatch,omitempty"`
		Pending *int `json:"pending,omitempty"`
		Timeout *int `json:"timeout,omitempty"`
	} `json:"lead,omitempty"`
} {
	if counters == nil {
		return nil
	}
	toPtr := func(v int64) *int { x := int(v); return &x }
	agg := struct {
		Dns *struct {
			Error   *int `json:"error,omitempty"`
			Ok      *int `json:"ok,omitempty"`
			Pending *int `json:"pending,omitempty"`
			Timeout *int `json:"timeout,omitempty"`
		} `json:"dns,omitempty"`
		Http *struct {
			Error   *int `json:"error,omitempty"`
			Ok      *int `json:"ok,omitempty"`
			Pending *int `json:"pending,omitempty"`
			Timeout *int `json:"timeout,omitempty"`
		} `json:"http,omitempty"`
		Lead *struct {
			Error   *int `json:"error,omitempty"`
			Match   *int `json:"match,omitempty"`
			NoMatch *int `json:"noMatch,omitempty"`
			Pending *int `json:"pending,omitempty"`
			Timeout *int `json:"timeout,omitempty"`
		} `json:"lead,omitempty"`
	}{}
	agg.Dns = &struct {
		Error   *int `json:"error,omitempty"`
		Ok      *int `json:"ok,omitempty"`
		Pending *int `json:"pending,omitempty"`
		Timeout *int `json:"timeout,omitempty"`
	}{Error: toPtr(counters.DNSError), Ok: toPtr(counters.DNSOk), Pending: toPtr(counters.DNSPending), Timeout: toPtr(counters.DNSTimeout)}
	agg.Http = &struct {
		Error   *int `json:"error,omitempty"`
		Ok      *int `json:"ok,omitempty"`
		Pending *int `json:"pending,omitempty"`
		Timeout *int `json:"timeout,omitempty"`
	}{Error: toPtr(counters.HTTPError), Ok: toPtr(counters.HTTPOk), Pending: toPtr(counters.HTTPPending), Timeout: toPtr(counters.HTTPTimeout)}
	agg.Lead = &struct {
		Error   *int `json:"error,omitempty"`
		Match   *int `json:"match,omitempty"`
		NoMatch *int `json:"noMatch,omitempty"`
		Pending *int `json:"pending,omitempty"`
		Timeout *int `json:"timeout,omitempty"`
	}{Error: toPtr(counters.LeadError), Match: toPtr(counters.LeadMatch), NoMatch: toPtr(counters.LeadNoMatch), Pending: toPtr(counters.LeadPending), Timeout: toPtr(counters.LeadTimeout)}
	return &struct {
		Dns *struct {
			Error   *int `json:"error,omitempty"`
			Ok      *int `json:"ok,omitempty"`
			Pending *int `json:"pending,omitempty"`
			Timeout *int `json:"timeout,omitempty"`
		} `json:"dns,omitempty"`
		Http *struct {
			Error   *int `json:"error,omitempty"`
			Ok      *int `json:"ok,omitempty"`
			Pending *int `json:"pending,omitempty"`
			Timeout *int `json:"timeout,omitempty"`
		} `json:"http,omitempty"`
		Lead *struct {
			Error   *int `json:"error,omitempty"`
			Match   *int `json:"match,omitempty"`
			NoMatch *int `json:"noMatch,omitempty"`
			Pending *int `json:"pending,omitempty"`
			Timeout *int `json:"timeout,omitempty"`
		} `json:"lead,omitempty"`
	}{Dns: agg.Dns, Http: agg.Http, Lead: agg.Lead}
}
