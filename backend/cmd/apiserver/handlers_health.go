package main

import (
	"context"
	"time"

	gen "github.com/fntelecomllc/studio/backend/internal/api/gen"
)

// ---- Health & Ping ----
func (h *strictHandlers) HealthCheck(ctx context.Context, req gen.HealthCheckRequestObject) (gen.HealthCheckResponseObject, error) {
	version := "2.0.0"
	now := time.Now()
	return gen.HealthCheck200JSONResponse{
		Status: gen.HealthResponseStatusOk,
		Version: &version,
		Timestamp: &now,
	}, nil
}

func (h *strictHandlers) HealthLive(ctx context.Context, req gen.HealthLiveRequestObject) (gen.HealthLiveResponseObject, error) {
	version := "2.0.0"
	now := time.Now()
	return gen.HealthLive200JSONResponse{
		Status: gen.HealthResponseStatusOk,
		Version: &version,
		Timestamp: &now,
	}, nil
}

func (h *strictHandlers) HealthReady(ctx context.Context, req gen.HealthReadyRequestObject) (gen.HealthReadyResponseObject, error) {
	version := "2.0.0"
	now := time.Now()
	return gen.HealthReady200JSONResponse{
		Status: gen.HealthResponseStatusOk,
		Version: &version,
		Timestamp: &now,
	}, nil
}

func (h *strictHandlers) Ping(ctx context.Context, req gen.PingRequestObject) (gen.PingResponseObject, error) {
	version := "2.0.0"
	now := time.Now()
	return gen.Ping200JSONResponse{
		Status: gen.HealthResponseStatusOk,
		Version: &version,
		Timestamp: &now,
	}, nil
}
