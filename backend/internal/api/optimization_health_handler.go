package api

import (
	"net/http"
	"time"

	"github.com/fntelecomllc/studio/backend/internal/services"
	"github.com/gin-gonic/gin"
)

// OptimizationHealthHandler handles health checks for optimization components
type OptimizationHealthHandler struct {
	serviceFactory *services.ServiceFactory
}

// NewOptimizationHealthHandler creates a new optimization health handler
func NewOptimizationHealthHandler(serviceFactory *services.ServiceFactory) *OptimizationHealthHandler {
	return &OptimizationHealthHandler{
		serviceFactory: serviceFactory,
	}
}

// HandleOptimizationHealth provides detailed health status of optimization components
func (h *OptimizationHealthHandler) HandleOptimizationHealth(c *gin.Context) {
	if h.serviceFactory == nil {
		c.JSON(http.StatusServiceUnavailable, NewErrorResponse(ErrorCodeServiceUnavailable, "Service factory not available", getRequestID(c), c.Request.URL.Path))
		return
	}

	healthStatus := h.serviceFactory.HealthCheck()

	// Determine overall status
	status := "healthy"
	httpCode := http.StatusOK

	// Check if optimization is enabled
	if enabled, ok := healthStatus["optimization_enabled"].(bool); !ok || !enabled {
		status = "disabled"
	}

	// Check cache availability if caching is enabled
	if phases, ok := healthStatus["phases"].(map[string]bool); ok {
		if cachingEnabled, exists := phases["caching"]; exists && cachingEnabled {
			if cacheAvailable, ok := healthStatus["cache_available"].(bool); !ok || !cacheAvailable {
				status = "degraded"
				httpCode = http.StatusOK // Return 200 with degraded status, not 206
			}
		}
	}

	responseData := map[string]interface{}{
		"status":       status,
		"optimization": healthStatus,
		"timestamp":    time.Now().UTC().Format(time.RFC3339),
	}

	respondWithJSONGin(c, httpCode, responseData)
}

// HandleOptimizationMetrics provides optimization performance metrics
func (h *OptimizationHealthHandler) HandleOptimizationMetrics(c *gin.Context) {
	identifier := c.DefaultQuery("identifier", "health-check")

	if h.serviceFactory == nil {
		c.JSON(http.StatusServiceUnavailable, NewErrorResponse(ErrorCodeServiceUnavailable, "Service factory not available", getRequestID(c), c.Request.URL.Path))
		return
	}

	optimizationStatus := h.serviceFactory.GetOptimizationStatus(identifier)

	responseData := map[string]interface{}{
		"optimization_status": optimizationStatus,
		"identifier":          identifier,
	}

	respondWithJSONGin(c, http.StatusOK, responseData)
}

// HandleFeatureFlagStatus provides feature flag configuration status
func (h *OptimizationHealthHandler) HandleFeatureFlagStatus(c *gin.Context) {
	if h.serviceFactory == nil {
		c.JSON(http.StatusServiceUnavailable, NewErrorResponse(ErrorCodeServiceUnavailable, "Service factory not available", getRequestID(c), c.Request.URL.Path))
		return
	}

	featureFlagService := h.serviceFactory.GetFeatureFlagService()
	if featureFlagService == nil {
		c.JSON(http.StatusServiceUnavailable, NewErrorResponse(ErrorCodeServiceUnavailable, "Feature flag service not available", getRequestID(c), c.Request.URL.Path))
		return
	}

	config := featureFlagService.GetConfig()

	responseData := map[string]interface{}{
		"feature_flags":      config,
		"rollout_enabled":    featureFlagService.IsOptimizationEnabled(),
		"rollout_percentage": featureFlagService.GetRolloutPercentage(),
	}

	respondWithJSONGin(c, http.StatusOK, responseData)
}

// HandleOptimizationTest tests optimization features for a given identifier
func (h *OptimizationHealthHandler) HandleOptimizationTest(c *gin.Context) {
	identifier := c.DefaultQuery("identifier", "test-user")

	if h.serviceFactory == nil {
		c.JSON(http.StatusServiceUnavailable, NewErrorResponse(ErrorCodeServiceUnavailable, "Service factory not available", getRequestID(c), c.Request.URL.Path))
		return
	}

	shouldUse := h.serviceFactory.ShouldUseOptimization(identifier)
	optimizationLevel := h.serviceFactory.GetFeatureFlagService().GetOptimizationLevel(identifier)

	responseData := map[string]interface{}{
		"identifier":              identifier,
		"should_use_optimization": shouldUse,
		"optimization_level":      optimizationLevel,
	}

	respondWithJSONGin(c, http.StatusOK, responseData)
}
