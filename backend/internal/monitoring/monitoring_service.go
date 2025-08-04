// File: backend/internal/monitoring/monitoring_service.go
package monitoring

import (
	"context"
	"log"
	"sync"
	"time"

	"github.com/google/uuid"
)

// ===============================================================================
// WEEK 2 DAY 2: UNIFIED MONITORING SERVICE
// Combines resource monitoring, performance tracking, and alerting
// ===============================================================================

// MonitoringService - Main monitoring service that orchestrates everything
type MonitoringService struct {
	ResourceMonitor    *ResourceMonitor
	PerformanceTracker *PerformanceTracker
	alertHandlers      []AlertHandler
	isRunning          bool
	stopChan           chan struct{}
	mutex              sync.RWMutex
}

// AlertHandler - Function to handle alerts
type AlertHandler func(alert Alert)

// Alert - Generic alert structure
type Alert struct {
	Type       string                 `json:"type"`     // "resource", "performance", "system"
	Severity   string                 `json:"severity"` // "low", "medium", "high", "critical"
	Message    string                 `json:"message"`
	Timestamp  time.Time              `json:"timestamp"`
	CampaignID *uuid.UUID             `json:"campaignId,omitempty"`
	Details    map[string]interface{} `json:"details"`
}

// MonitoringConfig - Configuration for monitoring service
type MonitoringConfig struct {
	ResourceCheckInterval     time.Duration `json:"resourceCheckInterval"`
	AlertCooldown             time.Duration `json:"alertCooldown"`
	EnableResourceMonitoring  bool          `json:"enableResourceMonitoring"`
	EnablePerformanceTracking bool          `json:"enablePerformanceTracking"`
}

// DefaultMonitoringConfig - Default configuration
func DefaultMonitoringConfig() MonitoringConfig {
	return MonitoringConfig{
		ResourceCheckInterval:     30 * time.Second,
		AlertCooldown:             5 * time.Minute,
		EnableResourceMonitoring:  true,
		EnablePerformanceTracking: true,
	}
}

// NewMonitoringService - Create new monitoring service
func NewMonitoringService(config MonitoringConfig) *MonitoringService {
	return &MonitoringService{
		ResourceMonitor:    NewResourceMonitor(),
		PerformanceTracker: NewPerformanceTracker(),
		alertHandlers:      make([]AlertHandler, 0),
		stopChan:           make(chan struct{}),
	}
}

// AddAlertHandler - Add alert handler
func (ms *MonitoringService) AddAlertHandler(handler AlertHandler) {
	ms.mutex.Lock()
	defer ms.mutex.Unlock()
	ms.alertHandlers = append(ms.alertHandlers, handler)
}

// Start - Start monitoring service
func (ms *MonitoringService) Start(ctx context.Context, config MonitoringConfig) error {
	ms.mutex.Lock()
	if ms.isRunning {
		ms.mutex.Unlock()
		return nil
	}
	ms.isRunning = true
	ms.mutex.Unlock()

	log.Println("Starting monitoring service...")

	// Start resource monitoring loop
	if config.EnableResourceMonitoring {
		go ms.resourceMonitoringLoop(ctx, config.ResourceCheckInterval)
	}

	// Start alert processing
	go ms.alertProcessingLoop(ctx)

	log.Println("Monitoring service started")
	return nil
}

// Stop - Stop monitoring service
func (ms *MonitoringService) Stop() {
	ms.mutex.Lock()
	defer ms.mutex.Unlock()

	if !ms.isRunning {
		return
	}

	log.Println("Stopping monitoring service...")
	close(ms.stopChan)
	ms.isRunning = false
	log.Println("Monitoring service stopped")
}

// resourceMonitoringLoop - Main resource monitoring loop
func (ms *MonitoringService) resourceMonitoringLoop(ctx context.Context, interval time.Duration) {
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ms.stopChan:
			return
		case <-ticker.C:
			ms.checkResources()
		}
	}
}

// checkResources - Check resource usage and generate alerts if needed
func (ms *MonitoringService) checkResources() {
	// Check for alerts (trigger manual check)
	ms.ResourceMonitor.checkAlerts()
	alerts := ms.ResourceMonitor.GetActiveAlerts(10)
	for _, alert := range alerts {
		ms.sendAlert(Alert{
			Type:      "resource",
			Severity:  alert.Severity,
			Message:   alert.Message,
			Timestamp: alert.Timestamp,
			Details: map[string]interface{}{
				"resourceType": alert.Type,
				"currentValue": alert.Value,
				"threshold":    alert.Threshold,
			},
		})
	}
}

// alertProcessingLoop - Process alerts (placeholder for future enhancement)
func (ms *MonitoringService) alertProcessingLoop(ctx context.Context) {
	// This could be enhanced to batch alerts, deduplicate, etc.
	for {
		select {
		case <-ctx.Done():
			return
		case <-ms.stopChan:
			return
		case <-time.After(1 * time.Second):
			// Placeholder for alert processing logic
		}
	}
}

// sendAlert - Send alert to all handlers
func (ms *MonitoringService) sendAlert(alert Alert) {
	ms.mutex.RLock()
	handlers := make([]AlertHandler, len(ms.alertHandlers))
	copy(handlers, ms.alertHandlers)
	ms.mutex.RUnlock()

	for _, handler := range handlers {
		go func(h AlertHandler) {
			defer func() {
				if r := recover(); r != nil {
					log.Printf("Alert handler panicked: %v", r)
				}
			}()
			h(alert)
		}(handler)
	}
}

// StartOperationTracking - Convenience method to start tracking an operation
func (ms *MonitoringService) StartOperationTracking(operationID, operationType string, campaignID *uuid.UUID) {
	ms.PerformanceTracker.StartOperation(operationID, operationType, campaignID)
}

// EndOperationTracking - Convenience method to end tracking an operation
func (ms *MonitoringService) EndOperationTracking(operationID string, itemsProcessed int, success bool, errorMessage string) {
	ms.PerformanceTracker.EndOperation(operationID, itemsProcessed, success, errorMessage)

	// Check for performance alerts
	if !success {
		ms.sendAlert(Alert{
			Type:      "performance",
			Severity:  "medium",
			Message:   "Operation failed: " + errorMessage,
			Timestamp: time.Now(),
			Details: map[string]interface{}{
				"operationId": operationID,
				"error":       errorMessage,
			},
		})
	}
}

// GetSystemHealth - Get overall system health status
func (ms *MonitoringService) GetSystemHealth() SystemHealth {
	// Get resource status
	usage := ms.ResourceMonitor.GetSystemUsage()
	resourceStatus := "healthy"
	alerts := ms.ResourceMonitor.GetActiveAlerts(10)
	if len(alerts) > 0 {
		resourceStatus = "warning"
		for _, alert := range alerts {
			if alert.Severity == "critical" {
				resourceStatus = "critical"
				break
			}
		}
	}

	// Get performance status
	summaries := ms.PerformanceTracker.GetAllSummaries()
	performanceStatus := "healthy"
	for _, summary := range summaries {
		if summary.SuccessRate < 90 {
			performanceStatus = "warning"
		}
		if summary.SuccessRate < 80 {
			performanceStatus = "critical"
			break
		}
	}

	// Overall status
	overallStatus := "healthy"
	if resourceStatus == "critical" || performanceStatus == "critical" {
		overallStatus = "critical"
	} else if resourceStatus == "warning" || performanceStatus == "warning" {
		overallStatus = "warning"
	} else if resourceStatus == "error" {
		overallStatus = "error"
	}

	return SystemHealth{
		OverallStatus:     overallStatus,
		ResourceStatus:    resourceStatus,
		PerformanceStatus: performanceStatus,
		LastUpdated:       time.Now(),
		ActiveOperations:  len(ms.PerformanceTracker.GetActiveOperations()),
		ResourceUsage:     &usage,
	}
}

// SystemHealth - Overall system health status
type SystemHealth struct {
	OverallStatus     string         `json:"overallStatus"` // "healthy", "warning", "critical", "error"
	ResourceStatus    string         `json:"resourceStatus"`
	PerformanceStatus string         `json:"performanceStatus"`
	LastUpdated       time.Time      `json:"lastUpdated"`
	ActiveOperations  int            `json:"activeOperations"`
	ResourceUsage     *ResourceUsage `json:"resourceUsage,omitempty"`
}

// GetMonitoringStats - Get comprehensive monitoring statistics
func (ms *MonitoringService) GetMonitoringStats() MonitoringStats {
	// Resource stats
	resourceUsage := ms.ResourceMonitor.GetSystemUsage()
	resourceHistory := ms.ResourceMonitor.GetResourceHistory(24) // Last 24 hours

	// Performance stats
	recentMetrics := ms.PerformanceTracker.GetRecentMetrics(100)
	allSummaries := ms.PerformanceTracker.GetAllSummaries()
	activeOps := ms.PerformanceTracker.GetActiveOperations()

	return MonitoringStats{
		SystemHealth:         ms.GetSystemHealth(),
		CurrentResourceUsage: &resourceUsage,
		ResourceHistory:      resourceHistory,
		RecentMetrics:        recentMetrics,
		PerformanceSummaries: allSummaries,
		ActiveOperations:     activeOps,
		LastUpdated:          time.Now(),
	}
}

// MonitoringStats - Comprehensive monitoring statistics
type MonitoringStats struct {
	SystemHealth         SystemHealth                  `json:"systemHealth"`
	CurrentResourceUsage *ResourceUsage                `json:"currentResourceUsage"`
	ResourceHistory      []ResourceUsage               `json:"resourceHistory"`
	RecentMetrics        []PerformanceMetric           `json:"recentMetrics"`
	PerformanceSummaries map[string]PerformanceSummary `json:"performanceSummaries"`
	ActiveOperations     []ActiveOperation             `json:"activeOperations"`
	LastUpdated          time.Time                     `json:"lastUpdated"`
}

// SetCampaignResourceLimits - Set resource limits for a campaign
func (ms *MonitoringService) SetCampaignResourceLimits(campaignID uuid.UUID, limits CampaignResourceLimits) {
	// TODO: Need to add SetCampaignLimits method to ResourceMonitor
	// For now, just register the campaign
	ms.ResourceMonitor.RegisterCampaign(campaignID)
}

// GetCampaignResourceUsage - Get resource usage for a specific campaign
func (ms *MonitoringService) GetCampaignResourceUsage(campaignID uuid.UUID) (*ResourceUsage, bool) {
	return ms.ResourceMonitor.GetCampaignUsage(campaignID)
}

// DefaultLogAlertHandler - Default alert handler that logs alerts
func DefaultLogAlertHandler(alert Alert) {
	log.Printf("[ALERT] %s - %s: %s", alert.Severity, alert.Type, alert.Message)
}

// IsRunning - Check if monitoring service is running
func (ms *MonitoringService) IsRunning() bool {
	ms.mutex.RLock()
	defer ms.mutex.RUnlock()
	return ms.isRunning
}
