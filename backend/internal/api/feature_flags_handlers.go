// File: backend/internal/api/feature_flags_handlers.go
package api

import (
	"net/http"

	"github.com/fntelecomllc/studio/backend/internal/config"
	"github.com/gin-gonic/gin"
)

// GetFeatureFlagsGin returns current feature flag settings.
// @Summary Get feature flags
// @Description Retrieves current feature flag settings
// @Tags Configuration
// @Produce json
// @Success 200 {object} map[string]interface{} "Feature flags configuration"
// @Failure 500 {object} ErrorResponse "Internal server error"
// @Router /api/v2/config/features [get]
// @Security SessionAuth
func (h *APIHandler) GetFeatureFlagsGin(c *gin.Context) {
	h.configMutex.RLock()
	flags := h.Config.Features
	h.configMutex.RUnlock()
	respondWithJSONGin(c, http.StatusOK, flags)
}

// UpdateFeatureFlagsGin updates feature flag settings.
// @Summary Update feature flags
// @Description Updates feature flag settings
// @Tags Configuration
// @Accept json
// @Produce json
// @Param config body map[string]interface{} true "Feature flags configuration updates"
// @Success 200 {object} map[string]interface{} "Updated feature flags configuration"
// @Failure 400 {object} ErrorResponse "Invalid request body"
// @Failure 500 {object} ErrorResponse "Failed to save feature flags"
// @Router /api/v2/config/features [post]
// @Security SessionAuth
func (h *APIHandler) UpdateFeatureFlagsGin(c *gin.Context) {
	var req config.FeatureFlags
	if err := c.ShouldBindJSON(&req); err != nil {
		respondWithErrorGin(c, http.StatusBadRequest, "Invalid request body: "+err.Error())
		return
	}
	h.configMutex.Lock()
	h.Config.Features = req
	h.configMutex.Unlock()
	if err := config.SaveAppConfig(h.Config); err != nil {
		respondWithErrorGin(c, http.StatusInternalServerError, "Failed to save feature flags")
		return
	}
	respondWithJSONGin(c, http.StatusOK, req)
}
