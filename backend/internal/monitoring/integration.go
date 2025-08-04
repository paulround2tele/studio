// File: backend/internal/monitoring/integration.go
package monitoring

import (
	"context"
	"log"

	"github.com/google/uuid"
)

// ===============================================================================
// WEEK 2 DAY 2: MONITORING INTEGRATION UTILITIES
// Helper functions to integrate monitoring with existing orchestrator
// ===============================================================================

// MonitoringIntegration - Integration helpers for orchestrator
type MonitoringIntegration struct {
	Service *MonitoringService
}

// NewMonitoringIntegration - Create monitoring integration
func NewMonitoringIntegration(service *MonitoringService) *MonitoringIntegration {
	return &MonitoringIntegration{
		Service: service,
	}
}

// InitializeMonitoring - Initialize monitoring service for orchestrator
func (mi *MonitoringIntegration) InitializeMonitoring(ctx context.Context) error {
	// Start monitoring service with default config
	config := DefaultMonitoringConfig()

	// Add default log alert handler
	mi.Service.AddAlertHandler(DefaultLogAlertHandler)

	// Start the service
	return mi.Service.Start(ctx, config)
}

// TrackDomainGeneration - Track domain generation operation
func (mi *MonitoringIntegration) TrackDomainGeneration(campaignID uuid.UUID, operationID string) {
	mi.Service.StartOperationTracking(operationID, "domain_generation", &campaignID)
}

// FinishDomainGeneration - Complete domain generation tracking
func (mi *MonitoringIntegration) FinishDomainGeneration(operationID string, domainsGenerated int, success bool, errorMsg string) {
	mi.Service.EndOperationTracking(operationID, domainsGenerated, success, errorMsg)
}

// TrackDNSValidation - Track DNS validation operation
func (mi *MonitoringIntegration) TrackDNSValidation(campaignID uuid.UUID, operationID string) {
	mi.Service.StartOperationTracking(operationID, "dns_validation", &campaignID)
}

// FinishDNSValidation - Complete DNS validation tracking
func (mi *MonitoringIntegration) FinishDNSValidation(operationID string, domainsValidated int, success bool, errorMsg string) {
	mi.Service.EndOperationTracking(operationID, domainsValidated, success, errorMsg)
}

// TrackCampaignExecution - Track campaign execution operation
func (mi *MonitoringIntegration) TrackCampaignExecution(campaignID uuid.UUID, operationID string) {
	mi.Service.StartOperationTracking(operationID, "campaign_execution", &campaignID)

	// Register campaign for resource monitoring
	mi.Service.ResourceMonitor.RegisterCampaign(campaignID)

	// Set default resource limits
	defaultLimits := CampaignResourceLimits{
		MaxCPUPercent:   80.0, // 80% CPU max
		MaxMemoryMB:     2048, // 2GB RAM max
		MaxDiskGB:       10,   // 10GB disk max
		MaxDurationMins: 60,   // 1 hour max
	}
	mi.Service.SetCampaignResourceLimits(campaignID, defaultLimits)
}

// FinishCampaignExecution - Complete campaign execution tracking
func (mi *MonitoringIntegration) FinishCampaignExecution(operationID string, campaignID uuid.UUID, itemsProcessed int, success bool, errorMsg string) {
	mi.Service.EndOperationTracking(operationID, itemsProcessed, success, errorMsg)

	// Unregister campaign to free resources
	mi.Service.ResourceMonitor.UnregisterCampaign(campaignID)
}

// TrackBulkOperation - Track bulk operation (general purpose)
func (mi *MonitoringIntegration) TrackBulkOperation(operationType string, campaignID *uuid.UUID, operationID string) {
	mi.Service.StartOperationTracking(operationID, operationType, campaignID)
}

// FinishBulkOperation - Complete bulk operation tracking
func (mi *MonitoringIntegration) FinishBulkOperation(operationID string, itemsProcessed int, success bool, errorMsg string) {
	mi.Service.EndOperationTracking(operationID, itemsProcessed, success, errorMsg)
}

// CheckCampaignHealth - Check if campaign is within resource limits
func (mi *MonitoringIntegration) CheckCampaignHealth(campaignID uuid.UUID) (bool, string) {
	return mi.Service.ResourceMonitor.CheckCampaignLimits(campaignID)
}

// GetSystemHealthStatus - Get simple health status for dashboard
func (mi *MonitoringIntegration) GetSystemHealthStatus() string {
	health := mi.Service.GetSystemHealth()
	return health.OverallStatus
}

// LogSystemHealth - Log current system health (for debugging)
func (mi *MonitoringIntegration) LogSystemHealth() {
	health := mi.Service.GetSystemHealth()
	log.Printf("System Health: %s | Resource: %s | Performance: %s | Active Ops: %d",
		health.OverallStatus, health.ResourceStatus, health.PerformanceStatus, health.ActiveOperations)

	if health.ResourceUsage != nil {
		log.Printf("Resources: CPU=%.1f%% | Memory=%.1f%% | Disk=%.1f%%",
			health.ResourceUsage.CPUPercent, health.ResourceUsage.MemoryPercent, health.ResourceUsage.DiskPercent)
	}
}

// Shutdown - Gracefully shutdown monitoring
func (mi *MonitoringIntegration) Shutdown() {
	mi.Service.Stop()
	log.Println("Monitoring service shutdown complete")
}
