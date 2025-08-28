package main

import (
	"context"
	"encoding/json"
	"time"

	gen "github.com/fntelecomllc/studio/backend/internal/api/gen"
	"github.com/fntelecomllc/studio/backend/internal/config"
)

// ---- Config: DNS ----
func (h *strictHandlers) ConfigGetDns(ctx context.Context, r gen.ConfigGetDnsRequestObject) (gen.ConfigGetDnsResponseObject, error) {
	if h.deps == nil || h.deps.Config == nil {
		return gen.ConfigGetDns500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "config not initialized", Code: "internal", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	dataJSON := config.ConvertDNSConfigToJSON(h.deps.Config.DNSValidator)
	dm := gen.DNSValidatorConfigJSON(toMap(dataJSON))
	return gen.ConfigGetDns200JSONResponse{Success: boolPtr(true), RequestId: reqID(), Metadata: okMeta(), Data: &dm}, nil
}

func (h *strictHandlers) ConfigUpdateDns(ctx context.Context, r gen.ConfigUpdateDnsRequestObject) (gen.ConfigUpdateDnsResponseObject, error) {
	if h.deps == nil || h.deps.Config == nil {
		return gen.ConfigUpdateDns500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "config not initialized", Code: "internal", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	if r.Body == nil {
		return gen.ConfigUpdateDns400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "missing body", Code: "bad_request", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	var bodyJSON config.DNSValidatorConfigJSON
	if b, err := json.Marshal(*r.Body); err == nil {
		_ = json.Unmarshal(b, &bodyJSON)
	}
	updated := config.ConvertJSONToDNSConfig(bodyJSON)
	if updated.QueryTimeoutSeconds <= 0 {
		return gen.ConfigUpdateDns400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "queryTimeoutSeconds must be positive", Code: "bad_request", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	h.deps.Config.DNSValidator = updated
	if err := config.SaveAppConfig(h.deps.Config); err != nil {
		return gen.ConfigUpdateDns500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to save config", Code: "internal", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	dm := gen.DNSValidatorConfigJSON(toMap(config.ConvertDNSConfigToJSON(updated)))
	return gen.ConfigUpdateDns200JSONResponse{Success: boolPtr(true), RequestId: reqID(), Metadata: okMeta(), Data: &dm}, nil
}

// ---- Config: HTTP ----
func (h *strictHandlers) ConfigGetHttp(ctx context.Context, r gen.ConfigGetHttpRequestObject) (gen.ConfigGetHttpResponseObject, error) {
	if h.deps == nil || h.deps.Config == nil {
		return gen.ConfigGetHttp500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "config not initialized", Code: "internal", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	data := config.ConvertHTTPConfigToJSON(h.deps.Config.HTTPValidator)
	return gen.ConfigGetHttp200JSONResponse{
		"data":      data,
		"metadata":  okMeta(),
		"requestId": reqID(),
		"success":   true,
	}, nil
}

func (h *strictHandlers) ConfigUpdateHttp(ctx context.Context, r gen.ConfigUpdateHttpRequestObject) (gen.ConfigUpdateHttpResponseObject, error) {
	if h.deps == nil || h.deps.Config == nil {
		return gen.ConfigUpdateHttp500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "config not initialized", Code: "internal", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	if r.Body == nil {
		return gen.ConfigUpdateHttp400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "missing body", Code: "bad_request", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	var hv config.HTTPValidatorConfigJSON
	if b, err := json.Marshal(*r.Body); err == nil {
		_ = json.Unmarshal(b, &hv)
	}
	updated := config.ConvertJSONToHTTPConfig(hv)
	if updated.MaxBodyReadBytes <= 0 {
		return gen.ConfigUpdateHttp400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "maxBodyReadBytes must be positive", Code: "bad_request", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	h.deps.Config.HTTPValidator = updated
	if err := config.SaveAppConfig(h.deps.Config); err != nil {
		return gen.ConfigUpdateHttp500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to save config", Code: "internal", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	resp := gen.ConfigUpdateHttp200JSONResponse{
		"data":      config.ConvertHTTPConfigToJSON(updated),
		"metadata":  okMeta(),
		"requestId": reqID(),
		"success":   true,
	}
	return resp, nil
}

// ---- Config: Logging ----
func (h *strictHandlers) ConfigGetLogging(ctx context.Context, r gen.ConfigGetLoggingRequestObject) (gen.ConfigGetLoggingResponseObject, error) {
	if h.deps == nil || h.deps.Config == nil {
		return gen.ConfigGetLogging500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "config not initialized", Code: "internal", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	lm := gen.LoggingConfig(toMap(h.deps.Config.Logging))
	return gen.ConfigGetLogging200JSONResponse{Success: boolPtr(true), RequestId: reqID(), Metadata: okMeta(), Data: &lm}, nil
}

func (h *strictHandlers) ConfigUpdateLogging(ctx context.Context, r gen.ConfigUpdateLoggingRequestObject) (gen.ConfigUpdateLoggingResponseObject, error) {
	if h.deps == nil || h.deps.Config == nil {
		return gen.ConfigUpdateLogging500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "config not initialized", Code: "internal", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	if r.Body == nil {
		return gen.ConfigUpdateLogging400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "missing body", Code: "bad_request", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	var newCfg config.LoggingConfig
	if b, err := json.Marshal(*r.Body); err == nil {
		_ = json.Unmarshal(b, &newCfg)
	}
	valid := map[string]bool{"DEBUG": true, "INFO": true, "WARN": true, "ERROR": true}
	if !valid[newCfg.Level] {
		return gen.ConfigUpdateLogging400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "Invalid logging level", Code: "bad_request", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	h.deps.Config.Logging = newCfg
	if err := config.SaveAppConfig(h.deps.Config); err != nil {
		return gen.ConfigUpdateLogging500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to save config", Code: "internal", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	lm := gen.LoggingConfig(toMap(h.deps.Config.Logging))
	return gen.ConfigUpdateLogging200JSONResponse{Success: boolPtr(true), RequestId: reqID(), Metadata: okMeta(), Data: &lm}, nil
}

// ---- Config: RateLimiter ----
func (h *strictHandlers) ConfigGetRateLimiter(ctx context.Context, r gen.ConfigGetRateLimiterRequestObject) (gen.ConfigGetRateLimiterResponseObject, error) {
	if h.deps == nil || h.deps.Config == nil {
		return gen.ConfigGetRateLimiter500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "config not initialized", Code: "internal", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	rm := gen.RateLimiterConfig(toMap(h.deps.Config.RateLimiter))
	return gen.ConfigGetRateLimiter200JSONResponse{Success: boolPtr(true), RequestId: reqID(), Metadata: okMeta(), Data: &rm}, nil
}

func (h *strictHandlers) ConfigUpdateRateLimiter(ctx context.Context, r gen.ConfigUpdateRateLimiterRequestObject) (gen.ConfigUpdateRateLimiterResponseObject, error) {
	if h.deps == nil || h.deps.Config == nil {
		return gen.ConfigUpdateRateLimiter500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "config not initialized", Code: "internal", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	if r.Body == nil {
		return gen.ConfigUpdateRateLimiter400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "missing body", Code: "bad_request", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	var rl config.RateLimiterConfig
	if b, err := json.Marshal(*r.Body); err == nil {
		_ = json.Unmarshal(b, &rl)
	}
	h.deps.Config.RateLimiter = rl
	if err := config.SaveAppConfig(h.deps.Config); err != nil {
		return gen.ConfigUpdateRateLimiter500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to save config", Code: "internal", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	rm := gen.RateLimiterConfig(toMap(h.deps.Config.RateLimiter))
	return gen.ConfigUpdateRateLimiter200JSONResponse{Success: boolPtr(true), RequestId: reqID(), Metadata: okMeta(), Data: &rm}, nil
}

// ---- Config: Server ----
func (h *strictHandlers) ConfigGetServer(ctx context.Context, r gen.ConfigGetServerRequestObject) (gen.ConfigGetServerResponseObject, error) {
	if h.deps == nil || h.deps.Config == nil {
		return gen.ConfigGetServer500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "config not initialized", Code: "internal", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	c := h.deps.Config.Server
	resp := gen.ConfigGetServer200JSONResponse{
		"data": map[string]interface{}{
			"port":            c.Port,
			"streamChunkSize": c.StreamChunkSize,
			"ginMode":         c.GinMode,
		},
		"metadata":  okMeta(),
		"requestId": reqID(),
		"success":   true,
	}
	return resp, nil
}

func (h *strictHandlers) ConfigUpdateServer(ctx context.Context, r gen.ConfigUpdateServerRequestObject) (gen.ConfigUpdateServerResponseObject, error) {
	if h.deps == nil || h.deps.Config == nil {
		return gen.ConfigUpdateServer500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "config not initialized", Code: "internal", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	if r.Body == nil {
		return gen.ConfigUpdateServer400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "missing body", Code: "bad_request", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	m := *r.Body
	if v, ok := m["streamChunkSize"].(float64); ok && v > 0 {
		h.deps.Config.Server.StreamChunkSize = int(v)
	}
	if v, ok := m["ginMode"].(string); ok {
		if v == "debug" || v == "release" || v == "test" {
			h.deps.Config.Server.GinMode = v
		} else {
			return gen.ConfigUpdateServer400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "Invalid ginMode", Code: "bad_request", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
		}
	}
	if err := config.SaveAppConfig(h.deps.Config); err != nil {
		return gen.ConfigUpdateServer500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to save config", Code: "internal", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	resp := gen.ConfigUpdateServer200JSONResponse{
		"data": map[string]interface{}{
			"port":            h.deps.Config.Server.Port,
			"streamChunkSize": h.deps.Config.Server.StreamChunkSize,
			"ginMode":         h.deps.Config.Server.GinMode,
		},
		"metadata":  okMeta(),
		"requestId": reqID(),
		"success":   true,
	}
	return resp, nil
}

// ---- Config: Worker ----
func (h *strictHandlers) ConfigGetWorker(ctx context.Context, r gen.ConfigGetWorkerRequestObject) (gen.ConfigGetWorkerResponseObject, error) {
	if h.deps == nil || h.deps.Config == nil {
		return gen.ConfigGetWorker500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "config not initialized", Code: "internal", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	wm := gen.WorkerConfig(toMap(h.deps.Config.Worker))
	return gen.ConfigGetWorker200JSONResponse{Success: boolPtr(true), RequestId: reqID(), Metadata: okMeta(), Data: &wm}, nil
}

func (h *strictHandlers) ConfigUpdateWorker(ctx context.Context, r gen.ConfigUpdateWorkerRequestObject) (gen.ConfigUpdateWorkerResponseObject, error) {
	if h.deps == nil || h.deps.Config == nil {
		return gen.ConfigUpdateWorker500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "config not initialized", Code: "internal", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	if r.Body == nil {
		return gen.ConfigUpdateWorker400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "missing body", Code: "bad_request", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	var wc config.WorkerConfig
	if b, err := json.Marshal(*r.Body); err == nil {
		_ = json.Unmarshal(b, &wc)
	}
	h.deps.Config.Worker = wc
	if err := config.SaveAppConfig(h.deps.Config); err != nil {
		return gen.ConfigUpdateWorker500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to save config", Code: "internal", Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	wm := gen.WorkerConfig(toMap(h.deps.Config.Worker))
	return gen.ConfigUpdateWorker200JSONResponse{Success: boolPtr(true), RequestId: reqID(), Metadata: okMeta(), Data: &wm}, nil
}
