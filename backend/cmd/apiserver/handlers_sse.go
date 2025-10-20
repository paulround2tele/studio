package main

import (
	"context"
	"io"
	"net/http"
	"time"

	gen "github.com/fntelecomllc/studio/backend/internal/api/gen"
	"github.com/google/uuid"
)

type ssePipeResponse struct {
	body    io.Reader
	headers http.Header
}

func (resp ssePipeResponse) VisitSseEventsCampaignResponse(w http.ResponseWriter) error {
	return resp.write(w)
}

func (resp ssePipeResponse) VisitSseEventsAllResponse(w http.ResponseWriter) error {
	return resp.write(w)
}

func (resp ssePipeResponse) write(w http.ResponseWriter) error {
	copyHeaders(w.Header(), resp.headers)
	if _, ok := w.Header()["Content-Type"]; !ok {
		w.Header().Set("Content-Type", "text/event-stream")
	}
	if _, ok := w.Header()["Cache-Control"]; !ok {
		w.Header().Set("Cache-Control", "no-cache")
	}
	if _, ok := w.Header()["Connection"]; !ok {
		w.Header().Set("Connection", "keep-alive")
	}
	w.WriteHeader(http.StatusOK)
	if flusher, ok := w.(http.Flusher); ok {
		flusher.Flush()
	}
	if closer, ok := resp.body.(io.ReadCloser); ok {
		defer closer.Close()
	}
	_, err := io.Copy(w, resp.body)
	return err
}

func copyHeaders(dst http.Header, src http.Header) {
	if src == nil {
		return
	}
	for key, values := range src {
		dst.Del(key)
		for _, value := range values {
			dst.Add(key, value)
		}
	}
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
	userID := extractUserID(ctx)
	campID := uuid.UUID(r.CampaignId)
	origin := allowedOriginFromContext(ctx)
	w := newPipeResponseWriter(pw)
	client, err := h.deps.SSE.RegisterClient(ctx, w, userID, &campID, origin)
	if err != nil {
		_ = pw.CloseWithError(err)
		return gen.SseEventsCampaign500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: err.Error(), Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	go func() {
		<-client.Context.Done()
		h.deps.SSE.UnregisterClient(client.ID)
		_ = pw.Close()
	}()
	return ssePipeResponse{body: pr, headers: w.Header().Clone()}, nil
}

func (h *strictHandlers) SseEventsAll(ctx context.Context, r gen.SseEventsAllRequestObject) (gen.SseEventsAllResponseObject, error) {
	if h.deps == nil || h.deps.SSE == nil {
		return gen.SseEventsAll500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "sse service not initialized", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	pr, pw := io.Pipe()
	userID := extractUserID(ctx)
	origin := allowedOriginFromContext(ctx)
	w := newPipeResponseWriter(pw)
	client, err := h.deps.SSE.RegisterClient(ctx, w, userID, nil, origin)
	if err != nil {
		_ = pw.CloseWithError(err)
		return gen.SseEventsAll500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: err.Error(), Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	go func() {
		<-client.Context.Done()
		h.deps.SSE.UnregisterClient(client.ID)
		_ = pw.Close()
	}()
	return ssePipeResponse{body: pr, headers: w.Header().Clone()}, nil
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
