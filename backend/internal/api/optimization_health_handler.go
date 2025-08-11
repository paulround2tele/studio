package api

import (
	"net/http"

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
				httpCode = http.StatusPartialContent
			}
		}
	}

	responseData := map[string]interface{}{
		"status":       status,
		"optimization": healthStatus,
		"timestamp":    "2025-01-29T12:51:00Z",
	}

	c.JSON(httpCode, NewSuccessResponse(responseData, getRequestID(c)))
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

	c.JSON(http.StatusOK, NewSuccessResponse(responseData, getRequestID(c)))
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

	c.JSON(http.StatusOK, NewSuccessResponse(responseData, getRequestID(c)))
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

	c.JSON(http.StatusOK, NewSuccessResponse(responseData, getRequestID(c)))
}
