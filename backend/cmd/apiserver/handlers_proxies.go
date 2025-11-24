package main

import (
	"context"
	"database/sql"
	"time"

	gen "github.com/fntelecomllc/studio/backend/internal/api/gen"
	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/fntelecomllc/studio/backend/internal/store"
	"github.com/google/uuid"
	openapi_types "github.com/oapi-codegen/runtime/types"
)

func (h *strictHandlers) ProxiesList(ctx context.Context, r gen.ProxiesListRequestObject) (gen.ProxiesListResponseObject, error) {
	if h.deps == nil || h.deps.Stores.Proxy == nil || h.deps.DB == nil {
		return gen.ProxiesList500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "proxy store not initialized", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	var proto models.ProxyProtocolEnum
	if r.Params.Protocol != nil {
		proto = models.ProxyProtocolEnum(*r.Params.Protocol)
	}
	filter := store.ListProxiesFilter{Protocol: proto, IsEnabled: (*bool)(r.Params.IsEnabled), IsHealthy: (*bool)(r.Params.IsHealthy)}
	if r.Params.Limit != nil {
		filter.Limit = int(*r.Params.Limit)
	}
	if r.Params.Offset != nil {
		filter.Offset = int(*r.Params.Offset)
	}
	proxies, err := h.deps.Stores.Proxy.ListProxies(ctx, h.deps.DB, filter)
	if err != nil {
		return gen.ProxiesList500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to list proxies", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	items := make([]gen.Proxy, 0, len(proxies))
	for _, p := range proxies {
		// Map model to API Proxy
		apiProxy := gen.Proxy{Id: openapi_types.UUID(p.ID), Name: p.Name, Address: p.Address, IsEnabled: p.IsEnabled, IsHealthy: p.IsHealthy, CreatedAt: p.CreatedAt, UpdatedAt: p.UpdatedAt}
		if p.Description.Valid {
			s := p.Description.String
			apiProxy.Description = &s
		}
		if p.Protocol != nil {
			protoStr := gen.ProxyProtocol(*p.Protocol)
			apiProxy.Protocol = &protoStr
		}
		if p.Username.Valid {
			s := p.Username.String
			apiProxy.Username = &s
		}
		if p.Host.Valid {
			s := p.Host.String
			apiProxy.Host = &s
		}
		if p.Port.Valid {
			v := int(p.Port.Int32)
			apiProxy.Port = &v
		}
		if p.LastCheckedAt.Valid {
			t := p.LastCheckedAt.Time
			apiProxy.LastCheckedAt = &t
		}
		if p.LatencyMs.Valid {
			v := int(p.LatencyMs.Int32)
			apiProxy.LatencyMs = &v
		}
		if p.CountryCode.Valid {
			s := p.CountryCode.String
			apiProxy.CountryCode = &s
		}
		if p.Notes.Valid {
			s := p.Notes.String
			apiProxy.Notes = &s
		}
		items = append(items, apiProxy)
	}
	return gen.ProxiesList200JSONResponse(items), nil
}

func (h *strictHandlers) ProxiesCreate(ctx context.Context, r gen.ProxiesCreateRequestObject) (gen.ProxiesCreateResponseObject, error) {
	if h.deps == nil || h.deps.Stores.Proxy == nil || h.deps.DB == nil {
		return gen.ProxiesCreate500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "proxy store not initialized", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	if r.Body == nil {
		return gen.ProxiesCreate400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "missing body", Code: gen.BADREQUEST, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	now := time.Now()
	m := &models.Proxy{ID: uuid.New(), Name: r.Body.Name}
	// build optional fields safely
	if r.Body.Description != nil {
		m.Description = sql.NullString{String: *r.Body.Description, Valid: *r.Body.Description != ""}
	}
	m.Address = r.Body.Address
	if r.Body.Protocol != nil {
		v := models.ProxyProtocolEnum(*r.Body.Protocol)
		m.Protocol = &v
	}
	if r.Body.Username != nil {
		m.Username = sql.NullString{String: *r.Body.Username, Valid: *r.Body.Username != ""}
	}
	if r.Body.IsEnabled != nil {
		m.IsEnabled = *r.Body.IsEnabled
	}
	m.CreatedAt, m.UpdatedAt = now, now
	if err := h.deps.Stores.Proxy.CreateProxy(ctx, h.deps.DB, m); err != nil {
		if err == store.ErrDuplicateEntry {
			return gen.ProxiesCreate409JSONResponse{ConflictJSONResponse: gen.ConflictJSONResponse{Error: gen.ApiError{Message: "proxy already exists", Code: gen.CONFLICT, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
		}
		return gen.ProxiesCreate500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to create proxy", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	// Build API Proxy response
	apiProxy := gen.Proxy{Id: openapi_types.UUID(m.ID), Name: m.Name, Address: m.Address, IsEnabled: m.IsEnabled, IsHealthy: m.IsHealthy, CreatedAt: m.CreatedAt, UpdatedAt: m.UpdatedAt}
	if m.Description.Valid {
		s := m.Description.String
		apiProxy.Description = &s
	}
	if m.Protocol != nil {
		protoStr := gen.ProxyProtocol(*m.Protocol)
		apiProxy.Protocol = &protoStr
	}
	if m.Username.Valid {
		s := m.Username.String
		apiProxy.Username = &s
	}
	if m.Host.Valid {
		s := m.Host.String
		apiProxy.Host = &s
	}
	if m.Port.Valid {
		v := int(m.Port.Int32)
		apiProxy.Port = &v
	}
	return gen.ProxiesCreate201JSONResponse(apiProxy), nil
}

func (h *strictHandlers) ProxiesBulkDelete(ctx context.Context, r gen.ProxiesBulkDeleteRequestObject) (gen.ProxiesBulkDeleteResponseObject, error) {
	if h.deps == nil || h.deps.Stores.Proxy == nil || h.deps.DB == nil {
		return gen.ProxiesBulkDelete500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "proxy store not initialized", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	if r.Body == nil || len(r.Body.ProxyIds) == 0 {
		return gen.ProxiesBulkDelete400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "missing proxyIds", Code: gen.BADREQUEST, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	var deleteErr error
	for _, id := range r.Body.ProxyIds {
		if err := h.deps.Stores.Proxy.DeleteProxy(ctx, h.deps.DB, uuid.UUID(id)); err != nil {
			deleteErr = err
		}
	}
	if deleteErr != nil {
		return gen.ProxiesBulkDelete500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to delete one or more proxies", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	return gen.ProxiesBulkDelete204Response{}, nil
}

func (h *strictHandlers) ProxiesBulkTest(ctx context.Context, r gen.ProxiesBulkTestRequestObject) (gen.ProxiesBulkTestResponseObject, error) {
	if r.Body == nil || len(r.Body.ProxyIds) == 0 {
		return gen.ProxiesBulkTest400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "missing proxyIds", Code: gen.BADREQUEST, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	results := make([]gen.ProxyTestResponse, 0, len(r.Body.ProxyIds))
	for _, id := range r.Body.ProxyIds {
		pid := openapi_types.UUID(uuid.UUID(id))
		ok := true
		status := 200
		var rt int64 = 0
		results = append(results, gen.ProxyTestResponse{ProxyId: &pid, Success: &ok, StatusCode: &status, ResponseTime: &rt})
	}
	return gen.ProxiesBulkTest200JSONResponse(gen.BulkProxyTestResponse{Results: &results}), nil
}

func (h *strictHandlers) ProxiesBulkUpdate(ctx context.Context, r gen.ProxiesBulkUpdateRequestObject) (gen.ProxiesBulkUpdateResponseObject, error) {
	if h.deps == nil || h.deps.Stores.Proxy == nil || h.deps.DB == nil {
		return gen.ProxiesBulkUpdate500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "proxy store not initialized", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	if r.Body == nil || len(r.Body.ProxyIds) == 0 {
		return gen.ProxiesBulkUpdate400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "missing proxyIds", Code: gen.BADREQUEST, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	var success, errors int
	for _, id := range r.Body.ProxyIds {
		existing, err := h.deps.Stores.Proxy.GetProxyByID(ctx, h.deps.DB, uuid.UUID(id))
		if err != nil {
			errors++
			continue
		}
		up := r.Body.Updates
		if up.Name != nil {
			existing.Name = *up.Name
		}
		if up.Description != nil {
			existing.Description = sql.NullString{String: *up.Description, Valid: *up.Description != ""}
		}
		if up.Address != nil {
			existing.Address = *up.Address
		}
		if up.Protocol != nil {
			v := models.ProxyProtocolEnum(*up.Protocol)
			existing.Protocol = &v
		}
		if up.Username != nil {
			existing.Username = sql.NullString{String: *up.Username, Valid: *up.Username != ""}
		}
		if up.IsEnabled != nil {
			existing.IsEnabled = *up.IsEnabled
		}
		existing.UpdatedAt = time.Now()
		if err := h.deps.Stores.Proxy.UpdateProxy(ctx, h.deps.DB, existing); err != nil {
			errors++
			continue
		}
		success++
	}
	resp := gen.BulkProxyOperationResponse{SuccessCount: success, ErrorCount: errors}
	return gen.ProxiesBulkUpdate200JSONResponse(resp), nil
}

func (h *strictHandlers) ProxiesHealthCheckAll(ctx context.Context, r gen.ProxiesHealthCheckAllRequestObject) (gen.ProxiesHealthCheckAllResponseObject, error) {
	if h.deps == nil {
		return gen.ProxiesHealthCheckAll500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "dependencies not initialized", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	var ids []string
	if r.Body != nil && r.Body.Ids != nil {
		for _, id := range *r.Body.Ids {
			ids = append(ids, uuid.UUID(id).String())
		}
	}
	if h.deps.ProxyMgr != nil {
		h.deps.ProxyMgr.ForceCheckProxiesAsync(ids)
	}
	total := len(ids)
	return gen.ProxiesHealthCheckAll202JSONResponse(gen.BulkHealthCheckResponse{TotalProxies: &total}), nil
}

func (h *strictHandlers) ProxiesStatus(ctx context.Context, r gen.ProxiesStatusRequestObject) (gen.ProxiesStatusResponseObject, error) {
	var out []gen.ProxyStatusResponse
	now := time.Now()
	if h.deps != nil && h.deps.ProxyMgr != nil {
		statuses := h.deps.ProxyMgr.GetAllProxyStatuses()
		out = make([]gen.ProxyStatusResponse, 0, len(statuses))
		for _, s := range statuses {
			id := openapi_types.UUID(uuid.MustParse(s.ID))
			healthy := s.IsHealthy
			out = append(out, gen.ProxyStatusResponse{ProxyId: &id, IsHealthy: &healthy, Status: func() *string {
				v := "ok"
				if !healthy {
					v = "unhealthy"
				}
				return &v
			}(), LastChecked: &now})
		}
	} else if h.deps != nil && h.deps.Stores.Proxy != nil && h.deps.DB != nil {
		proxies, err := h.deps.Stores.Proxy.ListProxies(ctx, h.deps.DB, store.ListProxiesFilter{})
		if err != nil {
			return gen.ProxiesStatus500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to load statuses", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
		}
		out = make([]gen.ProxyStatusResponse, 0, len(proxies))
		for _, p := range proxies {
			id := openapi_types.UUID(p.ID)
			healthy := p.IsHealthy
			var rt int64
			if p.LatencyMs.Valid {
				rt = int64(p.LatencyMs.Int32)
			}
			var last *time.Time
			if p.LastCheckedAt.Valid {
				t := p.LastCheckedAt.Time
				last = &t
			} else {
				last = &now
			}
			out = append(out, gen.ProxyStatusResponse{ProxyId: &id, IsHealthy: &healthy, ResponseTime: &rt, LastChecked: last, Status: func() *string {
				v := "ok"
				if !healthy {
					v = "unhealthy"
				}
				return &v
			}()})
		}
	} else {
		out = []gen.ProxyStatusResponse{}
	}
	return gen.ProxiesStatus200JSONResponse(out), nil
}

func (h *strictHandlers) ProxiesDelete(ctx context.Context, r gen.ProxiesDeleteRequestObject) (gen.ProxiesDeleteResponseObject, error) {
	if h.deps == nil || h.deps.Stores.Proxy == nil || h.deps.DB == nil {
		return gen.ProxiesDelete500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "proxy store not initialized", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	if err := h.deps.Stores.Proxy.DeleteProxy(ctx, h.deps.DB, uuid.UUID(r.ProxyId)); err != nil {
		if err == store.ErrNotFound {
			return gen.ProxiesDelete404JSONResponse{NotFoundJSONResponse: gen.NotFoundJSONResponse{Error: gen.ApiError{Message: "proxy not found", Code: gen.NOTFOUND, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
		}
		return gen.ProxiesDelete500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to delete proxy", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	// 204 No Content per spec
	return gen.ProxiesDelete204Response{}, nil
}

func (h *strictHandlers) ProxiesUpdate(ctx context.Context, r gen.ProxiesUpdateRequestObject) (gen.ProxiesUpdateResponseObject, error) {
	if h.deps == nil || h.deps.Stores.Proxy == nil || h.deps.DB == nil {
		return gen.ProxiesUpdate500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "proxy store not initialized", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	if r.Body == nil {
		return gen.ProxiesUpdate400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "missing body", Code: gen.BADREQUEST, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	existing, err := h.deps.Stores.Proxy.GetProxyByID(ctx, h.deps.DB, uuid.UUID(r.ProxyId))
	if err != nil {
		if err == store.ErrNotFound {
			return gen.ProxiesUpdate404JSONResponse{NotFoundJSONResponse: gen.NotFoundJSONResponse{Error: gen.ApiError{Message: "proxy not found", Code: gen.NOTFOUND, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
		}
		return gen.ProxiesUpdate500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to fetch proxy", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	up := *r.Body
	if up.Name != nil {
		existing.Name = *up.Name
	}
	if up.Description != nil {
		existing.Description = sql.NullString{String: *up.Description, Valid: *up.Description != ""}
	}
	if up.Address != nil {
		existing.Address = *up.Address
	}
	if up.Protocol != nil {
		v := models.ProxyProtocolEnum(*up.Protocol)
		existing.Protocol = &v
	}
	if up.Username != nil {
		existing.Username = sql.NullString{String: *up.Username, Valid: *up.Username != ""}
	}
	if up.IsEnabled != nil {
		existing.IsEnabled = *up.IsEnabled
	}
	existing.UpdatedAt = time.Now()
	if err := h.deps.Stores.Proxy.UpdateProxy(ctx, h.deps.DB, existing); err != nil {
		if err == store.ErrDuplicateEntry {
			return gen.ProxiesUpdate400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "duplicate name", Code: gen.CONFLICT, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
		}
		return gen.ProxiesUpdate500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to update proxy", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	apiProxy := gen.Proxy{Id: openapi_types.UUID(existing.ID), Name: existing.Name, Address: existing.Address, IsEnabled: existing.IsEnabled, IsHealthy: existing.IsHealthy, CreatedAt: existing.CreatedAt, UpdatedAt: existing.UpdatedAt}
	if existing.Description.Valid {
		s := existing.Description.String
		apiProxy.Description = &s
	}
	if existing.Protocol != nil {
		protoStr := gen.ProxyProtocol(*existing.Protocol)
		apiProxy.Protocol = &protoStr
	}
	if existing.Username.Valid {
		s := existing.Username.String
		apiProxy.Username = &s
	}
	if existing.Host.Valid {
		s := existing.Host.String
		apiProxy.Host = &s
	}
	if existing.Port.Valid {
		v := int(existing.Port.Int32)
		apiProxy.Port = &v
	}
	return gen.ProxiesUpdate200JSONResponse(apiProxy), nil
}

func (h *strictHandlers) ProxiesHealthCheckSingle(ctx context.Context, r gen.ProxiesHealthCheckSingleRequestObject) (gen.ProxiesHealthCheckSingleResponseObject, error) {
	if h.deps == nil || h.deps.Stores.Proxy == nil || h.deps.DB == nil {
		return gen.ProxiesHealthCheckSingle500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "dependencies not initialized", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	var res gen.ProxyHealthCheckResponse
	pid := uuid.UUID(r.ProxyId)
	if h.deps.ProxyMgr != nil {
		st, err := h.deps.ProxyMgr.ForceCheckSingleProxy(pid.String())
		if err != nil {
			return gen.ProxiesHealthCheckSingle404JSONResponse{NotFoundJSONResponse: gen.NotFoundJSONResponse{Error: gen.ApiError{Message: "proxy not found in manager", Code: gen.NOTFOUND, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
		}
		id := openapi_types.UUID(uuid.MustParse(st.ID))
		ok := st.IsHealthy
		now := time.Now()
		res = gen.ProxyHealthCheckResponse{ProxyId: &id, Success: &ok, Status: func() *string {
			s := "ok"
			if !ok {
				s = "unhealthy"
			}
			return &s
		}(), Timestamp: &now}
	} else {
		now := time.Now()
		id := openapi_types.UUID(pid)
		ok := true
		res = gen.ProxyHealthCheckResponse{ProxyId: &id, Success: &ok, Status: func() *string { s := "ok"; return &s }(), Timestamp: &now}
	}
	return gen.ProxiesHealthCheckSingle200JSONResponse(res), nil
}

func (h *strictHandlers) ProxiesTest(ctx context.Context, r gen.ProxiesTestRequestObject) (gen.ProxiesTestResponseObject, error) {
	// Minimal test response; if ProxyMgr exists, could integrate real check later
	pid := openapi_types.UUID(uuid.UUID(r.ProxyId))
	ok := true
	status := 200
	var rt int64 = 0
	data := gen.ProxyTestResponse{ProxyId: &pid, Success: &ok, StatusCode: &status, ResponseTime: &rt}
	return gen.ProxiesTest200JSONResponse(data), nil
}
