// File: backend/internal/monitoring/campaign_integration.go
package monitoring

import (
	"fmt"
	"log"
	"time"

	"github.com/google/uuid"
)

// ===============================================================================
// WEEK 2 DAY 3: CAMPAIGN MONITORING INTEGRATION
// Connect monitoring to existing campaign operations
// ===============================================================================

// CampaignMonitoringIntegration - Helper for integrating monitoring into campaigns
type CampaignMonitoringIntegration struct {
	monitoringService *MonitoringService
}

// NewCampaignMonitoringIntegration - Create campaign monitoring integration
func NewCampaignMonitoringIntegration(monitoringService *MonitoringService) *CampaignMonitoringIntegration {
	return &CampaignMonitoringIntegration{
		monitoringService: monitoringService,
	}
}

// TrackDomainGeneration - Track domain generation operation
func (cmi *CampaignMonitoringIntegration) TrackDomainGeneration(campaignID uuid.UUID, domainCount int) (string, func(bool, string)) {
	operationID := uuid.New().String()
	cmi.monitoringService.StartOperationTracking(operationID, "domain_generation", &campaignID)

	log.Printf("Started tracking domain generation for campaign %s: operation %s", campaignID, operationID)

	return operationID, func(success bool, errorMsg string) {
		cmi.monitoringService.EndOperationTracking(operationID, domainCount, success, errorMsg)

		status := "completed"
		if !success {
			status = "failed"
		}
		log.Printf("Domain generation %s for campaign %s: %d domains processed", status, campaignID, domainCount)
	}
}

// TrackDNSValidation - Track DNS validation operation
func (cmi *CampaignMonitoringIntegration) TrackDNSValidation(campaignID uuid.UUID, domainCount int) (string, func(bool, string)) {
	operationID := uuid.New().String()
	cmi.monitoringService.StartOperationTracking(operationID, "dns_validation", &campaignID)

	log.Printf("Started tracking DNS validation for campaign %s: operation %s", campaignID, operationID)

	return operationID, func(success bool, errorMsg string) {
		cmi.monitoringService.EndOperationTracking(operationID, domainCount, success, errorMsg)

		status := "completed"
		if !success {
			status = "failed"
		}
		log.Printf("DNS validation %s for campaign %s: %d domains processed", status, campaignID, domainCount)
	}
}

// TrackHTTPValidation - Track HTTP validation operation
func (cmi *CampaignMonitoringIntegration) TrackHTTPValidation(campaignID uuid.UUID, domainCount int) (string, func(bool, string)) {
	operationID := uuid.New().String()
	cmi.monitoringService.StartOperationTracking(operationID, "http_validation", &campaignID)

	log.Printf("Started tracking HTTP validation for campaign %s: operation %s", campaignID, operationID)

	return operationID, func(success bool, errorMsg string) {
		cmi.monitoringService.EndOperationTracking(operationID, domainCount, success, errorMsg)

		status := "completed"
		if !success {
			status = "failed"
		}
		log.Printf("HTTP validation %s for campaign %s: %d domains processed", status, campaignID, domainCount)
	}
}

// TrackContentAnalysis - Track content analysis operation
func (cmi *CampaignMonitoringIntegration) TrackContentAnalysis(campaignID uuid.UUID, domainCount int) (string, func(bool, string)) {
	operationID := uuid.New().String()
	cmi.monitoringService.StartOperationTracking(operationID, "content_analysis", &campaignID)

	log.Printf("Started tracking content analysis for campaign %s: operation %s", campaignID, operationID)

	return operationID, func(success bool, errorMsg string) {
		cmi.monitoringService.EndOperationTracking(operationID, domainCount, success, errorMsg)

		status := "completed"
		if !success {
			status = "failed"
		}
		log.Printf("Content analysis %s for campaign %s: %d domains processed", status, campaignID, domainCount)
	}
}

// TrackBulkOperation - Track general bulk operation
func (cmi *CampaignMonitoringIntegration) TrackBulkOperation(operationType string, campaignID *uuid.UUID, itemCount int) (string, func(bool, string)) {
	operationID := uuid.New().String()
	cmi.monitoringService.StartOperationTracking(operationID, operationType, campaignID)

	campaignInfo := "system-wide"
	if campaignID != nil {
		campaignInfo = fmt.Sprintf("campaign %s", *campaignID)
	}
	log.Printf("Started tracking bulk %s for %s: operation %s", operationType, campaignInfo, operationID)

	return operationID, func(success bool, errorMsg string) {
		cmi.monitoringService.EndOperationTracking(operationID, itemCount, success, errorMsg)

		status := "completed"
		if !success {
			status = "failed"
		}
		log.Printf("Bulk %s %s for %s: %d items processed", operationType, status, campaignInfo, itemCount)
	}
}

// SetCampaignResourceLimits - Set resource limits for a campaign
func (cmi *CampaignMonitoringIntegration) SetCampaignResourceLimits(campaignID uuid.UUID, maxCPU float64, maxMemoryMB uint64, maxDiskGB uint64, maxDurationMins int) {
	limits := CampaignResourceLimits{
		MaxCPUPercent:   maxCPU,
		MaxMemoryMB:     maxMemoryMB,
		MaxDiskGB:       maxDiskGB,
		MaxDurationMins: maxDurationMins,
	}

	cmi.monitoringService.SetCampaignResourceLimits(campaignID, limits)
	log.Printf("Set resource limits for campaign %s: CPU=%.1f%%, Memory=%dMB, Disk=%dGB, Duration=%dm",
		campaignID, maxCPU, maxMemoryMB, maxDiskGB, maxDurationMins)
}

// UpdateCampaignResourceUsage - Update resource usage for a campaign
func (cmi *CampaignMonitoringIntegration) UpdateCampaignResourceUsage(campaignID uuid.UUID, cpuPercent float64, memoryMB uint64, diskGB uint64) {
	cmi.monitoringService.ResourceMonitor.UpdateCampaignUsage(campaignID, cpuPercent, memoryMB, diskGB)
}

// GetCampaignHealth - Get health status for a specific campaign
func (cmi *CampaignMonitoringIntegration) GetCampaignHealth(campaignID uuid.UUID) CampaignHealth {
	// Get resource usage
	resourceUsage, hasResources := cmi.monitoringService.GetCampaignResourceUsage(campaignID)

	// Get recent performance metrics for this campaign
	allMetrics := cmi.monitoringService.PerformanceTracker.GetRecentMetrics(100)
	campaignMetrics := make([]PerformanceMetric, 0)
	for _, metric := range allMetrics {
		if metric.CampaignID != nil && *metric.CampaignID == campaignID {
			campaignMetrics = append(campaignMetrics, metric)
			if len(campaignMetrics) >= 10 { // Get last 10 operations
				break
			}
		}
	}

	// Calculate health status
	healthStatus := "healthy"
	if hasResources && resourceUsage != nil {
		// Simple health check based on resource usage
		if resourceUsage.CPUPercent > 80 || resourceUsage.MemoryPercent > 80 || resourceUsage.DiskPercent > 80 {
			healthStatus = "warning"
		}
		if resourceUsage.CPUPercent > 95 || resourceUsage.MemoryPercent > 95 || resourceUsage.DiskPercent > 95 {
			healthStatus = "critical"
		}
	}

	// Check for failed operations
	failedOps := 0
	totalOps := len(campaignMetrics)
	for _, metric := range campaignMetrics {
		if !metric.Success {
			failedOps++
		}
	}

	successRate := 100.0
	if totalOps > 0 {
		successRate = float64(totalOps-failedOps) / float64(totalOps) * 100
	}

	if successRate < 80 && totalOps > 2 {
		healthStatus = "warning"
	}
	if successRate < 50 && totalOps > 2 {
		healthStatus = "critical"
	}

	return CampaignHealth{
		CampaignID:       campaignID,
		HealthStatus:     healthStatus,
		ResourceUsage:    resourceUsage,
		RecentMetrics:    campaignMetrics,
		SuccessRate:      successRate,
		TotalOperations:  totalOps,
		FailedOperations: failedOps,
		LastUpdated:      time.Now(),
	}
}

// CampaignHealth - Health status for a specific campaign
type CampaignHealth struct {
	CampaignID       uuid.UUID           `json:"campaignId"`
	HealthStatus     string              `json:"healthStatus"` // "healthy", "warning", "critical"
	ResourceUsage    *ResourceUsage      `json:"resourceUsage,omitempty"`
	RecentMetrics    []PerformanceMetric `json:"recentMetrics"`
	SuccessRate      float64             `json:"successRate"`
	TotalOperations  int                 `json:"totalOperations"`
	FailedOperations int                 `json:"failedOperations"`
	LastUpdated      time.Time           `json:"lastUpdated"`
}

// GetSystemHealthSummary - Get overall system health for dashboard
func (cmi *CampaignMonitoringIntegration) GetSystemHealthSummary() SystemHealthSummary {
	systemHealth := cmi.monitoringService.GetSystemHealth()

	// Get active operations count by type
	activeOps := cmi.monitoringService.PerformanceTracker.GetActiveOperations()
	opsByType := make(map[string]int)
	for _, op := range activeOps {
		opsByType[op.OperationType]++
	}

	// Get recent failed operations
	failedOps := cmi.monitoringService.PerformanceTracker.GetFailedOperations(10)

	// Get slow operations
	slowOps := cmi.monitoringService.PerformanceTracker.GetSlowOperations(5000, 10) // > 5 seconds

	return SystemHealthSummary{
		OverallStatus:    systemHealth.OverallStatus,
		ActiveOperations: len(activeOps),
		ActiveByType:     opsByType,
		RecentFailures:   len(failedOps),
		SlowOperations:   len(slowOps),
		ResourceUsage:    systemHealth.ResourceUsage,
		LastUpdated:      time.Now(),
	}
}

// SystemHealthSummary - System health summary for dashboard
type SystemHealthSummary struct {
	OverallStatus    string         `json:"overallStatus"`
	ActiveOperations int            `json:"activeOperations"`
	ActiveByType     map[string]int `json:"activeByType"`
	RecentFailures   int            `json:"recentFailures"`
	SlowOperations   int            `json:"slowOperations"`
	ResourceUsage    *ResourceUsage `json:"resourceUsage,omitempty"`
	LastUpdated      time.Time      `json:"lastUpdated"`
}

// Global monitoring integration instance (singleton pattern for simplicity)
var globalMonitoringIntegration *CampaignMonitoringIntegration

// SetGlobalMonitoringIntegration - Set the global monitoring integration
func SetGlobalMonitoringIntegration(integration *CampaignMonitoringIntegration) {
	globalMonitoringIntegration = integration
}

// GetGlobalMonitoringIntegration - Get the global monitoring integration
func GetGlobalMonitoringIntegration() *CampaignMonitoringIntegration {
	return globalMonitoringIntegration
}

// Quick tracking functions for easy integration into existing code

// QuickTrackDomainGeneration - Quick domain generation tracking
func QuickTrackDomainGeneration(campaignID uuid.UUID, domainCount int) (string, func(bool, string)) {
	if globalMonitoringIntegration != nil {
		return globalMonitoringIntegration.TrackDomainGeneration(campaignID, domainCount)
	}
	// Return no-op function if monitoring not available
	return "", func(bool, string) {}
}

// QuickTrackDNSValidation - Quick DNS validation tracking
func QuickTrackDNSValidation(campaignID uuid.UUID, domainCount int) (string, func(bool, string)) {
	if globalMonitoringIntegration != nil {
		return globalMonitoringIntegration.TrackDNSValidation(campaignID, domainCount)
	}
	return "", func(bool, string) {}
}

// QuickTrackHTTPValidation - Quick HTTP validation tracking
func QuickTrackHTTPValidation(campaignID uuid.UUID, domainCount int) (string, func(bool, string)) {
	if globalMonitoringIntegration != nil {
		return globalMonitoringIntegration.TrackHTTPValidation(campaignID, domainCount)
	}
	return "", func(bool, string) {}
}
