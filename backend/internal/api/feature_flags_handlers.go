// File: backend/internal/api/feature_flags_handlers.go
package api

import (
	"net/http"

	"github.com/fntelecomllc/studio/backend/internal/config"
	"github.com/gin-gonic/gin"
)

// GetFeatureFlagsGin returns current feature flag settings.
// @Summary Get feature flags
// @Description Returns current feature flag settings
// @Tags Config
// @Produce json
// @Success 200 {object} config.FeatureFlags
// @Router /config/features [get]
func (h *APIHandler) GetFeatureFlagsGin(c *gin.Context) {
	h.configMutex.RLock()
	flags := h.Config.Features
	h.configMutex.RUnlock()
	respondWithJSONGin(c, http.StatusOK, flags)
}

// UpdateFeatureFlagsGin updates feature flag settings.
// @Summary Update feature flags
// @Description Updates feature flag settings
// @Tags Config
// @Accept json
// @Produce json
// @Param flags body config.FeatureFlags true "Feature flags"
// @Success 200 {object} config.FeatureFlags
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /config/features [post]
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
