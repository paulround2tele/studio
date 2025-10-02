package main

import (
	"context"
	"time"

	gen "github.com/fntelecomllc/studio/backend/internal/api/gen"
	"github.com/fntelecomllc/studio/backend/internal/config"
)

// ConfigGetStealth returns the stealth enabled flag
func (h *strictHandlers) ConfigGetStealth(ctx context.Context, r gen.ConfigGetStealthRequestObject) (gen.ConfigGetStealthResponseObject, error) {
	if h.deps == nil || h.deps.Config == nil {
		return gen.ConfigGetStealth500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "config not initialized", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	return gen.ConfigGetStealth200JSONResponse{Enabled: boolPtr(h.deps.Config.Features.EnableStealth)}, nil
}

// ConfigUpdateStealth updates the stealth enabled flag
func (h *strictHandlers) ConfigUpdateStealth(ctx context.Context, r gen.ConfigUpdateStealthRequestObject) (gen.ConfigUpdateStealthResponseObject, error) {
	if h.deps == nil || h.deps.Config == nil {
		return gen.ConfigUpdateStealth500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "config not initialized", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	if r.Body == nil {
		return gen.ConfigUpdateStealth400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "missing body", Code: gen.BADREQUEST, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	body := *r.Body
	h.deps.Config.Features.EnableStealth = body.Enabled
	if err := config.SaveAppConfig(h.deps.Config); err != nil {
		return gen.ConfigUpdateStealth500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to save stealth config", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	return gen.ConfigUpdateStealth200JSONResponse{Enabled: boolPtr(h.deps.Config.Features.EnableStealth)}, nil
}
