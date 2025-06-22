package monitoring

import (
	"context"
	"log"
	"sync"
	"time"

	"github.com/jmoiron/sqlx"
)

// ConnectionPoolMonitor provides real-time connection pool monitoring
type ConnectionPoolMonitor struct {
	db                *sqlx.DB
	metricsInterval   time.Duration
	stopCh            chan struct{}
	wg                sync.WaitGroup
	mutex             sync.RWMutex
	lastMetrics       *PoolMetrics
	leakDetector      *ConnectionLeakDetector
	alertThresholds   *AlertThresholds
}

// PoolMetrics represents connection pool metrics
type PoolMetrics struct {
	Timestamp           time.Time `json:"timestamp"`
	MaxOpenConnections  int       `json:"max_open_connections"`
	OpenConnections     int       `json:"open_connections"`
	InUseConnections    int       `json:"in_use_connections"`
	IdleConnections     int       `json:"idle_connections"`
	WaitCount           int64     `json:"wait_count"`
	WaitDuration        time.Duration `json:"wait_duration"`
	MaxIdleClosed       int64     `json:"max_idle_closed"`
	MaxIdleTimeClosed   int64     `json:"max_idle_time_closed"`
	MaxLifetimeClosed   int64     `json:"max_lifetime_closed"`
	UtilizationPercent  float64   `json:"utilization_percent"`
}

// AlertThresholds defines thresholds for connection pool alerts
type AlertThresholds struct {
	HighUtilization      float64 `json:"high_utilization"`       // 80%
	CriticalUtilization  float64 `json:"critical_utilization"`   // 95%
	LongWaitDuration     time.Duration `json:"long_wait_duration"` // 5s
	CriticalWaitDuration time.Duration `json:"critical_wait_duration"` // 30s
}


// NewConnectionPoolMonitor creates a new connection pool monitor
func NewConnectionPoolMonitor(db *sqlx.DB, metricsInterval time.Duration) *ConnectionPoolMonitor {
	return &ConnectionPoolMonitor{
		db:              db,
		metricsInterval: metricsInterval,
		stopCh:          make(chan struct{}),
		leakDetector:    NewConnectionLeakDetector(db),
		alertThresholds: &AlertThresholds{
			HighUtilization:      80.0,
			CriticalUtilization:  95.0,
			LongWaitDuration:     5 * time.Second,
			CriticalWaitDuration: 30 * time.Second,
		},
	}
}

// Start begins monitoring the connection pool
func (cpm *ConnectionPoolMonitor) Start(ctx context.Context) error {
	log.Println("Starting connection pool monitor")
	
	// Start leak detector
	if err := cpm.leakDetector.Start(ctx); err != nil {
		return err
	}
	
	// Start metrics collection
	cpm.wg.Add(1)
	go cpm.metricsCollectionLoop(ctx)
	
	return nil
}

// Stop stops the connection pool monitor
func (cpm *ConnectionPoolMonitor) Stop() {
	log.Println("Stopping connection pool monitor")
	close(cpm.stopCh)
	cpm.wg.Wait()
	
	if cpm.leakDetector != nil {
		cpm.leakDetector.Stop()
	}
}

// metricsCollectionLoop runs the metrics collection loop
func (cpm *ConnectionPoolMonitor) metricsCollectionLoop(ctx context.Context) {
	defer cpm.wg.Done()
	
	ticker := time.NewTicker(cpm.metricsInterval)
	defer ticker.Stop()
	
	for {
		select {
		case <-ctx.Done():
			return
		case <-cpm.stopCh:
			return
		case <-ticker.C:
			if err := cpm.collectMetrics(); err != nil {
				log.Printf("Failed to collect connection pool metrics: %v", err)
			}
		}
	}
}

// collectMetrics collects current connection pool metrics
func (cpm *ConnectionPoolMonitor) collectMetrics() error {
	stats := cpm.db.Stats()
	
	metrics := &PoolMetrics{
		Timestamp:           time.Now(),
		MaxOpenConnections:  stats.MaxOpenConnections,
		OpenConnections:     stats.OpenConnections,
		InUseConnections:    stats.InUse,
		IdleConnections:     stats.Idle,
		WaitCount:           stats.WaitCount,
		WaitDuration:        stats.WaitDuration,
		MaxIdleClosed:       stats.MaxIdleClosed,
		MaxIdleTimeClosed:   stats.MaxIdleTimeClosed,
		MaxLifetimeClosed:   stats.MaxLifetimeClosed,
		UtilizationPercent:  float64(stats.InUse) / float64(stats.MaxOpenConnections) * 100,
	}
	
	// Store metrics
	cpm.mutex.Lock()
	cpm.lastMetrics = metrics
	cpm.mutex.Unlock()
	
	// Check for alerts
	cpm.checkAlerts(metrics)
	
	// Store metrics in database
	return cpm.storeMetrics(metrics)
}

// checkAlerts checks for alert conditions
func (cpm *ConnectionPoolMonitor) checkAlerts(metrics *PoolMetrics) {
	if metrics.UtilizationPercent >= cpm.alertThresholds.CriticalUtilization {
		log.Printf("CRITICAL: Database connection pool utilization critical - %.2f%% (threshold: %.2f%%)",
			metrics.UtilizationPercent, cpm.alertThresholds.CriticalUtilization)
		
		// Store critical alert
		cpm.storeAlert("CRITICAL", "Connection pool utilization critical", metrics)
		
	} else if metrics.UtilizationPercent >= cpm.alertThresholds.HighUtilization {
		log.Printf("WARNING: Database connection pool utilization high - %.2f%% (threshold: %.2f%%)",
			metrics.UtilizationPercent, cpm.alertThresholds.HighUtilization)
		
		// Store warning alert
		cpm.storeAlert("WARNING", "Connection pool utilization high", metrics)
	}
	
	if metrics.WaitDuration >= cpm.alertThresholds.CriticalWaitDuration {
		log.Printf("CRITICAL: Database connection wait duration critical - %v (threshold: %v)",
			metrics.WaitDuration, cpm.alertThresholds.CriticalWaitDuration)
		
		cpm.storeAlert("CRITICAL", "Connection wait duration critical", metrics)
		
	} else if metrics.WaitDuration >= cpm.alertThresholds.LongWaitDuration {
		log.Printf("WARNING: Database connection wait duration high - %v (threshold: %v)",
			metrics.WaitDuration, cpm.alertThresholds.LongWaitDuration)
		
		cpm.storeAlert("WARNING", "Connection wait duration high", metrics)
	}
}

// storeMetrics stores metrics in the database
func (cpm *ConnectionPoolMonitor) storeMetrics(metrics *PoolMetrics) error {
	query := `
		INSERT INTO si004_connection_pool_metrics (
			timestamp, max_open_connections, open_connections, in_use_connections,
			idle_connections, wait_count, wait_duration_ms, max_idle_closed,
			max_idle_time_closed, max_lifetime_closed, utilization_percent
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
	`
	
	_, err := cpm.db.Exec(query,
		metrics.Timestamp,
		metrics.MaxOpenConnections,
		metrics.OpenConnections,
		metrics.InUseConnections,
		metrics.IdleConnections,
		metrics.WaitCount,
		int64(metrics.WaitDuration/time.Millisecond),
		metrics.MaxIdleClosed,
		metrics.MaxIdleTimeClosed,
		metrics.MaxLifetimeClosed,
		metrics.UtilizationPercent,
	)
	
	return err
}

// storeAlert stores an alert in the database
func (cpm *ConnectionPoolMonitor) storeAlert(level, message string, metrics *PoolMetrics) error {
	query := `
		INSERT INTO si004_connection_pool_alerts (
			timestamp, alert_level, alert_message, utilization_percent,
			wait_duration_ms, open_connections, in_use_connections
		) VALUES ($1, $2, $3, $4, $5, $6, $7)
	`
	
	_, err := cpm.db.Exec(query,
		metrics.Timestamp,
		level,
		message,
		metrics.UtilizationPercent,
		int64(metrics.WaitDuration/time.Millisecond),
		metrics.OpenConnections,
		metrics.InUseConnections,
	)
	
	return err
}

// GetLastMetrics returns the last collected metrics
func (cpm *ConnectionPoolMonitor) GetLastMetrics() *PoolMetrics {
	cpm.mutex.RLock()
	defer cpm.mutex.RUnlock()
	
	if cpm.lastMetrics == nil {
		return nil
	}
	
	// Return a copy
	metrics := *cpm.lastMetrics
	return &metrics
}

// GetMetricsHistory returns metrics history from the database
func (cpm *ConnectionPoolMonitor) GetMetricsHistory(since time.Time) ([]*PoolMetrics, error) {
	query := `
		SELECT timestamp, max_open_connections, open_connections, in_use_connections,
			   idle_connections, wait_count, wait_duration_ms, max_idle_closed,
			   max_idle_time_closed, max_lifetime_closed, utilization_percent
		FROM si004_connection_pool_metrics
		WHERE timestamp >= $1
		ORDER BY timestamp DESC
		LIMIT 1000
	`
	
	rows, err := cpm.db.Query(query, since)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	
	var metrics []*PoolMetrics
	for rows.Next() {
		var m PoolMetrics
		var waitDurationMs int64
		
		err = rows.Scan(
			&m.Timestamp,
			&m.MaxOpenConnections,
			&m.OpenConnections,
			&m.InUseConnections,
			&m.IdleConnections,
			&m.WaitCount,
			&waitDurationMs,
			&m.MaxIdleClosed,
			&m.MaxIdleTimeClosed,
			&m.MaxLifetimeClosed,
			&m.UtilizationPercent,
		)
		if err != nil {
			return nil, err
		}
		
		m.WaitDuration = time.Duration(waitDurationMs) * time.Millisecond
		metrics = append(metrics, &m)
	}
	
	return metrics, rows.Err()
}