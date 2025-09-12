package main

import (
	"context"
	"encoding/json"
	"time"

	services "github.com/fntelecomllc/studio/backend/internal/domain/services"

	gen "github.com/fntelecomllc/studio/backend/internal/api/gen"
	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/fntelecomllc/studio/backend/internal/store"
	"github.com/google/uuid"
	openapi_types "github.com/oapi-codegen/runtime/types"
)

// ScoringProfilesList lists scoring profiles with pagination.
func (h *strictHandlers) ScoringProfilesList(ctx context.Context, r gen.ScoringProfilesListRequestObject) (gen.ScoringProfilesListResponseObject, error) {
	if h.deps == nil || h.deps.DB == nil || h.deps.Stores.Campaign == nil {
		return gen.ScoringProfilesList500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "scoring store not initialized", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	limit := 50
	offset := 0
	if r.Params.Limit != nil {
		limit = int(*r.Params.Limit)
	}
	if r.Params.Offset != nil {
		offset = int(*r.Params.Offset)
	}
	// Adjust store method if offset unsupported: attempt dynamic interface detection
	type lister interface {
		ListScoringProfiles(context.Context, store.Querier, int, int) ([]*models.ScoringProfile, error)
	}
	var items []*models.ScoringProfile
	if ext, ok := h.deps.Stores.Campaign.(lister); ok {
		var err error
		items, err = ext.ListScoringProfiles(ctx, h.deps.DB, limit, offset)
		if err != nil {
			return gen.ScoringProfilesList500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to list scoring profiles", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
		}
	} else {
		// Fallback to legacy signature (limit only)
		type legacyLister interface {
			ListScoringProfiles(context.Context, store.Querier, int) ([]*models.ScoringProfile, error)
		}
		if ext, ok := h.deps.Stores.Campaign.(legacyLister); ok {
			var err error
			items, err = ext.ListScoringProfiles(ctx, h.deps.DB, limit)
			if err != nil {
				return gen.ScoringProfilesList500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to list scoring profiles", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
			}
		} else {
			return gen.ScoringProfilesList500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "listing not supported", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
		}
	}
	// Map to API DTO (direct field mapping)
	dtos := make([]gen.ScoringProfile, 0, len(items))
	for _, sp := range items {
		dto := gen.ScoringProfile{
			Id:        openapi_types.UUID(sp.ID),
			Name:      sp.Name,
			Version:   sp.Version,
			CreatedAt: sp.CreatedAt,
			UpdatedAt: sp.UpdatedAt,
			Weights:   map[string]float32{},
		}
		if sp.Description.Valid {
			s := sp.Description.String
			dto.Description = &s
		}
		if len(sp.Weights) > 0 {
			var wm map[string]float64
			_ = json.Unmarshal(sp.Weights, &wm)
			for k, v := range wm {
				dto.Weights[k] = float32(v)
			}
		}
		dtos = append(dtos, dto)
	}
	resp := gen.ScoringProfilesList200JSONResponse{Data: &dtos, Metadata: okMeta(), RequestId: reqID(), Success: boolPtr(true)}
	return resp, nil
}

func (h *strictHandlers) ScoringProfilesCreate(ctx context.Context, r gen.ScoringProfilesCreateRequestObject) (gen.ScoringProfilesCreateResponseObject, error) {
	if h.deps == nil || h.deps.DB == nil || h.deps.Stores.Campaign == nil {
		return gen.ScoringProfilesCreate500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "scoring store not initialized", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	body := r.Body
	if body == nil || body.Name == "" || body.Weights == nil {
		return gen.ScoringProfilesCreate400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "name and weights required", Code: gen.BADREQUEST, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	// Convert weights to float64 map for validation
	wmIn := map[string]float64{}
	for k, v := range body.Weights {
		wmIn[k] = float64(v)
	}
	validated, vErr := services.ValidateScoringWeights(wmIn)
	if vErr != nil {
		return gen.ScoringProfilesCreate400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: vErr.Error(), Code: gen.BADREQUEST, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	raw, _ := json.Marshal(validated)
	sp := &models.ScoringProfile{Name: body.Name, Weights: raw, Version: 1}
	if body.Version != nil && *body.Version > 0 {
		sp.Version = *body.Version
	}
	if body.Description != nil {
		sp.Description.Scan(*body.Description)
	}
	type creator interface {
		CreateScoringProfile(context.Context, store.Querier, *models.ScoringProfile) error
	}
	if ext, ok := h.deps.Stores.Campaign.(creator); ok {
		if err := ext.CreateScoringProfile(ctx, h.deps.DB, sp); err != nil {
			return gen.ScoringProfilesCreate500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to create scoring profile", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
		}
	} else {
		return gen.ScoringProfilesCreate500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "create not supported", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	dto := gen.ScoringProfile{Id: openapi_types.UUID(sp.ID), Name: sp.Name, Version: sp.Version, CreatedAt: sp.CreatedAt, UpdatedAt: sp.UpdatedAt, Weights: map[string]float32{}}
	if sp.Description.Valid {
		s := sp.Description.String
		dto.Description = &s
	}
	var wm map[string]float64
	_ = json.Unmarshal(sp.Weights, &wm)
	for k, v := range wm {
		dto.Weights[k] = float32(v)
	}
	resp := gen.ScoringProfilesCreate201JSONResponse{Data: &dto, Metadata: okMeta(), RequestId: reqID(), Success: boolPtr(true)}
	return resp, nil
}

func (h *strictHandlers) ScoringProfilesGet(ctx context.Context, r gen.ScoringProfilesGetRequestObject) (gen.ScoringProfilesGetResponseObject, error) {
	if h.deps == nil || h.deps.DB == nil || h.deps.Stores.Campaign == nil {
		return gen.ScoringProfilesGet500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "scoring store not initialized", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	id := uuid.UUID(r.ProfileId)
	type getter interface {
		GetScoringProfile(context.Context, store.Querier, uuid.UUID) (*models.ScoringProfile, error)
	}
	var sp *models.ScoringProfile
	if ext, ok := h.deps.Stores.Campaign.(getter); ok {
		res, err := ext.GetScoringProfile(ctx, h.deps.DB, id)
		if err != nil || res == nil {
			return gen.ScoringProfilesGet404JSONResponse{NotFoundJSONResponse: gen.NotFoundJSONResponse{Error: gen.ApiError{Message: "scoring profile not found", Code: gen.NOTFOUND, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
		}
		sp = res
	} else {
		return gen.ScoringProfilesGet500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "get not supported", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	dto := gen.ScoringProfile{Id: openapi_types.UUID(sp.ID), Name: sp.Name, Version: sp.Version, CreatedAt: sp.CreatedAt, UpdatedAt: sp.UpdatedAt, Weights: map[string]float32{}}
	if sp.Description.Valid {
		s := sp.Description.String
		dto.Description = &s
	}
	var wm map[string]float64
	_ = json.Unmarshal(sp.Weights, &wm)
	for k, v := range wm {
		dto.Weights[k] = float32(v)
	}
	resp := gen.ScoringProfilesGet200JSONResponse{Data: &dto, Metadata: okMeta(), RequestId: reqID(), Success: boolPtr(true)}
	return resp, nil
}

func (h *strictHandlers) ScoringProfilesUpdate(ctx context.Context, r gen.ScoringProfilesUpdateRequestObject) (gen.ScoringProfilesUpdateResponseObject, error) {
	if h.deps == nil || h.deps.DB == nil || h.deps.Stores.Campaign == nil {
		return gen.ScoringProfilesUpdate500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "scoring store not initialized", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	id := uuid.UUID(r.ProfileId)
	body := r.Body
	if body == nil {
		return gen.ScoringProfilesUpdate400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "body required", Code: gen.BADREQUEST, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	type getter interface {
		GetScoringProfile(context.Context, store.Querier, uuid.UUID) (*models.ScoringProfile, error)
	}
	type updater interface {
		UpdateScoringProfile(context.Context, store.Querier, *models.ScoringProfile) error
	}
	var sp *models.ScoringProfile
	if ext, ok := h.deps.Stores.Campaign.(getter); ok {
		existing, err := ext.GetScoringProfile(ctx, h.deps.DB, id)
		if err != nil || existing == nil {
			return gen.ScoringProfilesUpdate404JSONResponse{NotFoundJSONResponse: gen.NotFoundJSONResponse{Error: gen.ApiError{Message: "scoring profile not found", Code: gen.NOTFOUND, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
		}
		sp = existing
	} else {
		return gen.ScoringProfilesUpdate500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "get not supported", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	if body.Name != nil {
		sp.Name = *body.Name
	}
	if body.Description != nil {
		sp.Description.Scan(*body.Description)
	}
	if body.Weights != nil {
		wmIn := map[string]float64{}
		for k, v := range *body.Weights {
			wmIn[k] = float64(v)
		}
		validated, vErr := services.ValidateScoringWeights(wmIn)
		if vErr != nil {
			return gen.ScoringProfilesUpdate400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: vErr.Error(), Code: gen.BADREQUEST, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
		}
		raw, _ := json.Marshal(validated)
		sp.Weights = raw
	}
	if body.Version != nil && *body.Version > 0 {
		sp.Version = *body.Version
	}
	sp.UpdatedAt = time.Now().UTC()
	if ext, ok := h.deps.Stores.Campaign.(updater); ok {
		if err := ext.UpdateScoringProfile(ctx, h.deps.DB, sp); err != nil {
			return gen.ScoringProfilesUpdate500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to update scoring profile", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
		}
	} else {
		return gen.ScoringProfilesUpdate500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "update not supported", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	dto := gen.ScoringProfile{Id: openapi_types.UUID(sp.ID), Name: sp.Name, Version: sp.Version, CreatedAt: sp.CreatedAt, UpdatedAt: sp.UpdatedAt, Weights: map[string]float32{}}
	if sp.Description.Valid {
		s := sp.Description.String
		dto.Description = &s
	}
	var wm map[string]float64
	_ = json.Unmarshal(sp.Weights, &wm)
	for k, v := range wm {
		dto.Weights[k] = float32(v)
	}
	resp := gen.ScoringProfilesUpdate200JSONResponse{Data: &dto, Metadata: okMeta(), RequestId: reqID(), Success: boolPtr(true)}
	return resp, nil
}

func (h *strictHandlers) ScoringProfilesDelete(ctx context.Context, r gen.ScoringProfilesDeleteRequestObject) (gen.ScoringProfilesDeleteResponseObject, error) {
	if h.deps == nil || h.deps.DB == nil || h.deps.Stores.Campaign == nil {
		return gen.ScoringProfilesDelete500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "scoring store not initialized", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	id := uuid.UUID(r.ProfileId)
	type deleter interface {
		DeleteScoringProfile(context.Context, store.Querier, uuid.UUID) error
	}
	if ext, ok := h.deps.Stores.Campaign.(deleter); ok {
		if err := ext.DeleteScoringProfile(ctx, h.deps.DB, id); err != nil {
			return gen.ScoringProfilesDelete500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to delete scoring profile", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
		}
	} else {
		return gen.ScoringProfilesDelete500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "delete not supported", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	return gen.ScoringProfilesDelete200JSONResponse{Success: boolPtr(true), RequestId: reqID(), Metadata: okMeta()}, nil
}

func (h *strictHandlers) CampaignsScoringProfileAssociate(ctx context.Context, r gen.CampaignsScoringProfileAssociateRequestObject) (gen.CampaignsScoringProfileAssociateResponseObject, error) {
	if h.deps == nil || h.deps.DB == nil || h.deps.Stores.Campaign == nil {
		return gen.CampaignsScoringProfileAssociate500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "scoring store not initialized", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	body := r.Body
	if body == nil || body.ProfileId == (openapi_types.UUID{}) {
		return gen.CampaignsScoringProfileAssociate400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "profileId required", Code: gen.BADREQUEST, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	campaignID := uuid.UUID(r.CampaignId)
	profileID := uuid.UUID(body.ProfileId)
	type associator interface {
		AssociateCampaignScoringProfile(context.Context, store.Querier, uuid.UUID, uuid.UUID) error
	}
	if ext, ok := h.deps.Stores.Campaign.(associator); ok {
		if err := ext.AssociateCampaignScoringProfile(ctx, h.deps.DB, campaignID, profileID); err != nil {
			return gen.CampaignsScoringProfileAssociate500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to associate scoring profile", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
		}
	} else {
		return gen.CampaignsScoringProfileAssociate500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "associate not supported", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	return gen.CampaignsScoringProfileAssociate200JSONResponse{Success: boolPtr(true), RequestId: reqID(), Metadata: okMeta()}, nil
}

func (h *strictHandlers) CampaignsRescore(ctx context.Context, r gen.CampaignsRescoreRequestObject) (gen.CampaignsRescoreResponseObject, error) {
	if h.deps == nil || h.deps.Orchestrator == nil {
		return gen.CampaignsRescore500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "orchestrator not initialized", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	campaignID := uuid.UUID(r.CampaignId)
	go func(id uuid.UUID) { _ = h.deps.Orchestrator.RescoreCampaign(context.Background(), id) }(campaignID)
	return gen.CampaignsRescore200JSONResponse{Success: boolPtr(true), RequestId: reqID(), Metadata: okMeta()}, nil
}
