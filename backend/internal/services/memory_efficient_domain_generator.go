package services

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"runtime"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/fntelecomllc/studio/backend/internal/monitoring"
)

// MemoryEfficientDomainGenerator optimizes memory usage for large domain generation
type MemoryEfficientDomainGenerator struct {
	db                   *sqlx.DB
	memoryMonitor        *monitoring.MemoryMonitor
	batchSize            int
	maxConcurrentBatches int
	streamingEnabled     bool
	pooledBuffers        sync.Pool
}

// DomainBatch represents a batch of domains to generate
type DomainBatch struct {
	ID         uuid.UUID
	BatchNum   int
	Start      int
	End        int
	Config     *models.DomainGenerationCampaignParams
	CampaignID uuid.UUID
}

// BatchResult represents the result of processing a domain batch
type BatchResult struct {
	BatchID     uuid.UUID
	Domains     []models.GeneratedDomain
	ProcessedAt time.Time
	Duration    time.Duration
	WorkerID    int
}

// NewMemoryEfficientDomainGenerator creates a new memory-efficient domain generator
func NewMemoryEfficientDomainGenerator(db *sqlx.DB, memoryMonitor *monitoring.MemoryMonitor) *MemoryEfficientDomainGenerator {
	return &MemoryEfficientDomainGenerator{
		db:                   db,
		memoryMonitor:        memoryMonitor,
		batchSize:            1000, // Process domains in smaller batches
		maxConcurrentBatches: 5,    // Limit concurrent processing
		streamingEnabled:     true,
		pooledBuffers: sync.Pool{
			New: func() interface{} {
				return make([]models.GeneratedDomain, 0, 1000)
			},
		},
	}
}

// GenerateDomainsWithMemoryControl generates domains with memory optimization
func (medg *MemoryEfficientDomainGenerator) GenerateDomainsWithMemoryControl(
	ctx context.Context,
	campaign *models.Campaign,
	config *models.DomainGenerationCampaignParams,
) error {
	// Track memory allocation for this operation
	operationID := uuid.New().String()
	startTime := time.Now()

	defer func() {
		// Force garbage collection after large operations
		runtime.GC()

		// Record operation memory usage
		medg.recordOperationMemory(ctx, operationID, campaign.ID, time.Since(startTime))
	}()

	totalDomains := config.NumDomainsToGenerate
	batchCount := (totalDomains + medg.batchSize - 1) / medg.batchSize

	// Use buffered channel to control memory usage
	batchChan := make(chan *DomainBatch, medg.maxConcurrentBatches)
	resultChan := make(chan *BatchResult, batchCount)

	// Start worker goroutines with memory monitoring
	var wg sync.WaitGroup
	for i := 0; i < medg.maxConcurrentBatches; i++ {
		wg.Add(1)
		go func(workerID int) {
			defer wg.Done()
			medg.processBatchesWithMemoryControl(ctx, batchChan, resultChan, workerID)
		}(i)
	}

	// Generate batches
	go func() {
		defer close(batchChan)

		for batchNum := 0; batchNum < batchCount; batchNum++ {
			batchStart := batchNum * medg.batchSize
			batchEnd := batchStart + medg.batchSize
			if batchEnd > totalDomains {
				batchEnd = totalDomains
			}

			batch := &DomainBatch{
				ID:         uuid.New(),
				BatchNum:   batchNum,
				Start:      batchStart,
				End:        batchEnd,
				Config:     config,
				CampaignID: campaign.ID,
			}

			select {
			case batchChan <- batch:
			case <-ctx.Done():
				return
			}
		}
	}()

	// Collect results
	go func() {
		wg.Wait()
		close(resultChan)
	}()

	// Process results with memory-efficient streaming
	return medg.streamResults(ctx, resultChan, campaign.ID)
}

// processBatchesWithMemoryControl processes batches with memory pressure monitoring
func (medg *MemoryEfficientDomainGenerator) processBatchesWithMemoryControl(
	ctx context.Context,
	batchChan <-chan *DomainBatch,
	resultChan chan<- *BatchResult,
	workerID int,
) {
	for batch := range batchChan {
		// Check memory before processing
		if medg.isMemoryPressureHigh() {
			// Wait and force GC if memory pressure is high
			runtime.GC()
			time.Sleep(100 * time.Millisecond)
		}

		result := medg.processSingleBatch(ctx, batch, workerID)

		select {
		case resultChan <- result:
		case <-ctx.Done():
			return
		}

		// Clear references and suggest GC
		batch = nil
		if workerID%2 == 0 { // Stagger GC calls
			runtime.GC()
		}
	}
}

// processSingleBatch processes a single batch of domains
func (medg *MemoryEfficientDomainGenerator) processSingleBatch(
	ctx context.Context,
	batch *DomainBatch,
	workerID int,
) *BatchResult {
	// Get pooled buffer to reduce allocations
	domains := medg.pooledBuffers.Get().([]models.GeneratedDomain)
	domains = domains[:0] // Reset length but keep capacity

	defer func() {
		// Return buffer to pool
		if cap(domains) <= 2000 { // Prevent pool from growing too large
			medg.pooledBuffers.Put(domains)
		}
	}()

	startTime := time.Now()

	// Generate domains for this batch
	for i := batch.Start; i < batch.End; i++ {
		domain := medg.generateSingleDomain(ctx, batch.Config, i)
		domains = append(domains, domain)

		// Yield CPU periodically
		if i%100 == 0 {
			runtime.Gosched()
		}
	}

	return &BatchResult{
		BatchID:     batch.ID,
		Domains:     domains,
		ProcessedAt: time.Now(),
		Duration:    time.Since(startTime),
		WorkerID:    workerID,
	}
}

// generateSingleDomain generates a single domain based on configuration
func (medg *MemoryEfficientDomainGenerator) generateSingleDomain(
	ctx context.Context,
	config *models.DomainGenerationCampaignParams,
	index int,
) models.GeneratedDomain {
	// This is a simplified domain generation - in real implementation
	// this would use the actual domain generation algorithm
	domainName := fmt.Sprintf("domain%d.%s", index, config.TLD)

	return models.GeneratedDomain{
		ID:                   uuid.New(),
		DomainName:           domainName,
		GenerationCampaignID: config.CampaignID,
		OffsetIndex:          int64(index),
		GeneratedAt:          time.Now(),
		CreatedAt:            time.Now(),
	}
}

// isMemoryPressureHigh checks if memory pressure is high
func (medg *MemoryEfficientDomainGenerator) isMemoryPressureHigh() bool {
	var memStats runtime.MemStats
	runtime.ReadMemStats(&memStats)

	// Consider memory pressure high if heap utilization > 80%
	utilization := float64(memStats.HeapInuse) / float64(memStats.HeapSys)
	return utilization > 0.8
}

// streamResults streams results to database without accumulating in memory
func (medg *MemoryEfficientDomainGenerator) streamResults(
	ctx context.Context,
	resultChan <-chan *BatchResult,
	campaignID uuid.UUID,
) error {
	// Stream results to database without accumulating in memory
	for result := range resultChan {
		if err := medg.persistBatchResults(ctx, result, campaignID); err != nil {
			return fmt.Errorf("failed to persist batch results: %w", err)
		}

		// Clear result reference
		result = nil
	}

	return nil
}

// persistBatchResults persists a batch of domain results to the database
func (medg *MemoryEfficientDomainGenerator) persistBatchResults(
	ctx context.Context,
	result *BatchResult,
	campaignID uuid.UUID,
) error {
	// Begin transaction for batch insert
	tx, err := medg.db.BeginTxx(ctx, nil)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	// Insert domains in batch
	for _, domain := range result.Domains {
		_, err := tx.ExecContext(ctx, `
			INSERT INTO generated_domains (id, domain_generation_campaign_id, domain_name, created_at)
			VALUES ($1, $2, $3, $4)`,
			domain.ID, campaignID, domain.DomainName, domain.CreatedAt)
		if err != nil {
			return fmt.Errorf("failed to insert domain %s: %w", domain.DomainName, err)
		}
	}

	// Commit transaction
	if err := tx.Commit(); err != nil {
		return fmt.Errorf("failed to commit batch: %w", err)
	}

	log.Printf("Persisted batch %s with %d domains (worker %d, duration: %v)",
		result.BatchID, len(result.Domains), result.WorkerID, result.Duration)

	return nil
}

// recordOperationMemory records memory usage for the operation
func (medg *MemoryEfficientDomainGenerator) recordOperationMemory(
	ctx context.Context,
	operationID string,
	campaignID uuid.UUID,
	duration time.Duration,
) {
	var memStats runtime.MemStats
	runtime.ReadMemStats(&memStats)

	// Record in database using SI-005 schema
	query := `
		INSERT INTO memory_allocations 
			(operation_id, operation_type, campaign_id, allocated_bytes, 
			 peak_bytes, duration_ms, allocation_pattern)
		VALUES ($1, $2, $3, $4, $5, $6, $7)`

	allocationPattern := map[string]interface{}{
		"heap_alloc":  memStats.HeapAlloc,
		"heap_inuse":  memStats.HeapInuse,
		"stack_inuse": memStats.StackInuse,
		"gc_count":    memStats.NumGC,
		"goroutines":  runtime.NumGoroutine(),
	}

	allocationJSON, err := json.Marshal(allocationPattern)
	if err != nil {
		log.Printf("WARNING: Failed to marshal allocation pattern: %v", err)
		allocationJSON = []byte("{}")
	}

	_, err = medg.db.ExecContext(
		ctx, query,
		operationID,
		"domain_generation",
		campaignID,
		int64(memStats.TotalAlloc),
		int64(memStats.HeapInuse),
		int(duration.Milliseconds()),
		allocationJSON,
	)

	if err != nil {
		log.Printf("WARNING: Failed to record operation memory: %v", err)
	}
}

// SetBatchSize configures the batch size for domain generation
func (medg *MemoryEfficientDomainGenerator) SetBatchSize(size int) {
	if size > 0 && size <= 10000 {
		medg.batchSize = size
	}
}

// SetMaxConcurrentBatches configures the maximum concurrent batches
func (medg *MemoryEfficientDomainGenerator) SetMaxConcurrentBatches(count int) {
	if count > 0 && count <= 20 {
		medg.maxConcurrentBatches = count
	}
}

// GetPoolStats returns statistics about the memory pool
func (medg *MemoryEfficientDomainGenerator) GetPoolStats() map[string]interface{} {
	// This is a simplified implementation - in a real system you'd track more stats
	return map[string]interface{}{
		"batch_size":             medg.batchSize,
		"max_concurrent_batches": medg.maxConcurrentBatches,
		"streaming_enabled":      medg.streamingEnabled,
	}
}
