package main

import (
	"context"
	"fmt"
	"net/http"
	"time"

	gen "github.com/fntelecomllc/studio/backend/internal/api/gen"
	"github.com/fntelecomllc/studio/backend/internal/services"
	"github.com/google/uuid"
)

type sseLiveResponse struct {
	sse           *services.SSEService
	ctx           context.Context
	userID        uuid.UUID
	campaignID    *uuid.UUID
	allowedOrigin string
}

func (resp sseLiveResponse) VisitSseEventsCampaignResponse(w http.ResponseWriter) error {
	return resp.stream(w)
}

func (resp sseLiveResponse) VisitSseEventsAllResponse(w http.ResponseWriter) error {
	return resp.stream(w)
}

// stream registers the client against the real ResponseWriter so CORS/auth headers and flushing work as expected.
func (resp sseLiveResponse) stream(w http.ResponseWriter) error {
	if resp.sse == nil {
		return fmt.Errorf("sse service not initialized")
	}
	client, err := resp.sse.RegisterClient(resp.ctx, w, resp.userID, resp.campaignID, resp.allowedOrigin)
	if err != nil {
		return err
	}
	<-client.Context.Done()
	resp.sse.UnregisterClient(client.ID)
	return nil
}

func allowedOriginFromContext(ctx context.Context) string {
	if v := ctx.Value(contextKeyAllowedOrigin); v != nil {
		if s, ok := v.(string); ok {
			return s
		}
	}
	return ""
}

func extractUserID(ctx context.Context) uuid.UUID {
	if v := ctx.Value("user_id"); v != nil {
		switch val := v.(type) {
		case uuid.UUID:
			if val != uuid.Nil {
				return val
			}
		case string:
			if parsed, err := uuid.Parse(val); err == nil {
				return parsed
			}
		}
	}
	return uuid.New()
}

func (h *strictHandlers) SseEventsCampaign(ctx context.Context, r gen.SseEventsCampaignRequestObject) (gen.SseEventsCampaignResponseObject, error) {
	if h.deps == nil || h.deps.SSE == nil {
		return gen.SseEventsCampaign500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "sse service not initialized", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	userID := extractUserID(ctx)
	campID := uuid.UUID(r.CampaignId)
	origin := allowedOriginFromContext(ctx)
	return sseLiveResponse{
		sse:           h.deps.SSE,
		ctx:           ctx,
		userID:        userID,
		campaignID:    &campID,
		allowedOrigin: origin,
	}, nil
}

func (h *strictHandlers) SseEventsAll(ctx context.Context, r gen.SseEventsAllRequestObject) (gen.SseEventsAllResponseObject, error) {
	if h.deps == nil || h.deps.SSE == nil {
		return gen.SseEventsAll500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "sse service not initialized", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	userID := extractUserID(ctx)
	origin := allowedOriginFromContext(ctx)
	return sseLiveResponse{
		sse:           h.deps.SSE,
		ctx:           ctx,
		userID:        userID,
		campaignID:    nil,
		allowedOrigin: origin,
	}, nil
}

func (h *strictHandlers) SseEventsStats(ctx context.Context, r gen.SseEventsStatsRequestObject) (gen.SseEventsStatsResponseObject, error) {
	if h.deps == nil || h.deps.SSE == nil {
		return gen.SseEventsStats500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "sse service not initialized", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	active := h.deps.SSE.GetClientCount()
	total := h.deps.SSE.GetTotalEvents()
	up := h.deps.SSE.GetUptime().Round(time.Second).String()
	return gen.SseEventsStats200JSONResponse{ActiveConnections: &active, TotalEventsSent: &total, Uptime: &up}, nil
}

func (h *strictHandlers) SseEventsCampaignLatest(ctx context.Context, r gen.SseEventsCampaignLatestRequestObject) (gen.SseEventsCampaignLatestResponseObject, error) {
	if h.deps == nil || h.deps.SSE == nil {
		return gen.SseEventsCampaignLatest500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "sse service not initialized", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	// Minimal placeholder: return empty raw union (client-side adapter can ignore)
	var ev gen.CampaignSseEvent
	return gen.SseEventsCampaignLatest200JSONResponse(ev), nil
}

func (h *strictHandlers) SseEventsCampaignSample(ctx context.Context, r gen.SseEventsCampaignSampleRequestObject) (gen.SseEventsCampaignSampleResponseObject, error) {
	if h.deps == nil || h.deps.SSE == nil {
		return gen.SseEventsCampaignSample500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "sse service not initialized", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	var ev gen.CampaignSseEvent
	return gen.SseEventsCampaignSample200JSONResponse{ev}, nil
}
