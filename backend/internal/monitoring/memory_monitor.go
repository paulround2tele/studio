package monitoring

import (
	"context"
	"fmt"
	"runtime"
	"runtime/debug"
	"sync"
	"time"

	"github.com/jmoiron/sqlx"
)

// MemoryMetrics represents current memory usage metrics
type MemoryMetrics struct {
	Timestamp     time.Time `json:"timestamp"`
	HeapAlloc     uint64    `json:"heapAlloc"`     // bytes allocated and not yet freed
	HeapSys       uint64    `json:"heapSys"`       // bytes obtained from OS
	HeapIdle      uint64    `json:"heapIdle"`      // bytes in unused spans
	HeapInuse     uint64    `json:"heapInuse"`     // bytes in in-use spans
	HeapReleased  uint64    `json:"heapReleased"`  // bytes released to OS
	HeapObjects   uint64    `json:"heapObjects"`   // number of allocated objects
	StackInuse    uint64    `json:"stackInuse"`    // bytes used by stack spans
	StackSys      uint64    `json:"stackSys"`      // bytes obtained from OS for stack
	MSpanInuse    uint64    `json:"mSpanInuse"`    // bytes used by mspan structures
	MSpanSys      uint64    `json:"mSpanSys"`      // bytes obtained from OS for mspan
	MCacheInuse   uint64    `json:"mCacheInuse"`   // bytes used by mcache structures
	MCacheSys     uint64    `json:"mCacheSys"`     // bytes obtained from OS for mcache
	GCSys         uint64    `json:"gcSys"`         // bytes used for garbage collection metadata
	OtherSys      uint64    `json:"otherSys"`      // bytes used for other system allocations
	NextGC        uint64    `json:"nextGC"`        // next collection target heap size
	LastGC        uint64    `json:"lastGC"`        // end time of last collection (nanoseconds since 1970)
	NumGC         uint32    `json:"numGC"`         // number of garbage collections
	NumForcedGC   uint32    `json:"numForcedGC"`   // number of GC cycles forced by app
	GCCPUFraction float64   `json:"gcCPUFraction"` // fraction of CPU time used by GC
	NumGoroutine  int       `json:"numGoroutine"`  // number of goroutines
	CGOCallsCount int64     `json:"cgoCallsCount"` // number of cgo calls
	AllocRate     float64   `json:"allocRate"`     // allocation rate (bytes/second)
	GCRate        float64   `json:"gcRate"`        // GC rate (collections/second)
}

// MemoryLeak represents a detected memory leak
type MemoryLeak struct {
	ID           string                 `json:"id"`
	DetectedAt   time.Time              `json:"detectedAt"`
	LeakType     string                 `json:"leakType"`
	Severity     string                 `json:"severity"`
	Description  string                 `json:"description"`
	StackTrace   string                 `json:"stackTrace"`
	MemoryGrowth uint64                 `json:"memoryGrowth"`
	Duration     time.Duration          `json:"duration"`
	Metadata     map[string]interface{} `json:"metadata"`
	Resolved     bool                   `json:"resolved"`
	ResolvedAt   *time.Time             `json:"resolvedAt,omitempty"`
}

// MemoryMonitorConfig holds configuration for the memory monitor
type MemoryMonitorConfig struct {
	CollectionInterval    time.Duration `json:"collectionInterval"`
	LeakDetectionWindow   time.Duration `json:"leakDetectionWindow"`
	HeapGrowthThreshold   uint64        `json:"heapGrowthThreshold"` // bytes
	GoroutineThreshold    int           `json:"goroutineThreshold"`
	GCFrequencyThreshold  float64       `json:"gcFrequencyThreshold"`  // collections/second
	AlertThresholdPercent float64       `json:"alertThresholdPercent"` // heap usage percentage
}

// DefaultMemoryMonitorConfig returns default configuration
func DefaultMemoryMonitorConfig() *MemoryMonitorConfig {
	return &MemoryMonitorConfig{
		CollectionInterval:    30 * time.Second,
		LeakDetectionWindow:   5 * time.Minute,
		HeapGrowthThreshold:   100 * 1024 * 1024, // 100MB
		GoroutineThreshold:    1000,
		GCFrequencyThreshold:  0.1,  // 0.1 collections/second (1 every 10 seconds)
		AlertThresholdPercent: 80.0, // 80% heap usage
	}
}

// MemoryMonitor provides real-time memory monitoring and leak detection
type MemoryMonitor struct {
	db             *sqlx.DB
	alerting       AlertingService
	config         *MemoryMonitorConfig
	ctx            context.Context
	cancel         context.CancelFunc
	wg             sync.WaitGroup
	mu             sync.RWMutex
	lastMetrics    *MemoryMetrics
	metricsHistory []MemoryMetrics
	activeLeaks    map[string]*MemoryLeak
}

// NewMemoryMonitor creates a new memory monitor
func NewMemoryMonitor(db *sqlx.DB, alerting AlertingService, config *MemoryMonitorConfig) *MemoryMonitor {
	if config == nil {
		config = DefaultMemoryMonitorConfig()
	}

	ctx, cancel := context.WithCancel(context.Background())

	return &MemoryMonitor{
		db:             db,
		alerting:       alerting,
		config:         config,
		ctx:            ctx,
		cancel:         cancel,
		metricsHistory: make([]MemoryMetrics, 0),
		activeLeaks:    make(map[string]*MemoryLeak),
	}
}

// Start begins memory monitoring
func (mm *MemoryMonitor) Start() error {
	mm.wg.Add(1)
	go mm.monitorLoop()
	return nil
}

// Stop stops memory monitoring
func (mm *MemoryMonitor) Stop() error {
	mm.cancel()
	mm.wg.Wait()
	return nil
}

// GetCurrentMetrics returns the latest memory metrics
func (mm *MemoryMonitor) GetCurrentMetrics() *MemoryMetrics {
	mm.mu.RLock()
	defer mm.mu.RUnlock()
	if mm.lastMetrics == nil {
		return nil
	}
	metricsCopy := *mm.lastMetrics
	return &metricsCopy
}

// GetActiveLeaks returns currently active memory leaks
func (mm *MemoryMonitor) GetActiveLeaks() map[string]*MemoryLeak {
	mm.mu.RLock()
	defer mm.mu.RUnlock()

	leaks := make(map[string]*MemoryLeak)
	for id, leak := range mm.activeLeaks {
		leakCopy := *leak
		leaks[id] = &leakCopy
	}
	return leaks
}

// ForceGC triggers a manual garbage collection
func (mm *MemoryMonitor) ForceGC() {
	runtime.GC()
	debug.FreeOSMemory()
}

// monitorLoop runs the main monitoring loop
func (mm *MemoryMonitor) monitorLoop() {
	defer mm.wg.Done()

	ticker := time.NewTicker(mm.config.CollectionInterval)
	defer ticker.Stop()

	for {
		select {
		case <-mm.ctx.Done():
			return
		case <-ticker.C:
			if err := mm.collectAndAnalyzeMetrics(); err != nil {
				// Log error but continue monitoring
				fmt.Printf("Error collecting memory metrics: %v\n", err)
			}
		}
	}
}

// collectAndAnalyzeMetrics collects current memory metrics and analyzes for leaks
func (mm *MemoryMonitor) collectAndAnalyzeMetrics() error {
	metrics := mm.collectMemoryMetrics()

	// Store metrics in database
	if err := mm.recordMetrics(metrics); err != nil {
		return fmt.Errorf("failed to record metrics: %w", err)
	}

	// Update internal state
	mm.mu.Lock()
	mm.lastMetrics = metrics
	mm.metricsHistory = append(mm.metricsHistory, *metrics)

	// Keep only recent history (last hour worth of data)
	maxHistory := int(time.Hour / mm.config.CollectionInterval)
	if len(mm.metricsHistory) > maxHistory {
		mm.metricsHistory = mm.metricsHistory[len(mm.metricsHistory)-maxHistory:]
	}
	mm.mu.Unlock()

	// Analyze for memory leaks
	if err := mm.detectMemoryLeaks(metrics); err != nil {
		return fmt.Errorf("failed to detect memory leaks: %w", err)
	}

	// Check for alert conditions
	mm.checkAlertConditions(metrics)

	return nil
}

// collectMemoryMetrics collects current runtime memory statistics
func (mm *MemoryMonitor) collectMemoryMetrics() *MemoryMetrics {
	var memStats runtime.MemStats
	runtime.ReadMemStats(&memStats)

	// Calculate rates if we have previous metrics
	var allocRate, gcRate float64
	if mm.lastMetrics != nil {
		timeDiff := time.Since(mm.lastMetrics.Timestamp).Seconds()
		if timeDiff > 0 {
			allocDiff := int64(memStats.TotalAlloc) - int64(mm.lastMetrics.HeapAlloc)
			allocRate = float64(allocDiff) / timeDiff

			gcDiff := int64(memStats.NumGC) - int64(mm.lastMetrics.NumGC)
			gcRate = float64(gcDiff) / timeDiff
		}
	}

	return &MemoryMetrics{
		Timestamp:     time.Now(),
		HeapAlloc:     memStats.HeapAlloc,
		HeapSys:       memStats.HeapSys,
		HeapIdle:      memStats.HeapIdle,
		HeapInuse:     memStats.HeapInuse,
		HeapReleased:  memStats.HeapReleased,
		HeapObjects:   memStats.HeapObjects,
		StackInuse:    memStats.StackInuse,
		StackSys:      memStats.StackSys,
		MSpanInuse:    memStats.MSpanInuse,
		MSpanSys:      memStats.MSpanSys,
		MCacheInuse:   memStats.MCacheInuse,
		MCacheSys:     memStats.MCacheSys,
		GCSys:         memStats.GCSys,
		OtherSys:      memStats.OtherSys,
		NextGC:        memStats.NextGC,
		LastGC:        memStats.LastGC,
		NumGC:         memStats.NumGC,
		NumForcedGC:   memStats.NumForcedGC,
		GCCPUFraction: memStats.GCCPUFraction,
		NumGoroutine:  runtime.NumGoroutine(),
		CGOCallsCount: runtime.NumCgoCall(),
		AllocRate:     allocRate,
		GCRate:        gcRate,
	}
}

// recordMetrics stores memory metrics in the database using SI-005 schema
func (mm *MemoryMonitor) recordMetrics(metrics *MemoryMetrics) error {
	// Use the SI-005 record_memory_metrics function
	serviceName := "domainflow-api" // Default service name
	processID := fmt.Sprintf("monitor-%d", time.Now().Unix())

	// Calculate total heap size as the sum of allocated and available heap memory
	// HeapSys can be very large as it includes OS reserved memory
	heapSizeBytes := int64(metrics.HeapAlloc + metrics.HeapIdle)
	heapUsedBytes := int64(metrics.HeapAlloc)

	// Ensure we have reasonable values (avoid overflow/negative values)
	if heapSizeBytes <= 0 {
		heapSizeBytes = heapUsedBytes + 1024*1024 // Add 1MB minimum
	}
	if heapUsedBytes < 0 {
		heapUsedBytes = 0
	}

	var metricID string
	err := mm.db.QueryRow(`
		SELECT record_memory_metrics($1, $2, $3, $4, $5, $6, $7, $8)`,
		serviceName,
		processID,
		heapSizeBytes,                     // heap_size_bytes
		heapUsedBytes,                     // heap_used_bytes
		int64(metrics.NumGC),              // gc_count
		int64(metrics.GCCPUFraction*1000), // gc_duration_ms (approximation)
		metrics.NumGoroutine,              // goroutines_count
		int64(metrics.StackSys),           // stack_size_bytes
	).Scan(&metricID)

	return err
}

// detectMemoryLeaks analyzes metrics for potential memory leaks
func (mm *MemoryMonitor) detectMemoryLeaks(current *MemoryMetrics) error {
	mm.mu.RLock()
	historyLen := len(mm.metricsHistory)
	mm.mu.RUnlock()

	if historyLen < 5 { // Need at least 5 data points
		return nil
	}

	// Check for sustained heap growth
	if err := mm.checkHeapGrowthLeak(current); err != nil {
		return err
	}

	// Check for goroutine leaks
	if err := mm.checkGoroutineLeak(current); err != nil {
		return err
	}

	// Check for GC pressure
	if err := mm.checkGCPressureLeak(current); err != nil {
		return err
	}

	return nil
}

// checkHeapGrowthLeak detects leaks based on sustained heap growth
func (mm *MemoryMonitor) checkHeapGrowthLeak(current *MemoryMetrics) error {
	mm.mu.RLock()
	history := mm.metricsHistory
	mm.mu.RUnlock()

	if len(history) < 5 {
		return nil
	}

	// Check if heap has grown consistently over the detection window
	oldestInWindow := history[len(history)-5]
	heapGrowth := current.HeapAlloc - oldestInWindow.HeapAlloc

	if heapGrowth > mm.config.HeapGrowthThreshold {
		leakID := fmt.Sprintf("heap-growth-%d", time.Now().Unix())

		leak := &MemoryLeak{
			ID:           leakID,
			DetectedAt:   time.Now(),
			LeakType:     "heap_growth",
			Severity:     mm.determineSeverity(heapGrowth, mm.config.HeapGrowthThreshold),
			Description:  fmt.Sprintf("Sustained heap growth of %d bytes over %v", heapGrowth, mm.config.LeakDetectionWindow),
			StackTrace:   mm.captureStackTrace(),
			MemoryGrowth: heapGrowth,
			Duration:     current.Timestamp.Sub(oldestInWindow.Timestamp),
			Metadata: map[string]interface{}{
				"heapAllocStart": oldestInWindow.HeapAlloc,
				"heapAllocEnd":   current.HeapAlloc,
				"gcCount":        current.NumGC - oldestInWindow.NumGC,
			},
		}

		return mm.recordLeak(leak)
	}

	return nil
}

// checkGoroutineLeak detects goroutine leaks
func (mm *MemoryMonitor) checkGoroutineLeak(current *MemoryMetrics) error {
	if current.NumGoroutine > mm.config.GoroutineThreshold {
		leakID := fmt.Sprintf("goroutine-leak-%d", time.Now().Unix())

		leak := &MemoryLeak{
			ID:          leakID,
			DetectedAt:  time.Now(),
			LeakType:    "goroutine_leak",
			Severity:    mm.determineSeverity(uint64(current.NumGoroutine), uint64(mm.config.GoroutineThreshold)),
			Description: fmt.Sprintf("High goroutine count: %d (threshold: %d)", current.NumGoroutine, mm.config.GoroutineThreshold),
			StackTrace:  mm.captureStackTrace(),
			Metadata: map[string]interface{}{
				"goroutineCount": current.NumGoroutine,
				"threshold":      mm.config.GoroutineThreshold,
			},
		}

		return mm.recordLeak(leak)
	}

	return nil
}

// checkGCPressureLeak detects high GC pressure indicating potential memory issues
func (mm *MemoryMonitor) checkGCPressureLeak(current *MemoryMetrics) error {
	if current.GCRate > mm.config.GCFrequencyThreshold {
		leakID := fmt.Sprintf("gc-pressure-%d", time.Now().Unix())

		leak := &MemoryLeak{
			ID:          leakID,
			DetectedAt:  time.Now(),
			LeakType:    "gc_pressure",
			Severity:    "medium",
			Description: fmt.Sprintf("High GC frequency: %.2f collections/second (threshold: %.2f)", current.GCRate, mm.config.GCFrequencyThreshold),
			StackTrace:  mm.captureStackTrace(),
			Metadata: map[string]interface{}{
				"gcRate":        current.GCRate,
				"threshold":     mm.config.GCFrequencyThreshold,
				"gcCPUFraction": current.GCCPUFraction,
			},
		}

		return mm.recordLeak(leak)
	}

	return nil
}

// recordLeak stores a detected memory leak using SI-005 schema
func (mm *MemoryMonitor) recordLeak(leak *MemoryLeak) error {
	mm.mu.Lock()
	mm.activeLeaks[leak.ID] = leak
	mm.mu.Unlock()

	// Use the SI-005 detect_memory_leak function
	serviceName := "domainflow-api"
	operationID := fmt.Sprintf("monitor-operation-%d", time.Now().Unix())

	var leakID string
	err := mm.db.QueryRow(`
		SELECT detect_memory_leak($1, $2, $3, $4, $5)`,
		serviceName,
		operationID,
		int64(leak.MemoryGrowth),
		leak.LeakType,
		leak.StackTrace,
	).Scan(&leakID)

	if err == nil {
		// Send alert using the alerting service
		alertContext := map[string]interface{}{
			"leakType":     leak.LeakType,
			"memoryGrowth": leak.MemoryGrowth,
			"duration":     leak.Duration.String(),
			"serviceName":  serviceName,
		}

		mm.alerting.SendAlert(context.Background(), "memory_leak", leak.Severity, leak.Description, alertContext)
	}

	return err
}

// checkAlertConditions checks for alert conditions and sends alerts
func (mm *MemoryMonitor) checkAlertConditions(metrics *MemoryMetrics) {
	// Check heap usage percentage
	if metrics.HeapSys > 0 {
		heapUsagePercent := float64(metrics.HeapAlloc) / float64(metrics.HeapSys) * 100
		if heapUsagePercent > mm.config.AlertThresholdPercent {
			alertContext := map[string]interface{}{
				"heapUsagePercent": heapUsagePercent,
				"heapAlloc":        metrics.HeapAlloc,
				"heapSys":          metrics.HeapSys,
			}

			mm.alerting.SendAlert(
				context.Background(),
				"high_memory_usage",
				"high",
				fmt.Sprintf("High heap usage: %.1f%% (threshold: %.1f%%)", heapUsagePercent, mm.config.AlertThresholdPercent),
				alertContext,
			)
		}
	}
}

// determineSeverity determines the severity level based on the values
func (mm *MemoryMonitor) determineSeverity(actual, threshold uint64) string {
	ratio := float64(actual) / float64(threshold)

	switch {
	case ratio >= 3.0:
		return "critical"
	case ratio >= 2.0:
		return "high"
	case ratio >= 1.5:
		return "medium"
	default:
		return "low"
	}
}

// captureStackTrace captures the current stack trace
func (mm *MemoryMonitor) captureStackTrace() string {
	buf := make([]byte, 4096)
	n := runtime.Stack(buf, false)
	return string(buf[:n])
}

// RecordMemoryMetric records a custom memory metric using SI-005 function
func (mm *MemoryMonitor) RecordMemoryMetric(ctx context.Context, serviceName, metricName string, value float64) error {
	if serviceName == "" {
		return fmt.Errorf("service name cannot be empty")
	}
	if metricName == "" {
		return fmt.Errorf("metric name cannot be empty")
	}

	// Convert the generic metric to the SI-005 format
	processID := fmt.Sprintf("test-%d", time.Now().Unix())

	// Map generic metrics to SI-005 specific metrics
	var heapSize, heapUsed int64
	switch metricName {
	case "heap_alloc":
		heapUsed = int64(value)
		heapSize = int64(value * 2) // Estimate total heap size
	case "heap_sys":
		heapSize = int64(value)
		heapUsed = int64(value * 0.7) // Estimate used portion
	default:
		// For other metrics, use reasonable defaults
		heapUsed = int64(value)
		heapSize = int64(value * 1.5)
	}

	// Use the SI-005 record_memory_metrics function
	var metricID string
	err := mm.db.QueryRowContext(ctx, `
		SELECT record_memory_metrics($1, $2, $3, $4, $5, $6, $7, $8)`,
		serviceName,
		processID,
		heapSize, // heap_size_bytes
		heapUsed, // heap_used_bytes
		int64(0), // gc_count
		int64(0), // gc_duration_ms
		int(0),   // goroutines_count
		int64(0), // stack_size_bytes
	).Scan(&metricID)

	if err != nil {
		return fmt.Errorf("failed to record memory metric: %w", err)
	}

	return nil
}

// DetectMemoryLeak manually detects and records a memory leak (for testing and explicit leak reporting)
func (mm *MemoryMonitor) DetectMemoryLeak(ctx context.Context, operationName string, memoryUsage, threshold float64) error {
	serviceName := "test-service"
	leakedBytes := int64(memoryUsage)
	leakSource := operationName
	stackTrace := "test-stack-trace"

	var leakID string
	err := mm.db.QueryRowContext(ctx, `
		SELECT detect_memory_leak($1, $2, $3, $4, $5)`,
		serviceName,
		operationName, // operation_id
		leakedBytes,
		leakSource,
		stackTrace,
	).Scan(&leakID)

	if err != nil {
		return fmt.Errorf("failed to detect memory leak: %w", err)
	}

	return nil
}
