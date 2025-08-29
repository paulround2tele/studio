package main

import (
	"context"
	"database/sql"
	"time"

	gen "github.com/fntelecomllc/studio/backend/internal/api/gen"
	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/google/uuid"
	openapi_types "github.com/oapi-codegen/runtime/types"
)

func (h *strictHandlers) ProxyPoolsList(ctx context.Context, r gen.ProxyPoolsListRequestObject) (gen.ProxyPoolsListResponseObject, error) {
	if h.deps == nil || h.deps.Stores.ProxyPools == nil || h.deps.DB == nil {
		return gen.ProxyPoolsList500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "proxy pool store not initialized", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	pools, err := h.deps.Stores.ProxyPools.ListProxyPools(ctx, h.deps.DB)
	if err != nil {
		return gen.ProxyPoolsList500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to list proxy pools", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	out := make([]gen.ProxyPool, 0, len(pools))
	for _, p := range pools {
		id := openapi_types.UUID(p.ID)
		name := p.Name
		isEnabled := p.IsEnabled
		created := p.CreatedAt
		updated := p.UpdatedAt
		out = append(out, gen.ProxyPool{Id: &id, Name: &name, IsEnabled: &isEnabled, CreatedAt: &created, UpdatedAt: &updated})
	}
	return gen.ProxyPoolsList200JSONResponse{Data: &out, Metadata: okMeta(), RequestId: reqID(), Success: boolPtr(true)}, nil
}

func (h *strictHandlers) ProxyPoolsCreate(ctx context.Context, r gen.ProxyPoolsCreateRequestObject) (gen.ProxyPoolsCreateResponseObject, error) {
	if h.deps == nil || h.deps.Stores.ProxyPools == nil || h.deps.DB == nil {
		return gen.ProxyPoolsCreate500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "proxy pool store not initialized", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	if r.Body == nil {
		return gen.ProxyPoolsCreate400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "missing body", Code: gen.BADREQUEST, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	now := time.Now()
	pool := &models.ProxyPool{
		ID:   uuid.New(),
		Name: r.Body.Name,
		IsEnabled: func() bool {
			if r.Body.IsEnabled != nil {
				return *r.Body.IsEnabled
			}
			return true
		}(),
		CreatedAt: now,
		UpdatedAt: now,
	}
	if r.Body.Description != nil {
		pool.Description = sql.NullString{String: *r.Body.Description, Valid: *r.Body.Description != ""}
	}
	if r.Body.PoolStrategy != nil {
		pool.PoolStrategy = sql.NullString{String: *r.Body.PoolStrategy, Valid: *r.Body.PoolStrategy != ""}
	}
	if err := h.deps.Stores.ProxyPools.CreateProxyPool(ctx, h.deps.DB, pool); err != nil {
		return gen.ProxyPoolsCreate500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to create proxy pool", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	id := openapi_types.UUID(pool.ID)
	name := pool.Name
	isEnabled := pool.IsEnabled
	created := pool.CreatedAt
	updated := pool.UpdatedAt
	data := gen.ProxyPool{Id: &id, Name: &name, IsEnabled: &isEnabled, CreatedAt: &created, UpdatedAt: &updated}
	return gen.ProxyPoolsCreate201JSONResponse{Data: &data, Metadata: okMeta(), RequestId: reqID(), Success: boolPtr(true)}, nil
}

func (h *strictHandlers) ProxyPoolsDelete(ctx context.Context, r gen.ProxyPoolsDeleteRequestObject) (gen.ProxyPoolsDeleteResponseObject, error) {
	if h.deps == nil || h.deps.Stores.ProxyPools == nil || h.deps.DB == nil {
		return gen.ProxyPoolsDelete500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "proxy pool store not initialized", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	if err := h.deps.Stores.ProxyPools.DeleteProxyPool(ctx, h.deps.DB, uuid.UUID(r.PoolId)); err != nil {
		return gen.ProxyPoolsDelete500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to delete proxy pool", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	deleted := true
	msg := "proxy pool deleted"
	id := openapi_types.UUID(r.PoolId)
	return gen.ProxyPoolsDelete200JSONResponse{Data: &gen.ProxyPoolDeleteResponse{Deleted: &deleted, Message: &msg, PoolId: &id}, Metadata: okMeta(), RequestId: reqID(), Success: boolPtr(true)}, nil
}

func (h *strictHandlers) ProxyPoolsUpdate(ctx context.Context, r gen.ProxyPoolsUpdateRequestObject) (gen.ProxyPoolsUpdateResponseObject, error) {
	if h.deps == nil || h.deps.Stores.ProxyPools == nil || h.deps.DB == nil {
		return gen.ProxyPoolsUpdate500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "proxy pool store not initialized", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	if r.Body == nil {
		return gen.ProxyPoolsUpdate400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "missing body", Code: gen.BADREQUEST, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	pool, err := h.deps.Stores.ProxyPools.GetProxyPoolByID(ctx, h.deps.DB, uuid.UUID(r.PoolId))
	if err != nil {
		return gen.ProxyPoolsUpdate500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to fetch proxy pool", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	if r.Body.Name != "" {
		pool.Name = r.Body.Name
	}
	if r.Body.Description != nil {
		pool.Description = sql.NullString{String: *r.Body.Description, Valid: *r.Body.Description != ""}
	}
	if r.Body.IsEnabled != nil {
		pool.IsEnabled = *r.Body.IsEnabled
	}
	if r.Body.PoolStrategy != nil {
		pool.PoolStrategy = sql.NullString{String: *r.Body.PoolStrategy, Valid: *r.Body.PoolStrategy != ""}
	}
	if r.Body.HealthCheckEnabled != nil {
		pool.HealthCheckEnabled = *r.Body.HealthCheckEnabled
	}
	if r.Body.HealthCheckIntervalSeconds != nil {
		pool.HealthCheckIntervalSeconds = r.Body.HealthCheckIntervalSeconds
	}
	if r.Body.MaxRetries != nil {
		pool.MaxRetries = r.Body.MaxRetries
	}
	if r.Body.TimeoutSeconds != nil {
		pool.TimeoutSeconds = r.Body.TimeoutSeconds
	}
	pool.UpdatedAt = time.Now()
	if err := h.deps.Stores.ProxyPools.UpdateProxyPool(ctx, h.deps.DB, pool); err != nil {
		return gen.ProxyPoolsUpdate500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to update proxy pool", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	id := openapi_types.UUID(pool.ID)
	name := pool.Name
	isEnabled := pool.IsEnabled
	created := pool.CreatedAt
	updated := pool.UpdatedAt
	data := gen.ProxyPool{Id: &id, Name: &name, IsEnabled: &isEnabled, CreatedAt: &created, UpdatedAt: &updated}
	return gen.ProxyPoolsUpdate200JSONResponse{Data: &data, Metadata: okMeta(), RequestId: reqID(), Success: boolPtr(true)}, nil
}

func (h *strictHandlers) ProxyPoolsAddProxy(ctx context.Context, r gen.ProxyPoolsAddProxyRequestObject) (gen.ProxyPoolsAddProxyResponseObject, error) {
	if h.deps == nil || h.deps.Stores.ProxyPools == nil || h.deps.DB == nil {
		return gen.ProxyPoolsAddProxy400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "dependencies not initialized", Code: gen.BADREQUEST, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	if r.Body == nil {
		return gen.ProxyPoolsAddProxy400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "missing body", Code: gen.BADREQUEST, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	m := &models.ProxyPoolMembership{PoolID: uuid.UUID(r.PoolId), ProxyID: uuid.UUID(r.Body.ProxyId), IsActive: true, AddedAt: time.Now()}
	if r.Body.Weight != nil {
		m.Weight = r.Body.Weight
	}
	if err := h.deps.Stores.ProxyPools.AddProxyToPool(ctx, h.deps.DB, m); err != nil {
		return gen.ProxyPoolsAddProxy400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "failed to add proxy to pool", Code: gen.BADREQUEST, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	pid := openapi_types.UUID(r.PoolId)
	xid := openapi_types.UUID(r.Body.ProxyId)
	return gen.ProxyPoolsAddProxy201JSONResponse{Data: &gen.ProxyPoolMembership{AddedAt: func() *time.Time { t := m.AddedAt; return &t }(), IsActive: &m.IsActive, PoolId: &pid, ProxyId: &xid, Weight: m.Weight}, Metadata: okMeta(), RequestId: reqID(), Success: boolPtr(true)}, nil
}

func (h *strictHandlers) ProxyPoolsRemoveProxy(ctx context.Context, r gen.ProxyPoolsRemoveProxyRequestObject) (gen.ProxyPoolsRemoveProxyResponseObject, error) {
	if h.deps == nil || h.deps.Stores.ProxyPools == nil || h.deps.DB == nil {
		return gen.ProxyPoolsRemoveProxy400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "dependencies not initialized", Code: gen.BADREQUEST, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	if err := h.deps.Stores.ProxyPools.RemoveProxyFromPool(ctx, h.deps.DB, uuid.UUID(r.PoolId), uuid.UUID(r.ProxyId)); err != nil {
		return gen.ProxyPoolsRemoveProxy400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "failed to remove proxy from pool", Code: gen.BADREQUEST, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	removed := true
	pid := openapi_types.UUID(r.PoolId)
	xid := openapi_types.UUID(r.ProxyId)
	return gen.ProxyPoolsRemoveProxy200JSONResponse{Data: &gen.ProxyPoolMembershipResponse{Removed: &removed, PoolId: &pid, ProxyId: &xid}, Metadata: okMeta(), RequestId: reqID(), Success: boolPtr(true)}, nil
}
