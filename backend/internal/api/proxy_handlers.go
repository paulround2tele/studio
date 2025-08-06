// File: backend/internal/api/proxy_handlers.go
package api

import (
	"database/sql"
	"encoding/json" // Needed for audit log details
	"fmt"
	"log"
	"net/http"
	"sort"
	"strconv" // For parsing limit/offset
	"strings"
	"sync"
	"time"

	"github.com/fntelecomllc/studio/backend/internal/config" // For ProxyToProxyConfigEntry
	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/fntelecomllc/studio/backend/internal/proxymanager"
	"github.com/fntelecomllc/studio/backend/internal/store"
	"github.com/fntelecomllc/studio/backend/internal/websocket"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx" // Import for sqlx.Tx
	"golang.org/x/crypto/bcrypt"
)

// --- DTOs for Proxy API ---
// Using DTOs from models package to get correct schema names without api. prefix

// Helper to convert models.Proxy to config.ProxyConfigEntry
func proxyToProxyConfigEntry(p *models.Proxy) config.ProxyConfigEntry {
	if p == nil {
		return config.ProxyConfigEntry{}
	}
	isEnabled := p.IsEnabled
	var protocolStr string
	if p.Protocol != nil {
		protocolStr = string(*p.Protocol)
	}
	return config.ProxyConfigEntry{
		ID:          p.ID.String(),
		Name:        p.Name,
		Description: p.Description.String,
		Protocol:    protocolStr,
		Address:     p.Address,
		Username:    p.Username.String,
		Password:    "", // PasswordHash is in models.Proxy, TestProxy needs plaintext if it were to use it
		UserEnabled: &isEnabled,
	}
}

// toProxyResponse simply returns the proxy model itself, as it's already suitable for JSON response.
func toProxyResponse(p *models.Proxy) *models.Proxy {
	return p
}

func toListProxyResponse(proxies []*models.Proxy) []*models.Proxy {
	// Return slice of pointers directly as models.Proxy is already JSON-marshalable
	return proxies
}

// --- Gin Handlers for Proxies ---

// ListProxiesGin lists all proxies.
// @Summary List proxies
// @Description Retrieve a list of proxies with optional filtering by protocol, status, and health
// @Tags proxies
// @Produce json
// @Param limit query int false "Maximum number of results" default(100)
// @Param offset query int false "Number of results to skip" default(0)
// @Param protocol query string false "Filter by protocol (http, https, socks4, socks5)"
// @Param isEnabled query bool false "Filter by enabled status"
// @Param isHealthy query bool false "Filter by health status"
// @Success 200 {array} models.Proxy "List of proxies"
// @Failure 500 {object} map[string]string "Failed to list proxies"
// @Router /proxies [get]
func (h *APIHandler) ListProxiesGin(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "100"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	protocolFilter := models.ProxyProtocolEnum(c.Query("protocol"))
	isEnabledQuery := c.Query("isEnabled")
	var isEnabledFilter *bool
	if isEnabledQuery != "" {
		b, err := strconv.ParseBool(isEnabledQuery)
		if err == nil {
			isEnabledFilter = &b
		}
	}
	isHealthyQuery := c.Query("isHealthy")
	var isHealthyFilter *bool
	if isHealthyQuery != "" {
		b, err := strconv.ParseBool(isHealthyQuery)
		if err == nil {
			isHealthyFilter = &b
		}
	}

	filter := store.ListProxiesFilter{
		Protocol:  protocolFilter,
		IsEnabled: isEnabledFilter,
		IsHealthy: isHealthyFilter,
		Limit:     limit,
		Offset:    offset,
	}

	var querier store.Querier
	if h.DB != nil {
		querier = h.DB // Use DB for non-transactional reads in SQL mode
	} // For Firestore, querier remains nil, store uses its client

	proxies, err := h.ProxyStore.ListProxies(c.Request.Context(), querier, filter)
	if err != nil {
		log.Printf("Error listing proxies: %v", err)
		respondWithErrorGin(c, http.StatusInternalServerError, "Failed to list proxies")
		return
	}

	sort.Slice(proxies, func(i, j int) bool {
		if proxies[i] == nil || proxies[j] == nil {
			return false
		}
		return proxies[i].Name < proxies[j].Name
	})
	respondWithJSONGin(c, http.StatusOK, toListProxyResponse(proxies))
}

// AddProxyGin adds a new proxy.
// @Summary Create proxy
// @Description Add a new proxy configuration
// @Tags proxies
// @Accept json
// @Produce json
// @Param request body models.CreateProxyRequest true "Proxy creation request"
// @Success 201 {object} models.Proxy "Created proxy"
// @Failure 400 {object} map[string]string "Invalid request payload or validation failed"
// @Failure 409 {object} map[string]string "Proxy with address already exists"
// @Failure 500 {object} map[string]string "Failed to create proxy"
// @Router /proxies [post]
func (h *APIHandler) AddProxyGin(c *gin.Context) {
	var req models.CreateProxyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondWithErrorGin(c, http.StatusBadRequest, "Invalid request payload: "+err.Error())
		return
	}

	if err := validate.Struct(req); err != nil {
		respondWithErrorGin(c, http.StatusBadRequest, "Validation failed: "+err.Error())
		return
	}

	now := time.Now().UTC()
	proxyID := uuid.New()
	isEnabled := true
	if req.IsEnabled != nil {
		isEnabled = *req.IsEnabled
	}

	var passwordHash sql.NullString
	if req.Password != "" {
		hashedBytes, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		if err != nil {
			log.Printf("Error hashing proxy password: %v", err)
			respondWithErrorGin(c, http.StatusInternalServerError, "Failed to process proxy password")
			return
		}
		passwordHash = sql.NullString{String: string(hashedBytes), Valid: true}
	}

	proxy := &models.Proxy{
		ID:            proxyID,
		Name:          req.Name,
		Description:   sql.NullString{String: req.Description, Valid: req.Description != ""},
		Protocol:      models.ProxyProtocolEnumPtr(req.Protocol),
		Address:       req.Address,
		Username:      sql.NullString{String: req.Username, Valid: req.Username != ""},
		PasswordHash:  passwordHash,
		CountryCode:   sql.NullString{String: req.CountryCode, Valid: req.CountryCode != ""},
		IsEnabled:     isEnabled,
		IsHealthy:     true,
		LastCheckedAt: sql.NullTime{Time: now, Valid: true},
		CreatedAt:     now,
		UpdatedAt:     now,
	}

	var querier store.Querier
	var opErr error
	isSQL := h.DB != nil
	var sqlTx *sqlx.Tx // Declare sqlTx to be used in defer

	if isSQL {
		var startTxErr error
		sqlTx, startTxErr = h.DB.BeginTxx(c.Request.Context(), nil)
		if startTxErr != nil {
			log.Printf("[AddProxyGin] Error beginning SQL transaction: %v", startTxErr)
			respondWithErrorGin(c, http.StatusInternalServerError, "Failed to start SQL transaction")
			return
		}
		querier = sqlTx
		log.Printf("[AddProxyGin] SQL Transaction started.")
		defer func() {
			if p := recover(); p != nil {
				log.Printf("[AddProxyGin] Panic recovered (SQL), rolling back: %v", p)
				_ = sqlTx.Rollback()
				panic(p)
			} else if opErr != nil {
				log.Printf("[AddProxyGin] Error occurred (SQL), rolling back: %v", opErr)
				_ = sqlTx.Rollback()
			} else {
				if commitErr := sqlTx.Commit(); commitErr != nil {
					log.Printf("[AddProxyGin] Error committing SQL transaction: %v", commitErr)
				} else {
					log.Printf("[AddProxyGin] SQL Transaction committed.")
				}
			}
		}()
	} else {
		log.Printf("[AddProxyGin] Operating in Firestore mode.")
	}

	if err := h.ProxyStore.CreateProxy(c.Request.Context(), querier, proxy); err != nil {
		opErr = err
		log.Printf("Error creating proxy: %v", err)

		// Check if this is a duplicate/unique constraint error
		errStr := err.Error()
		if strings.Contains(errStr, "already exists") || strings.Contains(errStr, "unique constraint") || strings.Contains(errStr, "duplicate") {
			// Handle duplicate gracefully - return 409 Conflict instead of 500
			respondWithErrorGin(c, http.StatusConflict, fmt.Sprintf("Proxy with address '%s' already exists", req.Address))
		} else {
			respondWithErrorGin(c, http.StatusInternalServerError, "Failed to create proxy")
		}
		return
	}

	auditLog := &models.AuditLog{
		UserID:     uuid.NullUUID{},
		Action:     "Create Proxy",
		EntityType: sql.NullString{String: "Proxy", Valid: true},
		EntityID:   uuid.NullUUID{UUID: proxyID, Valid: true},
		Details:    models.JSONRawMessagePtr(json.RawMessage(fmt.Sprintf(`{"name":"%s", "address":"%s"}`, proxy.Name, proxy.Address))),
	}
	if auditErr := h.AuditLogStore.CreateAuditLog(c.Request.Context(), querier, auditLog); auditErr != nil {
		opErr = auditErr
		log.Printf("Error creating audit log for new proxy %s: %v", proxyID, opErr)
		respondWithErrorGin(c, http.StatusInternalServerError, fmt.Sprintf("Failed to create proxy (audit log error, transaction will be rolled back if SQL): %v", opErr))
		return
	}

	// Broadcast proxy creation to WebSocket clients
	websocket.BroadcastProxyCreated(proxy.ID.String(), proxy)
	log.Printf("Proxy created and broadcasted: %s", proxy.ID)

	respondWithJSONGin(c, http.StatusCreated, toProxyResponse(proxy))
}

// UpdateProxyGin updates a proxy.
// @Summary Update proxy
// @Description Update an existing proxy configuration
// @Tags proxies
// @Accept json
// @Produce json
// @Param proxyId path string true "Proxy ID"
// @Param request body models.UpdateProxyRequest true "Proxy update request"
// @Success 200 {object} models.Proxy "Updated proxy"
// @Failure 400 {object} map[string]string "Invalid request payload or validation failed"
// @Failure 404 {object} map[string]string "Proxy not found"
// @Failure 500 {object} map[string]string "Failed to update proxy"
// @Router /proxies/{proxyId} [put]
func (h *APIHandler) UpdateProxyGin(c *gin.Context) {
	proxyIDStr := c.Param("proxyId")
	proxyID, err := uuid.Parse(proxyIDStr)
	if err != nil {
		respondWithErrorGin(c, http.StatusBadRequest, "Invalid proxy ID format")
		return
	}

	var req models.UpdateProxyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondWithErrorGin(c, http.StatusBadRequest, "Invalid request payload: "+err.Error())
		return
	}

	if err := validate.Struct(req); err != nil {
		respondWithErrorGin(c, http.StatusBadRequest, "Validation failed: "+err.Error())
		return
	}

	var querier store.Querier
	var opErr error
	isSQL := h.DB != nil
	var sqlTx *sqlx.Tx

	if isSQL {
		var startTxErr error
		sqlTx, startTxErr = h.DB.BeginTxx(c.Request.Context(), nil)
		if startTxErr != nil {
			log.Printf("[UpdateProxyGin] Error beginning SQL transaction: %v", startTxErr)
			respondWithErrorGin(c, http.StatusInternalServerError, "Failed to start SQL transaction")
			return
		}
		querier = sqlTx
		log.Printf("[UpdateProxyGin] SQL Transaction started for %s.", proxyIDStr)
		defer func() {
			if p := recover(); p != nil {
				log.Printf("[UpdateProxyGin] Panic recovered (SQL), rolling back: %v", p)
				_ = sqlTx.Rollback()
				panic(p)
			} else if opErr != nil {
				log.Printf("[UpdateProxyGin] Error occurred (SQL), rolling back: %v", opErr)
				_ = sqlTx.Rollback()
			} else {
				if commitErr := sqlTx.Commit(); commitErr != nil {
					log.Printf("[UpdateProxyGin] Error committing SQL transaction: %v", commitErr)
				} else {
					log.Printf("[UpdateProxyGin] SQL Transaction committed for %s.", proxyIDStr)
				}
			}
		}()
	} else {
		log.Printf("[UpdateProxyGin] Operating in Firestore mode for %s.", proxyIDStr)
	}

	existingProxy, fetchErr := h.ProxyStore.GetProxyByID(c.Request.Context(), querier, proxyID)
	if fetchErr != nil {
		opErr = fetchErr
		if opErr == store.ErrNotFound {
			respondWithErrorGin(c, http.StatusNotFound, fmt.Sprintf("Proxy with ID %s not found", proxyIDStr))
		} else {
			log.Printf("Error fetching proxy %s for update: %v", proxyIDStr, opErr)
			respondWithErrorGin(c, http.StatusInternalServerError, "Failed to fetch proxy for update")
		}
		return
	}

	updated := false
	if req.Name != nil {
		existingProxy.Name = *req.Name
		updated = true
	}
	if req.Description != nil {
		existingProxy.Description = sql.NullString{String: *req.Description, Valid: true}
		updated = true
	}
	if req.Protocol != nil {
		existingProxy.Protocol = req.Protocol
		updated = true
	} // Assign pointer to pointer
	if req.Address != nil {
		existingProxy.Address = *req.Address
		updated = true
	}
	if req.Username != nil {
		existingProxy.Username = sql.NullString{String: *req.Username, Valid: true}
		updated = true
	}
	if req.Password != nil {
		if *req.Password == "" {
			existingProxy.PasswordHash = sql.NullString{}
		} else {
			hashedBytes, pErr := bcrypt.GenerateFromPassword([]byte(*req.Password), bcrypt.DefaultCost)
			if pErr != nil {
				opErr = fmt.Errorf("failed to process proxy password for update: %w", pErr)
				log.Printf("Error hashing proxy password for update: %v", opErr)
				respondWithErrorGin(c, http.StatusInternalServerError, opErr.Error())
				return
			}
			existingProxy.PasswordHash = sql.NullString{String: string(hashedBytes), Valid: true}
		}
		updated = true
	}
	if req.CountryCode != nil {
		existingProxy.CountryCode = sql.NullString{String: *req.CountryCode, Valid: true}
		updated = true
	}
	if req.IsEnabled != nil {
		existingProxy.IsEnabled = *req.IsEnabled
		updated = true
	}

	if !updated {
		log.Printf("[UpdateProxyGin] No fields to update for proxy %s.", proxyIDStr)
		// If isSQL and opErr is nil, the deferred func will commit the no-op transaction.
		respondWithJSONGin(c, http.StatusOK, toProxyResponse(existingProxy))
		return
	}

	existingProxy.UpdatedAt = time.Now().UTC()
	if errUpdate := h.ProxyStore.UpdateProxy(c.Request.Context(), querier, existingProxy); errUpdate != nil {
		opErr = errUpdate
		log.Printf("Error updating proxy %s: %v", proxyIDStr, opErr)
		respondWithErrorGin(c, http.StatusInternalServerError, "Failed to update proxy")
		return
	}

	auditLog := &models.AuditLog{
		UserID:     uuid.NullUUID{},
		Action:     "Update Proxy",
		EntityType: sql.NullString{String: "Proxy", Valid: true},
		EntityID:   uuid.NullUUID{UUID: proxyID, Valid: true},
	}
	if auditErr := h.AuditLogStore.CreateAuditLog(c.Request.Context(), querier, auditLog); auditErr != nil {
		opErr = auditErr
		log.Printf("Error creating audit log for updated proxy %s: %v", proxyID, opErr)
		respondWithErrorGin(c, http.StatusInternalServerError, fmt.Sprintf("Failed to update proxy (audit log error, transaction will be rolled back if SQL): %v", opErr))
		return
	}

	// Broadcast proxy update to WebSocket clients
	websocket.BroadcastProxyUpdated(existingProxy.ID.String(), existingProxy)
	log.Printf("Proxy updated and broadcasted: %s", existingProxy.ID)

	respondWithJSONGin(c, http.StatusOK, toProxyResponse(existingProxy))
}

// DeleteProxyGin deletes a proxy.
// @Summary Delete proxy
// @Description Delete a proxy configuration
// @Tags proxies
// @Param proxyId path string true "Proxy ID"
// @Success 204 "Proxy deleted successfully"
// @Failure 400 {object} map[string]string "Invalid proxy ID format"
// @Failure 404 {object} map[string]string "Proxy not found"
// @Failure 500 {object} map[string]string "Failed to delete proxy"
// @Router /proxies/{proxyId} [delete]
func (h *APIHandler) DeleteProxyGin(c *gin.Context) {
	proxyIDStr := c.Param("proxyId")
	proxyID, err := uuid.Parse(proxyIDStr)
	if err != nil {
		respondWithErrorGin(c, http.StatusBadRequest, "Invalid proxy ID format")
		return
	}

	var querier store.Querier
	var opErr error
	isSQL := h.DB != nil
	var sqlTx *sqlx.Tx

	if isSQL {
		var startTxErr error
		sqlTx, startTxErr = h.DB.BeginTxx(c.Request.Context(), nil)
		if startTxErr != nil {
			log.Printf("[DeleteProxyGin] Error beginning SQL transaction: %v", startTxErr)
			respondWithErrorGin(c, http.StatusInternalServerError, "Failed to start SQL transaction")
			return
		}
		querier = sqlTx
		log.Printf("[DeleteProxyGin] SQL Transaction started for %s.", proxyIDStr)
		defer func() {
			if p := recover(); p != nil {
				log.Printf("[DeleteProxyGin] Panic recovered (SQL), rolling back: %v", p)
				_ = sqlTx.Rollback()
				panic(p)
			} else if opErr != nil {
				log.Printf("[DeleteProxyGin] Error occurred (SQL), rolling back: %v", opErr)
				_ = sqlTx.Rollback()
			} else {
				if commitErr := sqlTx.Commit(); commitErr != nil {
					log.Printf("[DeleteProxyGin] Error committing SQL transaction: %v", commitErr)
				} else {
					log.Printf("[DeleteProxyGin] SQL Transaction committed for %s.", proxyIDStr)
				}
			}
		}()
	} else {
		log.Printf("[DeleteProxyGin] Operating in Firestore mode for %s.", proxyIDStr)
	}

	_, fetchErr := h.ProxyStore.GetProxyByID(c.Request.Context(), querier, proxyID)
	if fetchErr != nil {
		opErr = fetchErr
		if opErr == store.ErrNotFound {
			respondWithErrorGin(c, http.StatusNotFound, fmt.Sprintf("Proxy with ID %s not found", proxyIDStr))
		} else {
			log.Printf("[DeleteProxyGin] Error fetching proxy %s for delete check: %v", proxyIDStr, opErr)
			respondWithErrorGin(c, http.StatusInternalServerError, "Failed to fetch proxy for deletion")
		}
		return
	}

	if errDel := h.ProxyStore.DeleteProxy(c.Request.Context(), querier, proxyID); errDel != nil {
		opErr = errDel
		if opErr == store.ErrNotFound {
			respondWithErrorGin(c, http.StatusNotFound, fmt.Sprintf("Proxy with ID %s not found for deletion", proxyIDStr))
		} else {
			log.Printf("Error deleting proxy %s: %v", proxyIDStr, opErr)
			respondWithErrorGin(c, http.StatusInternalServerError, "Failed to delete proxy")
		}
		return
	}

	auditLog := &models.AuditLog{
		UserID:     uuid.NullUUID{},
		Action:     "Delete Proxy",
		EntityType: sql.NullString{String: "Proxy", Valid: true},
		EntityID:   uuid.NullUUID{UUID: proxyID, Valid: true},
	}
	if auditErr := h.AuditLogStore.CreateAuditLog(c.Request.Context(), querier, auditLog); auditErr != nil {
		opErr = auditErr
		log.Printf("Error creating audit log for deleted proxy %s: %v", proxyID, opErr)
		respondWithErrorGin(c, http.StatusInternalServerError, fmt.Sprintf("Failed to delete proxy (audit log error, transaction will be rolled back if SQL): %v", opErr))
		return
	}

	// Broadcast proxy deletion to WebSocket clients
	websocket.BroadcastProxyDeleted(proxyID.String())
	log.Printf("Proxy deleted and broadcasted: %s", proxyID)

	respondWithJSONGin(c, http.StatusOK, DeletionResponse{
		Success: true,
		Message: "Proxy deleted successfully",
		ID:      proxyID.String(),
	})
}

// GetProxyStatusesGin gets proxy statuses.
// @Summary Get proxy statuses
// @Description Retrieve health status information for all proxies
// @Tags proxies
// @Produce json
// @Success 200 {object} ProxyStatusResponse "Proxy status information"
// @Failure 500 {object} map[string]string "Internal Server Error"
// @Router /proxies/status [get]
func (h *APIHandler) GetProxyStatusesGin(c *gin.Context) {
	if h.ProxyMgr == nil {
		respondWithErrorGin(c, http.StatusInternalServerError, "ProxyManager not available")
		return
	}
	statuses := h.ProxyMgr.GetAllProxyStatuses()
	sort.Slice(statuses, func(i, j int) bool { return statuses[i].ID < statuses[j].ID })
	respondWithJSONGin(c, http.StatusOK, statuses)
}

// ForceCheckSingleProxyGin forces a health check on a single proxy.
// @Summary Force proxy health check
// @Description Force a health check on a specific proxy
// @Tags proxies
// @Produce json
// @Param proxyId path string true "Proxy ID (UUID)"
// @Success 200 {object} ProxyHealthCheckResponse "Health check completed"
// @Failure 400 {object} map[string]string "Bad Request"
// @Failure 404 {object} map[string]string "Proxy not found"
// @Failure 500 {object} map[string]string "Internal Server Error"
// @Router /proxies/{proxyId}/health-check [post]
func (h *APIHandler) ForceCheckSingleProxyGin(c *gin.Context) {
	if h.ProxyMgr == nil {
		respondWithErrorGin(c, http.StatusInternalServerError, "ProxyManager not available")
		return
	}
	proxyID := c.Param("proxyId")
	if proxyID == "" {
		respondWithErrorGin(c, http.StatusBadRequest, "Proxy ID missing in path")
		return
	}
	log.Printf("API: Gin request to force health check for proxy ID '%s'", proxyID)
	updatedStatus, err := h.ProxyMgr.ForceCheckSingleProxy(proxyID)
	if err != nil {
		if err.Error() == fmt.Sprintf("proxy ID '%s' not found", proxyID) {
			respondWithErrorGin(c, http.StatusNotFound, err.Error())
		} else {
			respondWithErrorGin(c, http.StatusInternalServerError, err.Error())
		}
		return
	}
	respondWithJSONGin(c, http.StatusOK, updatedStatus)
}

// ForceCheckAllProxiesGin forces a health check on all proxies.
// @Summary Force health check on all proxies
// @Description Force health checks on all registered proxies
// @Tags proxies
// @Produce json
// @Success 200 {object} BulkHealthCheckResponse "Health checks completed"
// @Failure 500 {object} map[string]string "Internal Server Error"
// @Router /proxies/health-check [post]
func (h *APIHandler) ForceCheckAllProxiesGin(c *gin.Context) {
	if h.ProxyMgr == nil {
		respondWithErrorGin(c, http.StatusInternalServerError, "ProxyManager not available")
		return
	}
	var reqBody ProxyHealthCheckRequest
	if c.Request.ContentLength > 0 {
		if err := c.ShouldBindJSON(&reqBody); err != nil {
			respondWithErrorGin(c, http.StatusBadRequest, "Invalid JSON in request body: "+err.Error())
			return
		}
	}

	var message string
	if len(reqBody.IDs) > 0 {
		log.Printf("API: Gin request to force health check for %d specific proxy IDs.", len(reqBody.IDs))
		h.ProxyMgr.ForceCheckProxiesAsync(reqBody.IDs)
		message = fmt.Sprintf("Health check process initiated for %d specified proxies. Check status endpoint.", len(reqBody.IDs))
	} else {
		log.Printf("API: Gin request to force health check for ALL managed proxies.")
		h.ProxyMgr.ForceCheckProxiesAsync(nil)
		message = "Health check process initiated for all managed proxies. Check status endpoint."
	}
	respondWithJSONGin(c, http.StatusAccepted, SuccessMessageResponse{
		Message: message,
	})
}

// TestProxyGin tests a proxy.
// @Summary Test proxy
// @Description Test a proxy configuration to verify it works correctly
// @Tags proxies
// @Produce json
// @Param proxyId path string true "Proxy ID (UUID)"
// @Success 200 {object} ProxyTestResponse "Proxy test results"
// @Failure 400 {object} map[string]string "Bad Request"
// @Failure 404 {object} map[string]string "Proxy not found"
// @Failure 500 {object} map[string]string "Internal Server Error"
// @Router /proxies/{proxyId}/test [post]
func (h *APIHandler) TestProxyGin(c *gin.Context) {
	proxyIDStr := c.Param("proxyId")
	proxyID, err := uuid.Parse(proxyIDStr)
	if err != nil {
		respondWithErrorGin(c, http.StatusBadRequest, "Invalid proxy ID format for testing")
		return
	}

	var querier store.Querier
	if h.DB != nil {
		querier = h.DB
	}

	targetProxyModel, err := h.ProxyStore.GetProxyByID(c.Request.Context(), querier, proxyID)
	if err != nil {
		if err == store.ErrNotFound {
			respondWithErrorGin(c, http.StatusNotFound, fmt.Sprintf("Proxy ID '%s' not found for testing", proxyIDStr))
			return
		}
		respondWithErrorGin(c, http.StatusInternalServerError, "Error fetching proxy for testing: "+err.Error())
		return
	}

	proxyCfgForTest := proxyToProxyConfigEntry(targetProxyModel)
	protocolForLog := "unknown"
	if targetProxyModel.Protocol != nil {
		protocolForLog = string(*targetProxyModel.Protocol)
	}
	log.Printf("API: Gin Testing proxy ID '%s' (%s://%s)", targetProxyModel.ID, protocolForLog, targetProxyModel.Address)
	testResult := proxymanager.TestProxy(proxyCfgForTest)
	respondWithJSONGin(c, http.StatusOK, testResult)
}

// BulkUpdateProxiesGin updates multiple proxies at once.
// @Summary Bulk update proxies
// @Description Update multiple proxy configurations simultaneously
// @Tags proxies
// @Accept json
// @Produce json
// @Param request body models.BulkUpdateProxiesRequest true "Bulk proxy update request"
// @Success 200 {object} models.BulkProxyOperationResponse "Bulk operation results"
// @Failure 400 {object} map[string]string "Invalid request payload or validation failed"
// @Failure 500 {object} map[string]string "Internal server error"
// @Router /proxies/bulk/update [put]
func (h *APIHandler) BulkUpdateProxiesGin(c *gin.Context) {
	var req models.BulkUpdateProxiesRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondWithErrorGin(c, http.StatusBadRequest, "Invalid request payload: "+err.Error())
		return
	}

	if err := validate.Struct(req); err != nil {
		respondWithErrorGin(c, http.StatusBadRequest, "Validation failed: "+err.Error())
		return
	}

	// Convert string IDs to UUIDs
	proxyUUIDs := make([]uuid.UUID, 0, len(req.ProxyIDs))
	for _, idStr := range req.ProxyIDs {
		proxyID, err := uuid.Parse(idStr)
		if err != nil {
			respondWithErrorGin(c, http.StatusBadRequest, fmt.Sprintf("Invalid proxy ID format: %s", idStr))
			return
		}
		proxyUUIDs = append(proxyUUIDs, proxyID)
	}

	var querier store.Querier
	var opErr error
	isSQL := h.DB != nil
	var sqlTx *sqlx.Tx

	if isSQL {
		var startTxErr error
		sqlTx, startTxErr = h.DB.BeginTxx(c.Request.Context(), nil)
		if startTxErr != nil {
			log.Printf("[BulkUpdateProxiesGin] Error beginning SQL transaction: %v", startTxErr)
			respondWithErrorGin(c, http.StatusInternalServerError, "Failed to start SQL transaction")
			return
		}
		querier = sqlTx
		log.Printf("[BulkUpdateProxiesGin] SQL Transaction started for %d proxies.", len(proxyUUIDs))
		defer func() {
			if p := recover(); p != nil {
				log.Printf("[BulkUpdateProxiesGin] Panic recovered (SQL), rolling back: %v", p)
				_ = sqlTx.Rollback()
				panic(p)
			} else if opErr != nil {
				log.Printf("[BulkUpdateProxiesGin] Error occurred (SQL), rolling back: %v", opErr)
				_ = sqlTx.Rollback()
			} else {
				if commitErr := sqlTx.Commit(); commitErr != nil {
					log.Printf("[BulkUpdateProxiesGin] Error committing SQL transaction: %v", commitErr)
				} else {
					log.Printf("[BulkUpdateProxiesGin] SQL Transaction committed for %d proxies.", len(proxyUUIDs))
				}
			}
		}()
	} else {
		log.Printf("[BulkUpdateProxiesGin] Operating in Firestore mode for %d proxies.", len(proxyUUIDs))
	}

	// Get all proxies to update using bulk query to avoid N+1
	existingProxies, err := h.ProxyStore.GetProxiesByIDs(c.Request.Context(), querier, proxyUUIDs)
	if err != nil {
		opErr = err
		log.Printf("Error fetching proxies for bulk update: %v", err)
		respondWithErrorGin(c, http.StatusInternalServerError, "Failed to fetch proxies for bulk update")
		return
	}

	// Track results
	response := models.BulkProxyOperationResponse{
		TotalRequested:    len(req.ProxyIDs),
		SuccessfulProxies: make([]string, 0),
		FailedProxies:     make([]models.BulkProxyError, 0),
		Results:           make([]*models.Proxy, 0),
	}

	// Update each proxy
	now := time.Now().UTC()
	for _, proxy := range existingProxies {
		updated := false

		// Apply updates
		if req.Updates.Name != nil {
			proxy.Name = *req.Updates.Name
			updated = true
		}
		if req.Updates.Description != nil {
			proxy.Description = sql.NullString{String: *req.Updates.Description, Valid: true}
			updated = true
		}
		if req.Updates.Protocol != nil {
			proxy.Protocol = req.Updates.Protocol
			updated = true
		}
		if req.Updates.Address != nil {
			proxy.Address = *req.Updates.Address
			updated = true
		}
		if req.Updates.Username != nil {
			proxy.Username = sql.NullString{String: *req.Updates.Username, Valid: true}
			updated = true
		}
		if req.Updates.Password != nil {
			if *req.Updates.Password == "" {
				proxy.PasswordHash = sql.NullString{}
			} else {
				hashedBytes, pErr := bcrypt.GenerateFromPassword([]byte(*req.Updates.Password), bcrypt.DefaultCost)
				if pErr != nil {
					response.FailedProxies = append(response.FailedProxies, models.BulkProxyError{
						ProxyID: proxy.ID.String(),
						Error:   fmt.Sprintf("Failed to process password: %v", pErr),
					})
					continue
				}
				proxy.PasswordHash = sql.NullString{String: string(hashedBytes), Valid: true}
			}
			updated = true
		}
		if req.Updates.CountryCode != nil {
			proxy.CountryCode = sql.NullString{String: *req.Updates.CountryCode, Valid: true}
			updated = true
		}
		if req.Updates.IsEnabled != nil {
			proxy.IsEnabled = *req.Updates.IsEnabled
			updated = true
		}

		if updated {
			proxy.UpdatedAt = now
			if errUpdate := h.ProxyStore.UpdateProxy(c.Request.Context(), querier, proxy); errUpdate != nil {
				response.FailedProxies = append(response.FailedProxies, models.BulkProxyError{
					ProxyID: proxy.ID.String(),
					Error:   errUpdate.Error(),
				})
				continue
			}

			// Broadcast proxy update
			websocket.BroadcastProxyUpdated(proxy.ID.String(), proxy)
		}

		response.SuccessfulProxies = append(response.SuccessfulProxies, proxy.ID.String())
		response.Results = append(response.Results, proxy)
	}

	// Handle missing proxies
	foundIDs := make(map[string]bool)
	for _, proxy := range existingProxies {
		foundIDs[proxy.ID.String()] = true
	}
	for _, idStr := range req.ProxyIDs {
		if !foundIDs[idStr] {
			response.FailedProxies = append(response.FailedProxies, models.BulkProxyError{
				ProxyID: idStr,
				Error:   "Proxy not found",
			})
		}
	}

	response.SuccessCount = len(response.SuccessfulProxies)
	response.ErrorCount = len(response.FailedProxies)

	log.Printf("Bulk update completed: %d/%d proxies updated successfully", response.SuccessCount, response.TotalRequested)
	respondWithJSONGin(c, http.StatusOK, response)
}

// BulkDeleteProxiesGin deletes multiple proxies at once.
// @Summary Bulk delete proxies
// @Description Delete multiple proxy configurations simultaneously
// @Tags proxies
// @Accept json
// @Produce json
// @Param request body models.BulkDeleteProxiesRequest true "Bulk proxy delete request"
// @Success 200 {object} models.BulkProxyOperationResponse "Bulk operation results"
// @Failure 400 {object} map[string]string "Invalid request payload or validation failed"
// @Failure 500 {object} map[string]string "Internal server error"
// @Router /proxies/bulk/delete [delete]
func (h *APIHandler) BulkDeleteProxiesGin(c *gin.Context) {
	var req models.BulkDeleteProxiesRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondWithErrorGin(c, http.StatusBadRequest, "Invalid request payload: "+err.Error())
		return
	}

	if err := validate.Struct(req); err != nil {
		respondWithErrorGin(c, http.StatusBadRequest, "Validation failed: "+err.Error())
		return
	}

	// Convert string IDs to UUIDs
	proxyUUIDs := make([]uuid.UUID, 0, len(req.ProxyIDs))
	for _, idStr := range req.ProxyIDs {
		proxyID, err := uuid.Parse(idStr)
		if err != nil {
			respondWithErrorGin(c, http.StatusBadRequest, fmt.Sprintf("Invalid proxy ID format: %s", idStr))
			return
		}
		proxyUUIDs = append(proxyUUIDs, proxyID)
	}

	var querier store.Querier
	var opErr error
	isSQL := h.DB != nil
	var sqlTx *sqlx.Tx

	if isSQL {
		var startTxErr error
		sqlTx, startTxErr = h.DB.BeginTxx(c.Request.Context(), nil)
		if startTxErr != nil {
			log.Printf("[BulkDeleteProxiesGin] Error beginning SQL transaction: %v", startTxErr)
			respondWithErrorGin(c, http.StatusInternalServerError, "Failed to start SQL transaction")
			return
		}
		querier = sqlTx
		log.Printf("[BulkDeleteProxiesGin] SQL Transaction started for %d proxies.", len(proxyUUIDs))
		defer func() {
			if p := recover(); p != nil {
				log.Printf("[BulkDeleteProxiesGin] Panic recovered (SQL), rolling back: %v", p)
				_ = sqlTx.Rollback()
				panic(p)
			} else if opErr != nil {
				log.Printf("[BulkDeleteProxiesGin] Error occurred (SQL), rolling back: %v", opErr)
				_ = sqlTx.Rollback()
			} else {
				if commitErr := sqlTx.Commit(); commitErr != nil {
					log.Printf("[BulkDeleteProxiesGin] Error committing SQL transaction: %v", commitErr)
				} else {
					log.Printf("[BulkDeleteProxiesGin] SQL Transaction committed for %d proxies.", len(proxyUUIDs))
				}
			}
		}()
	} else {
		log.Printf("[BulkDeleteProxiesGin] Operating in Firestore mode for %d proxies.", len(proxyUUIDs))
	}

	// Track results
	response := models.BulkProxyOperationResponse{
		TotalRequested:    len(req.ProxyIDs),
		SuccessfulProxies: make([]string, 0),
		FailedProxies:     make([]models.BulkProxyError, 0),
	}

	// Delete each proxy
	for _, proxyID := range proxyUUIDs {
		// Verify proxy exists before deletion
		_, fetchErr := h.ProxyStore.GetProxyByID(c.Request.Context(), querier, proxyID)
		if fetchErr != nil {
			if fetchErr == store.ErrNotFound {
				response.FailedProxies = append(response.FailedProxies, models.BulkProxyError{
					ProxyID: proxyID.String(),
					Error:   "Proxy not found",
				})
			} else {
				response.FailedProxies = append(response.FailedProxies, models.BulkProxyError{
					ProxyID: proxyID.String(),
					Error:   fmt.Sprintf("Failed to fetch proxy: %v", fetchErr),
				})
			}
			continue
		}

		// Delete the proxy
		if errDel := h.ProxyStore.DeleteProxy(c.Request.Context(), querier, proxyID); errDel != nil {
			response.FailedProxies = append(response.FailedProxies, models.BulkProxyError{
				ProxyID: proxyID.String(),
				Error:   errDel.Error(),
			})
			continue
		}

		// Create audit log
		auditLog := &models.AuditLog{
			UserID:     uuid.NullUUID{},
			Action:     "Bulk Delete Proxy",
			EntityType: sql.NullString{String: "Proxy", Valid: true},
			EntityID:   uuid.NullUUID{UUID: proxyID, Valid: true},
		}
		if auditErr := h.AuditLogStore.CreateAuditLog(c.Request.Context(), querier, auditLog); auditErr != nil {
			log.Printf("Error creating audit log for deleted proxy %s: %v", proxyID, auditErr)
			// Don't fail the operation for audit log errors
		}

		// Broadcast proxy deletion
		websocket.BroadcastProxyDeleted(proxyID.String())
		response.SuccessfulProxies = append(response.SuccessfulProxies, proxyID.String())
	}

	response.SuccessCount = len(response.SuccessfulProxies)
	response.ErrorCount = len(response.FailedProxies)

	log.Printf("Bulk delete completed: %d/%d proxies deleted successfully", response.SuccessCount, response.TotalRequested)
	respondWithJSONGin(c, http.StatusOK, response)
}

// BulkTestProxiesGin tests multiple proxies at once.
// @Summary Bulk test proxies
// @Description Test multiple proxy configurations simultaneously
// @Tags proxies
// @Accept json
// @Produce json
// @Param request body models.BulkTestProxiesRequest true "Bulk proxy test request"
// @Success 200 {object} BulkProxyTestResponse "Bulk test results"
// @Failure 400 {object} map[string]string "Invalid request payload or validation failed"
// @Failure 500 {object} map[string]string "Internal server error"
// @Router /proxies/bulk/test [post]
func (h *APIHandler) BulkTestProxiesGin(c *gin.Context) {
	var req models.BulkTestProxiesRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondWithErrorGin(c, http.StatusBadRequest, "Invalid request payload: "+err.Error())
		return
	}

	if err := validate.Struct(req); err != nil {
		respondWithErrorGin(c, http.StatusBadRequest, "Validation failed: "+err.Error())
		return
	}

	// Convert string IDs to UUIDs
	proxyUUIDs := make([]uuid.UUID, 0, len(req.ProxyIDs))
	for _, idStr := range req.ProxyIDs {
		proxyID, err := uuid.Parse(idStr)
		if err != nil {
			respondWithErrorGin(c, http.StatusBadRequest, fmt.Sprintf("Invalid proxy ID format: %s", idStr))
			return
		}
		proxyUUIDs = append(proxyUUIDs, proxyID)
	}

	var querier store.Querier
	if h.DB != nil {
		querier = h.DB
	}

	// Get all proxies to test using bulk query to avoid N+1
	existingProxies, err := h.ProxyStore.GetProxiesByIDs(c.Request.Context(), querier, proxyUUIDs)
	if err != nil {
		log.Printf("Error fetching proxies for bulk test: %v", err)
		respondWithErrorGin(c, http.StatusInternalServerError, "Failed to fetch proxies for bulk test")
		return
	}

	// Track results
	response := BulkProxyTestResponse{
		TotalRequested: len(req.ProxyIDs),
		TestResults:    make([]ProxyTestResponse, 0),
	}

	// Test each proxy concurrently
	type proxyTestResult struct {
		proxyID string
		result  ProxyTestResponse
	}

	resultChan := make(chan proxyTestResult, len(existingProxies))
	var wg sync.WaitGroup

	for _, proxy := range existingProxies {
		wg.Add(1)
		go func(p *models.Proxy) {
			defer wg.Done()

			proxyCfgForTest := proxyToProxyConfigEntry(p)
			testResult := proxymanager.TestProxy(proxyCfgForTest)

			// Convert proxymanager.ProxyTestResult to ProxyTestResponse
			result := ProxyTestResponse{
				ProxyID:      p.ID.String(),
				Success:      testResult.Success,
				StatusCode:   testResult.StatusCode,
				ResponseTime: testResult.DurationMs,
				Error:        testResult.Error,
			}

			resultChan <- proxyTestResult{
				proxyID: p.ID.String(),
				result:  result,
			}
		}(proxy)
	}

	// Close channel when all goroutines complete
	go func() {
		wg.Wait()
		close(resultChan)
	}()

	// Collect results
	for result := range resultChan {
		response.TestResults = append(response.TestResults, result.result)
		if result.result.Success {
			response.SuccessCount++
		} else {
			response.ErrorCount++
		}
	}

	// Handle missing proxies
	foundIDs := make(map[string]bool)
	for _, proxy := range existingProxies {
		foundIDs[proxy.ID.String()] = true
	}
	for _, idStr := range req.ProxyIDs {
		if !foundIDs[idStr] {
			response.TestResults = append(response.TestResults, ProxyTestResponse{
				ProxyID: idStr,
				Success: false,
				Error:   "Proxy not found",
			})
			response.ErrorCount++
		}
	}

	log.Printf("Bulk test completed: %d/%d proxies tested successfully", response.SuccessCount, response.TotalRequested)
	respondWithJSONGin(c, http.StatusOK, response)
}
