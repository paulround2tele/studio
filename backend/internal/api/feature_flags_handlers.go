// File: backend/internal/api/feature_flags_handlers.go
package api

import (
	"net/http"

	"github.com/fntelecomllc/studio/backend/internal/config"
	"github.com/gin-gonic/gin"
)

// GetFeatureFlagsGin returns current feature flag settings.
// @Summary Get feature flags
// @Description Retrieve current feature flag settings
// @Tags feature-flags
// @ID getFeatureFlags
// @Produce json
// @Success 200 {object} FeatureFlags "Feature flags settings"
// @Router /feature-flags [get]
func (h *APIHandler) GetFeatureFlagsGin(c *gin.Context) {
	h.configMutex.RLock()
	flags := h.Config.Features
	h.configMutex.RUnlock()
	respondWithJSONGin(c, http.StatusOK, flags)
}

// UpdateFeatureFlagsGin updates feature flag settings.
// @Summary Update feature flags
// @Description Update feature flag settings
// @Tags feature-flags
// @ID updateFeatureFlags
// @Accept json
// @Produce json
// @Param request body FeatureFlags true "Feature flags settings"
// @Success 200 {object} FeatureFlags "Updated feature flags"
// @Failure 400 {object} map[string]string "Invalid request body"
// @Failure 500 {object} map[string]string "Failed to save feature flags"
// @Router /feature-flags [put]
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
