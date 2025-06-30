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
// @Description Retrieves current server-wide configurations including port, stream chunk size, and gin mode
// @Tags Configuration
// @Produce json
// @Success 200 {object} map[string]interface{} "Server configuration"
// @Failure 500 {object} ErrorResponse "Internal server error"
// @Router /api/v2/config/server [get]
// @Security SessionAuth
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
// @Description Updates server-wide configurations including stream chunk size and gin mode
// @Tags Configuration
// @Accept json
// @Produce json
// @Param config body map[string]interface{} true "Server configuration updates"
// @Success 200 {object} map[string]interface{} "Updated server configuration"
// @Failure 400 {object} ErrorResponse "Invalid request payload"
// @Failure 500 {object} ErrorResponse "Failed to save configuration"
// @Router /api/v2/config/server [put]
// @Security SessionAuth
func (h *APIHandler) UpdateServerConfigGin(c *gin.Context) {
	var reqServerConfigUpdate struct {
		StreamChunkSize *int    `json:"streamChunkSize,omitempty"`
		GinMode         *string `json:"ginMode,omitempty"`
		// Add other updatable, non-sensitive fields
	}
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
// @Description Retrieves the default DNS validator configuration
// @Tags Configuration
// @Produce json
// @Success 200 {object} map[string]interface{} "DNS configuration"
// @Failure 500 {object} ErrorResponse "Internal server error"
// @Router /api/v2/config/dns [get]
// @Security SessionAuth
func (h *APIHandler) GetDNSConfigGin(c *gin.Context) {
	h.configMutex.RLock()
	// Assuming ConvertDNSConfigToJSON handles sensitive data appropriately if any
	dnsConfigJSON := config.ConvertDNSConfigToJSON(h.Config.DNSValidator)
	h.configMutex.RUnlock()
	respondWithJSONGin(c, http.StatusOK, dnsConfigJSON)
}

// UpdateDNSConfigGin updates the default DNS validator configuration.
// @Summary Update DNS configuration
// @Description Updates the default DNS validator configuration
// @Tags Configuration
// @Accept json
// @Produce json
// @Param config body map[string]interface{} true "DNS configuration updates"
// @Success 200 {object} map[string]interface{} "Updated DNS configuration"
// @Failure 400 {object} ErrorResponse "Invalid request body or validation error"
// @Failure 500 {object} ErrorResponse "Failed to save configuration"
// @Router /api/v2/config/dns [post]
// @Security SessionAuth
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
	respondWithJSONGin(c, http.StatusOK, config.ConvertDNSConfigToJSON(updatedDNSConfig))
}

// GetHTTPConfigGin retrieves the default HTTP validator configuration.
// @Summary Get HTTP configuration
// @Description Retrieves the default HTTP validator configuration
// @Tags Configuration
// @Produce json
// @Success 200 {object} map[string]interface{} "HTTP configuration"
// @Failure 500 {object} ErrorResponse "Internal server error"
// @Router /api/v2/config/http [get]
// @Security SessionAuth
func (h *APIHandler) GetHTTPConfigGin(c *gin.Context) {
	h.configMutex.RLock()
	httpConfigJSON := config.ConvertHTTPConfigToJSON(h.Config.HTTPValidator)
	h.configMutex.RUnlock()
	respondWithJSONGin(c, http.StatusOK, httpConfigJSON)
}

// UpdateHTTPConfigGin updates the default HTTP validator configuration.
// @Summary Update HTTP configuration
// @Description Updates the default HTTP validator configuration
// @Tags Configuration
// @Accept json
// @Produce json
// @Param config body map[string]interface{} true "HTTP configuration updates"
// @Success 200 {object} map[string]interface{} "Updated HTTP configuration"
// @Failure 400 {object} ErrorResponse "Invalid request body or validation error"
// @Failure 500 {object} ErrorResponse "Failed to save configuration"
// @Router /api/v2/config/http [post]
// @Security SessionAuth
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
	respondWithJSONGin(c, http.StatusOK, config.ConvertHTTPConfigToJSON(updatedHTTPConfig))
}

// GetLoggingConfigGin retrieves the current logging configuration.
// @Summary Get logging configuration
// @Description Retrieves the current logging configuration
// @Tags Configuration
// @Produce json
// @Success 200 {object} map[string]interface{} "Logging configuration"
// @Failure 500 {object} ErrorResponse "Internal server error"
// @Router /api/v2/config/logging [get]
// @Security SessionAuth
func (h *APIHandler) GetLoggingConfigGin(c *gin.Context) {
	h.configMutex.RLock()
	loggingConfig := h.Config.Logging
	h.configMutex.RUnlock()
	respondWithJSONGin(c, http.StatusOK, loggingConfig)
}

// UpdateLoggingConfigGin updates the logging configuration.
// @Summary Update logging configuration
// @Description Updates the logging configuration
// @Tags Configuration
// @Accept json
// @Produce json
// @Param config body map[string]interface{} true "Logging configuration updates"
// @Success 200 {object} map[string]interface{} "Updated logging configuration"
// @Failure 400 {object} ErrorResponse "Invalid request body or validation error"
// @Failure 500 {object} ErrorResponse "Failed to save configuration"
// @Router /api/v2/config/logging [post]
// @Security SessionAuth
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
// @Description Retrieves the worker configuration
// @Tags Configuration
// @Produce json
// @Success 200 {object} map[string]interface{} "Worker configuration"
// @Failure 500 {object} ErrorResponse "Internal server error"
// @Router /api/v2/config/worker [get]
// @Security SessionAuth
func (h *APIHandler) GetWorkerConfigGin(c *gin.Context) {
	h.configMutex.RLock()
	workerCfg := h.Config.Worker
	h.configMutex.RUnlock()
	respondWithJSONGin(c, http.StatusOK, workerCfg)
}

// UpdateWorkerConfigGin updates the worker configuration.
// @Summary Update worker configuration
// @Description Updates the worker configuration
// @Tags Configuration
// @Accept json
// @Produce json
// @Param config body map[string]interface{} true "Worker configuration updates"
// @Success 200 {object} map[string]interface{} "Updated worker configuration"
// @Failure 400 {object} ErrorResponse "Invalid request body"
// @Failure 500 {object} ErrorResponse "Failed to save configuration"
// @Router /api/v2/config/worker [post]
// @Security SessionAuth
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
// @Description Retrieves global rate limiter settings
// @Tags Configuration
// @Produce json
// @Success 200 {object} map[string]interface{} "Rate limiter configuration"
// @Failure 500 {object} ErrorResponse "Internal server error"
// @Router /api/v2/config/rate-limit [get]
// @Security SessionAuth
func (h *APIHandler) GetRateLimiterConfigGin(c *gin.Context) {
	h.configMutex.RLock()
	rlCfg := h.Config.RateLimiter
	h.configMutex.RUnlock()
	respondWithJSONGin(c, http.StatusOK, rlCfg)
}

// UpdateRateLimiterConfigGin updates global rate limiter settings.
// @Summary Update rate limiter configuration
// @Description Updates global rate limiter settings
// @Tags Configuration
// @Accept json
// @Produce json
// @Param config body map[string]interface{} true "Rate limiter configuration updates"
// @Success 200 {object} map[string]interface{} "Updated rate limiter configuration"
// @Failure 400 {object} ErrorResponse "Invalid request body"
// @Failure 500 {object} ErrorResponse "Failed to save configuration"
// @Router /api/v2/config/rate-limit [post]
// @Security SessionAuth
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
// @Description Retrieves sanitized authentication configuration (sensitive fields omitted)
// @Tags Configuration
// @Produce json
// @Success 200 {object} map[string]interface{} "Authentication configuration"
// @Failure 500 {object} ErrorResponse "Internal server error"
// @Router /api/v2/config/auth [get]
// @Security SessionAuth
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
// @Description Updates authentication configuration
// @Tags Configuration
// @Accept json
// @Produce json
// @Param config body map[string]interface{} true "Authentication configuration updates"
// @Success 200 {object} map[string]interface{} "Updated authentication configuration"
// @Failure 400 {object} ErrorResponse "Invalid request body"
// @Failure 500 {object} ErrorResponse "Failed to save configuration"
// @Router /api/v2/config/auth [post]
// @Security SessionAuth
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
// @Description Retrieves proxy manager settings
// @Tags Configuration
// @Produce json
// @Success 200 {object} map[string]interface{} "Proxy manager configuration"
// @Failure 500 {object} ErrorResponse "Internal server error"
// @Router /api/v2/config/proxy-manager [get]
// @Security SessionAuth
func (h *APIHandler) GetProxyManagerConfigGin(c *gin.Context) {
       h.configMutex.RLock()
       cfgJSON := config.ConvertProxyManagerConfigToJSON(h.Config.ProxyManager)
       h.configMutex.RUnlock()
       respondWithJSONGin(c, http.StatusOK, cfgJSON)
}

// UpdateProxyManagerConfigGin updates proxy manager settings.
// @Summary Update proxy manager configuration
// @Description Updates proxy manager settings
// @Tags Configuration
// @Accept json
// @Produce json
// @Param config body map[string]interface{} true "Proxy manager configuration updates"
// @Success 200 {object} map[string]interface{} "Updated proxy manager configuration"
// @Failure 400 {object} ErrorResponse "Invalid request body"
// @Failure 500 {object} ErrorResponse "Failed to save configuration"
// @Router /api/v2/config/proxy-manager [post]
// @Security SessionAuth
func (h *APIHandler) UpdateProxyManagerConfigGin(c *gin.Context) {
       var req config.ProxyManagerConfigJSON
       if err := c.ShouldBindJSON(&req); err != nil {
               respondWithErrorGin(c, http.StatusBadRequest, "Invalid request body: "+err.Error())
               return
       }
       updated := config.ConvertJSONToProxyManagerConfig(req)
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
       respondWithJSONGin(c, http.StatusOK, config.ConvertProxyManagerConfigToJSON(updated))
}
