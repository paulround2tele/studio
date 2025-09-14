package main

import (
	"context"
	"time"

	gen "github.com/fntelecomllc/studio/backend/internal/api/gen"
	"github.com/fntelecomllc/studio/backend/internal/config"
)

// ---- Feature Flags ----
func (h *strictHandlers) FeatureFlagsGet(ctx context.Context, r gen.FeatureFlagsGetRequestObject) (gen.FeatureFlagsGetResponseObject, error) {
	if h.deps == nil || h.deps.Config == nil {
		return gen.FeatureFlagsGet500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "config not initialized", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	cf := h.deps.Config.Features
	ff := gen.FeatureFlags{
		"enableRealTimeUpdates":    cf.EnableRealTimeUpdates,
		"enableOfflineMode":        cf.EnableOfflineMode,
		"enableAnalytics":          cf.EnableAnalytics,
		"enableDebugMode":          cf.EnableDebugMode,
		"enableStealth":            cf.EnableStealth,
		"enableStealthForceCursor": cf.EnableStealthForceCursor,
	}
	return gen.FeatureFlagsGet200JSONResponse{Success: boolPtr(true), RequestId: reqID(), Metadata: okMeta(), Data: &ff}, nil
}

func (h *strictHandlers) FeatureFlagsUpdate(ctx context.Context, r gen.FeatureFlagsUpdateRequestObject) (gen.FeatureFlagsUpdateResponseObject, error) {
	if h.deps == nil || h.deps.Config == nil {
		return gen.FeatureFlagsUpdate500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "config not initialized", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	if r.Body == nil {
		return gen.FeatureFlagsUpdate400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "missing body", Code: gen.BADREQUEST, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	body := *r.Body
	if v, ok := body["enableRealTimeUpdates"]; ok {
		h.deps.Config.Features.EnableRealTimeUpdates = v
	}
	if v, ok := body["enableOfflineMode"]; ok {
		h.deps.Config.Features.EnableOfflineMode = v
	}
	if v, ok := body["enableAnalytics"]; ok {
		h.deps.Config.Features.EnableAnalytics = v
	}
	if v, ok := body["enableDebugMode"]; ok {
		h.deps.Config.Features.EnableDebugMode = v
	}
	if v, ok := body["enableStealth"]; ok {
		h.deps.Config.Features.EnableStealth = v
	}
	if v, ok := body["enableStealthForceCursor"]; ok {
		h.deps.Config.Features.EnableStealthForceCursor = v
	}
	if err := config.SaveAppConfig(h.deps.Config); err != nil {
		return gen.FeatureFlagsUpdate500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to save feature flags", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	ff := gen.FeatureFlags{
		"enableRealTimeUpdates":    h.deps.Config.Features.EnableRealTimeUpdates,
		"enableOfflineMode":        h.deps.Config.Features.EnableOfflineMode,
		"enableAnalytics":          h.deps.Config.Features.EnableAnalytics,
		"enableDebugMode":          h.deps.Config.Features.EnableDebugMode,
		"enableStealth":            h.deps.Config.Features.EnableStealth,
		"enableStealthForceCursor": h.deps.Config.Features.EnableStealthForceCursor,
	}
	return gen.FeatureFlagsUpdate200JSONResponse{Success: boolPtr(true), RequestId: reqID(), Metadata: okMeta(), Data: &ff}, nil
}
