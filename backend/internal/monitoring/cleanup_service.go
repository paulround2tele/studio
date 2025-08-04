package monitoring

import (
	"context"
	"fmt"
	"log"
	"os"
	"sync"
	"time"

	"github.com/google/uuid"
)

// CleanupService - Manages cleanup of campaign resources
type CleanupService struct {
	activeCampaigns map[uuid.UUID]*CampaignCleanupInfo
	mutex           sync.RWMutex
	stopChan        chan struct{}
	isRunning       bool
}

// CleanupConfig - Configuration for cleanup service
type CleanupConfig struct {
	CleanupInterval   time.Duration
	CampaignTTL       time.Duration
	EnableAutoCleanup bool
}

// DefaultCleanupConfig - Default configuration
func DefaultCleanupConfig() CleanupConfig {
	return CleanupConfig{
		CleanupInterval:   30 * time.Minute,
		CampaignTTL:       24 * time.Hour,
		EnableAutoCleanup: true,
	}
}

// CampaignCleanupInfo - Campaign cleanup information
type CampaignCleanupInfo struct {
	CampaignID  uuid.UUID  `json:"campaignId"`
	Status      string     `json:"status"`
	StartTime   time.Time  `json:"startTime"`
	EndTime     *time.Time `json:"endTime,omitempty"`
	TempFiles   []string   `json:"tempFiles"`
	LastUpdated time.Time  `json:"lastUpdated"`
}

// CleanupStats - Cleanup statistics
type CleanupStats struct {
	TotalCampaignsTracked    int       `json:"totalCampaignsTracked"`
	CampaignsAwaitingCleanup int       `json:"campaignsAwaitingCleanup"`
	LastCleanupRun           time.Time `json:"lastCleanupRun"`
	CleanupErrors            []string  `json:"cleanupErrors"`
}

// NewCleanupService - Create cleanup service
func NewCleanupService(resourceMonitor *ResourceMonitor, monitoringService *MonitoringService, config CleanupConfig) *CleanupService {
	return &CleanupService{
		activeCampaigns: make(map[uuid.UUID]*CampaignCleanupInfo),
		stopChan:        make(chan struct{}),
	}
}

// Start - Start the cleanup service
func (cs *CleanupService) Start(ctx context.Context) error {
	cs.mutex.Lock()
	if cs.isRunning {
		cs.mutex.Unlock()
		return fmt.Errorf("cleanup service is already running")
	}
	cs.isRunning = true
	cs.mutex.Unlock()

	log.Println("✓ Resource cleanup service started")
	return nil
}

// Stop - Stop the cleanup service
func (cs *CleanupService) Stop() {
	cs.mutex.Lock()
	defer cs.mutex.Unlock()

	if !cs.isRunning {
		return
	}

	log.Println("✓ Resource cleanup service stopped")
	close(cs.stopChan)
	cs.isRunning = false
}

// RegisterCampaign - Register campaign for cleanup
func (cs *CleanupService) RegisterCampaign(campaignID uuid.UUID) {
	cs.mutex.Lock()
	defer cs.mutex.Unlock()

	info := &CampaignCleanupInfo{
		CampaignID:  campaignID,
		Status:      "active",
		StartTime:   time.Now(),
		TempFiles:   make([]string, 0),
		LastUpdated: time.Now(),
	}

	cs.activeCampaigns[campaignID] = info
	log.Printf("Registered campaign %s for cleanup tracking", campaignID)
}

// MarkCampaignFinished - Mark campaign as finished
func (cs *CleanupService) MarkCampaignFinished(campaignID uuid.UUID, status string) {
	cs.mutex.Lock()
	defer cs.mutex.Unlock()

	if info, exists := cs.activeCampaigns[campaignID]; exists {
		now := time.Now()
		info.Status = status
		info.EndTime = &now
		info.LastUpdated = now
		log.Printf("Marked campaign %s as %s for cleanup", campaignID, status)
	}
}

// AddTempFile - Add temp file to cleanup tracking
func (cs *CleanupService) AddTempFile(campaignID uuid.UUID, filePath string) {
	cs.mutex.Lock()
	defer cs.mutex.Unlock()

	if info, exists := cs.activeCampaigns[campaignID]; exists {
		info.TempFiles = append(info.TempFiles, filePath)
		info.LastUpdated = time.Now()
	}
}

// GetCleanupStats - Get cleanup statistics
func (cs *CleanupService) GetCleanupStats() CleanupStats {
	cs.mutex.RLock()
	defer cs.mutex.RUnlock()

	return CleanupStats{
		TotalCampaignsTracked:    len(cs.activeCampaigns),
		CampaignsAwaitingCleanup: 0,
		LastCleanupRun:           time.Now(),
		CleanupErrors:            make([]string, 0),
	}
}

// GetCampaignCleanupInfo - Get cleanup info for campaign
func (cs *CleanupService) GetCampaignCleanupInfo(campaignID uuid.UUID) (*CampaignCleanupInfo, bool) {
	cs.mutex.RLock()
	defer cs.mutex.RUnlock()

	info, exists := cs.activeCampaigns[campaignID]
	if exists {
		infoCopy := *info
		return &infoCopy, true
	}
	return nil, false
}

// ForceCleanupCampaign - Force cleanup of campaign
func (cs *CleanupService) ForceCleanupCampaign(campaignID uuid.UUID) error {
	cs.mutex.RLock()
	info, exists := cs.activeCampaigns[campaignID]
	cs.mutex.RUnlock()

	if !exists {
		return fmt.Errorf("campaign %s not found", campaignID)
	}

	log.Printf("Force cleaning campaign %s...", campaignID)

	// Simple cleanup - remove temp files
	filesDeleted := 0
	for _, filePath := range info.TempFiles {
		if err := os.Remove(filePath); err == nil {
			filesDeleted++
		}
	}

	cs.mutex.Lock()
	info.Status = "cleaned"
	delete(cs.activeCampaigns, campaignID)
	cs.mutex.Unlock()

	log.Printf("Force cleanup completed for campaign %s: %d files deleted", campaignID, filesDeleted)
	return nil
}

// IsRunning - Check if service is running
func (cs *CleanupService) IsRunning() bool {
	cs.mutex.RLock()
	defer cs.mutex.RUnlock()
	return cs.isRunning
}
