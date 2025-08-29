package main

import (
	"context"
	"encoding/json"
	"time"

	gen "github.com/fntelecomllc/studio/backend/internal/api/gen"
	"github.com/fntelecomllc/studio/backend/internal/config"
)

// ---- Config: Proxy Manager ----
func (h *strictHandlers) ConfigGetProxyManager(ctx context.Context, r gen.ConfigGetProxyManagerRequestObject) (gen.ConfigGetProxyManagerResponseObject, error) {
	if h.deps == nil || h.deps.Config == nil {
		return gen.ConfigGetProxyManager500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "config not initialized", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	pmJSON := config.ConvertProxyManagerConfigToJSON(h.deps.Config.ProxyManager)
	resp := gen.ConfigGetProxyManager200JSONResponse{
		"data":      toMap(pmJSON),
		"metadata":  okMeta(),
		"requestId": reqID(),
		"success":   true,
	}
	return resp, nil
}

func (h *strictHandlers) ConfigUpdateProxyManager(ctx context.Context, r gen.ConfigUpdateProxyManagerRequestObject) (gen.ConfigUpdateProxyManagerResponseObject, error) {
	if h.deps == nil || h.deps.Config == nil {
		return gen.ConfigUpdateProxyManager500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "config not initialized", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	if r.Body == nil {
		return gen.ConfigUpdateProxyManager400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "missing body", Code: gen.BADREQUEST, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	var pmCfg config.ProxyManagerConfig
	if b, err := json.Marshal(*r.Body); err == nil {
		_ = json.Unmarshal(b, &pmCfg)
	}
	h.deps.Config.ProxyManager = pmCfg
	if err := config.SaveAppConfig(h.deps.Config); err != nil {
		return gen.ConfigUpdateProxyManager500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to save config", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	resp := gen.ConfigUpdateProxyManager200JSONResponse{
		"data":      toMap(config.ConvertProxyManagerConfigToJSON(pmCfg)),
		"metadata":  okMeta(),
		"requestId": reqID(),
		"success":   true,
	}
	return resp, nil
}
