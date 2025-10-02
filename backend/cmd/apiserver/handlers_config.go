package main

import (
	"context"
	"encoding/json"
	"time"

	gen "github.com/fntelecomllc/studio/backend/internal/api/gen"
	"github.com/fntelecomllc/studio/backend/internal/config"
)

// ConfigGetAuthentication returns sanitized auth configuration as a free-form object
func (h *strictHandlers) ConfigGetAuthentication(ctx context.Context, r gen.ConfigGetAuthenticationRequestObject) (gen.ConfigGetAuthenticationResponseObject, error) {
	var ac config.AuthConfig
	if h.deps != nil && h.deps.Config != nil && h.deps.Config.Server.AuthConfig != nil {
		ac = *h.deps.Config.Server.AuthConfig
	} else {
		ac = config.GetDefaultAuthConfig()
	}
	m := map[string]interface{}{
		"bcryptCost":                 ac.BcryptCost,
		"passwordMinLength":          ac.PasswordMinLength,
		"sessionDurationSeconds":     int(ac.SessionDuration / time.Second),
		"sessionIdleTimeoutSeconds":  int(ac.SessionIdleTimeout / time.Second),
		"sessionCookieName":          ac.SessionCookieName,
		"sessionCookieDomain":        ac.SessionCookieDomain,
		"sessionCookieSecure":        ac.SessionCookieSecure,
		"resetTokenExpirySeconds":    int(ac.ResetTokenExpiry / time.Second),
		"maxFailedAttempts":          ac.MaxFailedAttempts,
		"accountLockDurationSeconds": int(ac.AccountLockDuration / time.Second),
		"rateLimitWindowSeconds":     int(ac.RateLimitWindow / time.Second),
		"maxLoginAttempts":           ac.MaxLoginAttempts,
		"maxPasswordResetAttempts":   ac.MaxPasswordResetAttempts,
		"captchaThreshold":           ac.CaptchaThreshold,
	}
	return gen.ConfigGetAuthentication200JSONResponse(m), nil
}

// ConfigUpdateAuthentication updates auth config fields dynamically and returns the updated config
func (h *strictHandlers) ConfigUpdateAuthentication(ctx context.Context, r gen.ConfigUpdateAuthenticationRequestObject) (gen.ConfigUpdateAuthenticationResponseObject, error) {
	if r.Body == nil {
		return gen.ConfigUpdateAuthentication400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "body required", Code: gen.BADREQUEST, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	if h.deps == nil || h.deps.Config == nil {
		return gen.ConfigUpdateAuthentication500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "config not initialized", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	if h.deps.Config.Server.AuthConfig == nil {
		cfg := config.GetDefaultAuthConfig()
		h.deps.Config.Server.AuthConfig = &cfg
	}
	ac := h.deps.Config.Server.AuthConfig
	body := map[string]interface{}(*r.Body)
	// Update known fields if present
	if v, ok := body["bcryptCost"].(float64); ok {
		ac.BcryptCost = int(v)
	}
	if v, ok := body["passwordMinLength"].(float64); ok {
		ac.PasswordMinLength = int(v)
	}
	if v, ok := body["sessionDurationSeconds"].(float64); ok {
		ac.SessionDuration = time.Duration(int(v)) * time.Second
	}
	if v, ok := body["sessionIdleTimeoutSeconds"].(float64); ok {
		ac.SessionIdleTimeout = time.Duration(int(v)) * time.Second
	}
	if v, ok := body["sessionCookieName"].(string); ok {
		ac.SessionCookieName = v
	}
	if v, ok := body["sessionCookieDomain"].(string); ok {
		ac.SessionCookieDomain = v
	}
	if v, ok := body["sessionCookieSecure"].(bool); ok {
		ac.SessionCookieSecure = v
	}
	if v, ok := body["resetTokenExpirySeconds"].(float64); ok {
		ac.ResetTokenExpiry = time.Duration(int(v)) * time.Second
	}
	if v, ok := body["maxFailedAttempts"].(float64); ok {
		ac.MaxFailedAttempts = int(v)
	}
	if v, ok := body["accountLockDurationSeconds"].(float64); ok {
		ac.AccountLockDuration = time.Duration(int(v)) * time.Second
	}
	if v, ok := body["rateLimitWindowSeconds"].(float64); ok {
		ac.RateLimitWindow = time.Duration(int(v)) * time.Second
	}
	if v, ok := body["maxLoginAttempts"].(float64); ok {
		ac.MaxLoginAttempts = int(v)
	}
	if v, ok := body["maxPasswordResetAttempts"].(float64); ok {
		ac.MaxPasswordResetAttempts = int(v)
	}
	if v, ok := body["captchaThreshold"].(float64); ok {
		ac.CaptchaThreshold = int(v)
	}
	// Propagate to session service if available
	if h.deps.Session != nil {
		if ac.SessionDuration > 0 {
			h.deps.Session.GetConfig().Duration = ac.SessionDuration
		}
		if ac.SessionIdleTimeout > 0 {
			h.deps.Session.GetConfig().IdleTimeout = ac.SessionIdleTimeout
		}
	}
	// Return updated snapshot
	m := map[string]interface{}{
		"bcryptCost":                 ac.BcryptCost,
		"passwordMinLength":          ac.PasswordMinLength,
		"sessionDurationSeconds":     int(ac.SessionDuration / time.Second),
		"sessionIdleTimeoutSeconds":  int(ac.SessionIdleTimeout / time.Second),
		"sessionCookieName":          ac.SessionCookieName,
		"sessionCookieDomain":        ac.SessionCookieDomain,
		"sessionCookieSecure":        ac.SessionCookieSecure,
		"resetTokenExpirySeconds":    int(ac.ResetTokenExpiry / time.Second),
		"maxFailedAttempts":          ac.MaxFailedAttempts,
		"accountLockDurationSeconds": int(ac.AccountLockDuration / time.Second),
		"rateLimitWindowSeconds":     int(ac.RateLimitWindow / time.Second),
		"maxLoginAttempts":           ac.MaxLoginAttempts,
		"maxPasswordResetAttempts":   ac.MaxPasswordResetAttempts,
		"captchaThreshold":           ac.CaptchaThreshold,
	}
	return gen.ConfigUpdateAuthentication200JSONResponse(m), nil
}

// ---- Config: DNS ----
func (h *strictHandlers) ConfigGetDnsValidator(ctx context.Context, r gen.ConfigGetDnsValidatorRequestObject) (gen.ConfigGetDnsValidatorResponseObject, error) {
	if h.deps == nil || h.deps.Config == nil {
		return gen.ConfigGetDnsValidator500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "config not initialized", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	dataJSON := config.ConvertDNSConfigToJSON(h.deps.Config.DNSValidator)
	dm := gen.DNSValidatorConfigJSON(toMap(dataJSON))
	return gen.ConfigGetDnsValidator200JSONResponse(dm), nil
}

func (h *strictHandlers) ConfigUpdateDnsValidator(ctx context.Context, r gen.ConfigUpdateDnsValidatorRequestObject) (gen.ConfigUpdateDnsValidatorResponseObject, error) {
	if h.deps == nil || h.deps.Config == nil {
		return gen.ConfigUpdateDnsValidator500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "config not initialized", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	if r.Body == nil {
		return gen.ConfigUpdateDnsValidator400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "missing body", Code: gen.BADREQUEST, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	var bodyJSON config.DNSValidatorConfigJSON
	if b, err := json.Marshal(*r.Body); err == nil {
		_ = json.Unmarshal(b, &bodyJSON)
	}
	updated := config.ConvertJSONToDNSConfig(bodyJSON)
	if updated.QueryTimeoutSeconds <= 0 {
		return gen.ConfigUpdateDnsValidator400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "queryTimeoutSeconds must be positive", Code: gen.BADREQUEST, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	h.deps.Config.DNSValidator = updated
	if err := config.SaveAppConfig(h.deps.Config); err != nil {
		return gen.ConfigUpdateDnsValidator500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to save config", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	dm := gen.DNSValidatorConfigJSON(toMap(config.ConvertDNSConfigToJSON(updated)))
	return gen.ConfigUpdateDnsValidator200JSONResponse(dm), nil
}

// ---- Config: HTTP ----
func (h *strictHandlers) ConfigGetHttp(ctx context.Context, r gen.ConfigGetHttpRequestObject) (gen.ConfigGetHttpResponseObject, error) {
	if h.deps == nil || h.deps.Config == nil {
		return gen.ConfigGetHttp500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "config not initialized", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	data := config.ConvertHTTPConfigToJSON(h.deps.Config.HTTPValidator)
	return gen.ConfigGetHttp200JSONResponse(map[string]interface{}{"data": data}), nil
}

func (h *strictHandlers) ConfigUpdateHttp(ctx context.Context, r gen.ConfigUpdateHttpRequestObject) (gen.ConfigUpdateHttpResponseObject, error) {
	if h.deps == nil || h.deps.Config == nil {
		return gen.ConfigUpdateHttp500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "config not initialized", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	if r.Body == nil {
		return gen.ConfigUpdateHttp400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "missing body", Code: gen.BADREQUEST, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	var hv config.HTTPValidatorConfigJSON
	if b, err := json.Marshal(*r.Body); err == nil {
		_ = json.Unmarshal(b, &hv)
	}
	updated := config.ConvertJSONToHTTPConfig(hv)
	if updated.MaxBodyReadBytes <= 0 {
		return gen.ConfigUpdateHttp400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "maxBodyReadBytes must be positive", Code: gen.BADREQUEST, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	h.deps.Config.HTTPValidator = updated
	if err := config.SaveAppConfig(h.deps.Config); err != nil {
		return gen.ConfigUpdateHttp500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to save config", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	return gen.ConfigUpdateHttp200JSONResponse(map[string]interface{}{"data": config.ConvertHTTPConfigToJSON(updated)}), nil
}

// ---- Config: Logging ----
func (h *strictHandlers) ConfigGetLogging(ctx context.Context, r gen.ConfigGetLoggingRequestObject) (gen.ConfigGetLoggingResponseObject, error) {
	if h.deps == nil || h.deps.Config == nil {
		return gen.ConfigGetLogging500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "config not initialized", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	lm := gen.LoggingConfig(toMap(h.deps.Config.Logging))
	return gen.ConfigGetLogging200JSONResponse(lm), nil
}

func (h *strictHandlers) ConfigUpdateLogging(ctx context.Context, r gen.ConfigUpdateLoggingRequestObject) (gen.ConfigUpdateLoggingResponseObject, error) {
	if h.deps == nil || h.deps.Config == nil {
		return gen.ConfigUpdateLogging500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "config not initialized", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	if r.Body == nil {
		return gen.ConfigUpdateLogging400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "missing body", Code: gen.BADREQUEST, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	var newCfg config.LoggingConfig
	if b, err := json.Marshal(*r.Body); err == nil {
		_ = json.Unmarshal(b, &newCfg)
	}
	valid := map[string]bool{"DEBUG": true, "INFO": true, "WARN": true, "ERROR": true}
	if !valid[newCfg.Level] {
		return gen.ConfigUpdateLogging400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "Invalid logging level", Code: gen.BADREQUEST, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	h.deps.Config.Logging = newCfg
	if err := config.SaveAppConfig(h.deps.Config); err != nil {
		return gen.ConfigUpdateLogging500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to save config", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	lm := gen.LoggingConfig(toMap(h.deps.Config.Logging))
	return gen.ConfigUpdateLogging200JSONResponse(lm), nil
}

// ---- Config: RateLimiter ----
func (h *strictHandlers) ConfigGetRateLimiter(ctx context.Context, r gen.ConfigGetRateLimiterRequestObject) (gen.ConfigGetRateLimiterResponseObject, error) {
	if h.deps == nil || h.deps.Config == nil {
		return gen.ConfigGetRateLimiter500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "config not initialized", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	rm := gen.RateLimiterConfig(toMap(h.deps.Config.RateLimiter))
	return gen.ConfigGetRateLimiter200JSONResponse(rm), nil
}

func (h *strictHandlers) ConfigUpdateRateLimiter(ctx context.Context, r gen.ConfigUpdateRateLimiterRequestObject) (gen.ConfigUpdateRateLimiterResponseObject, error) {
	if h.deps == nil || h.deps.Config == nil {
		return gen.ConfigUpdateRateLimiter500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "config not initialized", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	if r.Body == nil {
		return gen.ConfigUpdateRateLimiter400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "missing body", Code: gen.BADREQUEST, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	var rl config.RateLimiterConfig
	if b, err := json.Marshal(*r.Body); err == nil {
		_ = json.Unmarshal(b, &rl)
	}
	h.deps.Config.RateLimiter = rl
	if err := config.SaveAppConfig(h.deps.Config); err != nil {
		return gen.ConfigUpdateRateLimiter500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to save config", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	rm := gen.RateLimiterConfig(toMap(h.deps.Config.RateLimiter))
	return gen.ConfigUpdateRateLimiter200JSONResponse(rm), nil
}

// ---- Config: Server ----
func (h *strictHandlers) ConfigGetServer(ctx context.Context, r gen.ConfigGetServerRequestObject) (gen.ConfigGetServerResponseObject, error) {
	if h.deps == nil || h.deps.Config == nil {
		return gen.ConfigGetServer500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "config not initialized", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	c := h.deps.Config.Server
	resp := map[string]interface{}{
		"port":            c.Port,
		"streamChunkSize": c.StreamChunkSize,
		"ginMode":         c.GinMode,
	}
	return gen.ConfigGetServer200JSONResponse(resp), nil
}

func (h *strictHandlers) ConfigUpdateServer(ctx context.Context, r gen.ConfigUpdateServerRequestObject) (gen.ConfigUpdateServerResponseObject, error) {
	if h.deps == nil || h.deps.Config == nil {
		return gen.ConfigUpdateServer500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "config not initialized", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	if r.Body == nil {
		return gen.ConfigUpdateServer400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "missing body", Code: gen.BADREQUEST, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	m := *r.Body
	if v, ok := m["streamChunkSize"].(float64); ok && v > 0 {
		h.deps.Config.Server.StreamChunkSize = int(v)
	}
	if v, ok := m["ginMode"].(string); ok {
		if v == "debug" || v == "release" || v == "test" {
			h.deps.Config.Server.GinMode = v
		} else {
			return gen.ConfigUpdateServer400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "Invalid ginMode", Code: gen.BADREQUEST, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
		}
	}
	if err := config.SaveAppConfig(h.deps.Config); err != nil {
		return gen.ConfigUpdateServer500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to save config", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	updateServerMap := map[string]interface{}{
		"port":            h.deps.Config.Server.Port,
		"streamChunkSize": h.deps.Config.Server.StreamChunkSize,
		"ginMode":         h.deps.Config.Server.GinMode,
	}
	return gen.ConfigUpdateServer200JSONResponse(updateServerMap), nil
}

// ---- Config: Worker ----
func (h *strictHandlers) ConfigGetWorker(ctx context.Context, r gen.ConfigGetWorkerRequestObject) (gen.ConfigGetWorkerResponseObject, error) {
	if h.deps == nil || h.deps.Config == nil {
		return gen.ConfigGetWorker500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "config not initialized", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	wm := gen.WorkerConfig(toMap(h.deps.Config.Worker))
	return gen.ConfigGetWorker200JSONResponse(wm), nil
}

func (h *strictHandlers) ConfigUpdateWorker(ctx context.Context, r gen.ConfigUpdateWorkerRequestObject) (gen.ConfigUpdateWorkerResponseObject, error) {
	if h.deps == nil || h.deps.Config == nil {
		return gen.ConfigUpdateWorker500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "config not initialized", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	if r.Body == nil {
		return gen.ConfigUpdateWorker400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "missing body", Code: gen.BADREQUEST, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	var wc config.WorkerConfig
	if b, err := json.Marshal(*r.Body); err == nil {
		_ = json.Unmarshal(b, &wc)
	}
	h.deps.Config.Worker = wc
	if err := config.SaveAppConfig(h.deps.Config); err != nil {
		return gen.ConfigUpdateWorker500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to save config", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	wm := gen.WorkerConfig(toMap(h.deps.Config.Worker))
	return gen.ConfigUpdateWorker200JSONResponse(wm), nil
}
