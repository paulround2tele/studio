// Package domainexpert provides domain generation expertise and optimization
package domainexpert

import (
	"time"
)

// MemoryEfficiencyConfig defines memory efficiency configuration for domain generation
type MemoryEfficiencyConfig struct {
	PoolSize             int           `json:"poolSize"`
	BatchSize            int           `json:"batchSize"`
	MaxMemoryUsage       int64         `json:"maxMemoryUsage"`
	GCInterval           time.Duration `json:"gcInterval"`
	PreallocationEnabled bool          `json:"preallocationEnabled"`
	CompressionEnabled   bool          `json:"compressionEnabled"`
	MemoryLimitMB        int           `json:"memoryLimitMB"`
	OptimizationLevel    string        `json:"optimizationLevel"`
	EnableMemoryLogging  bool          `json:"enableMemoryLogging"`
	MaxMemoryUsageMB     int           `json:"maxMemoryUsageMB"`
}

// DefaultMemoryEfficiencyConfig provides default memory efficiency settings
var DefaultMemoryEfficiencyConfig = &MemoryEfficiencyConfig{
	PoolSize:             1000,
	BatchSize:            100,
	MaxMemoryUsage:       1024 * 1024 * 1024, // 1GB
	GCInterval:           30 * time.Second,
	PreallocationEnabled: true,
	CompressionEnabled:   false,
	MemoryLimitMB:        256,
	OptimizationLevel:    "standard",
	EnableMemoryLogging:  false,
	MaxMemoryUsageMB:     256,
}
