package config

import (
	"time"

	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"
)

// DatabasePoolConfig provides optimized connection pool configuration
type DatabasePoolConfig struct {
	MaxOpenConnections     int           `json:"max_open_connections"`
	MaxIdleConnections     int           `json:"max_idle_connections"`
	ConnectionMaxLifetime  time.Duration `json:"connection_max_lifetime"`
	ConnectionMaxIdleTime  time.Duration `json:"connection_max_idle_time"`
	ConnectionTimeout      time.Duration `json:"connection_timeout"`
	EnableMetrics         bool          `json:"enable_metrics"`
	MetricsInterval       time.Duration `json:"metrics_interval"`
	LeakDetectionEnabled  bool          `json:"leak_detection_enabled"`
	LeakDetectionTimeout  time.Duration `json:"leak_detection_timeout"`
}

// OptimizedDatabasePoolConfig returns production-optimized pool settings
func OptimizedDatabasePoolConfig() *DatabasePoolConfig {
	return &DatabasePoolConfig{
		MaxOpenConnections:    50,  // Increased from default
		MaxIdleConnections:    10,  // Reasonable idle pool
		ConnectionMaxLifetime: 30 * time.Minute, // Prevent stale connections
		ConnectionMaxIdleTime: 5 * time.Minute,  // Close idle connections
		ConnectionTimeout:     30 * time.Second, // Connection acquisition timeout
		EnableMetrics:         true,
		MetricsInterval:       30 * time.Second,
		LeakDetectionEnabled:  true,
		LeakDetectionTimeout:  10 * time.Minute,
	}
}

// ConfigureDatabase applies optimized configuration to database connection
func (dpc *DatabasePoolConfig) ConfigureDatabase(db *sqlx.DB) {
	db.SetMaxOpenConns(dpc.MaxOpenConnections)
	db.SetMaxIdleConns(dpc.MaxIdleConnections)
	db.SetConnMaxLifetime(dpc.ConnectionMaxLifetime)
	db.SetConnMaxIdleTime(dpc.ConnectionMaxIdleTime)
}

// LoadTestDatabasePoolConfig provides configuration for load testing
func LoadTestDatabasePoolConfig() *DatabasePoolConfig {
	return &DatabasePoolConfig{
		MaxOpenConnections:    100, // Higher for load testing
		MaxIdleConnections:    20,
		ConnectionMaxLifetime: 15 * time.Minute,
		ConnectionMaxIdleTime: 2 * time.Minute,
		ConnectionTimeout:     10 * time.Second,
		EnableMetrics:         true,
		MetricsInterval:       10 * time.Second,
		LeakDetectionEnabled:  true,
		LeakDetectionTimeout:  5 * time.Minute,
	}
}