// File: backend/internal/api/proxy_pool_handlers.go
package api

import (
	"database/sql"
	"log"
	"net/http"
	"time"

	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/fntelecomllc/studio/backend/internal/store"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// ProxyPoolRequest represents payload for creating or updating a proxy pool
type ProxyPoolRequest struct {
	Name                       string  `json:"name" binding:"required"`
	Description                *string `json:"description,omitempty"`
	IsEnabled                  *bool   `json:"isEnabled,omitempty"`
	PoolStrategy               *string `json:"poolStrategy,omitempty"`
	HealthCheckEnabled         *bool   `json:"healthCheckEnabled,omitempty"`
	HealthCheckIntervalSeconds *int    `json:"healthCheckIntervalSeconds,omitempty"`
	MaxRetries                 *int    `json:"maxRetries,omitempty"`
	TimeoutSeconds             *int    `json:"timeoutSeconds,omitempty"`
}

// ListProxyPoolsGin returns all proxy pools.
// @Summary List proxy pools
// @Description Retrieve all proxy pools with their associated proxies
// @Tags proxy-pools
// @ID listProxyPools
// @Produce json
// @Success 200 {array} models.ProxyPool "List of proxy pools"
// @Failure 500 {object} map[string]string "Failed to list proxy pools"
// @Router /proxy-pools [get]
func (h *APIHandler) ListProxyPoolsGin(c *gin.Context) {
	pools, err := h.ProxyPoolStore.ListProxyPools(c.Request.Context(), h.DB)
	if err != nil {
		respondWithErrorGin(c, http.StatusInternalServerError, "Failed to list proxy pools")
		return
	}
	for _, p := range pools {
		proxyPtrs, _ := h.ProxyPoolStore.ListProxiesForPool(c.Request.Context(), h.DB, p.ID)
		proxies := make([]models.Proxy, 0, len(proxyPtrs))
		for _, pr := range proxyPtrs {
			if pr != nil {
				proxies = append(proxies, *pr)
			}
		}
		p.Proxies = proxies
	}
	respondWithJSONGin(c, http.StatusOK, pools)
}

// CreateProxyPoolGin handles creating a new proxy pool.
// @Summary Create proxy pool
// @Description Create a new proxy pool with configuration settings
// @Tags proxy-pools
// @Accept json
// @Produce json
// @Param request body ProxyPoolRequest true "Proxy pool creation request"
// @Success 201 {object} models.ProxyPool "Created proxy pool"
// @Failure 400 {object} map[string]string "Invalid request payload"
// @Failure 500 {object} map[string]string "Failed to create pool"
// @Router /proxy-pools [post]
func (h *APIHandler) CreateProxyPoolGin(c *gin.Context) {
	var req ProxyPoolRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondWithErrorGin(c, http.StatusBadRequest, "Invalid request payload")
		return
	}
	now := time.Now().UTC()
	pool := &models.ProxyPool{
		ID:                         uuid.New(),
		Name:                       req.Name,
		Description:                sql.NullString{String: getString(req.Description), Valid: req.Description != nil && *req.Description != ""},
		IsEnabled:                  getBool(req.IsEnabled, true),
		PoolStrategy:               sql.NullString{String: getString(req.PoolStrategy), Valid: req.PoolStrategy != nil && *req.PoolStrategy != ""},
		HealthCheckEnabled:         getBool(req.HealthCheckEnabled, true),
		HealthCheckIntervalSeconds: req.HealthCheckIntervalSeconds,
		MaxRetries:                 req.MaxRetries,
		TimeoutSeconds:             req.TimeoutSeconds,
		CreatedAt:                  now,
		UpdatedAt:                  now,
	}

	var opErr error
	tx, err := h.ProxyPoolStore.BeginTxx(c.Request.Context(), nil)
	if err != nil {
		log.Printf("BeginTxx error: %v", err)
		tx = nil
	}
	var querier store.Querier = h.DB
	if tx != nil {
		querier = tx
	}
	if err := h.ProxyPoolStore.CreateProxyPool(c.Request.Context(), querier, pool); err != nil {
		opErr = err
	}
	if tx != nil {
		if opErr != nil {
			_ = tx.Rollback()
		} else {
			opErr = tx.Commit()
		}
	}
	if opErr != nil {
		respondWithErrorGin(c, http.StatusInternalServerError, "Failed to create pool")
		return
	}
	respondWithJSONGin(c, http.StatusCreated, pool)
}

// UpdateProxyPoolGin updates a proxy pool.
// @Summary Update proxy pool
// @Description Update an existing proxy pool configuration
// @Tags proxy-pools
// @Accept json
// @Produce json
// @Param poolId path string true "Proxy pool ID"
// @Param request body ProxyPoolRequest true "Proxy pool update request"
// @Success 200 {object} models.ProxyPool "Updated proxy pool"
// @Failure 400 {object} map[string]string "Invalid ID or request payload"
// @Failure 404 {object} map[string]string "Pool not found"
// @Failure 500 {object} map[string]string "Failed to update pool"
// @Router /proxy-pools/{poolId} [put]
func (h *APIHandler) UpdateProxyPoolGin(c *gin.Context) {
	poolID, err := uuid.Parse(c.Param("poolId"))
	if err != nil {
		respondWithErrorGin(c, http.StatusBadRequest, "Invalid ID")
		return
	}
	var req ProxyPoolRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondWithErrorGin(c, http.StatusBadRequest, "Invalid request payload")
		return
	}
	existing, err := h.ProxyPoolStore.GetProxyPoolByID(c.Request.Context(), h.DB, poolID)
	if err != nil {
		status := http.StatusInternalServerError
		if err == store.ErrNotFound {
			status = http.StatusNotFound
		}
		respondWithErrorGin(c, status, "Pool not found")
		return
	}
	if req.Name != "" {
		existing.Name = req.Name
	}
	if req.Description != nil {
		existing.Description = sql.NullString{String: getString(req.Description), Valid: *req.Description != ""}
	}
	if req.IsEnabled != nil {
		existing.IsEnabled = *req.IsEnabled
	}
	if req.PoolStrategy != nil {
		existing.PoolStrategy = sql.NullString{String: getString(req.PoolStrategy), Valid: *req.PoolStrategy != ""}
	}
	if req.HealthCheckEnabled != nil {
		existing.HealthCheckEnabled = *req.HealthCheckEnabled
	}
	if req.HealthCheckIntervalSeconds != nil {
		existing.HealthCheckIntervalSeconds = req.HealthCheckIntervalSeconds
	}
	if req.MaxRetries != nil {
		existing.MaxRetries = req.MaxRetries
	}
	if req.TimeoutSeconds != nil {
		existing.TimeoutSeconds = req.TimeoutSeconds
	}

	var opErr error
	tx, err := h.ProxyPoolStore.BeginTxx(c.Request.Context(), nil)
	if err != nil {
		tx = nil
	}
	var querier store.Querier = h.DB
	if tx != nil {
		querier = tx
	}
	if err := h.ProxyPoolStore.UpdateProxyPool(c.Request.Context(), querier, existing); err != nil {
		opErr = err
	}
	if tx != nil {
		if opErr != nil {
			_ = tx.Rollback()
		} else {
			opErr = tx.Commit()
		}
	}
	if opErr != nil {
		respondWithErrorGin(c, http.StatusInternalServerError, "Failed to update pool")
		return
	}
	respondWithJSONGin(c, http.StatusOK, existing)
}

// DeleteProxyPoolGin deletes a pool.
// @Summary Delete proxy pool
// @Description Delete a proxy pool
// @Tags proxy-pools
// @Param poolId path string true "Proxy pool ID"
// @Success 200 {object} map[string]bool "Deletion confirmation"
// @Failure 400 {object} map[string]string "Invalid ID"
// @Failure 404 {object} map[string]string "Failed to delete pool"
// @Failure 500 {object} map[string]string "Failed to delete pool"
// @Router /proxy-pools/{poolId} [delete]
func (h *APIHandler) DeleteProxyPoolGin(c *gin.Context) {
	poolID, err := uuid.Parse(c.Param("poolId"))
	if err != nil {
		respondWithErrorGin(c, http.StatusBadRequest, "Invalid ID")
		return
	}
	if err := h.ProxyPoolStore.DeleteProxyPool(c.Request.Context(), h.DB, poolID); err != nil {
		status := http.StatusInternalServerError
		if err == store.ErrNotFound {
			status = http.StatusNotFound
		}
		respondWithErrorGin(c, status, "Failed to delete pool")
		return
	}
	respondWithJSONGin(c, http.StatusOK, gin.H{"deleted": true})
}

// AddProxyToPoolGin assigns a proxy to pool.
// @Summary Add proxy to pool
// @Description Assign a proxy to a proxy pool with optional weight
// @Tags proxy-pools
// @Accept json
// @Produce json
// @Param poolId path string true "Proxy pool ID"
// @Param request body object{proxyId=string,weight=int} true "Proxy assignment request"
// @Success 201 {object} models.ProxyPoolMembership "Created membership"
// @Failure 400 {object} map[string]string "Invalid pool ID, payload, or proxy ID"
// @Failure 500 {object} map[string]string "Failed to add proxy"
// @Router /proxy-pools/{poolId}/proxies [post]
func (h *APIHandler) AddProxyToPoolGin(c *gin.Context) {
	poolID, err := uuid.Parse(c.Param("poolId"))
	if err != nil {
		respondWithErrorGin(c, http.StatusBadRequest, "Invalid pool ID")
		return
	}
	var body AddProxyToPoolRequest
	if err := c.ShouldBindJSON(&body); err != nil {
		respondWithErrorGin(c, http.StatusBadRequest, "Invalid payload")
		return
	}
	proxyUUID, err := uuid.Parse(body.ProxyID)
	if err != nil {
		respondWithErrorGin(c, http.StatusBadRequest, "Invalid proxy ID")
		return
	}
	m := &models.ProxyPoolMembership{
		PoolID:   poolID,
		ProxyID:  proxyUUID,
		Weight:   body.Weight,
		IsActive: true,
		AddedAt:  time.Now().UTC(),
	}
	if err := h.ProxyPoolStore.AddProxyToPool(c.Request.Context(), h.DB, m); err != nil {
		respondWithErrorGin(c, http.StatusInternalServerError, "Failed to add proxy")
		return
	}
	respondWithJSONGin(c, http.StatusCreated, m)
}

// RemoveProxyFromPoolGin removes a proxy from pool.
// @Summary Remove proxy from pool
// @Description Remove a proxy from a specific proxy pool
// @Tags proxy-pools
// @Produce json
// @Param poolId path string true "Pool ID (UUID)"
// @Param proxyId path string true "Proxy ID (UUID)"
// @Success 200 {object} ProxyPoolMembershipResponse "Proxy removed from pool successfully"
// @Failure 400 {object} map[string]string "Bad Request"
// @Failure 404 {object} map[string]string "Pool or proxy not found"
// @Failure 500 {object} map[string]string "Internal Server Error"
// @Router /proxy-pools/{poolId}/proxies/{proxyId} [delete]
func (h *APIHandler) RemoveProxyFromPoolGin(c *gin.Context) {
	poolID, err := uuid.Parse(c.Param("poolId"))
	if err != nil {
		respondWithErrorGin(c, http.StatusBadRequest, "Invalid pool ID")
		return
	}
	proxyID, err := uuid.Parse(c.Param("proxyId"))
	if err != nil {
		respondWithErrorGin(c, http.StatusBadRequest, "Invalid proxy ID")
		return
	}
	if err := h.ProxyPoolStore.RemoveProxyFromPool(c.Request.Context(), h.DB, poolID, proxyID); err != nil {
		status := http.StatusInternalServerError
		if err == store.ErrNotFound {
			status = http.StatusNotFound
		}
		respondWithErrorGin(c, status, "Failed to remove proxy")
		return
	}
	respondWithJSONGin(c, http.StatusOK, gin.H{"removed": true})
}

func getString(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}
func getBool(b *bool, def bool) bool {
	if b == nil {
		return def
	}
	return *b
}
