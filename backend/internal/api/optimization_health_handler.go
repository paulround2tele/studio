package api

import (
	"net/http"

	"github.com/fntelecomllc/studio/backend/internal/services"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
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
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"status":  "error",
			"message": "Service factory not available",
		})
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

	response := gin.H{
		"status":       status,
		"optimization": healthStatus,
		"timestamp":    "2025-01-29T12:51:00Z",
	}

	c.JSON(httpCode, response)
}

// HandleOptimizationMetrics provides optimization performance metrics
func (h *OptimizationHealthHandler) HandleOptimizationMetrics(c *gin.Context) {
	identifier := c.DefaultQuery("identifier", "health-check")

	if h.serviceFactory == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"error": "Service factory not available",
		})
		return
	}

	optimizationStatus := h.serviceFactory.GetOptimizationStatus(identifier)

	c.JSON(http.StatusOK, APIResponse{
		Success: true,
		Data: gin.H{
			"optimization_status": optimizationStatus,
			"identifier":          identifier,
		},
		RequestID: uuid.NewString(),
	})
}

// HandleFeatureFlagStatus provides feature flag configuration status
func (h *OptimizationHealthHandler) HandleFeatureFlagStatus(c *gin.Context) {
	if h.serviceFactory == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"error": "Service factory not available",
		})
		return
	}

	featureFlagService := h.serviceFactory.GetFeatureFlagService()
	if featureFlagService == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"error": "Feature flag service not available",
		})
		return
	}

	config := featureFlagService.GetConfig()

	c.JSON(http.StatusOK, APIResponse{
		Success: true,
		Data: gin.H{
			"feature_flags":      config,
			"rollout_enabled":    featureFlagService.IsOptimizationEnabled(),
			"rollout_percentage": featureFlagService.GetRolloutPercentage(),
		},
		RequestID: uuid.NewString(),
	})
}

// HandleOptimizationTest tests optimization features for a given identifier
func (h *OptimizationHealthHandler) HandleOptimizationTest(c *gin.Context) {
	identifier := c.DefaultQuery("identifier", "test-user")

	if h.serviceFactory == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"error": "Service factory not available",
		})
		return
	}

	shouldUse := h.serviceFactory.ShouldUseOptimization(identifier)
	optimizationLevel := h.serviceFactory.GetFeatureFlagService().GetOptimizationLevel(identifier)

	c.JSON(http.StatusOK, APIResponse{
		Success: true,
		Data: gin.H{
			"identifier":              identifier,
			"should_use_optimization": shouldUse,
			"optimization_level":      optimizationLevel,
		},
		RequestID: uuid.NewString(),
	})
}
