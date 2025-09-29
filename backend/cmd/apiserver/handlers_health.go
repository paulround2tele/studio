package main

import (
	"context"

	gen "github.com/fntelecomllc/studio/backend/internal/api/gen"
)

// ---- Health & Ping ----
func (h *strictHandlers) HealthCheck(ctx context.Context, req gen.HealthCheckRequestObject) (gen.HealthCheckResponseObject, error) {
	res := gen.HealthResponse{Status: "ok"}
	return gen.HealthCheck200JSONResponse{Body: res, Headers: gen.HealthCheck200ResponseHeaders{XRequestId: reqID()}}, nil
}

func (h *strictHandlers) HealthLive(ctx context.Context, req gen.HealthLiveRequestObject) (gen.HealthLiveResponseObject, error) {
	res := gen.HealthResponse{Status: "ok"}
	return gen.HealthLive200JSONResponse{Body: res, Headers: gen.HealthLive200ResponseHeaders{XRequestId: reqID()}}, nil
}

func (h *strictHandlers) HealthReady(ctx context.Context, req gen.HealthReadyRequestObject) (gen.HealthReadyResponseObject, error) {
	res := gen.HealthResponse{Status: "ok"}
	return gen.HealthReady200JSONResponse{Body: res, Headers: gen.HealthReady200ResponseHeaders{XRequestId: reqID()}}, nil
}

func (h *strictHandlers) Ping(ctx context.Context, req gen.PingRequestObject) (gen.PingResponseObject, error) {
	res := gen.PingResponse{Message: "pong"}
	return gen.Ping200JSONResponse{Body: res, Headers: gen.Ping200ResponseHeaders{XRequestId: reqID()}}, nil
}
