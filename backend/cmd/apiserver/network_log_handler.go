package main

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"log"
	"net/http"
	"sort"
	"strings"
	"time"

	gen "github.com/fntelecomllc/studio/backend/internal/api/gen"
	"github.com/fntelecomllc/studio/backend/internal/config"
)

const (
	networkLogMaxBodyBytes       = 32 * 1024
	networkLogMaxHeaderEntries   = 16
	networkLogMaxHeaderValueSize = 256
	networkLogMaxErrorSize       = 512
	networkLogMaxURLSize         = 2048
)

type networkLogPayload struct {
	Timestamp       time.Time         `json:"timestamp"`
	Url             string            `json:"url"`
	Method          string            `json:"method"`
	Status          *int              `json:"status,omitempty"`
	Ok              *bool             `json:"ok,omitempty"`
	DurationMs      int               `json:"durationMs"`
	Error           *string           `json:"error,omitempty"`
	RequestHeaders  map[string]string `json:"requestHeaders,omitempty"`
	ResponseHeaders map[string]string `json:"responseHeaders,omitempty"`
}

type networkLogHandler struct {
	deps *AppDeps
}

type networkLogMeta struct {
	ClientIP string
	Origin   string
}

func newNetworkLogHandler(deps *AppDeps) *networkLogHandler {
	return &networkLogHandler{deps: deps}
}

func (h *networkLogHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx := h.attachSessionContext(r)

	payload, err := h.parsePayload(w, r)
	if err != nil {
		h.writeBadRequest(w, err.Error())
		return
	}
	origin, _ := ctx.Value(contextKeyAllowedOrigin).(string)
	requestID, ingestErr := h.ingest(ctx, payload, networkLogMeta{
		ClientIP: clientIP(r),
		Origin:   origin,
	})
	if ingestErr != nil {
		h.writeBadRequest(w, ingestErr.Error())
		return
	}

	w.Header().Set("X-Request-Id", requestID)
	w.WriteHeader(http.StatusAccepted)
}

func (h *networkLogHandler) parsePayload(w http.ResponseWriter, r *http.Request) (*networkLogPayload, error) {
	if r.Body == nil {
		return nil, errors.New("empty body")
	}
	defer r.Body.Close()

	limited := io.LimitReader(r.Body, networkLogMaxBodyBytes)
	decoder := json.NewDecoder(limited)
	decoder.DisallowUnknownFields()

	var payload networkLogPayload
	if err := decoder.Decode(&payload); err != nil {
		return nil, errors.New("invalid json payload")
	}
	if err := decoder.Decode(&struct{}{}); err != io.EOF {
		return nil, errors.New("unexpected trailing data")
	}
	return &payload, nil
}

func (h *networkLogHandler) attachSessionContext(r *http.Request) context.Context {
	ctx := r.Context()
	if h.deps == nil || h.deps.Session == nil {
		return ctx
	}
	if c, err := r.Cookie(config.SessionCookieName); err == nil {
		token := strings.TrimSpace(c.Value)
		if token != "" {
			if session, verr := h.deps.Session.ValidateSession(token, clientIP(r)); verr == nil && session != nil {
				ctx = context.WithValue(ctx, "user_id", session.UserID.String())
				ctx = context.WithValue(ctx, "session_id", session.ID)
			}
		}
	}
	return ctx
}

func (h *networkLogHandler) writeBadRequest(w http.ResponseWriter, message string) {
	resp := gen.BadRequestJSONResponse{
		Error: gen.ApiError{
			Message:   message,
			Code:      gen.BADREQUEST,
			Timestamp: time.Now(),
		},
		RequestId: reqID(),
		Success:   boolPtr(false),
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusBadRequest)
	_ = json.NewEncoder(w).Encode(resp)
}

func (h *strictHandlers) DebugNetworkLogIngest(ctx context.Context, r gen.DebugNetworkLogIngestRequestObject) (gen.DebugNetworkLogIngestResponseObject, error) {
	if h.networkLogger == nil {
		h.networkLogger = newNetworkLogHandler(h.deps)
	}
	if r.Body == nil {
		return gen.DebugNetworkLogIngest400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{
			Error:     gen.ApiError{Message: "body required", Code: gen.BADREQUEST, Timestamp: time.Now()},
			RequestId: reqID(),
			Success:   boolPtr(false),
		}}, nil
	}

	payload := &networkLogPayload{
		Timestamp:  r.Body.Timestamp,
		Url:        r.Body.Url,
		Method:     r.Body.Method,
		DurationMs: r.Body.DurationMs,
		Status:     r.Body.Status,
		Ok:         r.Body.Ok,
		Error:      r.Body.Error,
	}

	if r.Body.RequestHeaders != nil {
		payload.RequestHeaders = *r.Body.RequestHeaders
	}
	if r.Body.ResponseHeaders != nil {
		payload.ResponseHeaders = *r.Body.ResponseHeaders
	}

	clientIP, _ := ctx.Value("client_ip").(string)
	origin, _ := ctx.Value(contextKeyAllowedOrigin).(string)

	requestID, err := h.networkLogger.ingest(ctx, payload, networkLogMeta{ClientIP: clientIP, Origin: origin})
	if err != nil {
		return gen.DebugNetworkLogIngest400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{
			Error:     gen.ApiError{Message: err.Error(), Code: gen.BADREQUEST, Timestamp: time.Now()},
			RequestId: reqID(),
			Success:   boolPtr(false),
		}}, nil
	}

	return gen.DebugNetworkLogIngest202Response{Headers: gen.DebugNetworkLogIngest202ResponseHeaders{XRequestId: requestID}}, nil
}

func (h *networkLogHandler) ingest(ctx context.Context, payload *networkLogPayload, meta networkLogMeta) (string, error) {
	if payload == nil {
		return "", errors.New("payload required")
	}

	sanitizedURL := sanitizeText(payload.Url, networkLogMaxURLSize)
	if sanitizedURL == "" {
		return "", errors.New("url required")
	}

	method := strings.ToUpper(strings.TrimSpace(payload.Method))
	if method == "" {
		return "", errors.New("method required")
	}

	if payload.Timestamp.IsZero() {
		return "", errors.New("timestamp required")
	}

	duration := payload.DurationMs
	if duration < 0 {
		duration = 0
	}

	clientIPVal := strings.TrimSpace(meta.ClientIP)
	if clientIPVal == "" {
		if v, ok := ctx.Value("client_ip").(string); ok && strings.TrimSpace(v) != "" {
			clientIPVal = strings.TrimSpace(v)
		}
	}

	fields := map[string]interface{}{
		"url":         sanitizedURL,
		"method":      method,
		"timestamp":   payload.Timestamp.UTC().Format(time.RFC3339Nano),
		"duration_ms": duration,
	}

	if clientIPVal != "" {
		fields["client_ip"] = clientIPVal
	}

	if payload.Status != nil {
		fields["status"] = *payload.Status
	}
	if payload.Ok != nil {
		fields["ok"] = *payload.Ok
	}
	if errText := sanitizeOptionalText(payload.Error, networkLogMaxErrorSize); errText != "" {
		fields["error"] = errText
	}
	if headers := sanitizeHeadersMap(payload.RequestHeaders); headers != nil {
		fields["request_headers"] = headers
	}
	if headers := sanitizeHeadersMap(payload.ResponseHeaders); headers != nil {
		fields["response_headers"] = headers
	}

	originVal := strings.TrimSpace(meta.Origin)
	if originVal == "" {
		if v, ok := ctx.Value(contextKeyAllowedOrigin).(string); ok {
			originVal = strings.TrimSpace(v)
		}
	}
	if originVal != "" {
		fields["origin"] = originVal
	}

	if userID, ok := ctx.Value("user_id").(string); ok && strings.TrimSpace(userID) != "" {
		fields["user_id"] = strings.TrimSpace(userID)
	}
	if sessionID, ok := ctx.Value("session_id").(string); ok && strings.TrimSpace(sessionID) != "" {
		fields["session_id"] = strings.TrimSpace(sessionID)
	}

	requestID := reqID()
	fields["request_id"] = requestID

	if h.deps != nil && h.deps.Logger != nil {
		h.deps.Logger.Debug(ctx, "frontend.network.request", fields)
	} else {
		log.Printf("[DEBUG] frontend.network.request %v", fields)
	}

	return requestID, nil
}

func sanitizeOptionalText(input *string, maxLen int) string {
	if input == nil {
		return ""
	}
	return sanitizeText(*input, maxLen)
}

func sanitizeText(input string, maxLen int) string {
	trimmed := strings.TrimSpace(input)
	if trimmed == "" {
		return ""
	}
	cleaned := strings.ReplaceAll(trimmed, "\r", " ")
	cleaned = strings.ReplaceAll(cleaned, "\n", " ")
	cleaned = strings.ReplaceAll(cleaned, "\t", " ")
	cleaned = strings.Join(strings.Fields(cleaned), " ")
	if cleaned == "" {
		return ""
	}
	if len(cleaned) > maxLen {
		cleaned = cleaned[:maxLen]
	}
	return cleaned
}

func sanitizeHeadersMap(headers map[string]string) map[string]string {
	if len(headers) == 0 {
		return nil
	}
	type headerEntry struct {
		key   string
		value string
	}
	entries := make([]headerEntry, 0, len(headers))
	for rawKey, rawValue := range headers {
		key := strings.ToLower(strings.TrimSpace(rawKey))
		if key == "" {
			continue
		}
		value := sanitizeText(rawValue, networkLogMaxHeaderValueSize)
		if value == "" {
			continue
		}
		entries = append(entries, headerEntry{key: key, value: value})
	}
	if len(entries) == 0 {
		return nil
	}
	sort.Slice(entries, func(i, j int) bool { return entries[i].key < entries[j].key })
	sanitized := make(map[string]string, min(networkLogMaxHeaderEntries, len(entries)))
	count := 0
	for _, entry := range entries {
		sanitized[entry.key] = entry.value
		count++
		if count >= networkLogMaxHeaderEntries {
			break
		}
	}
	if len(sanitized) == 0 {
		return nil
	}
	return sanitized
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
