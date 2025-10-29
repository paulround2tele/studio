package main

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	gen "github.com/fntelecomllc/studio/backend/internal/api/gen"
	"github.com/fntelecomllc/studio/backend/internal/config"
)

func (h *strictHandlers) ConfigGetAuthentication(ctx context.Context, r gen.ConfigGetAuthenticationRequestObject) (gen.ConfigGetAuthenticationResponseObject, error) {
	var auth config.AuthConfig
	if h.deps != nil && h.deps.Config != nil && h.deps.Config.Server.AuthConfig != nil {
		auth = *h.deps.Config.Server.AuthConfig
	} else {
		auth = config.GetDefaultAuthConfig()
	}
	api := mapAuthConfigToAPI(auth)
	return gen.ConfigGetAuthentication200JSONResponse(api), nil
}

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
	applyAuthConfigPatch(h.deps.Config.Server.AuthConfig, *r.Body)
	if h.deps.Session != nil {
		cfg := h.deps.Session.GetConfig()
		if h.deps.Config.Server.AuthConfig.SessionDuration > 0 {
			cfg.Duration = h.deps.Config.Server.AuthConfig.SessionDuration
		}
		if h.deps.Config.Server.AuthConfig.SessionIdleTimeout > 0 {
			cfg.IdleTimeout = h.deps.Config.Server.AuthConfig.SessionIdleTimeout
		}
	}
	if err := config.SaveAppConfig(h.deps.Config); err != nil {
		return gen.ConfigUpdateAuthentication500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to save config", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	api := mapAuthConfigToAPI(*h.deps.Config.Server.AuthConfig)
	return gen.ConfigUpdateAuthentication200JSONResponse(api), nil
}

func (h *strictHandlers) ConfigGetDnsValidator(ctx context.Context, r gen.ConfigGetDnsValidatorRequestObject) (gen.ConfigGetDnsValidatorResponseObject, error) {
	if h.deps == nil || h.deps.Config == nil {
		return gen.ConfigGetDnsValidator500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "config not initialized", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	apiCfg, err := convertStruct[gen.DNSValidatorConfigJSON](config.ConvertDNSConfigToJSON(h.deps.Config.DNSValidator))
	if err != nil {
		return gen.ConfigGetDnsValidator500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to map dns config", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	return gen.ConfigGetDnsValidator200JSONResponse(apiCfg), nil
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
	apiCfg, err := convertStruct[gen.DNSValidatorConfigJSON](config.ConvertDNSConfigToJSON(updated))
	if err != nil {
		return gen.ConfigUpdateDnsValidator500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to map dns config", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	return gen.ConfigUpdateDnsValidator200JSONResponse(apiCfg), nil
}

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
	if updated.RequestTimeoutSeconds <= 0 {
		return gen.ConfigUpdateHttp400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "requestTimeoutSeconds must be positive", Code: gen.BADREQUEST, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	h.deps.Config.HTTPValidator = updated
	if err := config.SaveAppConfig(h.deps.Config); err != nil {
		return gen.ConfigUpdateHttp500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to save config", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	data := config.ConvertHTTPConfigToJSON(updated)
	return gen.ConfigUpdateHttp200JSONResponse(map[string]interface{}{"data": data}), nil
}

func (h *strictHandlers) ConfigGetLogging(ctx context.Context, r gen.ConfigGetLoggingRequestObject) (gen.ConfigGetLoggingResponseObject, error) {
	if h.deps == nil || h.deps.Config == nil {
		return gen.ConfigGetLogging500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "config not initialized", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	apiCfg, err := convertStruct[gen.LoggingConfig](h.deps.Config.Logging)
	if err != nil {
		return gen.ConfigGetLogging500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to map logging config", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	return gen.ConfigGetLogging200JSONResponse(apiCfg), nil
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
	valid := map[string]struct{}{"DEBUG": {}, "INFO": {}, "WARN": {}, "ERROR": {}}
	if _, ok := valid[newCfg.Level]; !ok {
		return gen.ConfigUpdateLogging400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "invalid logging level", Code: gen.BADREQUEST, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	h.deps.Config.Logging = newCfg
	if err := config.SaveAppConfig(h.deps.Config); err != nil {
		return gen.ConfigUpdateLogging500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to save config", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	apiCfg, err := convertStruct[gen.LoggingConfig](h.deps.Config.Logging)
	if err != nil {
		return gen.ConfigUpdateLogging500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to map logging config", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	return gen.ConfigUpdateLogging200JSONResponse(apiCfg), nil
}

func (h *strictHandlers) ConfigGetRateLimiter(ctx context.Context, r gen.ConfigGetRateLimiterRequestObject) (gen.ConfigGetRateLimiterResponseObject, error) {
	if h.deps == nil || h.deps.Config == nil {
		return gen.ConfigGetRateLimiter500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "config not initialized", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	apiCfg, err := convertStruct[gen.RateLimiterConfig](h.deps.Config.RateLimiter)
	if err != nil {
		return gen.ConfigGetRateLimiter500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to map rate limiter config", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	apiCfg.Enabled = true
	if apiCfg.Strategy == "" {
		apiCfg.Strategy = gen.RateLimiterConfigStrategy("fixed_window")
	}
	return gen.ConfigGetRateLimiter200JSONResponse(apiCfg), nil
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
	if rl.MaxRequests <= 0 || rl.WindowSeconds <= 0 {
		return gen.ConfigUpdateRateLimiter400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "maxRequests and windowSeconds must be positive", Code: gen.BADREQUEST, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	h.deps.Config.RateLimiter = rl
	if err := config.SaveAppConfig(h.deps.Config); err != nil {
		return gen.ConfigUpdateRateLimiter500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to save config", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	apiCfg, err := convertStruct[gen.RateLimiterConfig](h.deps.Config.RateLimiter)
	if err != nil {
		return gen.ConfigUpdateRateLimiter500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to map rate limiter config", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	apiCfg.Enabled = true
	if apiCfg.Strategy == "" {
		apiCfg.Strategy = gen.RateLimiterConfigStrategy("fixed_window")
	}
	return gen.ConfigUpdateRateLimiter200JSONResponse(apiCfg), nil
}

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
	body := *r.Body
	if v, ok := body["streamChunkSize"].(float64); ok {
		chunk := int(v)
		if chunk <= 0 {
			return gen.ConfigUpdateServer400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "streamChunkSize must be positive", Code: gen.BADREQUEST, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
		}
		h.deps.Config.Server.StreamChunkSize = chunk
	}
	if v, ok := body["ginMode"].(string); ok {
		switch v {
		case "debug", "release", "test":
			h.deps.Config.Server.GinMode = v
		default:
			return gen.ConfigUpdateServer400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: fmt.Sprintf("invalid ginMode: %s", v), Code: gen.BADREQUEST, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
		}
	}
	if err := config.SaveAppConfig(h.deps.Config); err != nil {
		return gen.ConfigUpdateServer500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to save config", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	resp := map[string]interface{}{
		"port":            h.deps.Config.Server.Port,
		"streamChunkSize": h.deps.Config.Server.StreamChunkSize,
		"ginMode":         h.deps.Config.Server.GinMode,
	}
	return gen.ConfigUpdateServer200JSONResponse(resp), nil
}

func (h *strictHandlers) ConfigGetWorker(ctx context.Context, r gen.ConfigGetWorkerRequestObject) (gen.ConfigGetWorkerResponseObject, error) {
	if h.deps == nil || h.deps.Config == nil {
		return gen.ConfigGetWorker500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "config not initialized", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	apiCfg, err := convertStruct[gen.WorkerConfig](h.deps.Config.Worker)
	if err != nil {
		return gen.ConfigGetWorker500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to map worker config", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	return gen.ConfigGetWorker200JSONResponse(apiCfg), nil
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
	apiCfg, err := convertStruct[gen.WorkerConfig](h.deps.Config.Worker)
	if err != nil {
		return gen.ConfigUpdateWorker500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to map worker config", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	return gen.ConfigUpdateWorker200JSONResponse(apiCfg), nil
}

func mapAuthConfigToAPI(cfg config.AuthConfig) gen.AuthConfig {
	accessTTL := int32(cfg.SessionIdleTimeout / time.Second)
	if accessTTL <= 0 {
		accessTTL = int32(cfg.SessionDuration / time.Second)
	}
	refreshTTL := int32(cfg.SessionDuration / time.Second)
	if refreshTTL <= 0 {
		refreshTTL = accessTTL
	}
	var policy *struct {
		MinLength        *int  `json:"minLength,omitempty"`
		RequireLowercase *bool `json:"requireLowercase,omitempty"`
		RequireNumbers   *bool `json:"requireNumbers,omitempty"`
		RequireSymbols   *bool `json:"requireSymbols,omitempty"`
		RequireUppercase *bool `json:"requireUppercase,omitempty"`
	}
	if cfg.PasswordMinLength > 0 {
		min := cfg.PasswordMinLength
		policy = &struct {
			MinLength        *int  `json:"minLength,omitempty"`
			RequireLowercase *bool `json:"requireLowercase,omitempty"`
			RequireNumbers   *bool `json:"requireNumbers,omitempty"`
			RequireSymbols   *bool `json:"requireSymbols,omitempty"`
			RequireUppercase *bool `json:"requireUppercase,omitempty"`
		}{}
		policy.MinLength = &min
	}
	enabled := true
	provider := gen.AuthConfigProvider("local")
	return gen.AuthConfig{
		AccessTokenTtlSeconds:  accessTTL,
		AllowedProviders:       nil,
		Enabled:                enabled,
		JwtAudience:            nil,
		JwtIssuer:              nil,
		PasswordPolicy:         policy,
		Provider:               provider,
		RefreshTokenTtlSeconds: refreshTTL,
	}
}

func applyAuthConfigPatch(target *config.AuthConfig, incoming gen.AuthConfig) {
	if incoming.PasswordPolicy != nil && incoming.PasswordPolicy.MinLength != nil {
		target.PasswordMinLength = *incoming.PasswordPolicy.MinLength
	}
	if incoming.AccessTokenTtlSeconds > 0 {
		target.SessionIdleTimeout = time.Duration(incoming.AccessTokenTtlSeconds) * time.Second
	}
	if incoming.RefreshTokenTtlSeconds > 0 {
		target.SessionDuration = time.Duration(incoming.RefreshTokenTtlSeconds) * time.Second
	}
	if incoming.Enabled {
		// keep enabled; no-op for now but ensures value read so future logic can hook here
	}
}

func convertStruct[T any](src interface{}) (T, error) {
	var out T
	data, err := json.Marshal(src)
	if err != nil {
		return out, err
	}
	if err := json.Unmarshal(data, &out); err != nil {
		return out, err
	}
	return out, nil
}
