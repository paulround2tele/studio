// File: backend/internal/api/server_settings_handlers.go
package api

import (
	"log"
	"net/http"

	"github.com/fntelecomllc/studio/backend/internal/config"
	"github.com/gin-gonic/gin"
)

// GetServerConfigGin retrieves current server-wide configurations.
// @Summary Get server configuration
// @Description Retrieve current server-wide configuration settings
// @Tags server-settings
// @Produce json
// @ID getServerConfig
// @Success 200 {object} APIResponse{data=ServerConfigResponse} "Server configuration"
// @Router /server/config [get]
func (h *APIHandler) GetServerConfigGin(c *gin.Context) {
	h.configMutex.RLock()
	// Expose only specific, safe-to-view fields. APIKey should not be exposed.
	serverConfigDTO := struct {
		Port            string `json:"port"`
		StreamChunkSize int    `json:"streamChunkSize"`
		GinMode         string `json:"ginMode"`
		// Add other relevant server config fields, but NOT APIKey or sensitive DB creds
	}{
		Port:            h.Config.Server.Port,
		StreamChunkSize: h.Config.Server.StreamChunkSize,
		GinMode:         h.Config.Server.GinMode,
	}
	h.configMutex.RUnlock()
	respondWithJSONGin(c, http.StatusOK, serverConfigDTO)
}

// UpdateServerConfigGin updates server-wide configurations.
// @Summary Update server configuration
// @Description Update server-wide configuration settings
// @Tags server-settings
// @Accept json
// @Produce json
// @ID updateServerConfig
// @Param request body ServerConfigUpdateRequest true "Server configuration update"
// @Success 200 {object} APIResponse{data=ServerConfigResponse} "Updated server configuration"
// @Failure 400 {object} APIResponse{error=ApiError} "Invalid request payload"
// @Failure 500 {object} APIResponse{error=ApiError} "Failed to save server configuration"
// @Router /server/config [put]
func (h *APIHandler) UpdateServerConfigGin(c *gin.Context) {
	var reqServerConfigUpdate ServerConfigUpdateRequest
	if err := c.ShouldBindJSON(&reqServerConfigUpdate); err != nil {
		respondWithErrorGin(c, http.StatusBadRequest, "Invalid request payload: "+err.Error())
		return
	}

	configChanged := false
	h.configMutex.Lock()
	if reqServerConfigUpdate.StreamChunkSize != nil {
		if *reqServerConfigUpdate.StreamChunkSize > 0 {
			if h.Config.Server.StreamChunkSize != *reqServerConfigUpdate.StreamChunkSize {
				h.Config.Server.StreamChunkSize = *reqServerConfigUpdate.StreamChunkSize
				configChanged = true
				log.Printf("API: Server StreamChunkSize updated to: %d", h.Config.Server.StreamChunkSize)
			}
		} else {
			log.Printf("API Warning: UpdateServerConfigGin - Invalid StreamChunkSize received: %d. Not updating.", *reqServerConfigUpdate.StreamChunkSize)
		}
	}
	if reqServerConfigUpdate.GinMode != nil {
		validGinModes := map[string]bool{"debug": true, "release": true, "test": true}
		if validGinModes[*reqServerConfigUpdate.GinMode] {
			if h.Config.Server.GinMode != *reqServerConfigUpdate.GinMode {
				h.Config.Server.GinMode = *reqServerConfigUpdate.GinMode
				configChanged = true
				log.Printf("API: Server GinMode updated to: %s", h.Config.Server.GinMode)
			}
		} else {
			log.Printf("API Warning: UpdateServerConfigGin - Invalid GinMode received: %s. Not updating.", *reqServerConfigUpdate.GinMode)
		}
	}

	if configChanged {
		if err := config.SaveAppConfig(h.Config); err != nil { // Assuming SaveAppConfig correctly uses h.Config.GetLoadedFromPath()
			h.configMutex.Unlock()
			log.Printf("API Error: UpdateServerConfigGin - Failed to save updated server config: %v", err)
			respondWithErrorGin(c, http.StatusInternalServerError, "Failed to save server configuration")
			return
		}
	}
	h.configMutex.Unlock()

	// Respond with current (potentially updated) settings
	currentServerConfigDTO := struct {
		Port            string `json:"port"`
		StreamChunkSize int    `json:"streamChunkSize"`
		GinMode         string `json:"ginMode"`
	}{
		Port:            h.Config.Server.Port,
		StreamChunkSize: h.Config.Server.StreamChunkSize,
		GinMode:         h.Config.Server.GinMode,
	}
	respondWithJSONGin(c, http.StatusOK, currentServerConfigDTO)
}

// GetDNSConfigGin retrieves the default DNS validator configuration.
// @Summary Get DNS configuration
// @Description Retrieve default DNS validator configuration
// @Tags server-settings
// @Produce json
// @ID getDNSConfig
// @Success 200 {object} APIResponse{data=config.DNSValidatorConfigJSON} "DNS validator configuration"
// @Router /server/dns-config [get]
func (h *APIHandler) GetDNSConfigGin(c *gin.Context) {
	h.configMutex.RLock()
	// Assuming ConvertDNSConfigToJSON handles sensitive data appropriately if any
	dnsConfigJSON := config.ConvertDNSConfigToJSON(h.Config.DNSValidator)
	h.configMutex.RUnlock()
	respondWithJSONGin(c, http.StatusOK, dnsConfigJSON)
}

// UpdateDNSConfigGin updates the default DNS validator configuration.
// @Summary Update DNS configuration
// @Description Update default DNS validator configuration
// @Tags server-settings
// @Accept json
// @Produce json
// @ID updateDNSConfig
// @Param request body config.DNSValidatorConfigJSON true "DNS validator configuration"
// @Success 200 {object} APIResponse{data=config.DNSValidatorConfigJSON} "Updated DNS configuration"
// @Failure 400 {object} APIResponse{error=ApiError} "Invalid request body or validation failed"
// @Failure 500 {object} APIResponse{error=ApiError} "Failed to save DNS configuration"
// @Router /server/dns-config [put]
func (h *APIHandler) UpdateDNSConfigGin(c *gin.Context) {
	var reqJSON config.DNSValidatorConfigJSON
	if err := c.ShouldBindJSON(&reqJSON); err != nil {
		respondWithErrorGin(c, http.StatusBadRequest, "Invalid request body: "+err.Error())
		return
	}

	updatedDNSConfig := config.ConvertJSONToDNSConfig(reqJSON)
	// Basic validation (example, can be expanded in config package or here)
	if updatedDNSConfig.QueryTimeoutSeconds <= 0 {
		respondWithErrorGin(c, http.StatusBadRequest, "queryTimeoutSeconds must be positive")
		return
	}

	h.configMutex.Lock()
	h.Config.DNSValidator = updatedDNSConfig
	// Create a copy for saving if SaveAppConfig modifies the passed pointer or for safety
	// configToSave := *h.Config
	h.configMutex.Unlock()

	// Save the entire AppConfig
	if err := config.SaveAppConfig(h.Config); err != nil {
		log.Printf("API Error: Failed to save updated DNS config: %v", err)
		// Potentially revert in-memory change if save fails and that's desired behavior
		respondWithErrorGin(c, http.StatusInternalServerError, "Failed to save DNS configuration")
		return
	}
	log.Printf("API: Updated server default DNS configuration.")
	// Respond with the DTO that was accepted and converted
	dnsResponse := config.ConvertDNSConfigToJSON(updatedDNSConfig)
	respondWithJSONGin(c, http.StatusOK, dnsResponse)
}

// GetHTTPConfigGin retrieves the default HTTP validator configuration.
// @Summary Get HTTP configuration
// @Description Retrieve default HTTP validator configuration
// @Tags server-settings
// @Produce json
// @ID getHTTPConfig
// @Success 200 {object} APIResponse{data=config.HTTPValidatorConfigJSON} "HTTP validator configuration"
// @Router /server/http-config [get]
func (h *APIHandler) GetHTTPConfigGin(c *gin.Context) {
	h.configMutex.RLock()
	httpConfigJSON := config.ConvertHTTPConfigToJSON(h.Config.HTTPValidator)
	h.configMutex.RUnlock()
	respondWithJSONGin(c, http.StatusOK, httpConfigJSON)
}

// UpdateHTTPConfigGin updates the default HTTP validator configuration.
// @Summary Update HTTP configuration
// @Description Update default HTTP validator configuration
// @Tags server-settings
// @Accept json
// @Produce json
// @ID updateHTTPConfig
// @Param request body config.HTTPValidatorConfigJSON true "HTTP validator configuration"
// @Success 200 {object} APIResponse{data=config.HTTPValidatorConfigJSON} "Updated HTTP configuration"
// @Failure 400 {object} APIResponse{error=ApiError} "Invalid request body or validation failed"
// @Failure 500 {object} APIResponse{error=ApiError} "Failed to save HTTP configuration"
// @Router /server/http-config [put]
func (h *APIHandler) UpdateHTTPConfigGin(c *gin.Context) {
	var reqJSON config.HTTPValidatorConfigJSON
	if err := c.ShouldBindJSON(&reqJSON); err != nil {
		respondWithErrorGin(c, http.StatusBadRequest, "Invalid request body: "+err.Error())
		return
	}
	updatedHTTPConfig := config.ConvertJSONToHTTPConfig(reqJSON)
	// Basic validation for new advanced HTTP settings
	if updatedHTTPConfig.MaxBodyReadBytes <= 0 {
		respondWithErrorGin(c, http.StatusBadRequest, "maxBodyReadBytes must be positive")
		return
	}

	h.configMutex.Lock()
	h.Config.HTTPValidator = updatedHTTPConfig
	h.configMutex.Unlock()

	if err := config.SaveAppConfig(h.Config); err != nil {
		log.Printf("API Error: Failed to save updated HTTP config: %v", err)
		respondWithErrorGin(c, http.StatusInternalServerError, "Failed to save HTTP configuration")
		return
	}
	log.Printf("API: Updated server default HTTP configuration.")
	httpResponse := config.ConvertHTTPConfigToJSON(updatedHTTPConfig)
	respondWithJSONGin(c, http.StatusOK, httpResponse)
}

// GetLoggingConfigGin retrieves the current logging configuration.
// @Summary Get logging configuration
// @Description Retrieve the current logging configuration settings
// @Tags server-settings
// @Produce json
// @ID getLoggingConfig
// @Success 200 {object} APIResponse{data=config.LoggingConfig} "Logging configuration"
// @Failure 500 {object} APIResponse{error=ApiError} "Internal Server Error"
// @Router /server/logging-config [get]
func (h *APIHandler) GetLoggingConfigGin(c *gin.Context) {
	h.configMutex.RLock()
	loggingConfig := h.Config.Logging
	h.configMutex.RUnlock()
	respondWithJSONGin(c, http.StatusOK, loggingConfig)
}

// UpdateLoggingConfigGin updates the logging configuration.
// @Summary Update logging configuration
// @Description Update the logging configuration settings
// @Tags server-settings
// @Accept json
// @Produce json
// @ID updateLoggingConfig
// @Param request body config.LoggingConfig true "Logging configuration"
// @Success 200 {object} APIResponse{data=config.LoggingConfig} "Updated logging configuration"
// @Failure 400 {object} APIResponse{error=ApiError} "Bad Request"
// @Failure 500 {object} APIResponse{error=ApiError} "Internal Server Error"
// @Router /server/logging-config [put]
func (h *APIHandler) UpdateLoggingConfigGin(c *gin.Context) {
	var reqLogging config.LoggingConfig
	if err := c.ShouldBindJSON(&reqLogging); err != nil {
		respondWithErrorGin(c, http.StatusBadRequest, "Invalid request body: "+err.Error())
		return
	}
	// Validate logging level if necessary
	validLevels := map[string]bool{"DEBUG": true, "INFO": true, "WARN": true, "ERROR": true}
	if !validLevels[reqLogging.Level] {
		respondWithErrorGin(c, http.StatusBadRequest, "Invalid logging level")
		return
	}

	h.configMutex.Lock()
	h.Config.Logging = reqLogging
	h.configMutex.Unlock()

	if err := config.SaveAppConfig(h.Config); err != nil {
		log.Printf("API Error: Failed to save updated Logging config: %v", err)
		respondWithErrorGin(c, http.StatusInternalServerError, "Failed to save Logging configuration")
		return
	}
	log.Printf("API: Updated server Logging configuration. New level: %s", reqLogging.Level)
	// TODO: Apply new logging level dynamically to the logger if possible
	respondWithJSONGin(c, http.StatusOK, reqLogging)
}

// GetWorkerConfigGin retrieves the worker configuration.
// @Summary Get worker configuration
// @Description Retrieve the current worker configuration settings
// @Tags server-settings
// @Produce json
// @ID getWorkerConfig
// @Success 200 {object} APIResponse{data=config.WorkerConfig} "Worker configuration"
// @Failure 500 {object} APIResponse{error=ApiError} "Internal Server Error"
// @Router /server/worker-config [get]
func (h *APIHandler) GetWorkerConfigGin(c *gin.Context) {
	h.configMutex.RLock()
	workerCfg := h.Config.Worker
	h.configMutex.RUnlock()
	respondWithJSONGin(c, http.StatusOK, workerCfg)
}

// UpdateWorkerConfigGin updates the worker configuration.
// @Summary Update worker configuration
// @Description Update the worker configuration settings
// @Tags server-settings
// @Accept json
// @Produce json
// @ID updateWorkerConfig
// @Param request body config.WorkerConfig true "Worker configuration"
// @Success 200 {object} APIResponse{data=config.WorkerConfig} "Updated worker configuration"
// @Failure 400 {object} APIResponse{error=ApiError} "Bad Request"
// @Failure 500 {object} APIResponse{error=ApiError} "Internal Server Error"
// @Router /server/worker-config [put]
func (h *APIHandler) UpdateWorkerConfigGin(c *gin.Context) {
	var req config.WorkerConfig
	if err := c.ShouldBindJSON(&req); err != nil {
		respondWithErrorGin(c, http.StatusBadRequest, "Invalid request body: "+err.Error())
		return
	}
	updated := config.ConvertJSONToWorkerConfig(req)
	h.configMutex.Lock()
	h.Config.Worker = updated
	h.configMutex.Unlock()
	if err := config.SaveAppConfig(h.Config); err != nil {
		respondWithErrorGin(c, http.StatusInternalServerError, "Failed to save Worker configuration")
		return
	}
	respondWithJSONGin(c, http.StatusOK, updated)
}

// GetRateLimiterConfigGin retrieves global rate limiter settings.
// @Summary Get rate limiter configuration
// @Description Retrieve the current rate limiter configuration settings
// @Tags server-settings
// @Produce json
// @ID getRateLimiterConfig
// @Success 200 {object} APIResponse{data=config.RateLimiterConfig} "Rate limiter configuration"
// @Failure 500 {object} APIResponse{error=ApiError} "Internal Server Error"
// @Router /server/rate-limiter-config [get]
func (h *APIHandler) GetRateLimiterConfigGin(c *gin.Context) {
	h.configMutex.RLock()
	rlCfg := h.Config.RateLimiter
	h.configMutex.RUnlock()
	respondWithJSONGin(c, http.StatusOK, rlCfg)
}

// UpdateRateLimiterConfigGin updates global rate limiter settings.
// @Summary Update rate limiter configuration
// @Description Update the rate limiter configuration settings
// @Tags server-settings
// @Accept json
// @Produce json
// @ID updateRateLimiterConfig
// @Param request body config.RateLimiterConfig true "Rate limiter configuration"
// @Success 200 {object} APIResponse{data=config.RateLimiterConfig} "Updated rate limiter configuration"
// @Failure 400 {object} APIResponse{error=ApiError} "Bad Request"
// @Failure 500 {object} APIResponse{error=ApiError} "Internal Server Error"
// @Router /server/rate-limiter-config [put]
func (h *APIHandler) UpdateRateLimiterConfigGin(c *gin.Context) {
	var req config.RateLimiterConfig
	if err := c.ShouldBindJSON(&req); err != nil {
		respondWithErrorGin(c, http.StatusBadRequest, "Invalid request body: "+err.Error())
		return
	}
	updated := config.ConvertJSONToRateLimiterConfig(req)
	h.configMutex.Lock()
	h.Config.RateLimiter = updated
	h.configMutex.Unlock()
	if err := config.SaveAppConfig(h.Config); err != nil {
		respondWithErrorGin(c, http.StatusInternalServerError, "Failed to save rate limiter configuration")
		return
	}
	respondWithJSONGin(c, http.StatusOK, updated)
}

// GetAuthConfigGin retrieves sanitized authentication configuration.
// @Summary Get authentication configuration
// @Description Retrieve the current authentication configuration settings
// @Tags server-settings
// @Produce json
// @ID getAuthConfig
// @Success 200 {object} APIResponse{data=config.AuthConfig} "Authentication configuration"
// @Failure 500 {object} APIResponse{error=ApiError} "Internal Server Error"
// @Router /server/auth-config [get]
func (h *APIHandler) GetAuthConfigGin(c *gin.Context) {
	h.configMutex.RLock()
	authCfg := *h.Config.Server.AuthConfig
	h.configMutex.RUnlock()
	// Omit sensitive fields
	authCfg.PepperKey = ""
	authCfg.RecaptchaSecretKey = ""
	authCfg.SMTPPassword = ""
	respondWithJSONGin(c, http.StatusOK, authCfg)
}

// UpdateAuthConfigGin updates authentication configuration.
// @Summary Update authentication configuration
// @Description Update the authentication configuration settings
// @Tags server-settings
// @Accept json
// @Produce json
// @ID updateAuthConfig
// @Param request body config.AuthConfig true "Authentication configuration"
// @Success 200 {object} APIResponse{data=config.AuthConfig} "Updated authentication configuration"
// @Failure 400 {object} APIResponse{error=ApiError} "Bad Request"
// @Failure 500 {object} APIResponse{error=ApiError} "Internal Server Error"
// @Router /server/auth-config [put]
func (h *APIHandler) UpdateAuthConfigGin(c *gin.Context) {
	var req config.AuthConfig
	if err := c.ShouldBindJSON(&req); err != nil {
		respondWithErrorGin(c, http.StatusBadRequest, "Invalid request body: "+err.Error())
		return
	}
	h.configMutex.Lock()
	h.Config.Server.AuthConfig = &req
	h.configMutex.Unlock()
	if err := config.SaveAppConfig(h.Config); err != nil {
		respondWithErrorGin(c, http.StatusInternalServerError, "Failed to save auth configuration")
		return
	}
	respondWithJSONGin(c, http.StatusOK, req)
}

// GetProxyManagerConfigGin retrieves proxy manager settings.
// @Summary Get proxy manager configuration
// @Description Retrieve the current proxy manager configuration settings
// @Tags server-settings
// @Produce json
// @ID getProxyManagerConfig
// @Success 200 {object} APIResponse{data=config.ProxyManagerConfigJSON} "Proxy manager configuration"
// @Failure 500 {object} APIResponse{error=ApiError} "Internal Server Error"
// @Router /server/proxy-manager-config [get]
func (h *APIHandler) GetProxyManagerConfigGin(c *gin.Context) {
	h.configMutex.RLock()
	cfgJSON := config.ConvertProxyManagerConfigToJSON(h.Config.ProxyManager)
	h.configMutex.RUnlock()
	respondWithJSONGin(c, http.StatusOK, cfgJSON)
}

// UpdateProxyManagerConfigGin updates proxy manager settings.
// @Summary Update proxy manager configuration
// @Description Update the proxy manager configuration settings
// @Tags server-settings
// @Accept json
// @Produce json
// @ID updateProxyManagerConfig
// @Param request body config.ProxyManagerConfigJSON true "Proxy manager configuration"
// @Success 200 {object} APIResponse{data=config.ProxyManagerConfigJSON} "Updated proxy manager configuration"
// @Failure 400 {object} APIResponse{error=ApiError} "Bad Request"
// @Failure 500 {object} APIResponse{error=ApiError} "Internal Server Error"
// @Router /server/proxy-manager-config [put]
func (h *APIHandler) UpdateProxyManagerConfigGin(c *gin.Context) {
	var req config.ProxyManagerConfig
	if err := c.ShouldBindJSON(&req); err != nil {
		respondWithErrorGin(c, http.StatusBadRequest, "Invalid request body: "+err.Error())
		return
	}
	updated := req
	h.configMutex.Lock()
	h.Config.ProxyManager = updated
	h.configMutex.Unlock()
	if h.ProxyMgr != nil {
		h.ProxyMgr.UpdateConfig(updated)
	}
	if err := config.SaveAppConfig(h.Config); err != nil {
		respondWithErrorGin(c, http.StatusInternalServerError, "Failed to save proxy manager configuration")
		return
	}
	proxyResponse := config.ConvertProxyManagerConfigToJSON(updated)
	respondWithJSONGin(c, http.StatusOK, proxyResponse)
}
