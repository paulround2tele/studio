// File: backend/internal/services/db_monitor.go
package services

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"time"

	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/fntelecomllc/studio/backend/internal/store"
	"github.com/jmoiron/sqlx"
)

// DatabaseMonitor monitors database connection pool performance and health
type DatabaseMonitor struct {
	db           *sqlx.DB
	campaignStore store.CampaignStore
	ticker       *time.Ticker
	stopChan     chan struct{}
	isRunning    bool
}

// NewDatabaseMonitor creates a new database monitor instance
func NewDatabaseMonitor(db *sqlx.DB, campaignStore store.CampaignStore) *DatabaseMonitor {
	return &DatabaseMonitor{
		db:           db,
		campaignStore: campaignStore,
		stopChan:     make(chan struct{}),
	}
}

// Start begins monitoring database performance
func (dm *DatabaseMonitor) Start(interval time.Duration) {
	if dm.isRunning {
		return
	}
	
	dm.isRunning = true
	dm.ticker = time.NewTicker(interval)
	
	go dm.monitorLoop()
	log.Printf("Database monitor started with interval: %v", interval)
}

// Stop stops the database monitoring
func (dm *DatabaseMonitor) Stop() {
	if !dm.isRunning {
		return
	}
	
	dm.isRunning = false
	close(dm.stopChan)
	if dm.ticker != nil {
		dm.ticker.Stop()
	}
	log.Println("Database monitor stopped")
}

// monitorLoop is the main monitoring loop
func (dm *DatabaseMonitor) monitorLoop() {
	for {
		select {
		case <-dm.ticker.C:
			dm.collectMetrics()
		case <-dm.stopChan:
			return
		}
	}
}

// collectMetrics collects and records database performance metrics
func (dm *DatabaseMonitor) collectMetrics() {
	ctx := context.Background()
	
	// Get database stats
	stats := dm.db.Stats()
	
	// Calculate utilization percentage
	utilizationPercent := float64(stats.OpenConnections) / float64(stats.MaxOpenConnections) * 100
	
	// Create connection pool metrics
	metrics := &models.ConnectionPoolMetrics{
		ActiveConnections:      stats.OpenConnections,
		IdleConnections:        stats.Idle,
		MaxConnections:         stats.MaxOpenConnections,
		WaitCount:              int(stats.WaitCount),
		WaitDurationMs:         int(stats.WaitDuration.Milliseconds()),
		PoolUtilizationPercent: utilizationPercent,
		RecordedAt:             time.Now(),
	}
	
	// Record metrics
	if err := dm.campaignStore.RecordConnectionPoolMetrics(ctx, dm.db, metrics); err != nil {
		log.Printf("Failed to record connection pool metrics: %v", err)
		return
	}
	
	// Check for performance issues and log warnings
	dm.checkPerformanceThresholds(stats, utilizationPercent)
}

// checkPerformanceThresholds checks if performance thresholds are exceeded
func (dm *DatabaseMonitor) checkPerformanceThresholds(stats sql.DBStats, utilizationPercent float64) {
	// High utilization warning
	if utilizationPercent > 80 {
		log.Printf("WARNING: High database connection pool utilization: %.2f%%", utilizationPercent)
	}
	
	// High wait count warning
	if stats.WaitCount > 100 {
		log.Printf("WARNING: High database connection wait count: %d", stats.WaitCount)
	}
	
	// Long wait duration warning
	if stats.WaitDuration > 5*time.Second {
		log.Printf("WARNING: Long database connection wait duration: %v", stats.WaitDuration)
	}
	
	// Connection leaks warning
	if stats.OpenConnections > stats.MaxOpenConnections-5 {
		log.Printf("WARNING: Possible connection leak - using %d/%d connections", 
			stats.OpenConnections, stats.MaxOpenConnections)
	}
}

// GetCurrentStats returns current database connection statistics
func (dm *DatabaseMonitor) GetCurrentStats() sql.DBStats {
	return dm.db.Stats()
}

// GetHealthStatus returns the health status of the database connection pool
func (dm *DatabaseMonitor) GetHealthStatus() map[string]interface{} {
	stats := dm.db.Stats()
	utilizationPercent := float64(stats.OpenConnections) / float64(stats.MaxOpenConnections) * 100
	
	status := "healthy"
	if utilizationPercent > 90 {
		status = "critical"
	} else if utilizationPercent > 80 || stats.WaitCount > 100 {
		status = "warning"
	}
	
	return map[string]interface{}{
		"status":               status,
		"open_connections":     stats.OpenConnections,
		"idle_connections":     stats.Idle,
		"max_connections":      stats.MaxOpenConnections,
		"utilization_percent":  utilizationPercent,
		"wait_count":          stats.WaitCount,
		"wait_duration_ms":    stats.WaitDuration.Milliseconds(),
		"max_idle_closed":     stats.MaxIdleClosed,
		"max_idle_time_closed": stats.MaxIdleTimeClosed,
		"max_lifetime_closed": stats.MaxLifetimeClosed,
	}
}

// OptimizeConnectionPool automatically optimizes connection pool settings based on usage patterns
func (dm *DatabaseMonitor) OptimizeConnectionPool() error {
	stats := dm.db.Stats()
	
	// Calculate optimal settings based on current usage
	utilizationPercent := float64(stats.OpenConnections) / float64(stats.MaxOpenConnections) * 100
	
	var recommendations []string
	
	// If utilization is consistently high, recommend increasing max connections
	if utilizationPercent > 85 {
		newMax := int(float64(stats.MaxOpenConnections) * 1.2)
		recommendations = append(recommendations, 
			fmt.Sprintf("Consider increasing max connections from %d to %d", 
				stats.MaxOpenConnections, newMax))
	}
	
	// If there are many wait events, recommend increasing idle connections
	if stats.WaitCount > 50 {
		newIdle := int(float64(stats.MaxOpenConnections) * 0.3)
		recommendations = append(recommendations, 
			fmt.Sprintf("Consider increasing idle connections to %d to reduce wait times", newIdle))
	}
	
	// If utilization is very low, recommend reducing connections to save resources
	if utilizationPercent < 20 && stats.MaxOpenConnections > 20 {
		newMax := int(float64(stats.MaxOpenConnections) * 0.8)
		recommendations = append(recommendations, 
			fmt.Sprintf("Consider reducing max connections from %d to %d to save resources", 
				stats.MaxOpenConnections, newMax))
	}
	
	if len(recommendations) > 0 {
		log.Println("Connection Pool Optimization Recommendations:")
		for _, rec := range recommendations {
			log.Printf("  - %s", rec)
		}
	} else {
		log.Println("Connection pool settings appear optimal")
	}
	
	return nil
}

// RunHealthCheck performs a comprehensive health check of the database
func (dm *DatabaseMonitor) RunHealthCheck(ctx context.Context) error {
	// Test basic connectivity
	if err := dm.db.PingContext(ctx); err != nil {
		return fmt.Errorf("database ping failed: %w", err)
	}
	
	// Test query performance with a simple query
	start := time.Now()
	var result int
	err := dm.db.GetContext(ctx, &result, "SELECT 1")
	queryDuration := time.Since(start)
	
	if err != nil {
		return fmt.Errorf("test query failed: %w", err)
	}
	
	if queryDuration > 1*time.Second {
		log.Printf("WARNING: Test query took %v (expected < 1s)", queryDuration)
	}
	
	// Test transaction handling
	tx, err := dm.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("transaction start failed: %w", err)
	}
	
	if err := tx.Rollback(); err != nil {
		return fmt.Errorf("transaction rollback failed: %w", err)
	}
	
	log.Printf("Database health check passed (query time: %v)", queryDuration)
	return nil
}