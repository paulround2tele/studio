package main

import (
	"context"
	"io"
	"net/http"
	"time"

	gen "github.com/fntelecomllc/studio/backend/internal/api/gen"
	"github.com/google/uuid"
)

// pipeResponseWriter adapts an io.Writer into an http.ResponseWriter with Flush for SSEService
type pipeResponseWriter struct {
	w io.Writer
	h http.Header
}

func newPipeResponseWriter(w io.Writer) *pipeResponseWriter {
	return &pipeResponseWriter{w: w, h: make(http.Header)}
}
func (p *pipeResponseWriter) Header() http.Header         { return p.h }
func (p *pipeResponseWriter) Write(b []byte) (int, error) { return p.w.Write(b) }
func (p *pipeResponseWriter) WriteHeader(statusCode int)  {}
func (p *pipeResponseWriter) Flush()                      {}

func (h *strictHandlers) SseEventsCampaign(ctx context.Context, r gen.SseEventsCampaignRequestObject) (gen.SseEventsCampaignResponseObject, error) {
	if h.deps == nil || h.deps.SSE == nil {
		return gen.SseEventsCampaign500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "sse service not initialized", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	pr, pw := io.Pipe()
	var userID uuid.UUID
	if v := ctx.Value("user_id"); v != nil {
		if uid, ok := v.(uuid.UUID); ok {
			userID = uid
		} else {
			userID = uuid.New()
		}
	} else {
		userID = uuid.New()
	}
	campID := uuid.UUID(r.CampaignId)
	go func() {
		w := newPipeResponseWriter(pw)
		client, err := h.deps.SSE.RegisterClient(ctx, w, userID, &campID)
		if err != nil {
			pw.CloseWithError(err)
			return
		}
		<-client.Context.Done()
		h.deps.SSE.UnregisterClient(client.ID)
		_ = pw.Close()
	}()
	return gen.SseEventsCampaign200TexteventStreamResponse{Body: pr}, nil
}

func (h *strictHandlers) SseEventsAll(ctx context.Context, r gen.SseEventsAllRequestObject) (gen.SseEventsAllResponseObject, error) {
	if h.deps == nil || h.deps.SSE == nil {
		return gen.SseEventsAll500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "sse service not initialized", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	pr, pw := io.Pipe()
	var userID uuid.UUID
	if v := ctx.Value("user_id"); v != nil {
		if uid, ok := v.(uuid.UUID); ok {
			userID = uid
		} else {
			userID = uuid.New()
		}
	} else {
		userID = uuid.New()
	}
	go func() {
		w := newPipeResponseWriter(pw)
		client, err := h.deps.SSE.RegisterClient(ctx, w, userID, nil)
		if err != nil {
			pw.CloseWithError(err)
			return
		}
		<-client.Context.Done()
		h.deps.SSE.UnregisterClient(client.ID)
		_ = pw.Close()
	}()
	return gen.SseEventsAll200TexteventStreamResponse{Body: pr}, nil
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
