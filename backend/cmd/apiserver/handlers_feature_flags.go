package main

import (
	"context"
	"time"

	gen "github.com/fntelecomllc/studio/backend/internal/api/gen"
)

// ---- Feature Flags ----
// ConfigGetFeatures exposes feature flags (GET /config/features)
func (h *strictHandlers) ConfigGetFeatures(ctx context.Context, r gen.ConfigGetFeaturesRequestObject) (gen.ConfigGetFeaturesResponseObject, error) {
	if h.deps == nil || h.deps.Config == nil {
		return gen.ConfigGetFeatures500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "config not initialized", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
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
	return gen.ConfigGetFeatures200JSONResponse(ff), nil
}

// NOTE: No update endpoint generated for /config/features in current spec; removal of update handler.
