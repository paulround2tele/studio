// File: backend/internal/monitoring/resource_monitor.go
package monitoring

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/shirou/gopsutil/v3/cpu"
	"github.com/shirou/gopsutil/v3/disk"
	"github.com/shirou/gopsutil/v3/mem"
)

// ===============================================================================
// WEEK 2 DAY 2: RESOURCE MONITORING SERVICE
// Actually useful resource tracking, not enterprise theater
// ===============================================================================

// ResourceUsage - Current resource usage for a campaign or system
type ResourceUsage struct {
	CampaignID    *uuid.UUID `json:"campaignId,omitempty"`
	CPUPercent    float64    `json:"cpuPercent"`
	MemoryUsedMB  uint64     `json:"memoryUsedMB"`
	MemoryPercent float64    `json:"memoryPercent"`
	DiskUsedGB    uint64     `json:"diskUsedGB"`
	DiskPercent   float64    `json:"diskPercent"`
	Timestamp     time.Time  `json:"timestamp"`
}

// ResourceAlert - Alert when resources get too high
type ResourceAlert struct {
	Type       string     `json:"type"`     // "cpu", "memory", "disk"
	Severity   string     `json:"severity"` // "warning", "critical"
	Value      float64    `json:"value"`
	Threshold  float64    `json:"threshold"`
	CampaignID *uuid.UUID `json:"campaignId,omitempty"`
	Timestamp  time.Time  `json:"timestamp"`
	Message    string     `json:"message"`
}

// CampaignResourceLimits - Limits to prevent runaway campaigns
type CampaignResourceLimits struct {
	MaxCPUPercent   float64 `json:"maxCpuPercent"`   // Kill if CPU > this
	MaxMemoryMB     uint64  `json:"maxMemoryMB"`     // Kill if memory > this
	MaxDiskGB       uint64  `json:"maxDiskGB"`       // Kill if disk > this
	MaxDurationMins int     `json:"maxDurationMins"` // Kill if running too long
}

// ResourceMonitor - Tracks resource usage and enforces limits
type ResourceMonitor struct {
	campaignUsage   map[uuid.UUID]*ResourceUsage
	systemUsage     *ResourceUsage
	alerts          []ResourceAlert
	limits          CampaignResourceLimits
	alertThresholds AlertThresholds
	mutex           sync.RWMutex
	stopChan        chan bool
}

// AlertThresholds - When to trigger alerts
type AlertThresholds struct {
	CPUWarning     float64 `json:"cpuWarning"`     // 70%
	CPUCritical    float64 `json:"cpuCritical"`    // 90%
	MemoryWarning  float64 `json:"memoryWarning"`  // 80%
	MemoryCritical float64 `json:"memoryCritical"` // 95%
	DiskWarning    float64 `json:"diskWarning"`    // 85%
	DiskCritical   float64 `json:"diskCritical"`   // 95%
}

// NewResourceMonitor - Create resource monitor with sensible defaults
func NewResourceMonitor() *ResourceMonitor {
	return &ResourceMonitor{
		campaignUsage: make(map[uuid.UUID]*ResourceUsage),
		systemUsage:   &ResourceUsage{},
		alerts:        make([]ResourceAlert, 0),
		limits: CampaignResourceLimits{
			MaxCPUPercent:   80.0, // Kill campaign if using > 80% CPU
			MaxMemoryMB:     2048, // Kill campaign if using > 2GB RAM
			MaxDiskGB:       10,   // Kill campaign if using > 10GB disk
			MaxDurationMins: 120,  // Kill campaign if running > 2 hours
		},
		alertThresholds: AlertThresholds{
			CPUWarning:     70.0,
			CPUCritical:    90.0,
			MemoryWarning:  80.0,
			MemoryCritical: 95.0,
			DiskWarning:    85.0,
			DiskCritical:   95.0,
		},
		stopChan: make(chan bool),
	}
}

// StartMonitoring - Begin monitoring system resources
func (rm *ResourceMonitor) StartMonitoring(ctx context.Context) {
	ticker := time.NewTicker(10 * time.Second) // Monitor every 10 seconds
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-rm.stopChan:
			return
		case <-ticker.C:
			rm.updateSystemUsage()
			rm.checkAlerts()
		}
	}
}

// updateSystemUsage - Get current system resource usage
func (rm *ResourceMonitor) updateSystemUsage() {
	rm.mutex.Lock()
	defer rm.mutex.Unlock()

	// Get CPU usage
	cpuPercent, err := cpu.Percent(0, false)
	if err == nil && len(cpuPercent) > 0 {
		rm.systemUsage.CPUPercent = cpuPercent[0]
	}

	// Get memory usage
	memInfo, err := mem.VirtualMemory()
	if err == nil {
		rm.systemUsage.MemoryUsedMB = memInfo.Used / 1024 / 1024
		rm.systemUsage.MemoryPercent = memInfo.UsedPercent
	}

	// Get disk usage (root partition)
	diskInfo, err := disk.Usage("/")
	if err == nil {
		rm.systemUsage.DiskUsedGB = diskInfo.Used / 1024 / 1024 / 1024
		rm.systemUsage.DiskPercent = diskInfo.UsedPercent
	}

	rm.systemUsage.Timestamp = time.Now()
}

// checkAlerts - Check if any thresholds are exceeded
func (rm *ResourceMonitor) checkAlerts() {
	rm.mutex.Lock()
	defer rm.mutex.Unlock()

	now := time.Now()

	// Check CPU alerts
	if rm.systemUsage.CPUPercent >= rm.alertThresholds.CPUCritical {
		alert := ResourceAlert{
			Type:      "cpu",
			Severity:  "critical",
			Value:     rm.systemUsage.CPUPercent,
			Threshold: rm.alertThresholds.CPUCritical,
			Timestamp: now,
			Message:   fmt.Sprintf("Critical CPU usage: %.1f%%", rm.systemUsage.CPUPercent),
		}
		rm.addAlert(alert)
	} else if rm.systemUsage.CPUPercent >= rm.alertThresholds.CPUWarning {
		alert := ResourceAlert{
			Type:      "cpu",
			Severity:  "warning",
			Value:     rm.systemUsage.CPUPercent,
			Threshold: rm.alertThresholds.CPUWarning,
			Timestamp: now,
			Message:   fmt.Sprintf("High CPU usage: %.1f%%", rm.systemUsage.CPUPercent),
		}
		rm.addAlert(alert)
	}

	// Check memory alerts
	if rm.systemUsage.MemoryPercent >= rm.alertThresholds.MemoryCritical {
		alert := ResourceAlert{
			Type:      "memory",
			Severity:  "critical",
			Value:     rm.systemUsage.MemoryPercent,
			Threshold: rm.alertThresholds.MemoryCritical,
			Timestamp: now,
			Message:   fmt.Sprintf("Critical memory usage: %.1f%%", rm.systemUsage.MemoryPercent),
		}
		rm.addAlert(alert)
	} else if rm.systemUsage.MemoryPercent >= rm.alertThresholds.MemoryWarning {
		alert := ResourceAlert{
			Type:      "memory",
			Severity:  "warning",
			Value:     rm.systemUsage.MemoryPercent,
			Threshold: rm.alertThresholds.MemoryWarning,
			Timestamp: now,
			Message:   fmt.Sprintf("High memory usage: %.1f%%", rm.systemUsage.MemoryPercent),
		}
		rm.addAlert(alert)
	}

	// Check disk alerts
	if rm.systemUsage.DiskPercent >= rm.alertThresholds.DiskCritical {
		alert := ResourceAlert{
			Type:      "disk",
			Severity:  "critical",
			Value:     rm.systemUsage.DiskPercent,
			Threshold: rm.alertThresholds.DiskCritical,
			Timestamp: now,
			Message:   fmt.Sprintf("Critical disk usage: %.1f%%", rm.systemUsage.DiskPercent),
		}
		rm.addAlert(alert)
	} else if rm.systemUsage.DiskPercent >= rm.alertThresholds.DiskWarning {
		alert := ResourceAlert{
			Type:      "disk",
			Severity:  "warning",
			Value:     rm.systemUsage.DiskPercent,
			Threshold: rm.alertThresholds.DiskWarning,
			Timestamp: now,
			Message:   fmt.Sprintf("High disk usage: %.1f%%", rm.systemUsage.DiskPercent),
		}
		rm.addAlert(alert)
	}
}

// addAlert - Add alert to the list (keep last 100)
func (rm *ResourceMonitor) addAlert(alert ResourceAlert) {
	rm.alerts = append(rm.alerts, alert)

	// Keep only last 100 alerts
	if len(rm.alerts) > 100 {
		rm.alerts = rm.alerts[len(rm.alerts)-100:]
	}
}

// GetSystemUsage - Get current system resource usage
func (rm *ResourceMonitor) GetSystemUsage() ResourceUsage {
	rm.mutex.RLock()
	defer rm.mutex.RUnlock()
	return *rm.systemUsage
}

// GetCampaignUsage - Get resource usage for specific campaign
func (rm *ResourceMonitor) GetCampaignUsage(campaignID uuid.UUID) (*ResourceUsage, bool) {
	rm.mutex.RLock()
	defer rm.mutex.RUnlock()
	usage, exists := rm.campaignUsage[campaignID]
	if exists {
		return usage, true
	}
	return nil, false
}

// GetActiveAlerts - Get recent alerts
func (rm *ResourceMonitor) GetActiveAlerts(limit int) []ResourceAlert {
	rm.mutex.RLock()
	defer rm.mutex.RUnlock()

	if limit <= 0 || limit > len(rm.alerts) {
		limit = len(rm.alerts)
	}

	// Return most recent alerts
	start := len(rm.alerts) - limit
	if start < 0 {
		start = 0
	}

	alerts := make([]ResourceAlert, limit)
	copy(alerts, rm.alerts[start:])
	return alerts
}

// RegisterCampaign - Start tracking resources for a campaign
func (rm *ResourceMonitor) RegisterCampaign(campaignID uuid.UUID) {
	rm.mutex.Lock()
	defer rm.mutex.Unlock()

	rm.campaignUsage[campaignID] = &ResourceUsage{
		CampaignID: &campaignID,
		Timestamp:  time.Now(),
	}
}

// UnregisterCampaign - Stop tracking resources for a campaign
func (rm *ResourceMonitor) UnregisterCampaign(campaignID uuid.UUID) {
	rm.mutex.Lock()
	defer rm.mutex.Unlock()

	delete(rm.campaignUsage, campaignID)
}

// CheckCampaignLimits - Check if campaign exceeds resource limits
func (rm *ResourceMonitor) CheckCampaignLimits(campaignID uuid.UUID) (bool, string) {
	rm.mutex.RLock()
	defer rm.mutex.RUnlock()

	usage, exists := rm.campaignUsage[campaignID]
	if !exists {
		return false, "Campaign not registered"
	}

	// Check CPU limit
	if usage.CPUPercent > rm.limits.MaxCPUPercent {
		return true, fmt.Sprintf("CPU usage (%.1f%%) exceeds limit (%.1f%%)",
			usage.CPUPercent, rm.limits.MaxCPUPercent)
	}

	// Check memory limit
	if usage.MemoryUsedMB > rm.limits.MaxMemoryMB {
		return true, fmt.Sprintf("Memory usage (%dMB) exceeds limit (%dMB)",
			usage.MemoryUsedMB, rm.limits.MaxMemoryMB)
	}

	// Check disk limit
	if usage.DiskUsedGB > rm.limits.MaxDiskGB {
		return true, fmt.Sprintf("Disk usage (%dGB) exceeds limit (%dGB)",
			usage.DiskUsedGB, rm.limits.MaxDiskGB)
	}

	return false, ""
}

// GetResourceHistory - Get resource usage history (simplified)
func (rm *ResourceMonitor) GetResourceHistory(hours int) []ResourceUsage {
	// For now, just return current usage
	// TODO: Implement proper history storage if needed
	rm.mutex.RLock()
	defer rm.mutex.RUnlock()

	return []ResourceUsage{*rm.systemUsage}
}

// Stop - Stop monitoring
func (rm *ResourceMonitor) Stop() {
	close(rm.stopChan)
}

// UpdateCampaignUsage - Update resource usage for a specific campaign
// This would be called from campaign execution code
func (rm *ResourceMonitor) UpdateCampaignUsage(campaignID uuid.UUID, cpuPercent float64, memoryMB uint64, diskGB uint64) {
	rm.mutex.Lock()
	defer rm.mutex.Unlock()

	usage, exists := rm.campaignUsage[campaignID]
	if !exists {
		return
	}

	usage.CPUPercent = cpuPercent
	usage.MemoryUsedMB = memoryMB
	usage.DiskUsedGB = diskGB
	usage.Timestamp = time.Now()

	// Calculate percentages based on system total
	memInfo, _ := mem.VirtualMemory()
	if memInfo != nil {
		usage.MemoryPercent = float64(memoryMB*1024*1024) / float64(memInfo.Total) * 100
	}

	diskInfo, _ := disk.Usage("/")
	if diskInfo != nil {
		usage.DiskPercent = float64(diskGB*1024*1024*1024) / float64(diskInfo.Total) * 100
	}
}
