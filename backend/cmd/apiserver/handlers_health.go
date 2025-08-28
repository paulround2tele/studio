package main

import (
	"context"

	gen "github.com/fntelecomllc/studio/backend/internal/api/gen"
)

// ---- Health & Ping ----
func (h *strictHandlers) HealthCheck(ctx context.Context, req gen.HealthCheckRequestObject) (gen.HealthCheckResponseObject, error) {
	return gen.HealthCheck200JSONResponse{Success: boolPtr(true), RequestId: ""}, nil
}

func (h *strictHandlers) HealthLive(ctx context.Context, req gen.HealthLiveRequestObject) (gen.HealthLiveResponseObject, error) {
	return gen.HealthLive200JSONResponse{Success: boolPtr(true), RequestId: ""}, nil
}

func (h *strictHandlers) HealthReady(ctx context.Context, req gen.HealthReadyRequestObject) (gen.HealthReadyResponseObject, error) {
	return gen.HealthReady200JSONResponse{Success: boolPtr(true), RequestId: ""}, nil
}

func (h *strictHandlers) Ping(ctx context.Context, req gen.PingRequestObject) (gen.PingResponseObject, error) {
	return gen.Ping200JSONResponse{Success: boolPtr(true), RequestId: ""}, nil
}
