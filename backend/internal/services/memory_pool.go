package services

import (
	"context"
	"log"
	"runtime"
	"sync"
	"time"

	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/fntelecomllc/studio/backend/internal/monitoring"
	"github.com/google/uuid"
)

// MemoryPoolConfig holds configuration for memory pool management
type MemoryPoolConfig struct {
	MaxPoolSize         int           `json:"maxPoolSize"`
	CleanupInterval     time.Duration `json:"cleanupInterval"`
	MaxObjectLifetime   time.Duration `json:"maxObjectLifetime"`
	GCThresholdPercent  float64       `json:"gcThresholdPercent"`
	EnableMemoryMetrics bool          `json:"enableMemoryMetrics"`
}

// DefaultMemoryPoolConfig returns default configuration
func DefaultMemoryPoolConfig() *MemoryPoolConfig {
	return &MemoryPoolConfig{
		MaxPoolSize:         1000,
		CleanupInterval:     5 * time.Minute,
		MaxObjectLifetime:   30 * time.Minute,
		GCThresholdPercent:  80.0,
		EnableMemoryMetrics: true,
	}
}

// PooledObject represents an object that can be pooled
type PooledObject interface {
	Reset()
	IsExpired() bool
	GetCreatedAt() time.Time
}

// PooledDomainBatch implements PooledObject for domain batches
type PooledDomainBatch struct {
	ID         uuid.UUID
	BatchNum   int
	Start      int
	End        int
	Config     *models.DomainGenerationCampaignParams
	CampaignID uuid.UUID
	Domains    []models.GeneratedDomain
	CreatedAt  time.Time
	MaxAge     time.Duration
}

func (p *PooledDomainBatch) Reset() {
	p.ID = uuid.UUID{}
	p.BatchNum = 0
	p.Start = 0
	p.End = 0
	p.Config = nil
	p.CampaignID = uuid.UUID{}
	p.Domains = p.Domains[:0] // Reset slice but keep capacity
	p.CreatedAt = time.Now()
}

func (p *PooledDomainBatch) IsExpired() bool {
	return time.Since(p.CreatedAt) > p.MaxAge
}

func (p *PooledDomainBatch) GetCreatedAt() time.Time {
	return p.CreatedAt
}

// PooledBuffer implements PooledObject for byte buffers
type PooledBuffer struct {
	Buffer    []byte
	CreatedAt time.Time
	MaxAge    time.Duration
}

func (p *PooledBuffer) Reset() {
	p.Buffer = p.Buffer[:0] // Reset length but keep capacity
	p.CreatedAt = time.Now()
}

func (p *PooledBuffer) IsExpired() bool {
	return time.Since(p.CreatedAt) > p.MaxAge
}

func (p *PooledBuffer) GetCreatedAt() time.Time {
	return p.CreatedAt
}

// MemoryPoolManager manages object pools and memory lifecycle
type MemoryPoolManager struct {
	config        *MemoryPoolConfig
	monitor       *monitoring.MemoryMonitor
	domainPool    sync.Pool
	bufferPool    sync.Pool
	stringPool    sync.Pool
	cleanupTicker *time.Ticker
	ctx           context.Context
	cancel        context.CancelFunc
	mu            sync.RWMutex

	// Statistics
	poolHits   int64
	poolMisses int64
	cleanups   int64
}

// NewMemoryPoolManager creates a new memory pool manager
func NewMemoryPoolManager(config *MemoryPoolConfig, monitor *monitoring.MemoryMonitor) *MemoryPoolManager {
	if config == nil {
		config = DefaultMemoryPoolConfig()
	}

	ctx, cancel := context.WithCancel(context.Background())

	manager := &MemoryPoolManager{
		config:  config,
		monitor: monitor,
		ctx:     ctx,
		cancel:  cancel,
		domainPool: sync.Pool{
			New: func() interface{} {
				return &PooledDomainBatch{
					Domains:   make([]models.GeneratedDomain, 0, 100),
					CreatedAt: time.Now(),
					MaxAge:    config.MaxObjectLifetime,
				}
			},
		},
		bufferPool: sync.Pool{
			New: func() interface{} {
				return &PooledBuffer{
					Buffer:    make([]byte, 0, 4096),
					CreatedAt: time.Now(),
					MaxAge:    config.MaxObjectLifetime,
				}
			},
		},
		stringPool: sync.Pool{
			New: func() interface{} {
				return make([]string, 0, 50)
			},
		},
	}

	// Start cleanup routine
	manager.startCleanupRoutine()

	return manager
}

// GetDomainBatch gets a pooled domain batch
func (mp *MemoryPoolManager) GetDomainBatch() *PooledDomainBatch {
	obj := mp.domainPool.Get().(*PooledDomainBatch)

	// Check if object is expired
	if obj.IsExpired() {
		mp.mu.Lock()
		mp.poolMisses++
		mp.mu.Unlock()

		// Create new object
		obj = &PooledDomainBatch{
			Domains:   make([]models.GeneratedDomain, 0, 100),
			CreatedAt: time.Now(),
			MaxAge:    mp.config.MaxObjectLifetime,
		}
	} else {
		mp.mu.Lock()
		mp.poolHits++
		mp.mu.Unlock()

		obj.Reset()
	}

	return obj
}

// PutDomainBatch returns a domain batch to the pool
func (mp *MemoryPoolManager) PutDomainBatch(batch *PooledDomainBatch) {
	if batch == nil || batch.IsExpired() {
		return
	}

	// Reset and return to pool
	batch.Reset()
	mp.domainPool.Put(batch)
}

// GetBuffer gets a pooled buffer
func (mp *MemoryPoolManager) GetBuffer() *PooledBuffer {
	obj := mp.bufferPool.Get().(*PooledBuffer)

	if obj.IsExpired() {
		mp.mu.Lock()
		mp.poolMisses++
		mp.mu.Unlock()

		obj = &PooledBuffer{
			Buffer:    make([]byte, 0, 4096),
			CreatedAt: time.Now(),
			MaxAge:    mp.config.MaxObjectLifetime,
		}
	} else {
		mp.mu.Lock()
		mp.poolHits++
		mp.mu.Unlock()

		obj.Reset()
	}

	return obj
}

// PutBuffer returns a buffer to the pool
func (mp *MemoryPoolManager) PutBuffer(buffer *PooledBuffer) {
	if buffer == nil || buffer.IsExpired() || cap(buffer.Buffer) > 65536 {
		// Don't pool very large buffers
		return
	}

	buffer.Reset()
	mp.bufferPool.Put(buffer)
}

// GetStringSlice gets a pooled string slice
func (mp *MemoryPoolManager) GetStringSlice() []string {
	slice := mp.stringPool.Get().([]string)
	return slice[:0] // Reset length but keep capacity
}

// PutStringSlice returns a string slice to the pool
func (mp *MemoryPoolManager) PutStringSlice(slice []string) {
	if slice == nil || cap(slice) > 1000 {
		// Don't pool very large slices
		return
	}

	// Clear slice references to prevent memory leaks
	for i := range slice {
		slice[i] = ""
	}
	slice = slice[:0]
	mp.stringPool.Put(slice)
}

// startCleanupRoutine starts the background cleanup routine
func (mp *MemoryPoolManager) startCleanupRoutine() {
	mp.cleanupTicker = time.NewTicker(mp.config.CleanupInterval)

	go func() {
		defer mp.cleanupTicker.Stop()

		for {
			select {
			case <-mp.ctx.Done():
				return
			case <-mp.cleanupTicker.C:
				mp.performCleanup()
			}
		}
	}()
}

// performCleanup performs memory cleanup operations
func (mp *MemoryPoolManager) performCleanup() {
	mp.mu.Lock()
	mp.cleanups++
	mp.mu.Unlock()

	// Force garbage collection if memory pressure is high
	var m runtime.MemStats
	runtime.ReadMemStats(&m)

	memoryUsagePercent := float64(m.Alloc) / float64(m.Sys) * 100
	if memoryUsagePercent > mp.config.GCThresholdPercent {
		log.Printf("Memory usage at %.2f%%, forcing GC", memoryUsagePercent)
		runtime.GC()

		// Record memory metrics if monitoring is enabled
		if mp.config.EnableMemoryMetrics && mp.monitor != nil {
			mp.recordMemoryMetrics(&m)
		}
	}
}

// recordMemoryMetrics records memory metrics for monitoring
func (mp *MemoryPoolManager) recordMemoryMetrics(m *runtime.MemStats) {
	ctx := context.Background()

	// Record memory metrics via the monitoring service
	mp.monitor.RecordMemoryMetric(ctx, "pool_manager", "heap_alloc", float64(m.Alloc))
	mp.monitor.RecordMemoryMetric(ctx, "pool_manager", "heap_sys", float64(m.HeapSys))
	mp.monitor.RecordMemoryMetric(ctx, "pool_manager", "gc_cycles", float64(m.NumGC))

	// Record pool statistics
	mp.mu.RLock()
	hits := mp.poolHits
	misses := mp.poolMisses
	cleanups := mp.cleanups
	mp.mu.RUnlock()

	mp.monitor.RecordMemoryMetric(ctx, "pool_manager", "pool_hits", float64(hits))
	mp.monitor.RecordMemoryMetric(ctx, "pool_manager", "pool_misses", float64(misses))
	mp.monitor.RecordMemoryMetric(ctx, "pool_manager", "cleanups", float64(cleanups))

	// Calculate hit rate
	total := hits + misses
	if total > 0 {
		hitRate := float64(hits) / float64(total) * 100
		mp.monitor.RecordMemoryMetric(ctx, "pool_manager", "pool_hit_rate", hitRate)
	}
}

// GetStatistics returns pool statistics
func (mp *MemoryPoolManager) GetStatistics() map[string]interface{} {
	mp.mu.RLock()
	defer mp.mu.RUnlock()

	total := mp.poolHits + mp.poolMisses
	hitRate := float64(0)
	if total > 0 {
		hitRate = float64(mp.poolHits) / float64(total) * 100
	}

	return map[string]interface{}{
		"pool_hits":   mp.poolHits,
		"pool_misses": mp.poolMisses,
		"hit_rate":    hitRate,
		"cleanups":    mp.cleanups,
		"config":      mp.config,
	}
}

// Shutdown gracefully shuts down the memory pool manager
func (mp *MemoryPoolManager) Shutdown() {
	if mp.cancel != nil {
		mp.cancel()
	}

	if mp.cleanupTicker != nil {
		mp.cleanupTicker.Stop()
	}

	// Perform final cleanup
	mp.performCleanup()

	log.Println("Memory pool manager shutdown complete")
}

// ForceGC forces garbage collection and reports memory statistics
func (mp *MemoryPoolManager) ForceGC() {
	runtime.GC()

	var m runtime.MemStats
	runtime.ReadMemStats(&m)

	if mp.config.EnableMemoryMetrics && mp.monitor != nil {
		mp.recordMemoryMetrics(&m)
	}

	log.Printf("Forced GC complete - Alloc: %d KB, Sys: %d KB, NumGC: %d",
		m.Alloc/1024, m.Sys/1024, m.NumGC)
}

// CheckMemoryPressure checks if memory pressure is high
func (mp *MemoryPoolManager) CheckMemoryPressure() bool {
	var m runtime.MemStats
	runtime.ReadMemStats(&m)

	memoryUsagePercent := float64(m.Alloc) / float64(m.Sys) * 100
	return memoryUsagePercent > mp.config.GCThresholdPercent
}
