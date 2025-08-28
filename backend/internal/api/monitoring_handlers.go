//go:build legacy_gin
// +build legacy_gin

// File: backend/internal/api/monitoring_handlers.go
package api

import (
	"net/http"
	"strconv"

	"github.com/fntelecomllc/studio/backend/internal/monitoring"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// ===============================================================================
// WEEK 2 DAY 2: MONITORING API HANDLERS
// REST endpoints for the existing UI to consume monitoring data
// ===============================================================================

// MonitoringHandlers - Handlers for monitoring endpoints
type MonitoringHandlers struct {
	monitoringService *monitoring.MonitoringService
	cleanupService    *monitoring.CleanupService
}

// NewMonitoringHandlers - Create monitoring handlers
func NewMonitoringHandlers(monitoringService *monitoring.MonitoringService, cleanupService *monitoring.CleanupService) *MonitoringHandlers {
	return &MonitoringHandlers{
		monitoringService: monitoringService,
		cleanupService:    cleanupService,
	}
}

// RegisterMonitoringRoutes - Register monitoring routes
func (h *MonitoringHandlers) RegisterMonitoringRoutes(r *gin.RouterGroup) {
	monitoring := r.Group("/monitoring")
	{
		// System health and overview
		monitoring.GET("/health", h.GetSystemHealth)
		monitoring.GET("/stats", h.GetMonitoringStats)

		// Resource monitoring
		monitoring.GET("/resources/system", h.GetSystemResources)
		monitoring.GET("/resources/history", h.GetResourceHistory)
		monitoring.GET("/resources/alerts", h.GetResourceAlerts)

		// Performance tracking
		monitoring.GET("/performance/metrics", h.GetPerformanceMetrics)
		monitoring.GET("/performance/summary", h.GetPerformanceSummary)
		monitoring.GET("/performance/active", h.GetActiveOperations)
		monitoring.GET("/performance/slow", h.GetSlowOperations)
		monitoring.GET("/performance/failed", h.GetFailedOperations)

		// Campaign-specific monitoring
		monitoring.GET("/campaigns/:campaignId/resources", h.GetCampaignResources)
		monitoring.POST("/campaigns/:campaignId/limits", h.SetCampaignLimits)
		monitoring.GET("/campaigns/:campaignId/performance", h.GetCampaignPerformance)
		monitoring.GET("/campaigns/:campaignId/health", h.GetCampaignHealth)

		// Dashboard endpoints
		monitoring.GET("/dashboard/summary", h.GetDashboardSummary)
		monitoring.GET("/dashboard/trends", h.GetThroughputTrends)

		// Week 2 Day 4: Cleanup endpoints
		monitoring.GET("/cleanup/stats", h.GetCleanupStats)
		monitoring.GET("/cleanup/campaigns/:campaignId", h.GetCampaignCleanupInfo)
		monitoring.POST("/cleanup/campaigns/:campaignId/force", h.ForceCleanupCampaign)
	}
}

// GetSystemHealth - Get overall system health status
func (h *MonitoringHandlers) GetSystemHealth(c *gin.Context) {
	health := h.monitoringService.GetSystemHealth()
	respondWithJSONGin(c, http.StatusOK, health)
}

// GetMonitoringStats - Get comprehensive monitoring statistics
func (h *MonitoringHandlers) GetMonitoringStats(c *gin.Context) {
	stats := h.monitoringService.GetMonitoringStats()
	respondWithJSONGin(c, http.StatusOK, stats)
}

// GetSystemResources - Get current system resource usage
func (h *MonitoringHandlers) GetSystemResources(c *gin.Context) {
	usage := h.monitoringService.ResourceMonitor.GetSystemUsage()
	respondWithJSONGin(c, http.StatusOK, usage)
}

// GetResourceHistory - Get resource usage history
func (h *MonitoringHandlers) GetResourceHistory(c *gin.Context) {
	hoursStr := c.DefaultQuery("hours", "24")
	hours, err := strconv.Atoi(hoursStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, NewErrorResponse(ErrorCodeBadRequest, "Invalid hours parameter", getRequestID(c), c.Request.URL.Path))
		return
	}

	history := h.monitoringService.ResourceMonitor.GetResourceHistory(hours)
	respondWithJSONGin(c, http.StatusOK, history)
}

// GetResourceAlerts - Get active resource alerts
func (h *MonitoringHandlers) GetResourceAlerts(c *gin.Context) {
	limitStr := c.DefaultQuery("limit", "50")
	limit, err := strconv.Atoi(limitStr)
	if err != nil {
		respondWithErrorGin(c, http.StatusBadRequest, "Invalid limit parameter")
		return
	}

	alerts := h.monitoringService.ResourceMonitor.GetActiveAlerts(limit)
	respondWithJSONGin(c, http.StatusOK, alerts)
}

// GetPerformanceMetrics - Get recent performance metrics
func (h *MonitoringHandlers) GetPerformanceMetrics(c *gin.Context) {
	limitStr := c.DefaultQuery("limit", "100")
	limit, err := strconv.Atoi(limitStr)
	if err != nil {
		respondWithErrorGin(c, http.StatusBadRequest, "Invalid limit parameter")
		return
	}

	operationType := c.Query("type")
	var metrics []monitoring.PerformanceMetric

	if operationType != "" {
		metrics = h.monitoringService.PerformanceTracker.GetMetricsByOperationType(operationType, limit)
	} else {
		metrics = h.monitoringService.PerformanceTracker.GetRecentMetrics(limit)
	}

	respondWithJSONGin(c, http.StatusOK, metrics)
}

// GetPerformanceSummary - Get performance summary for operation types
func (h *MonitoringHandlers) GetPerformanceSummary(c *gin.Context) {
	operationType := c.Query("type")

	if operationType != "" {
		summary, exists := h.monitoringService.PerformanceTracker.GetSummary(operationType)
		if !exists {
			respondWithErrorGin(c, http.StatusNotFound, "No data found for operation type: "+operationType)
			return
		}
		respondWithJSONGin(c, http.StatusOK, summary)
	} else {
		summaries := h.monitoringService.PerformanceTracker.GetAllSummaries()
		respondWithJSONGin(c, http.StatusOK, summaries)
	}
}

// GetActiveOperations - Get currently running operations
func (h *MonitoringHandlers) GetActiveOperations(c *gin.Context) {
	operations := h.monitoringService.PerformanceTracker.GetActiveOperations()
	respondWithJSONGin(c, http.StatusOK, operations)
}

// GetSlowOperations - Get operations that took longer than threshold
func (h *MonitoringHandlers) GetSlowOperations(c *gin.Context) {
	thresholdStr := c.DefaultQuery("threshold", "5000") // 5 seconds default
	threshold, err := strconv.ParseInt(thresholdStr, 10, 64)
	if err != nil {
		respondWithErrorGin(c, http.StatusBadRequest, "Invalid threshold parameter")
		return
	}

	limitStr := c.DefaultQuery("limit", "50")
	limit, err := strconv.Atoi(limitStr)
	if err != nil {
		respondWithErrorGin(c, http.StatusBadRequest, "Invalid limit parameter")
		return
	}

	slowOps := h.monitoringService.PerformanceTracker.GetSlowOperations(threshold, limit)
	respondWithJSONGin(c, http.StatusOK, slowOps)
}

// GetFailedOperations - Get recent failed operations
func (h *MonitoringHandlers) GetFailedOperations(c *gin.Context) {
	limitStr := c.DefaultQuery("limit", "50")
	limit, err := strconv.Atoi(limitStr)
	if err != nil {
		respondWithErrorGin(c, http.StatusBadRequest, "Invalid limit parameter")
		return
	}

	failedOps := h.monitoringService.PerformanceTracker.GetFailedOperations(limit)
	respondWithJSONGin(c, http.StatusOK, failedOps)
}

// GetCampaignResources - Get resource usage for specific campaign
func (h *MonitoringHandlers) GetCampaignResources(c *gin.Context) {
	campaignIDStr := c.Param("campaignId")
	campaignID, err := uuid.Parse(campaignIDStr)
	if err != nil {
		respondWithErrorGin(c, http.StatusBadRequest, "Invalid campaign ID")
		return
	}

	usage, exists := h.monitoringService.GetCampaignResourceUsage(campaignID)
	if !exists {
		respondWithErrorGin(c, http.StatusNotFound, "Campaign not found or no resource data available")
		return
	}

	respondWithJSONGin(c, http.StatusOK, usage)
}

// SetCampaignLimitsRequest - Request structure for setting campaign limits
type SetCampaignLimitsRequest struct {
	MaxCPUPercent   float64 `json:"maxCpuPercent" binding:"required,min=0,max=100"`
	MaxMemoryMB     uint64  `json:"maxMemoryMB" binding:"required,min=1"`
	MaxDiskGB       uint64  `json:"maxDiskGB" binding:"required,min=1"`
	MaxDurationMins int     `json:"maxDurationMins" binding:"required,min=1"`
}

// SetCampaignLimits - Set resource limits for a campaign
func (h *MonitoringHandlers) SetCampaignLimits(c *gin.Context) {
	campaignIDStr := c.Param("campaignId")
	campaignID, err := uuid.Parse(campaignIDStr)
	if err != nil {
		respondWithErrorGin(c, http.StatusBadRequest, "Invalid campaign ID")
		return
	}

	var req SetCampaignLimitsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondWithErrorGin(c, http.StatusBadRequest, "Invalid request: "+err.Error())
		return
	}

	limits := monitoring.CampaignResourceLimits{
		MaxCPUPercent:   req.MaxCPUPercent,
		MaxMemoryMB:     req.MaxMemoryMB,
		MaxDiskGB:       req.MaxDiskGB,
		MaxDurationMins: req.MaxDurationMins,
	}

	h.monitoringService.SetCampaignResourceLimits(campaignID, limits)

	respondWithJSONGin(c, http.StatusOK, map[string]string{"message": "Campaign resource limits set successfully"})
}

// GetCampaignPerformance - Get performance metrics for specific campaign
func (h *MonitoringHandlers) GetCampaignPerformance(c *gin.Context) {
	campaignIDStr := c.Param("campaignId")
	campaignID, err := uuid.Parse(campaignIDStr)
	if err != nil {
		respondWithErrorGin(c, http.StatusBadRequest, "Invalid campaign ID")
		return
	}

	limitStr := c.DefaultQuery("limit", "100")
	limit, err := strconv.Atoi(limitStr)
	if err != nil {
		respondWithErrorGin(c, http.StatusBadRequest, "Invalid limit parameter")
		return
	}

	// Get all recent metrics and filter by campaign ID
	allMetrics := h.monitoringService.PerformanceTracker.GetRecentMetrics(limit * 2) // Get more to account for filtering
	campaignMetrics := make([]monitoring.PerformanceMetric, 0)

	for _, metric := range allMetrics {
		if metric.CampaignID != nil && *metric.CampaignID == campaignID {
			campaignMetrics = append(campaignMetrics, metric)
			if len(campaignMetrics) >= limit {
				break
			}
		}
	}

	respondWithJSONGin(c, http.StatusOK, campaignMetrics)
}

// GetThroughputTrends - Get throughput trends for operation type
func (h *MonitoringHandlers) GetThroughputTrends(c *gin.Context) {
	operationType := c.Query("type")
	if operationType == "" {
		respondWithErrorGin(c, http.StatusBadRequest, "Operation type is required")
		return
	}

	hoursStr := c.DefaultQuery("hours", "24")
	hours, err := strconv.Atoi(hoursStr)
	if err != nil {
		respondWithErrorGin(c, http.StatusBadRequest, "Invalid hours parameter")
		return
	}

	trends := h.monitoringService.PerformanceTracker.GetThroughputTrends(operationType, hours)
	respondWithJSONGin(c, http.StatusOK, trends)
}

// GetCampaignHealth - Get health status for specific campaign
func (h *MonitoringHandlers) GetCampaignHealth(c *gin.Context) {
	campaignIDStr := c.Param("campaignId")
	campaignID, err := uuid.Parse(campaignIDStr)
	if err != nil {
		respondWithErrorGin(c, http.StatusBadRequest, "Invalid campaign ID")
		return
	}

	// Get campaign monitoring integration
	integration := monitoring.GetGlobalMonitoringIntegration()
	if integration == nil {
		respondWithErrorGin(c, http.StatusServiceUnavailable, "Monitoring integration not available")
		return
	}

	health := integration.GetCampaignHealth(campaignID)
	respondWithJSONGin(c, http.StatusOK, health)
}

// GetDashboardSummary - Get system health summary for dashboard
func (h *MonitoringHandlers) GetDashboardSummary(c *gin.Context) {
	// Get campaign monitoring integration
	integration := monitoring.GetGlobalMonitoringIntegration()
	if integration == nil {
		respondWithErrorGin(c, http.StatusServiceUnavailable, "Monitoring integration not available")
		return
	}

	summary := integration.GetSystemHealthSummary()
	respondWithJSONGin(c, http.StatusOK, summary)
}

// Week 2 Day 4: Cleanup API endpoints

// GetCleanupStats - Get cleanup service statistics
func (h *MonitoringHandlers) GetCleanupStats(c *gin.Context) {
	if h.cleanupService == nil {
		respondWithErrorGin(c, http.StatusServiceUnavailable, "Cleanup service not available")
		return
	}

	stats := h.cleanupService.GetCleanupStats()
	respondWithJSONGin(c, http.StatusOK, stats)
}

// GetCampaignCleanupInfo - Get cleanup info for specific campaign
func (h *MonitoringHandlers) GetCampaignCleanupInfo(c *gin.Context) {
	if h.cleanupService == nil {
		respondWithErrorGin(c, http.StatusServiceUnavailable, "Cleanup service not available")
		return
	}

	campaignIDStr := c.Param("campaignId")
	campaignID, err := uuid.Parse(campaignIDStr)
	if err != nil {
		respondWithErrorGin(c, http.StatusBadRequest, "Invalid campaign ID")
		return
	}

	info, exists := h.cleanupService.GetCampaignCleanupInfo(campaignID)
	if !exists {
		respondWithErrorGin(c, http.StatusNotFound, "Campaign cleanup info not found")
		return
	}

	respondWithJSONGin(c, http.StatusOK, info)
}

// ForceCleanupCampaign - Force cleanup of specific campaign
func (h *MonitoringHandlers) ForceCleanupCampaign(c *gin.Context) {
	if h.cleanupService == nil {
		respondWithErrorGin(c, http.StatusServiceUnavailable, "Cleanup service not available")
		return
	}

	campaignIDStr := c.Param("campaignId")
	campaignID, err := uuid.Parse(campaignIDStr)
	if err != nil {
		respondWithErrorGin(c, http.StatusBadRequest, "Invalid campaign ID")
		return
	}

	if err := h.cleanupService.ForceCleanupCampaign(campaignID); err != nil {
		respondWithErrorGin(c, http.StatusInternalServerError, "Cleanup failed: "+err.Error())
		return
	}

	respondWithJSONGin(c, http.StatusOK, map[string]string{"message": "Campaign cleanup completed successfully"})
}
