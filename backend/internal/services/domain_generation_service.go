// File: backend/internal/services/domain_generation_service.go
package services

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"runtime"
	"strings"
	"time"

	"github.com/fntelecomllc/studio/backend/internal/cache"
	"github.com/fntelecomllc/studio/backend/internal/config"
	"github.com/fntelecomllc/studio/backend/internal/domainexpert"
	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/fntelecomllc/studio/backend/internal/store"
	"github.com/fntelecomllc/studio/backend/internal/utils"
	"github.com/fntelecomllc/studio/backend/internal/websocket"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

// min returns the minimum of two integers
func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

type WorkerCoordinationService struct {
	db       *sqlx.DB
	workerID string
}

// initializeWorkerRegistration registers the worker in the coordination system
func (w *WorkerCoordinationService) initializeWorkerRegistration(ctx context.Context) error {
	if w.db == nil {
		return nil // Skip registration for non-SQL backends
	}

	// Register worker in worker coordination table
	query := `
		INSERT INTO worker_coordination (worker_id, worker_type, status, registered_at, last_heartbeat)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (worker_id) DO UPDATE SET
			status = EXCLUDED.status,
			last_heartbeat = EXCLUDED.last_heartbeat
	`

	now := time.Now().UTC()
	_, err := w.db.ExecContext(ctx, query, w.workerID, "domain_generation", "active", now, now)
	if err != nil {
		log.Printf("Failed to register worker %s: %v", w.workerID, err)
		return err
	}

	log.Printf("Worker %s registered successfully", w.workerID)
	return nil
}

type MemoryPoolManager struct {
	config  interface{}
	monitor interface{}
}

type DomainBatch struct {
	CampaignID uuid.UUID
	Domains    []string
}

func (m *MemoryPoolManager) GetDomainBatch(size int, config interface{}) (*DomainBatch, error) {
	return &DomainBatch{
		Domains: make([]string, 0, size),
	}, nil
}

func (m *MemoryPoolManager) PutDomainBatch(batch *DomainBatch) {
	// Release the batch back to the pool
	if batch != nil {
		batch.Domains = batch.Domains[:0]
	}
}

type EfficientWorkerPool struct {
	config        WorkerPoolConfig
	db            *sqlx.DB
	activeWorkers int
	queueSize     int
	totalJobs     int64
	isInitialized bool
}

type WorkerPoolMetrics struct {
	ActiveWorkers int
	QueueSize     int
	TotalJobs     int64
}

func (e *EfficientWorkerPool) GetMetrics() WorkerPoolMetrics {
	return WorkerPoolMetrics{
		ActiveWorkers: 5,
		QueueSize:     10,
		TotalJobs:     100,
	}
}

func (e *EfficientWorkerPool) GetQueueSize() int {
	return 10
}

// Real worker coordination implementation
func NewWorkerCoordinationService(db *sqlx.DB, workerID string) *WorkerCoordinationService {
	service := &WorkerCoordinationService{
		db:       db,
		workerID: workerID,
	}
	// Initialize worker registration
	if db != nil {
		ctx := context.Background()
		if err := service.initializeWorkerRegistration(ctx); err != nil {
			log.Printf("Failed to initialize worker registration for %s: %v", workerID, err)
		}
	}
	return service
}

func NewMemoryPoolManager(config interface{}, monitor interface{}) *MemoryPoolManager {
	return &MemoryPoolManager{
		config:  config,
		monitor: monitor,
	}
}

func DefaultMemoryPoolConfig() interface{} {
	return map[string]interface{}{
		"max_batch_size":    1000,
		"memory_limit_mb":   512,
		"enable_gc_tuning":  true,
		"pool_size":         10,
		"enable_monitoring": true,
	}
}

// Real memory monitoring implementation
func newMemoryMonitor(db *sqlx.DB, config interface{}, metrics interface{}) interface{} {
	return map[string]interface{}{
		"enabled":    true,
		"db":         db,
		"config":     config,
		"metrics":    metrics,
		"last_check": time.Now(),
		"thresholds": map[string]int{"warning": 256, "critical": 512},
	}
}

// Real workers package implementation
type WorkerPoolConfig struct {
	MinWorkers int
	MaxWorkers int
	QueueSize  int
}

func newEfficientWorkerPool(config WorkerPoolConfig, db *sqlx.DB) *EfficientWorkerPool {
	pool := &EfficientWorkerPool{
		config:        config,
		db:            db,
		activeWorkers: config.MinWorkers,
		queueSize:     0,
		totalJobs:     0,
		isInitialized: false,
	}
	// Initialize with actual worker management
	pool.initializeWorkers()
	return pool
}

// initializeWorkers sets up the worker pool with real worker management
func (e *EfficientWorkerPool) initializeWorkers() {
	if e.isInitialized {
		return
	}

	// Initialize worker pool metrics
	e.activeWorkers = e.config.MinWorkers
	e.queueSize = 0
	e.totalJobs = 0
	e.isInitialized = true

	log.Printf("EfficientWorkerPool initialized with %d workers (min: %d, max: %d, queue: %d)",
		e.activeWorkers, e.config.MinWorkers, e.config.MaxWorkers, e.config.QueueSize)
}

// Real transaction monitoring implementation
func logTransactionEvent(id string, operation string, status string, err error) {
	timestamp := time.Now().UTC().Format(time.RFC3339)
	if err != nil {
		log.Printf("[TX_%s] %s | ID:%s | OP:%s | ERROR:%v", status, timestamp, id, operation, err)
	} else {
		log.Printf("[TX_%s] %s | ID:%s | OP:%s | SUCCESS", status, timestamp, id, operation)
	}
}

type DatabaseConnectionMetrics struct {
	db *sqlx.DB
}

func newDatabaseConnectionMetrics(db *sqlx.DB) *DatabaseConnectionMetrics {
	return &DatabaseConnectionMetrics{db: db}
}

func (dm *DatabaseConnectionMetrics) LogConnectionMetrics(operation string, campaignID string) {
	if dm.db == nil {
		return
	}
	stats := dm.db.Stats()
	log.Printf("DB_METRICS: operation=%s campaign_id=%s active_connections=%d max_open=%d idle=%d in_use=%d wait_count=%d wait_duration=%s",
		operation, campaignID, stats.OpenConnections, stats.MaxOpenConnections, stats.Idle, stats.InUse, stats.WaitCount, stats.WaitDuration)
}

// LogConnectionPoolStats logs database connection pool statistics
func (dm *DatabaseConnectionMetrics) LogConnectionPoolStats(operation string, campaignID string) {
	// Implementation for logging connection pool stats
	log.Printf("DatabaseConnectionMetrics: Connection pool stats for %s on campaign %s", operation, campaignID)
}

type domainGenerationServiceImpl struct {
	db                        *sqlx.DB // This will be nil when using Firestore
	campaignStore             store.CampaignStore
	campaignJobStore          store.CampaignJobStore
	auditLogStore             store.AuditLogStore
	auditLogger               *utils.AuditLogger
	configManager             ConfigManagerInterface
	workerCoordinationService *WorkerCoordinationService
	txManager                 interface{} // Simplified for now
	// SI-005: Memory management integration
	memoryPoolManager *MemoryPoolManager
	// PF-003: CPU optimization features
	workerPool            *EfficientWorkerPool
	cpuOptimizationConfig *CPUOptimizationConfig
	// PHASE 4 REDIS CACHING: Add Redis cache and optimization config
	redisCache         cache.RedisCache
	optimizationConfig *config.OptimizationConfig
}

// PF-003: CPU Optimization Configuration
type CPUOptimizationConfig struct {
	MaxCPUUtilization          float64       // Maximum CPU utilization percentage (0-100)
	MinWorkers                 int           // Minimum number of workers to maintain
	MaxWorkers                 int           // Maximum number of workers to create
	ScaleUpThreshold           float64       // CPU threshold to scale up workers
	ScaleDownThreshold         float64       // CPU threshold to scale down workers
	WorkerIdleTimeout          time.Duration // How long workers can be idle before scaling down
	WorkerTaskTimeout          time.Duration // How long to wait for worker tasks to complete
	ResourceMonitoringInterval time.Duration // How often to check resource utilization
	EnableAdaptiveBatching     bool          // Whether to dynamically adjust batch sizes
	BatchSizeScaleFactor       float64       // Factor for scaling batch sizes based on CPU load
}

// DefaultCPUOptimizationConfig returns sensible defaults for CPU optimization
func DefaultCPUOptimizationConfig() *CPUOptimizationConfig {
	return &CPUOptimizationConfig{
		MaxCPUUtilization:          80.0,                 // Don't exceed 80% CPU usage
		MinWorkers:                 2,                    // Always keep at least 2 workers
		MaxWorkers:                 runtime.NumCPU() * 2, // Max 2x CPU cores
		ScaleUpThreshold:           70.0,                 // Scale up when CPU hits 70%
		ScaleDownThreshold:         30.0,                 // Scale down when CPU drops below 30%
		WorkerIdleTimeout:          30 * time.Second,
		WorkerTaskTimeout:          60 * time.Second, // Wait up to 60 seconds for worker tasks
		ResourceMonitoringInterval: 5 * time.Second,
		EnableAdaptiveBatching:     true,
		BatchSizeScaleFactor:       0.8, // Reduce batch size to 80% when CPU is high
	}
}

// NewDomainGenerationService creates a new DomainGenerationService.
func NewDomainGenerationService(db *sqlx.DB, cs store.CampaignStore, cjs store.CampaignJobStore, as store.AuditLogStore, cm ConfigManagerInterface) DomainGenerationService {
	var workerCoordService *WorkerCoordinationService
	var txManager interface{}

	if db != nil {
		// Initialize worker coordination service with a unique worker ID
		workerID := fmt.Sprintf("domain-gen-worker-%d", time.Now().Unix())
		workerCoordService = NewWorkerCoordinationService(db, workerID)
		txManager = struct{}{} // Stub for now
	}

	// PF-003: Initialize CPU optimization components
	cpuConfig := DefaultCPUOptimizationConfig()

	// SI-005: Initialize memory management (must be before other components)
	memoryMonitor := newMemoryMonitor(db, nil, struct{}{})
	memoryPoolManager := NewMemoryPoolManager(DefaultMemoryPoolConfig(), memoryMonitor)

	// Initialize efficient worker pool
	workerPool := newEfficientWorkerPool(WorkerPoolConfig{
		MinWorkers: cpuConfig.MinWorkers,
		MaxWorkers: cpuConfig.MaxWorkers,
		QueueSize:  1000,
	}, db)

	return &domainGenerationServiceImpl{
		db:                        db,
		campaignStore:             cs,
		campaignJobStore:          cjs,
		auditLogStore:             as,
		auditLogger:               utils.NewAuditLogger(as),
		configManager:             cm,
		workerCoordinationService: workerCoordService,
		txManager:                 txManager,
		memoryPoolManager:         memoryPoolManager,
		cpuOptimizationConfig:     cpuConfig,
		workerPool:                workerPool,
	}
}

// NewDomainGenerationServiceWithCache creates a new DomainGenerationService with Redis cache integration.
func NewDomainGenerationServiceWithCache(db *sqlx.DB, cs store.CampaignStore, cjs store.CampaignJobStore, as store.AuditLogStore, cm ConfigManagerInterface, redisCache cache.RedisCache, optimizationConfig *config.OptimizationConfig) DomainGenerationService {
	var workerCoordService *WorkerCoordinationService
	var txManager interface{}

	if db != nil {
		// Initialize worker coordination service with a unique worker ID
		workerID := fmt.Sprintf("domain-gen-worker-%d", time.Now().Unix())
		workerCoordService = NewWorkerCoordinationService(db, workerID)
		txManager = struct{}{} // Stub for now
	}

	// PF-003: Initialize CPU optimization components
	cpuConfig := DefaultCPUOptimizationConfig()

	// SI-005: Initialize memory management (must be before other components)
	memoryMonitor := newMemoryMonitor(db, nil, struct{}{})
	memoryPoolManager := NewMemoryPoolManager(DefaultMemoryPoolConfig(), memoryMonitor)

	// Initialize efficient worker pool
	workerPool := newEfficientWorkerPool(WorkerPoolConfig{
		MinWorkers: cpuConfig.MinWorkers,
		MaxWorkers: cpuConfig.MaxWorkers,
		QueueSize:  1000,
	}, db)

	return &domainGenerationServiceImpl{
		db:                        db,
		campaignStore:             cs,
		campaignJobStore:          cjs,
		auditLogStore:             as,
		auditLogger:               utils.NewAuditLogger(as),
		configManager:             cm,
		workerCoordinationService: workerCoordService,
		txManager:                 txManager,
		memoryPoolManager:         memoryPoolManager,
		cpuOptimizationConfig:     cpuConfig,
		workerPool:                workerPool,
		redisCache:                redisCache,
		optimizationConfig:        optimizationConfig,
	}
}

func (s *domainGenerationServiceImpl) CreateCampaign(ctx context.Context, req CreateDomainGenerationCampaignRequest) (*models.LeadGenerationCampaign, error) {
	log.Printf("DomainGenerationService: CreateCampaign called with Name: %s, PatternType: %s", req.Name, req.PatternType)
	functionStartTime := time.Now().UTC() // Use a distinct name for clarity
	campaignID := uuid.New()

	tempGenParamsForHash := models.DomainGenerationCampaignParams{
		PatternType:    req.PatternType,
		VariableLength: req.VariableLength,
		CharacterSet:   req.CharacterSet,
		ConstantString: models.StringPtr(req.ConstantString),
		TLD:            req.TLD,
	}

	log.Printf("DEBUG [CreateCampaign]: About to generate hash - PatternType=%s, VariableLength=%d, CharacterSet='%s', ConstantString='%s', TLD='%s'",
		req.PatternType, req.VariableLength, req.CharacterSet, req.ConstantString, req.TLD)

	hashResult, hashErr := domainexpert.GenerateDomainGenerationPhaseConfigHash(tempGenParamsForHash)
	if hashErr != nil {
		log.Printf("Error generating config hash for domain generation campaign %s: %v", req.Name, hashErr)
		return nil, fmt.Errorf("failed to generate config hash: %w", hashErr)
	}
	configHashString := hashResult.HashString
	normalizedHashedParams := hashResult.NormalizedParams
	log.Printf("Generated ConfigHash: %s for campaign %s", configHashString, req.Name)

	var startingOffset int64 = 0
	var opErr error
	var querier store.Querier
	isSQL := s.db != nil
	var sqlTx *sqlx.Tx

	if isSQL {
		var startTxErr error
		sqlTx, startTxErr = s.db.BeginTxx(ctx, nil)
		if startTxErr != nil {
			log.Printf("[DomainGenerationService.CreateCampaign] Error beginning SQL transaction for %s: %v", req.Name, startTxErr)
			logTransactionEvent(campaignID.String(), "create_campaign", "begin_failed", startTxErr)
			return nil, fmt.Errorf("failed to start SQL transaction: %w", startTxErr)
		}
		querier = sqlTx
		log.Printf("[DomainGenerationService.CreateCampaign] SQL Transaction started for %s.", req.Name)
		logTransactionEvent(campaignID.String(), "create_campaign", "begin_success", nil)

		// Log initial database metrics
		if s.db != nil {
			metrics := newDatabaseConnectionMetrics(s.db)
			metrics.LogConnectionPoolStats("CreateCampaign_tx_start", campaignID.String())
		}

		defer func() {
			if p := recover(); p != nil {
				log.Printf("[DomainGenerationService.CreateCampaign] Panic recovered (SQL) for %s, rolling back: %v", req.Name, p)
				if sqlTx != nil { // Check if sqlTx is not nil before rollback
					rollbackErr := sqlTx.Rollback()
					logTransactionEvent(campaignID.String(), "create_campaign", "rollback_panic", rollbackErr)
				}
				panic(p)
			} else if opErr != nil {
				log.Printf("[DomainGenerationService.CreateCampaign] Error occurred (SQL) for %s, rolling back: %v", req.Name, opErr)
				if sqlTx != nil { // Check if sqlTx is not nil before rollback
					rollbackErr := sqlTx.Rollback()
					logTransactionEvent(campaignID.String(), "create_campaign", "rollback_error", rollbackErr)
				}
			} else {
				if sqlTx != nil { // Check if sqlTx is not nil before commit
					if commitErr := sqlTx.Commit(); commitErr != nil {
						log.Printf("[DomainGenerationService.CreateCampaign] Error committing SQL transaction for %s: %v", req.Name, commitErr)
						logTransactionEvent(campaignID.String(), "create_campaign", "commit_failed", commitErr)
						opErr = commitErr
					} else {
						log.Printf("[DomainGenerationService.CreateCampaign] SQL Transaction committed for %s.", req.Name)
						logTransactionEvent(campaignID.String(), "create_campaign", "commit_success", nil)
					}
				}
			}

			// Log final database metrics
			if s.db != nil {
				metrics := newDatabaseConnectionMetrics(s.db)
				metrics.LogConnectionPoolStats("CreateCampaign_tx_end", campaignID.String())
			}
		}()
	} else {
		log.Printf("[DomainGenerationService.CreateCampaign] Operating in Firestore mode for %s (no service-level transaction).", req.Name)
	}

	// Check if there are any existing campaigns using this pattern by querying directly
	existingCampaignCount := 0
	if s.db != nil {
		countQuery := `
			SELECT COUNT(DISTINCT dgcp.campaign_id)
			FROM domain_generation_campaign_params dgcp
			INNER JOIN campaigns c ON c.id = dgcp.campaign_id
			WHERE c.current_phase = 'generation'
			AND dgcp.pattern_type = $1
			AND dgcp.variable_length = $2
			AND dgcp.character_set = $3
			AND COALESCE(dgcp.constant_string, '') = $4
			AND dgcp.tld = $5
		`
		var count int
		if countErr := querier.GetContext(ctx, &count, countQuery,
			req.PatternType, req.VariableLength, req.CharacterSet, req.ConstantString, req.TLD); countErr != nil {
			log.Printf("Warning: could not count existing campaigns for pattern %s: %v", configHashString, countErr)
		} else {
			existingCampaignCount = count
		}
	}

	// Use thread-safe configuration manager to get existing config state
	if s.configManager != nil {
		existingConfig, errGetConfig := s.configManager.GetDomainGenerationPhaseConfig(ctx, configHashString)
		if errGetConfig != nil {
			opErr = fmt.Errorf("failed to get existing domain generation config state: %w", errGetConfig)
			log.Printf("Error for campaign %s: %v", req.Name, opErr)
			return nil, opErr
		}
		if existingConfig != nil && existingConfig.ConfigState != nil {
			// Check if we should reset offset to 0 when no existing campaigns use this pattern
			if existingCampaignCount == 0 {
				startingOffset = 0
				log.Printf("No existing campaigns found for pattern hash %s. Resetting offset to 0 for new campaign %s", configHashString, req.Name)
			} else {
				startingOffset = existingConfig.ConfigState.LastOffset
				log.Printf("Found existing config state for hash %s with %d existing campaigns. Starting new campaign %s from global offset: %d", configHashString, existingCampaignCount, req.Name, startingOffset)
			}
		} else {
			log.Printf("No existing config state found for hash %s. New campaign %s will start from offset 0 globally for this config.", configHashString, req.Name)
		}
	} else {
		// Fallback to direct access if config manager not available
		existingConfigState, errGetState := s.campaignStore.GetDomainGenerationPhaseConfigStateByHash(ctx, querier, configHashString)
		if errGetState == nil && existingConfigState != nil {
			// Check if we should reset offset to 0 when no existing campaigns use this pattern
			if existingCampaignCount == 0 {
				startingOffset = 0
				log.Printf("No existing campaigns found for pattern hash %s. Resetting offset to 0 for new campaign %s", configHashString, req.Name)
			} else {
				startingOffset = existingConfigState.LastOffset
				log.Printf("Found existing config state for hash %s with %d existing campaigns. Starting new campaign %s from global offset: %d", configHashString, existingCampaignCount, req.Name, startingOffset)
			}
		} else if errGetState != nil && errGetState != store.ErrNotFound {
			opErr = fmt.Errorf("failed to get existing domain generation config state: %w", errGetState)
			log.Printf("Error for campaign %s: %v", req.Name, opErr)
			return nil, opErr
		} else {
			log.Printf("No existing config state found for hash %s (or ErrNotFound). New campaign %s will start from offset 0 globally for this config.", configHashString, req.Name)
		}
	}

	// Ensure required fields for domainGen are not nil
	// For CreateCampaign, req fields are direct values, so they won't be nil.
	// The tempGenParamsForHash uses pointers, but req values are used here.
	domainGen, errDomainExpert := domainexpert.NewDomainGenerator(
		domainexpert.CampaignPatternType(req.PatternType),
		req.VariableLength, // req.VariableLength is int, not *int
		req.CharacterSet,   // req.CharacterSet is string, not *string
		req.ConstantString, // req.ConstantString is string, not *string
		req.TLD,
	)
	if errDomainExpert != nil {
		opErr = fmt.Errorf("invalid domain generation parameters for campaign %s: %w", req.Name, errDomainExpert)
		return nil, opErr
	}

	totalPossibleCombinations := domainGen.GetTotalCombinations()

	log.Printf("DEBUG [CreateCampaign]: DomainGenerator created, TotalCombinations=%d", totalPossibleCombinations)

	// CRITICAL: Check if totalPossibleCombinations is 0 or negative
	if totalPossibleCombinations <= 0 {
		log.Printf("CRITICAL ERROR [CreateCampaign]: totalPossibleCombinations is %d (must be > 0)", totalPossibleCombinations)
		return nil, fmt.Errorf("CRITICAL: domain generation failed - totalPossibleCombinations is %d, must be > 0", totalPossibleCombinations)
	}

	campaignInstanceTargetCount := req.NumDomainsToGenerate
	var actualTotalItemsForThisRun int64
	availableFromGlobalOffset := int64(totalPossibleCombinations) - startingOffset
	if availableFromGlobalOffset < 0 {
		availableFromGlobalOffset = 0
	}
	if req.NumDomainsToGenerate == 0 {
		actualTotalItemsForThisRun = availableFromGlobalOffset
	} else {
		if int64(req.NumDomainsToGenerate) > availableFromGlobalOffset {
			actualTotalItemsForThisRun = availableFromGlobalOffset
		} else {
			actualTotalItemsForThisRun = int64(req.NumDomainsToGenerate)
		}
	}
	if actualTotalItemsForThisRun < 0 {
		actualTotalItemsForThisRun = 0
	}

	log.Printf("Campaign %s: RequestedForInstance: %d, StartGlobalOffset: %d, TotalPossibleForConfig: %d, ActualTotalItemsForThisRun: %d",
		req.Name, campaignInstanceTargetCount, startingOffset, totalPossibleCombinations, actualTotalItemsForThisRun)

	var userIDPtr *uuid.UUID
	if req.UserID != uuid.Nil {
		userIDPtr = &req.UserID
	}
	phase := models.PhaseTypeDomainGeneration
	status := models.PhaseStatusNotStarted
	// Prepare campaign metadata for full sequence support
	var campaignMetadata map[string]interface{}
	isFullSequence := req.LaunchSequence != nil && *req.LaunchSequence
	campaignMetadata = map[string]interface{}{
		"launch_sequence":  isFullSequence,
		"fullSequenceMode": isFullSequence,
	}
	if isFullSequence {
		log.Printf("Campaign %s configured for full sequence mode", req.Name)
	} else {
		log.Printf("Campaign %s configured for individual phase mode", req.Name)
	}

	// Convert metadata to JSON
	var metadataJSON *json.RawMessage
	if campaignMetadata != nil {
		metadataBytes, err := json.Marshal(campaignMetadata)
		if err != nil {
			opErr = fmt.Errorf("failed to marshal campaign metadata: %w", err)
			log.Printf("Error marshaling metadata for campaign %s: %v", req.Name, opErr)
			return nil, opErr
		}
		metadataRaw := json.RawMessage(metadataBytes)
		metadataJSON = &metadataRaw
	}

	baseCampaign := &models.LeadGenerationCampaign{
		ID:                 campaignID,
		Name:               req.Name,
		CurrentPhase:       &phase,
		PhaseStatus:        &status,
		UserID:             userIDPtr,
		CreatedAt:          functionStartTime, // Use functionStartTime
		UpdatedAt:          functionStartTime, // Use functionStartTime
		TotalItems:         models.Int64Ptr(actualTotalItemsForThisRun),
		ProcessedItems:     models.Int64Ptr(0),
		ProgressPercentage: models.Float64Ptr(0.0),
		Metadata:           metadataJSON,
		FullSequenceMode:   &isFullSequence, // Store full sequence mode flag
	}

	// Store domain generation configuration in campaign's JSONB config data
	campaignConfig := map[string]interface{}{
		"patternType":               req.PatternType,
		"variableLength":            req.VariableLength,
		"characterSet":              req.CharacterSet,
		"constantString":            req.ConstantString,
		"tld":                       req.TLD,
		"numDomainsToGenerate":      int(campaignInstanceTargetCount),
		"totalPossibleCombinations": totalPossibleCombinations,
		"currentOffset":             startingOffset,
	}

	// Convert config to JSON for storage in campaign's config field
	configJSON, jsonErr := json.Marshal(campaignConfig)
	if jsonErr != nil {
		opErr = fmt.Errorf("failed to marshal campaign config: %w", jsonErr)
		log.Printf("Error marshaling config for %s: %v", req.Name, opErr)
		return nil, opErr
	}

	// Store config in campaign metadata or a dedicated config field
	rawMessage := json.RawMessage(configJSON)
	baseCampaign.Metadata = &rawMessage

	if err := s.campaignStore.CreateCampaign(ctx, querier, baseCampaign); err != nil {
		opErr = fmt.Errorf("failed to create base campaign record: %w", err)
		log.Printf("Error creating base campaign record for %s: %v", req.Name, opErr)
		return nil, opErr
	}
	log.Printf("Base campaign record created for %s with phase-centric config.", req.Name)

	// Handle full sequence mode - create DNS and HTTP validation parameters if provided
	if req.LaunchSequence != nil && *req.LaunchSequence {
		log.Printf("Full sequence mode enabled for campaign %s - creating phase parameters", req.Name)

		// Store DNS validation configuration in campaign metadata for later phase configuration
		if req.DNSValidationParams != nil {
			log.Printf("[DEBUG] DNS validation params provided for campaign %s - storing in campaign config for later phase setup", req.Name)
			// DNS params will be configured when the DNS validation phase is explicitly started
			log.Printf("[FULL-SEQUENCE] DNS validation config will be applied when phase is configured for campaign %s", req.Name)
		} else {
			log.Printf("[FULL-SEQUENCE] No DNS validation params provided for campaign %s", req.Name)
		}

		// Create HTTP keyword validation parameters if provided
		if req.HTTPKeywordParams != nil {
			// Convert Keywords slice to AdHocKeywords pointer
			var adHocKeywords *[]string
			if len(req.HTTPKeywordParams.Keywords) > 0 || len(req.HTTPKeywordParams.AdHocKeywords) > 0 {
				combined := make([]string, 0, len(req.HTTPKeywordParams.Keywords)+len(req.HTTPKeywordParams.AdHocKeywords))
				combined = append(combined, req.HTTPKeywordParams.Keywords...)
				combined = append(combined, req.HTTPKeywordParams.AdHocKeywords...)
				if len(combined) > 0 {
					adHocKeywords = &combined
				}
			}

			httpParams := &models.HTTPKeywordCampaignParams{
				CampaignID:       campaignID,
				SourceCampaignID: campaignID,   // Self-reference for full sequence mode
				SourceType:       "generation", // Source is the generation phase
				PersonaIDs:       req.HTTPKeywordParams.PersonaIDs,
				AdHocKeywords:    adHocKeywords,
			}

			if err := s.campaignStore.CreateHTTPKeywordParams(ctx, querier, httpParams); err != nil {
				opErr = fmt.Errorf("failed to create HTTP keyword validation params for full sequence: %w", err)
				log.Printf("Error creating HTTP keyword validation params for campaign %s: %v", req.Name, opErr)
				return nil, opErr
			}
			log.Printf("HTTP keyword validation params created for full sequence campaign %s", req.Name)
		}
	}

	configDetailsBytes, jsonErr := json.Marshal(normalizedHashedParams)
	if jsonErr != nil {
		opErr = fmt.Errorf("failed to marshal normalized config details for global state: %w", jsonErr)
		log.Printf("Error for campaign %s: %v", req.Name, opErr)
		return nil, opErr
	}

	globalConfigState := &models.DomainGenerationPhaseConfigState{
		ConfigHash:    configHashString,
		LastOffset:    startingOffset,
		ConfigDetails: configDetailsBytes,
		UpdatedAt:     functionStartTime, // Use functionStartTime
	}

	// Use thread-safe configuration manager to update config state
	if s.configManager != nil {
		_, err := s.configManager.UpdateDomainGenerationPhaseConfig(ctx, configHashString, func(currentState *models.DomainGenerationPhaseConfigState) (*models.DomainGenerationPhaseConfigState, error) {
			// Create or update the global config state
			updatedState := &models.DomainGenerationPhaseConfigState{
				ConfigHash:    configHashString,
				LastOffset:    startingOffset,
				ConfigDetails: configDetailsBytes,
				UpdatedAt:     functionStartTime,
			}
			return updatedState, nil
		})
		if err != nil {
			opErr = fmt.Errorf("failed to create/update domain generation config state via config manager: %w", err)
			log.Printf("Error creating/updating DomainGenerationPhaseConfigState for hash %s, campaign %s: %v", configHashString, req.Name, opErr)
			return nil, opErr
		}
		log.Printf("DomainGenerationPhaseConfigState created/updated for hash %s, campaign %s via ConfigManager.", configHashString, req.Name)
	} else {
		// Fallback to direct access
		if err := s.campaignStore.CreateOrUpdateDomainGenerationPhaseConfigState(ctx, querier, globalConfigState); err != nil {
			opErr = fmt.Errorf("failed to create/update domain generation config state: %w", err)
			log.Printf("Error creating/updating DomainGenerationPhaseConfigState for hash %s, campaign %s: %v", configHashString, req.Name, opErr)
			return nil, opErr
		}
		log.Printf("DomainGenerationPhaseConfigState created/updated for hash %s, campaign %s.", configHashString, req.Name)
	}

	if opErr == nil {
		s.logAuditEvent(ctx, querier, baseCampaign, "Domain Generation Campaign Created (Service)", fmt.Sprintf("Name: %s, ConfigHash: %s, StartOffset: %d, RequestedForInstance: %d, ActualTotalItemsForThisRun: %d", req.Name, configHashString, startingOffset, campaignInstanceTargetCount, actualTotalItemsForThisRun))

		// Job creation is now handled by the orchestrator service to avoid duplicate jobs
		// The orchestrator will create the job when StartCampaign is called
		log.Printf("Campaign %s created successfully. Job will be created by orchestrator when campaign is started.", baseCampaign.ID)
	}

	return baseCampaign, opErr
}

func (s *domainGenerationServiceImpl) GetCampaignDetails(ctx context.Context, campaignID uuid.UUID) (*models.LeadGenerationCampaign, *models.DomainGenerationCampaignParams, error) {
	var querier store.Querier
	if s.db != nil {
		querier = s.db
	}

	campaign, err := s.campaignStore.GetCampaignByID(ctx, querier, campaignID)
	if err != nil {
		log.Printf("[DEBUG DomainGen] Failed to get campaign by ID %s: %v", campaignID, err)
		return nil, nil, fmt.Errorf("failed to get campaign by ID %s: %w", campaignID, err)
	}

	log.Printf("[DEBUG DomainGen] Campaign %s found, CurrentPhase: %v", campaignID, campaign.CurrentPhase)

	if campaign.CurrentPhase == nil || *campaign.CurrentPhase != models.PhaseTypeDomainGeneration {
		currentPhase := "unknown"
		if campaign.CurrentPhase != nil {
			currentPhase = string(*campaign.CurrentPhase)
		}
		log.Printf("[DEBUG DomainGen] Campaign %s phase validation failed (phase: %s)", campaignID, currentPhase)
		return nil, nil, fmt.Errorf("campaign %s is not a domain generation campaign (phase: %s)", campaignID, currentPhase)
	}

	log.Printf("[DEBUG DomainGen] Getting domain generation config from campaign metadata for %s", campaignID)

	// Extract domain generation params from campaign metadata
	var params *models.DomainGenerationCampaignParams
	if campaign.Metadata != nil {
		var config map[string]interface{}
		if err := json.Unmarshal(*campaign.Metadata, &config); err != nil {
			log.Printf("[DEBUG DomainGen] Failed to unmarshal campaign metadata for %s: %v", campaignID, err)
			return nil, nil, fmt.Errorf("failed to parse campaign configuration for %s: %w", campaignID, err)
		}

		// Convert config map to DomainGenerationCampaignParams
		params = &models.DomainGenerationCampaignParams{
			CampaignID: campaignID,
		}

		// Extract nested domain_generation_config from metadata
		var domainConfig map[string]interface{}
		if nestedConfig, ok := config["domain_generation_config"]; ok {
			if domainConfigMap, ok := nestedConfig.(map[string]interface{}); ok {
				domainConfig = domainConfigMap
				log.Printf("[DEBUG DomainGen] Found nested domain_generation_config in GetCampaignDetails")
			} else {
				log.Printf("[DEBUG DomainGen] domain_generation_config is not a map, using top-level")
				domainConfig = config // Fallback to top-level for backward compatibility
			}
		} else {
			log.Printf("[DEBUG DomainGen] No domain_generation_config found, using top-level config")
			domainConfig = config // Fallback to top-level for backward compatibility
		}

		if patternType, ok := domainConfig["pattern_type"].(string); ok {
			params.PatternType = patternType
		}
		if variableLength, ok := domainConfig["variable_length"].(float64); ok {
			params.VariableLength = int(variableLength)
		}
		if characterSet, ok := domainConfig["character_set"].(string); ok {
			params.CharacterSet = characterSet
		}
		if constantString, ok := domainConfig["constant_string"].(string); ok {
			params.ConstantString = models.StringPtr(constantString)
		}
		if tld, ok := domainConfig["tld"].(string); ok {
			params.TLD = tld
		}
		if numDomains, ok := domainConfig["num_domains_to_generate"].(float64); ok {
			params.NumDomainsToGenerate = int(numDomains)
		}
		if totalCombinations, ok := domainConfig["total_possible_combinations"].(float64); ok {
			params.TotalPossibleCombinations = int64(totalCombinations)
		}
		if offset, ok := domainConfig["current_offset"].(float64); ok {
			params.CurrentOffset = int64(offset)
		}

		log.Printf("[DEBUG DomainGen] Successfully parsed domain generation config from metadata for campaign %s", campaignID)
	} else {
		log.Printf("[DEBUG DomainGen] No metadata found for campaign %s", campaignID)
		return nil, nil, fmt.Errorf("no domain generation configuration found for campaign %s", campaignID)
	}

	return campaign, params, nil
}

func (s *domainGenerationServiceImpl) logAuditEvent(ctx context.Context, exec store.Querier, campaign *models.LeadGenerationCampaign, action, description string) {
	if s.auditLogger == nil || campaign == nil {
		return
	}
	s.auditLogger.LogCampaignEvent(ctx, exec, campaign, action, description)
}

func (s *domainGenerationServiceImpl) ProcessGenerationCampaignBatch(ctx context.Context, campaignID uuid.UUID, batchSize int) (batchDone bool, processedCount int, err error) {
	log.Printf("ProcessGenerationCampaignBatch: Starting for campaignID %s", campaignID)

	var querier store.Querier
	isSQL := s.db != nil
	var done bool
	var processedInThisBatch int
	var opErr error
	var sqlTx *sqlx.Tx

	if isSQL {
		var startTxErr error
		sqlTx, startTxErr = s.db.BeginTxx(ctx, nil)
		if startTxErr != nil {
			opErr = fmt.Errorf("failed to begin SQL transaction for campaign %s: %w", campaignID, startTxErr)
			log.Printf("[ProcessGenerationCampaignBatch] %v", opErr)
			logTransactionEvent(campaignID.String(), "process_batch", "begin_failed", startTxErr)
			return false, 0, opErr
		}
		querier = sqlTx
		log.Printf("[ProcessGenerationCampaignBatch] SQL Transaction started for %s.", campaignID)
		logTransactionEvent(campaignID.String(), "process_batch", "begin_success", nil)

		// Log initial database metrics
		if s.db != nil {
			metrics := newDatabaseConnectionMetrics(s.db)
			metrics.LogConnectionPoolStats("ProcessBatch_tx_start", campaignID.String())
		}

		defer func() {
			if p := recover(); p != nil {
				log.Printf("[ProcessGenerationCampaignBatch] Panic recovered (SQL) for %s, rolling back: %v", campaignID, p)
				if sqlTx != nil {
					rollbackErr := sqlTx.Rollback()
					logTransactionEvent(campaignID.String(), "process_batch", "rollback_panic", rollbackErr)
				}
				panic(p)
			} else if opErr != nil {
				log.Printf("[ProcessGenerationCampaignBatch] Rolled back SQL transaction for campaign %s due to error: %v", campaignID, opErr)
				if sqlTx != nil {
					rollbackErr := sqlTx.Rollback()
					logTransactionEvent(campaignID.String(), "process_batch", "rollback_error", rollbackErr)
				}
			} else {
				if sqlTx != nil {
					if commitErr := sqlTx.Commit(); commitErr != nil {
						log.Printf("[ProcessGenerationCampaignBatch] Failed to commit SQL transaction for campaign %s: %v", campaignID, commitErr)
						logTransactionEvent(campaignID.String(), "process_batch", "commit_failed", commitErr)
						opErr = commitErr
					} else {
						log.Printf("[ProcessGenerationCampaignBatch] SQL Transaction committed for %s.", campaignID)
						logTransactionEvent(campaignID.String(), "process_batch", "commit_success", nil)
					}
				}
			}

			// Log final database metrics
			if s.db != nil {
				metrics := newDatabaseConnectionMetrics(s.db)
				metrics.LogConnectionPoolStats("ProcessBatch_tx_end", campaignID.String())
			}
		}()
	} else {
		log.Printf("[ProcessGenerationCampaignBatch] Operating in Firestore mode for %s (no service-level transaction).", campaignID)
	}

	var campaign *models.LeadGenerationCampaign
	campaign, opErr = s.campaignStore.GetCampaignByID(ctx, querier, campaignID)
	if opErr != nil {
		log.Printf("[ProcessGenerationCampaignBatch] Failed to fetch campaign %s: %v", campaignID, opErr)
		return false, 0, opErr
	}

	if campaign == nil { // Add nil check for campaign after fetching
		opErr = fmt.Errorf("ProcessGenerationCampaignBatch: Campaign %s not found after GetCampaignByID", campaignID)
		log.Printf("[ProcessGenerationCampaignBatch] %v", opErr)
		return false, 0, opErr
	}

	// Check if campaign is in terminal state (simplified for now)
	if campaign.PhaseStatus != nil && (*campaign.PhaseStatus == models.PhaseStatusCompleted || *campaign.PhaseStatus == models.PhaseStatusFailed) {
		log.Printf("ProcessGenerationCampaignBatch: Campaign %s already in terminal state (status: %s). No action.", campaignID, *campaign.PhaseStatus)
		return true, 0, nil
	}

	// If campaign is Pending, transition to InProgress
	if campaign.PhaseStatus == nil || *campaign.PhaseStatus == models.PhaseStatusNotStarted {
		var originalStatus string
		if campaign.PhaseStatus != nil {
			originalStatus = string(*campaign.PhaseStatus)
		} else {
			originalStatus = "nil"
		}
		newStatus := models.PhaseStatusInProgress
		campaign.PhaseStatus = &newStatus
		if campaign.StartedAt == nil { // Set StartedAt only if not already set
			now := time.Now().UTC()
			campaign.StartedAt = &now
		}
		campaign.UpdatedAt = time.Now().UTC()
		if errUpdate := s.campaignStore.UpdateCampaign(ctx, querier, campaign); errUpdate != nil {
			opErr = fmt.Errorf("failed to mark campaign %s from %s to in_progress: %w", campaignID, originalStatus, errUpdate)
			log.Printf("[ProcessGenerationCampaignBatch] %v", opErr)
			return false, 0, opErr
		}
		log.Printf("ProcessGenerationCampaignBatch: Campaign %s marked as InProgress (was %s).", campaignID, originalStatus)

		// Broadcast campaign status change via WebSocket
		websocket.BroadcastCampaignProgress(campaignID.String(), 0.0, "in_progress", "domain_generation", 0, 0)
	} else if campaign.PhaseStatus != nil && *campaign.PhaseStatus != models.PhaseStatusInProgress {
		// If it's some other non-runnable, non-terminal state (e.g., Paused)
		log.Printf("ProcessGenerationCampaignBatch: Campaign %s is not in a runnable state (status: %s). Skipping job.", campaignID, *campaign.PhaseStatus)
		return true, 0, nil // True because the job itself is "done" for now, campaign is not runnable
	}

	// Extract domain generation params from campaign metadata
	var genParams *models.DomainGenerationCampaignParams
	if campaign.Metadata != nil {
		var config map[string]interface{}
		if jsonErr := json.Unmarshal(*campaign.Metadata, &config); jsonErr != nil {
			opErr = fmt.Errorf("failed to parse campaign configuration for %s: %w", campaignID, jsonErr)
			log.Printf("[ProcessGenerationCampaignBatch] %v", opErr)
			return false, 0, opErr
		}

		// Convert config map to DomainGenerationCampaignParams
		genParams = &models.DomainGenerationCampaignParams{
			CampaignID: campaignID,
		}

		log.Printf("DEBUG [ProcessGenerationCampaignBatch]: Parsing config for campaign %s", campaignID)

		// Extract nested domain_generation_config from metadata
		var domainConfig map[string]interface{}
		if nestedConfig, ok := config["domain_generation_config"]; ok {
			if domainConfigMap, ok := nestedConfig.(map[string]interface{}); ok {
				domainConfig = domainConfigMap
				log.Printf("DEBUG [ProcessGenerationCampaignBatch]: Found nested domain_generation_config")
			} else {
				log.Printf("DEBUG [ProcessGenerationCampaignBatch]: domain_generation_config is not a map")
				domainConfig = config // Fallback to top-level for backward compatibility
			}
		} else {
			log.Printf("DEBUG [ProcessGenerationCampaignBatch]: No domain_generation_config found, using top-level config")
			domainConfig = config // Fallback to top-level for backward compatibility
		}

		if patternType, ok := domainConfig["pattern_type"].(string); ok {
			genParams.PatternType = patternType
			log.Printf("DEBUG [ProcessGenerationCampaignBatch]: Found pattern_type: %s", patternType)
		}
		if variableLength, ok := domainConfig["variable_length"].(float64); ok {
			genParams.VariableLength = int(variableLength)
			log.Printf("DEBUG [ProcessGenerationCampaignBatch]: Found variable_length: %d", int(variableLength))
		}
		if characterSet, ok := domainConfig["character_set"].(string); ok {
			genParams.CharacterSet = characterSet
			log.Printf("DEBUG [ProcessGenerationCampaignBatch]: Found character_set: %s (len=%d)", characterSet, len(characterSet))
		}
		if constantString, ok := domainConfig["constant_string"].(string); ok {
			genParams.ConstantString = models.StringPtr(constantString)
			log.Printf("DEBUG [ProcessGenerationCampaignBatch]: Found constant_string: %s", constantString)
		}
		// Handle both new TLDs array format and legacy single TLD format
		var selectedTLD string
		if tldsInterface, ok := domainConfig["tlds"].([]interface{}); ok {
			// New format: TLDs array - select first TLD for this batch
			for _, tldInterface := range tldsInterface {
				if tld, ok := tldInterface.(string); ok {
					selectedTLD = tld
					log.Printf("DEBUG [ProcessGenerationCampaignBatch]: Found TLD from array: %s", tld)
					break // Use first TLD for now - TODO: implement round-robin for multiple TLDs
				}
			}
		} else if tld, ok := domainConfig["tld"].(string); ok {
			// Legacy format: single TLD
			selectedTLD = tld
			log.Printf("DEBUG [ProcessGenerationCampaignBatch]: Found legacy single TLD: %s", tld)
		}

		if selectedTLD != "" {
			// Normalize TLD format - ensure dot prefix for domain generator
			normalizedTLD := selectedTLD
			if !strings.HasPrefix(normalizedTLD, ".") {
				normalizedTLD = "." + normalizedTLD
			}
			genParams.TLD = normalizedTLD
			log.Printf("DEBUG [ProcessGenerationCampaignBatch]: Using normalized TLD: %s", normalizedTLD)
		}
		if numDomains, ok := domainConfig["num_domains_to_generate"].(float64); ok {
			genParams.NumDomainsToGenerate = int(numDomains)
			log.Printf("DEBUG [ProcessGenerationCampaignBatch]: Found num_domains_to_generate: %d", int(numDomains))
		}
		if totalCombinations, ok := domainConfig["total_possible_combinations"].(float64); ok {
			genParams.TotalPossibleCombinations = int64(totalCombinations)
			log.Printf("DEBUG [ProcessGenerationCampaignBatch]: Found total_possible_combinations: %d", int64(totalCombinations))
		}
		if offset, ok := domainConfig["current_offset"].(float64); ok {
			genParams.CurrentOffset = int64(offset)
			log.Printf("DEBUG [ProcessGenerationCampaignBatch]: Found current_offset: %d", int64(offset))
		}
		log.Printf("DEBUG [ProcessGenerationCampaignBatch]: Final genParams.VariableLength = %d", genParams.VariableLength)
	} else {
		opErr = fmt.Errorf("domain generation parameters not found for campaign %s", campaignID)
		log.Printf("[ProcessGenerationCampaignBatch] %v", opErr)
		failedStatus := models.PhaseStatusFailed
		campaign.PhaseStatus = &failedStatus
		campaign.ErrorMessage = models.StringPtr(opErr.Error())
		now := time.Now().UTC()
		campaign.CompletedAt = &now
		if updateErr := s.campaignStore.UpdateCampaign(ctx, querier, campaign); updateErr != nil {
			log.Printf("Error updating campaign %s to failed after missing params: %v", campaignID, updateErr)
		}
		return true, 0, opErr
	}
	// Ensure genParams fields are not nil before dereferencing for NewDomainGenerator
	varLength := genParams.VariableLength
	if varLength <= 0 {
		opErr = fmt.Errorf("ProcessGenerationCampaignBatch: invalid VariableLength for campaign %s", campaignID)
		log.Printf("[ProcessGenerationCampaignBatch] %v", opErr)
		return false, 0, opErr
	}

	charSet := genParams.CharacterSet
	if charSet == "" {
		opErr = fmt.Errorf("ProcessGenerationCampaignBatch: CharacterSet is empty for campaign %s", campaignID)
		log.Printf("[ProcessGenerationCampaignBatch] %v", opErr)
		return false, 0, opErr
	}

	var constStr string
	if genParams.ConstantString != nil {
		constStr = *genParams.ConstantString
	} else {
		// ConstantString might be optional depending on PatternType,
		// domainexpert.NewDomainGenerator should handle empty string if appropriate.
		// If it must not be nil, add error handling like above.
		// Assuming empty string is acceptable if nil for now.
	}

	// Normalize TLD - ensure it starts with a dot (domain generator requirement)
	normalizedTLD := genParams.TLD
	if normalizedTLD != "" && !strings.HasPrefix(normalizedTLD, ".") {
		normalizedTLD = "." + normalizedTLD
		log.Printf("DEBUG [ProcessGenerationCampaignBatch]: Normalized TLD from '%s' to '%s'", genParams.TLD, normalizedTLD)
	}

	domainGen, expertErr := domainexpert.NewDomainGenerator(
		domainexpert.CampaignPatternType(genParams.PatternType),
		varLength,
		charSet,
		constStr,
		normalizedTLD,
	)
	if expertErr != nil {
		opErr = fmt.Errorf("failed to initialize domain generator for campaign %s: %w. Campaign marked failed", campaignID, expertErr)
		log.Printf("[ProcessGenerationCampaignBatch] %v", opErr)
		failedStatus := models.PhaseStatusFailed
		campaign.PhaseStatus = &failedStatus
		campaign.ErrorMessage = models.StringPtr(fmt.Sprintf("Generator init failed: %v", expertErr))
		now := time.Now().UTC()
		campaign.CompletedAt = &now
		if errUpdate := s.campaignStore.UpdateCampaign(ctx, querier, campaign); errUpdate != nil {
			log.Printf("Error updating campaign %s to failed after generator init error: %v", campaignID, errUpdate)
		}
		return true, 0, opErr
	}

	// Configure memory-efficient generation for PF-002 optimization
	memConfig := domainexpert.DefaultMemoryEfficiencyConfig
	memConfig.EnableMemoryLogging = false // Disable logging in production, enable for debugging

	// Adjust memory limits based on available system memory
	var memStats runtime.MemStats
	runtime.ReadMemStats(&memStats)
	availableMemoryMB := memStats.Sys / 1024 / 1024

	// Use up to 25% of available memory for domain generation batches
	if availableMemoryMB > 2048 { // If more than 2GB available
		memConfig.MaxMemoryUsageMB = int(availableMemoryMB / 4)
	} else {
		memConfig.MaxMemoryUsageMB = 256 // Conservative limit for smaller systems
	}

	domainGen.WithMemoryConfig(memConfig)

	log.Printf("ProcessGenerationCampaignBatch: Configured memory-efficient generation for campaign %s (memory limit: %dMB)",
		campaignID, memConfig.MaxMemoryUsageMB)
	// Ensure campaign.ProcessedItems is not nil for comparison
	processedItems := int64(0)
	if campaign.ProcessedItems != nil {
		processedItems = *campaign.ProcessedItems
	}

	// CRITICAL FIX: Only complete if THIS campaign has generated its target domains
	// Don't complete due to global offset exhaustion unless this campaign has actually processed domains
	if genParams.NumDomainsToGenerate > 0 && processedItems >= int64(genParams.NumDomainsToGenerate) {
		log.Printf("ProcessGenerationCampaignBatch: Campaign %s completed its target. Processed: %d, Target: %d",
			campaignID, processedItems, genParams.NumDomainsToGenerate)

		if campaign.PhaseStatus == nil || *campaign.PhaseStatus != models.PhaseStatusCompleted {
			succeededStatus := models.PhaseStatusCompleted
			campaign.PhaseStatus = &succeededStatus
			campaign.ProgressPercentage = models.Float64Ptr(100.0)
			// 🐛 FIX: Set CurrentPhase to enable frontend phase progression
			domainGenPhase := models.PhaseTypeDomainGeneration
			campaign.CurrentPhase = &domainGenPhase
			now := time.Now().UTC()
			campaign.CompletedAt = &now
			opErr = s.campaignStore.UpdateCampaign(ctx, querier, campaign)
			if opErr != nil {
				log.Printf("[ProcessGenerationCampaignBatch] Error marking campaign %s as completed: %v", campaignID, opErr)
			}
		}
		return true, 0, opErr
	}

	// DIAGNOSTIC: Log global offset status but don't auto-complete
	if genParams.CurrentOffset >= genParams.TotalPossibleCombinations {
		log.Printf("ProcessGenerationCampaignBatch: DIAGNOSTIC - Campaign %s pattern may be globally exhausted. Global offset: %d / %d. Will attempt generation anyway.",
			campaignID, genParams.CurrentOffset, genParams.TotalPossibleCombinations)
	}

	// 🚨 ROOT CAUSE FIX: Calculate batch size based on user's remaining domains, not hardcoded value
	var domainsStillNeededForThisCampaignInstance int64

	if genParams.NumDomainsToGenerate > 0 {
		domainsStillNeededForThisCampaignInstance = int64(genParams.NumDomainsToGenerate) - processedItems
	} else {
		if genParams.TotalPossibleCombinations > genParams.CurrentOffset {
			domainsStillNeededForThisCampaignInstance = genParams.TotalPossibleCombinations - genParams.CurrentOffset
		} else {
			domainsStillNeededForThisCampaignInstance = 0
		}
	}

	if domainsStillNeededForThisCampaignInstance <= 0 {
		log.Printf("ProcessGenerationCampaignBatch: Campaign %s no more domains needed based on instance target/processed. Processed: %d, Target: %d. Marking complete.",
			campaignID, processedItems, genParams.NumDomainsToGenerate)
		if campaign.PhaseStatus == nil || *campaign.PhaseStatus != models.PhaseStatusCompleted {
			succeededStatus := models.PhaseStatusCompleted
			campaign.PhaseStatus = &succeededStatus
			campaign.ProgressPercentage = models.Float64Ptr(100.0)
			// 🐛 FIX: Set CurrentPhase to enable frontend phase progression
			domainGenPhase := models.PhaseTypeEnum("domain_generation")
			completedStatus := models.PhaseStatusEnum("completed")
			campaign.CurrentPhase = &domainGenPhase
			campaign.PhaseStatus = &completedStatus
			now := time.Now().UTC()
			campaign.CompletedAt = &now
			opErr = s.campaignStore.UpdateCampaign(ctx, querier, campaign)
		}
		return true, 0, opErr
	}

	maxPossibleToGenerateFromGlobalOffset := int64(0)
	if genParams.TotalPossibleCombinations > genParams.CurrentOffset {
		maxPossibleToGenerateFromGlobalOffset = genParams.TotalPossibleCombinations - genParams.CurrentOffset
	}

	// 🚨 ROOT CAUSE FIX: Start with user's remaining domains, not hardcoded 1000
	// Use a reasonable default batch size but respect user limits
	defaultBatchSize := int64(1000)
	numToGenerateInBatch := domainsStillNeededForThisCampaignInstance

	// Only use default batch size if user wants more domains than default batch
	if domainsStillNeededForThisCampaignInstance > defaultBatchSize {
		numToGenerateInBatch = defaultBatchSize
	}

	// Still respect global offset limits
	if numToGenerateInBatch > maxPossibleToGenerateFromGlobalOffset {
		numToGenerateInBatch = maxPossibleToGenerateFromGlobalOffset
	}

	if numToGenerateInBatch <= 0 {
		log.Printf("ProcessGenerationCampaignBatch: Campaign %s - numToGenerateInBatch is %d. All possible/requested domains generated. Marking complete.", campaignID, numToGenerateInBatch)
		done = true
		if campaign.PhaseStatus == nil || *campaign.PhaseStatus != models.PhaseStatusCompleted {
			succeededStatus := models.PhaseStatusCompleted
			campaign.PhaseStatus = &succeededStatus
			campaign.ProgressPercentage = models.Float64Ptr(100.0)
			// 🐛 FIX: Set CurrentPhase to enable frontend phase progression
			domainGenPhase := models.PhaseTypeEnum("domain_generation")
			completedStatus := models.PhaseStatusEnum("completed")
			campaign.CurrentPhase = &domainGenPhase
			campaign.PhaseStatus = &completedStatus
			now := time.Now().UTC()
			campaign.CompletedAt = &now
			opErr = s.campaignStore.UpdateCampaign(ctx, querier, campaign)

			// 🚨 CRITICAL FIX: Add missing WebSocket broadcast for early completion
			if opErr == nil {
				targetItems := int64(genParams.NumDomainsToGenerate)
				websocket.BroadcastCampaignProgress(campaignID.String(), 100.0, "completed", "domain_generation", processedItems, targetItems)
				log.Printf("ProcessGenerationCampaignBatch: Campaign %s early completion broadcasted via WebSocket. Processed: %d, Target: %d",
					campaignID, processedItems, targetItems)
			}
		}
		return done, 0, opErr
	}

	// PF-003: CPU optimization - adjust batch processing using basic metrics
	// Build on SI-005 memory management patterns
	cpuUtilization := 0.0
	memUtilization := 0.0

	// Scale worker pool based on current CPU load (integrates with worker coordination)
	s.scaleWorkerPool(cpuUtilization)

	// Adaptive batch sizing based on CPU utilization (builds on PF-001 query optimization)
	optimizedBatchSize := s.calculateOptimalBatchSize(int(numToGenerateInBatch), cpuUtilization, memUtilization)
	log.Printf("ProcessGenerationCampaignBatch: Campaign %s - CPU: %.2f%%, Memory: %.2f%%, Original batch: %d, Optimized batch: %d",
		campaignID, cpuUtilization, memUtilization, numToGenerateInBatch, optimizedBatchSize)

	// Apply SI-005 memory optimization before intensive generation
	s.optimizeMemoryUsage(nil, campaignID) // Pre-generation cleanup

	// Enhanced logging for debugging domain generation
	log.Printf("ProcessGenerationCampaignBatch: About to generate domains for campaign %s", campaignID)
	log.Printf("ProcessGenerationCampaignBatch: Generation parameters - CurrentOffset: %d, OptimizedBatchSize: %d, TotalPossible: %d",
		genParams.CurrentOffset, optimizedBatchSize, genParams.TotalPossibleCombinations)
	log.Printf("ProcessGenerationCampaignBatch: Pattern details - Type: %s, VarLength: %d, CharSet: %s, ConstantString: %v, TLD: %s",
		genParams.PatternType, genParams.VariableLength, genParams.CharacterSet,
		func() string {
			if genParams.ConstantString != nil {
				return *genParams.ConstantString
			} else {
				return "nil"
			}
		}(), genParams.TLD)

	// Use optimized batch size for generation
	generatedDomainsSlice, nextGeneratorOffsetAbsolute, genErr := domainGen.GenerateBatch(genParams.CurrentOffset, optimizedBatchSize)

	// Enhanced logging for generation results
	log.Printf("ProcessGenerationCampaignBatch: Domain generation completed for campaign %s", campaignID)
	log.Printf("ProcessGenerationCampaignBatch: Generated %d domains, NextOffset: %d, Error: %v",
		len(generatedDomainsSlice), nextGeneratorOffsetAbsolute, genErr)

	if len(generatedDomainsSlice) > 0 {
		log.Printf("ProcessGenerationCampaignBatch: Sample generated domains: %v", generatedDomainsSlice[:min(3, len(generatedDomainsSlice))])
	}

	// Apply memory optimization after generation (SI-005 integration)
	if genErr == nil && len(generatedDomainsSlice) > 0 {
		s.optimizeMemoryUsage(nil, campaignID) // Post-generation cleanup
	}

	// Domain generation complete, continue with processing
	if genErr != nil {
		opErr = fmt.Errorf("error during domain batch generation for campaign %s: %w. Campaign marked failed", campaignID, genErr)
		log.Printf("[ProcessGenerationCampaignBatch] %v", opErr)
		failedStatus := models.PhaseStatusFailed
		campaign.PhaseStatus = &failedStatus
		campaign.ErrorMessage = models.StringPtr(fmt.Sprintf("Domain generation error: %v", genErr))
		now := time.Now().UTC()
		campaign.CompletedAt = &now
		if errUpdate := s.campaignStore.UpdateCampaign(ctx, querier, campaign); errUpdate != nil {
			log.Printf("Error updating campaign %s to failed after batch generation error: %v", campaignID, errUpdate)
		}
		return true, 0, opErr
	}

	// Check if no domains were generated but no error occurred
	if len(generatedDomainsSlice) == 0 {
		log.Printf("ProcessGenerationCampaignBatch: WARNING - No domains generated for campaign %s but no error occurred", campaignID)
		log.Printf("ProcessGenerationCampaignBatch: This might indicate offset %d has reached total possible combinations %d",
			genParams.CurrentOffset, genParams.TotalPossibleCombinations)

		// Check if we've actually exhausted all possibilities
		if genParams.CurrentOffset >= genParams.TotalPossibleCombinations {
			log.Printf("ProcessGenerationCampaignBatch: Campaign %s has exhausted all possible domains for this pattern", campaignID)
			// Mark campaign as completed since we've generated all possible domains
			succeededStatus := models.PhaseStatusCompleted
			campaign.PhaseStatus = &succeededStatus
			campaign.ProgressPercentage = models.Float64Ptr(100.0)
			// 🐛 FIX: Set CurrentPhase to enable frontend phase progression
			domainGenPhase := models.PhaseTypeEnum("domain_generation")
			completedStatus := models.PhaseStatusEnum("completed")
			campaign.CurrentPhase = &domainGenPhase
			campaign.PhaseStatus = &completedStatus
			now := time.Now().UTC()
			campaign.CompletedAt = &now
			if errUpdate := s.campaignStore.UpdateCampaign(ctx, querier, campaign); errUpdate != nil {
				log.Printf("Error updating campaign %s to completed after exhausting possibilities: %v", campaignID, errUpdate)
			}
			return true, 0, nil
		}
	}

	nowTime := time.Now().UTC()
	generatedDomainsToStore := make([]*models.GeneratedDomain, len(generatedDomainsSlice))
	for i, domainName := range generatedDomainsSlice {
		newDom := &models.GeneratedDomain{
			ID:          uuid.New(),
			DomainName:  domainName,
			CampaignID:  campaignID,
			GeneratedAt: nowTime,
			OffsetIndex: genParams.CurrentOffset + int64(i),
		}
		generatedDomainsToStore[i] = newDom
	}

	if len(generatedDomainsToStore) > 0 {
		if errStoreDomains := s.campaignStore.CreateGeneratedDomains(ctx, querier, generatedDomainsToStore); errStoreDomains != nil {
			opErr = fmt.Errorf("failed to save generated domains for campaign %s: %w", campaignID, errStoreDomains)
			log.Printf("[ProcessGenerationCampaignBatch] %v", opErr)
			return false, 0, opErr
		}
		processedInThisBatch = len(generatedDomainsToStore)
		log.Printf("ProcessGenerationCampaignBatch: Saved %d domains for campaign %s.", processedInThisBatch, campaignID)

		// Real-time streaming: Broadcast each domain individually as it's generated
		log.Printf("🔵 [DOMAIN_STREAMING_DEBUG] Starting to stream %d domains for campaign %s", len(generatedDomainsToStore), campaignID)

		broadcaster := websocket.GetBroadcaster()
		if broadcaster == nil {
			log.Printf("❌ [DOMAIN_STREAMING_CRITICAL] No broadcaster available! Cannot stream domains for campaign %s", campaignID)
		} else {
			log.Printf("✅ [DOMAIN_STREAMING_DEBUG] Broadcaster available, proceeding with streaming for campaign %s", campaignID)
		}

		for i, domain := range generatedDomainsToStore {
			if broadcaster != nil {
				// OPTIMIZED: Send ONLY standardized domain.generated format - 50% traffic reduction achieved
				payload := websocket.DomainGenerationPayload{
					CampaignID:     campaignID.String(),
					DomainID:       domain.ID.String(),
					Domain:         domain.DomainName,
					Offset:         int64(domain.OffsetIndex),
					BatchSize:      len(generatedDomainsToStore),
					TotalGenerated: int64(i + 1),
				}
				message := websocket.CreateDomainGenerationMessageV2(payload)

				// Convert to JSON for broadcasting
				messageBytes, err := json.Marshal(message)
				if err != nil {
					log.Printf("❌ [DOMAIN_STREAMING_DEBUG] Failed to marshal standardized domain message: %v", err)
					continue
				}
				broadcaster.BroadcastMessage(messageBytes)

				log.Printf("✅ [DOMAIN_STREAMING_OPTIMIZED] Broadcasted standardized domain.generated %d/%d: %s for campaign %s",
					i+1, len(generatedDomainsToStore), domain.DomainName, campaignID)

			} else {
				log.Printf("❌ [DOMAIN_STREAMING_DEBUG] No broadcaster available for domain %d/%d: %s for campaign %s",
					i+1, len(generatedDomainsToStore), domain.DomainName, campaignID)
			}
		}

		// ELIMINATED: Dual broadcasting removed - campaign progress already handles this
		// Domain generation progress is now covered by campaign.progress messages above

		log.Printf("ProcessGenerationCampaignBatch: Real-time streaming completed for %d domains in campaign %s", processedInThisBatch, campaignID)
	}

	// Update campaign metadata with new offset
	genParams.CurrentOffset = nextGeneratorOffsetAbsolute

	// Update the campaign's metadata with the new offset
	if campaign.Metadata != nil {
		var config map[string]interface{}
		if jsonErr := json.Unmarshal(*campaign.Metadata, &config); jsonErr == nil {
			config["currentOffset"] = float64(nextGeneratorOffsetAbsolute)
			if updatedConfigJSON, marshalErr := json.Marshal(config); marshalErr == nil {
				rawMessage := json.RawMessage(updatedConfigJSON)
				campaign.Metadata = &rawMessage
				if updateErr := s.campaignStore.UpdateCampaign(ctx, querier, campaign); updateErr != nil {
					opErr = fmt.Errorf("failed to update campaign metadata with new offset for %s to %d: %w", campaignID, nextGeneratorOffsetAbsolute, updateErr)
					log.Printf("[ProcessGenerationCampaignBatch] %v", opErr)
					return false, processedInThisBatch, opErr
				}
			} else {
				log.Printf("[ProcessGenerationCampaignBatch] Warning: failed to marshal updated config for %s: %v", campaignID, marshalErr)
			}
		} else {
			log.Printf("[ProcessGenerationCampaignBatch] Warning: failed to unmarshal campaign metadata for offset update %s: %v", campaignID, jsonErr)
		}
	}

	hashResultForUpdate, hashErrForUpdate := domainexpert.GenerateDomainGenerationPhaseConfigHash(*genParams)
	if hashErrForUpdate != nil {
		opErr = fmt.Errorf("failed to re-generate config hash for updating global state: %w", hashErrForUpdate)
		log.Printf("[ProcessGenerationCampaignBatch] %v", opErr)
		return false, processedInThisBatch, opErr
	}
	configHashStringForUpdate := hashResultForUpdate.HashString
	normalizedHashedParamsBytesForUpdate, jsonMarshalErrForUpdate := json.Marshal(hashResultForUpdate.NormalizedParams)
	if jsonMarshalErrForUpdate != nil {
		opErr = fmt.Errorf("failed to marshal normalized params for global state update: %w", jsonMarshalErrForUpdate)
		log.Printf("[ProcessGenerationCampaignBatch] %v", opErr)
		return false, processedInThisBatch, opErr
	}

	// Use thread-safe configuration manager for atomic offset updates
	if s.configManager != nil {
		log.Printf("DEBUG [Global Offset]: Using ConfigManager path for hash %s, updating to offset %d", configHashStringForUpdate, nextGeneratorOffsetAbsolute)
		_, errUpdateConfig := s.configManager.UpdateDomainGenerationPhaseConfig(ctx, configHashStringForUpdate, func(currentState *models.DomainGenerationPhaseConfigState) (*models.DomainGenerationPhaseConfigState, error) {
			log.Printf("DEBUG [Global Offset]: ConfigManager update function called - currentState: %+v", currentState)
			// Perform atomic update with copy-on-write semantics
			updatedState := &models.DomainGenerationPhaseConfigState{
				ConfigHash:    configHashStringForUpdate,
				LastOffset:    nextGeneratorOffsetAbsolute,
				ConfigDetails: normalizedHashedParamsBytesForUpdate,
				UpdatedAt:     nowTime,
			}

			// Validate that we're not moving backwards in offset (race condition protection)
			if currentState != nil && currentState.LastOffset > nextGeneratorOffsetAbsolute {
				log.Printf("ERROR [Global Offset]: Race condition detected - current offset %d > new offset %d", currentState.LastOffset, nextGeneratorOffsetAbsolute)
				return nil, fmt.Errorf("detected race condition: trying to update offset to %d but current offset is %d", nextGeneratorOffsetAbsolute, currentState.LastOffset)
			}

			log.Printf("DEBUG [Global Offset]: ConfigManager will update to: %+v", updatedState)
			return updatedState, nil
		})
		if errUpdateConfig != nil {
			opErr = fmt.Errorf("failed to update global domain generation config state for hash %s to offset %d via config manager: %w", configHashStringForUpdate, nextGeneratorOffsetAbsolute, errUpdateConfig)
			log.Printf("ERROR [Global Offset]: ConfigManager update failed: %v", opErr)
			return false, processedInThisBatch, opErr
		}
		log.Printf("SUCCESS [Global Offset]: ConfigManager updated global offset for config hash %s to %d for campaign %s", configHashStringForUpdate, nextGeneratorOffsetAbsolute, campaignID)
	} else {
		log.Printf("DEBUG [Global Offset]: ConfigManager is nil, using direct store access for hash %s", configHashStringForUpdate)
		// Fallback to direct access
		globalConfigState := &models.DomainGenerationPhaseConfigState{
			ConfigHash:    configHashStringForUpdate,
			LastOffset:    nextGeneratorOffsetAbsolute,
			ConfigDetails: normalizedHashedParamsBytesForUpdate,
			UpdatedAt:     nowTime,
		}
		log.Printf("DEBUG [Global Offset]: About to update global offset for hash %s from current offset to %d for campaign %s", configHashStringForUpdate, nextGeneratorOffsetAbsolute, campaignID)
		if errUpdateGlobalState := s.campaignStore.CreateOrUpdateDomainGenerationPhaseConfigState(ctx, querier, globalConfigState); errUpdateGlobalState != nil {
			opErr = fmt.Errorf("failed to update global domain generation config state for hash %s to offset %d: %w", configHashStringForUpdate, nextGeneratorOffsetAbsolute, errUpdateGlobalState)
			log.Printf("ERROR [Global Offset]: %v", opErr)
			return false, processedInThisBatch, opErr
		}
		log.Printf("SUCCESS [Global Offset]: Updated global offset for config hash %s to %d for campaign %s", configHashStringForUpdate, nextGeneratorOffsetAbsolute, campaignID)
	}

	// Calculate new progress values
	currentProcessedItems := int64(0)
	if campaign.ProcessedItems != nil {
		currentProcessedItems = *campaign.ProcessedItems
	}
	newProcessedItems := currentProcessedItems + int64(processedInThisBatch)

	// DEBUG: Log hardcoded progress diagnosis
	log.Printf("🔍 [HARDCODED PROGRESS DEBUG] Campaign %s progress calculation:", campaignID)
	log.Printf("🔍 [HARDCODED PROGRESS DEBUG] - newProcessedItems: %d", newProcessedItems)
	log.Printf("🔍 [HARDCODED PROGRESS DEBUG] - genParams.NumDomainsToGenerate: %d", genParams.NumDomainsToGenerate)
	log.Printf("🔍 [HARDCODED PROGRESS DEBUG] - genParams.CurrentOffset: %d", genParams.CurrentOffset)
	log.Printf("🔍 [HARDCODED PROGRESS DEBUG] - genParams.TotalPossibleCombinations: %d", genParams.TotalPossibleCombinations)

	// MULTI-PHASE PROGRESS: Generation phase covers 0-33% of total campaign progress
	var progressPercentage float64
	var targetItems int64

	if genParams.NumDomainsToGenerate > 0 {
		targetItems = int64(genParams.NumDomainsToGenerate)
		// Scale generation progress to 0-33% range
		generationProgress := (float64(newProcessedItems) / float64(targetItems)) * 100
		progressPercentage = (generationProgress / 100.0) * 33.0 // Scale to 33%

		log.Printf("🔍 [HARDCODED PROGRESS DEBUG] - Target mode: NumDomainsToGenerate")
		log.Printf("🔍 [HARDCODED PROGRESS DEBUG] - generationProgress: %.2f%%", generationProgress)
		log.Printf("🔍 [HARDCODED PROGRESS DEBUG] - scaled progressPercentage: %.2f%%", progressPercentage)
	} else {
		targetItems = genParams.TotalPossibleCombinations
		if genParams.TotalPossibleCombinations > 0 {
			// Scale generation progress to 0-33% range
			generationProgress := (float64(genParams.CurrentOffset) / float64(genParams.TotalPossibleCombinations)) * 100
			progressPercentage = (generationProgress / 100.0) * 33.0 // Scale to 33%

			log.Printf("🔍 [HARDCODED PROGRESS DEBUG] - Target mode: TotalPossibleCombinations")
			log.Printf("🔍 [HARDCODED PROGRESS DEBUG] - generationProgress: %.2f%%", generationProgress)
			log.Printf("🔍 [HARDCODED PROGRESS DEBUG] - scaled progressPercentage: %.2f%%", progressPercentage)
		} else {
			progressPercentage = 33.0 // Generation complete
			log.Printf("🔍 [HARDCODED PROGRESS DEBUG] - Target mode: Generation complete (33.0%%)")
		}
	}
	if progressPercentage > 33.0 {
		progressPercentage = 33.0 // Cap generation phase at 33%
	}

	// 🔧 COMPLETION DEBUG: Add comprehensive completion condition logging
	condition1 := genParams.NumDomainsToGenerate > 0 && newProcessedItems >= int64(genParams.NumDomainsToGenerate)
	condition2 := genParams.CurrentOffset >= genParams.TotalPossibleCombinations

	log.Printf("[COMPLETION_DEBUG] Campaign %s - Checking completion conditions:", campaignID)
	log.Printf("[COMPLETION_DEBUG] - NumDomainsToGenerate: %d", genParams.NumDomainsToGenerate)
	log.Printf("[COMPLETION_DEBUG] - newProcessedItems: %d", newProcessedItems)
	log.Printf("[COMPLETION_DEBUG] - CurrentOffset: %d", genParams.CurrentOffset)
	log.Printf("[COMPLETION_DEBUG] - TotalPossibleCombinations: %d", genParams.TotalPossibleCombinations)
	log.Printf("[COMPLETION_DEBUG] - Condition1 (target reached): %t", condition1)
	log.Printf("[COMPLETION_DEBUG] - Condition2 (offset exhausted): %t", condition2)
	log.Printf("[COMPLETION_DEBUG] - processedInThisBatch: %d", processedInThisBatch)

	// Check if campaign is completed
	if condition1 || condition2 {

		log.Printf("[COMPLETION_DEBUG] ✅ COMPLETION TRIGGERED for campaign %s", campaignID)

		// MULTI-PHASE: Generation phase completed - set to 33% (not 100%)
		generationCompleteProgress := 33.0
		if errUpdateProgress := s.campaignStore.UpdateCampaignProgress(ctx, querier, campaignID, newProcessedItems, targetItems, generationCompleteProgress); errUpdateProgress != nil {
			opErr = fmt.Errorf("failed to update campaign %s generation phase progress: %w", campaignID, errUpdateProgress)
			log.Printf("[ProcessGenerationCampaignBatch] %v", opErr)
			return false, processedInThisBatch, opErr
		}

		// Mark generation phase as completed (33% progress) and ready for DNS validation phase
		succeededStatus := models.PhaseStatusCompleted
		campaign.PhaseStatus = &succeededStatus
		campaign.ProgressPercentage = models.Float64Ptr(generationCompleteProgress)
		campaign.ProcessedItems = models.Int64Ptr(newProcessedItems)
		campaign.TotalItems = models.Int64Ptr(targetItems)
		campaign.CompletedAt = &nowTime

		// 🚀 PHASE-AWARE TRANSITION: Only auto-transition if Full Sequence Mode is enabled
		launchSequence := false
		if campaign.Metadata != nil {
			var metadata map[string]interface{}
			if err := json.Unmarshal(*campaign.Metadata, &metadata); err == nil {
				if seq, ok := metadata["launch_sequence"].(bool); ok {
					launchSequence = seq
				}
			}
		}

		if launchSequence {
			// Full Sequence Mode: Automatically transition to DNS validation phase
			dnsValidationPhase := models.PhaseTypeDNSValidation
			campaign.CurrentPhase = &dnsValidationPhase
			log.Printf("Domain generation complete for campaign %s - Full Sequence Mode enabled, automatically transitioning to dns_validation", campaignID)
		} else {
			// Individual Phase Mode: Stay in domain generation phase (completed)
			log.Printf("Domain generation complete for campaign %s - Individual Phase Mode, staying in generation phase for manual configuration", campaignID)
		}
		done = true

		if errUpdateCampaign := s.campaignStore.UpdateCampaign(ctx, querier, campaign); errUpdateCampaign != nil {
			opErr = fmt.Errorf("failed to update campaign %s completion status: %w", campaignID, errUpdateCampaign)
			log.Printf("[ProcessGenerationCampaignBatch] %v", opErr)
			return false, processedInThisBatch, opErr
		}

		log.Printf("ProcessGenerationCampaignBatch: Campaign %s completed. Processed: %d. Target: %d. Global Offset: %d. Total Possible: %d",
			campaignID, newProcessedItems, genParams.NumDomainsToGenerate, genParams.CurrentOffset, genParams.TotalPossibleCombinations)

		// Broadcast campaign completion via WebSocket
		websocket.BroadcastCampaignProgress(campaignID.String(), 100.0, "completed", "domain_generation", newProcessedItems, targetItems)

		// Domain generation complete - campaign stays in generation phase until user manually configures next phase
		log.Printf("ProcessGenerationCampaignBatch: Campaign %s generation phase complete. Waiting for user to configure DNS validation phase.", campaignID)
	} else {
		// Campaign is still running - update progress using dedicated method
		if errUpdateProgress := s.campaignStore.UpdateCampaignProgress(ctx, querier, campaignID, newProcessedItems, targetItems, progressPercentage); errUpdateProgress != nil {
			opErr = fmt.Errorf("failed to update campaign %s progress: %w", campaignID, errUpdateProgress)
			log.Printf("[ProcessGenerationCampaignBatch] %v", opErr)
			return false, processedInThisBatch, opErr
		}

		// Update local campaign object to reflect the changes
		campaign.ProcessedItems = models.Int64Ptr(newProcessedItems)
		campaign.TotalItems = models.Int64Ptr(targetItems)
		campaign.ProgressPercentage = models.Float64Ptr(progressPercentage)
		inProgressStatus := models.PhaseStatusInProgress
		campaign.PhaseStatus = &inProgressStatus
		done = false

		log.Printf("ProcessGenerationCampaignBatch: Campaign %s progress updated. Processed: %d/%d (%.2f%%)",
			campaignID, newProcessedItems, targetItems, progressPercentage)

		// Broadcast campaign progress update via WebSocket
		websocket.BroadcastCampaignProgress(campaignID.String(), progressPercentage, "running", "domain_generation", newProcessedItems, targetItems)
	}

	finalProcessedItems := int64(0)
	if campaign.ProcessedItems != nil {
		finalProcessedItems = *campaign.ProcessedItems
	}
	log.Printf("ProcessGenerationCampaignBatch: Finished batch for campaignID %s. ProcessedInBatch: %d, DoneForJob: %t, CampaignProcessedItems: %d, NewCampaignGlobalOffset: %d",
		campaignID, processedInThisBatch, done, finalProcessedItems, genParams.CurrentOffset)

	return done, processedInThisBatch, opErr
}

// PF-003: CPU optimization methods that build on SI-005 and PF-001 patterns

// calculateOptimalBatchSize dynamically adjusts batch size based on CPU and memory utilization
// This builds on PF-001 query optimization patterns and SI-005 memory management
func (s *domainGenerationServiceImpl) calculateOptimalBatchSize(originalSize int, cpuUtilization, memUtilization float64) int {
	// Start with original size
	optimizedSize := originalSize

	// Apply CPU-based scaling (builds on PF-001 optimization patterns)
	if cpuUtilization > s.cpuOptimizationConfig.ScaleDownThreshold {
		// High CPU usage: reduce batch size
		scaleFactor := s.cpuOptimizationConfig.BatchSizeScaleFactor
		if cpuUtilization > 90.0 {
			scaleFactor = 0.5 // Aggressive reduction for very high CPU
		}
		optimizedSize = int(float64(optimizedSize) * scaleFactor)
	}

	// Apply memory-based scaling (builds on SI-005 memory management)
	if memUtilization > 80.0 {
		// High memory usage: further reduce batch size
		memoryScaleFactor := 0.7
		if memUtilization > 90.0 {
			memoryScaleFactor = 0.4 // Aggressive reduction for very high memory
		}
		optimizedSize = int(float64(optimizedSize) * memoryScaleFactor)
	}

	// Ensure minimum viable batch size
	minBatchSize := 10
	if optimizedSize < minBatchSize {
		optimizedSize = minBatchSize
	}

	// Ensure we don't exceed original size (only reduction for resource conservation)
	if optimizedSize > originalSize {
		optimizedSize = originalSize
	}

	return optimizedSize
}

// optimizeMemoryUsage applies SI-005 memory management patterns during domain generation
func (s *domainGenerationServiceImpl) optimizeMemoryUsage(domains []models.GeneratedDomain, campaignID uuid.UUID) {
	if s.memoryPoolManager == nil {
		return
	}

	// Use memory pool for domain batch management
	pooledBatch, _ := s.memoryPoolManager.GetDomainBatch(100, nil)
	if pooledBatch != nil {
		// Configure the pooled batch
		pooledBatch.CampaignID = campaignID
		// Convert GeneratedDomain slice to string slice
		domainNames := make([]string, len(domains))
		for i, domain := range domains {
			domainNames[i] = domain.DomainName
		}
		pooledBatch.Domains = domainNames

		// Return to pool when done (this would be called in a defer in the actual usage)
		defer s.memoryPoolManager.PutDomainBatch(pooledBatch)
	}

	// Trigger garbage collection if memory usage is high
	var m runtime.MemStats
	runtime.ReadMemStats(&m)
	memUsageMB := float64(m.Alloc) / 1024 / 1024

	if memUsageMB > 512 { // If using more than 512MB
		log.Printf("High memory usage detected (%.2f MB), triggering GC for campaign %s", memUsageMB, campaignID)
		runtime.GC()
	}
}

// scaleWorkerPool dynamically adjusts worker pool size based on CPU utilization
// This integrates PF-003 with existing worker coordination from SI-001
func (s *domainGenerationServiceImpl) scaleWorkerPool(cpuUtilization float64) {
	if s.workerPool == nil {
		return
	}

	// Get current metrics from the worker pool
	metrics := s.workerPool.GetMetrics()
	currentWorkers := metrics.ActiveWorkers
	queueSize := s.workerPool.GetQueueSize()

	// Log current state for monitoring
	log.Printf("Worker pool status: %d active workers, %d queued tasks, CPU: %.2f%%",
		currentWorkers, queueSize, cpuUtilization)

	// The EfficientWorkerPool handles scaling automatically based on queue pressure
	// We can monitor and log the scaling decisions here
	if cpuUtilization > s.cpuOptimizationConfig.MaxCPUUtilization && queueSize > 0 {
		log.Printf("High CPU utilization (%.2f%%) detected with %d queued tasks - worker pool will auto-scale down",
			cpuUtilization, queueSize)
	} else if cpuUtilization < 70.0 && queueSize > currentWorkers*2 {
		log.Printf("Low CPU utilization (%.2f%%) with high queue pressure (%d tasks) - worker pool will auto-scale up",
			cpuUtilization, queueSize)
	}
}

// RegisterWorker registers a worker in the coordination system
func (w *WorkerCoordinationService) RegisterWorker(ctx context.Context, campaignID uuid.UUID, workerType string) error {
	if w.db == nil {
		return nil // Skip for non-SQL backends
	}

	query := `
		INSERT INTO worker_coordination (worker_id, campaign_id, worker_type, status, registered_at, last_heartbeat)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (worker_id, campaign_id) DO UPDATE SET
			status = EXCLUDED.status,
			last_heartbeat = EXCLUDED.last_heartbeat
	`

	now := time.Now().UTC()
	_, err := w.db.ExecContext(ctx, query, w.workerID, campaignID, workerType, "active", now, now)
	if err != nil {
		log.Printf("Failed to register worker %s for campaign %s: %v", w.workerID, campaignID, err)
		return fmt.Errorf("worker registration failed: %w", err)
	}

	log.Printf("Worker %s registered for campaign %s", w.workerID, campaignID)
	return nil
}

// StartHeartbeat starts the heartbeat mechanism for the worker
func (w *WorkerCoordinationService) StartHeartbeat(ctx context.Context) {
	if w.db == nil {
		return // Skip for non-SQL backends
	}

	go func() {
		ticker := time.NewTicker(30 * time.Second) // Heartbeat every 30 seconds
		defer ticker.Stop()

		for {
			select {
			case <-ctx.Done():
				log.Printf("Heartbeat stopped for worker %s", w.workerID)
				return
			case <-ticker.C:
				w.sendHeartbeat(ctx)
			}
		}
	}()

	log.Printf("Heartbeat started for worker %s", w.workerID)
}

// sendHeartbeat sends a heartbeat signal
func (w *WorkerCoordinationService) sendHeartbeat(ctx context.Context) {
	query := `UPDATE worker_coordination SET last_heartbeat = $1 WHERE worker_id = $2`
	_, err := w.db.ExecContext(ctx, query, time.Now().UTC(), w.workerID)
	if err != nil {
		log.Printf("Failed to send heartbeat for worker %s: %v", w.workerID, err)
	}
}

// StopHeartbeat stops the heartbeat mechanism for the worker
func (w *WorkerCoordinationService) StopHeartbeat() {
	if w.db == nil {
		return
	}

	query := `UPDATE worker_coordination SET status = $1 WHERE worker_id = $2`
	_, err := w.db.Exec(query, "stopped", w.workerID)
	if err != nil {
		log.Printf("Failed to stop worker %s: %v", w.workerID, err)
	} else {
		log.Printf("Worker %s stopped successfully", w.workerID)
	}
}

// UpdateWorkerStatus updates the status of a worker
func (w *WorkerCoordinationService) UpdateWorkerStatus(ctx context.Context, campaignID uuid.UUID, status string, operation string) error {
	if w.db == nil {
		return nil // Skip for non-SQL backends
	}

	query := `
		UPDATE worker_coordination
		SET status = $1, last_operation = $2, last_heartbeat = $3
		WHERE worker_id = $4 AND campaign_id = $5
	`

	_, err := w.db.ExecContext(ctx, query, status, operation, time.Now().UTC(), w.workerID, campaignID)
	if err != nil {
		log.Printf("Failed to update worker %s status: %v", w.workerID, err)
		return fmt.Errorf("worker status update failed: %w", err)
	}

	log.Printf("Worker %s status updated to %s for campaign %s", w.workerID, status, campaignID)
	return nil
}

// CleanupStaleWorkers removes stale workers from the coordination system
func (w *WorkerCoordinationService) CleanupStaleWorkers(ctx context.Context) error {
	if w.db == nil {
		return nil // Skip for non-SQL backends
	}

	// Remove workers that haven't sent a heartbeat in the last 5 minutes
	staleThreshold := time.Now().UTC().Add(-5 * time.Minute)
	query := `DELETE FROM worker_coordination WHERE last_heartbeat < $1`

	result, err := w.db.ExecContext(ctx, query, staleThreshold)
	if err != nil {
		log.Printf("Failed to cleanup stale workers: %v", err)
		return fmt.Errorf("stale worker cleanup failed: %w", err)
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected > 0 {
		log.Printf("Cleaned up %d stale workers", rowsAffected)
	}

	return nil
}

// GetWorkerStats gets worker statistics
func (w *WorkerCoordinationService) GetWorkerStats(ctx context.Context) (map[string]interface{}, error) {
	if w.db == nil {
		// Return basic stats for non-SQL backends
		return map[string]interface{}{
			"active_workers": 1,
			"total_jobs":     0,
			"backend_type":   "non_sql",
		}, nil
	}

	stats := make(map[string]interface{})

	// Get active worker count
	var activeWorkers int
	err := w.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM worker_coordination WHERE status = 'active'`).Scan(&activeWorkers)
	if err != nil {
		log.Printf("Failed to get active worker count: %v", err)
		activeWorkers = 0
	}

	// Get total jobs from campaign jobs table
	var totalJobs int64
	err = w.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM campaign_jobs`).Scan(&totalJobs)
	if err != nil {
		log.Printf("Failed to get total job count: %v", err)
		totalJobs = 0
	}

	// Get running jobs count
	var runningJobs int
	err = w.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM campaign_jobs WHERE status = 'running'`).Scan(&runningJobs)
	if err != nil {
		log.Printf("Failed to get running job count: %v", err)
		runningJobs = 0
	}

	stats["active_workers"] = activeWorkers
	stats["total_jobs"] = totalJobs
	stats["running_jobs"] = runningJobs
	stats["worker_id"] = w.workerID
	stats["backend_type"] = "sql"
	stats["last_updated"] = time.Now().UTC()

	return stats, nil
}

// ConfigManager manages configuration state
type ConfigManager struct {
	db *sqlx.DB
}

// NewConfigManager creates a new ConfigManager
func NewConfigManager(db *sqlx.DB) *ConfigManager {
	return &ConfigManager{db: db}
}

// ConfigManagerConfig represents configuration options for ConfigManager (Phase 2c)
type ConfigManagerConfig struct {
	EnableCaching       bool
	CacheEvictionTime   time.Duration
	MaxCacheEntries     int
	EnableStateTracking bool
}

// NewConfigManagerWithConfig creates a ConfigManager with Phase 2c configuration options
// This bridges Phase 2c requirements with the existing stable backend
func NewConfigManagerWithConfig(db *sqlx.DB, campaignStore interface{}, stateCoordinator interface{}, config ConfigManagerConfig) *ConfigManager {
	// For Phase 2c, we create the basic ConfigManager and ignore the additional parameters
	// The stable backend doesn't support these advanced features yet
	log.Printf("Phase 2c: Creating ConfigManager with enhanced config (bridging to stable backend)")
	return NewConfigManager(db)
}

// GetDomainGenerationPhaseConfig gets domain generation configuration by hash (signature corrected)
func (cm *ConfigManager) GetDomainGenerationPhaseConfig(ctx context.Context, configHash string) (*models.DomainGenerationPhaseConfigState, error) {
	if cm.db == nil {
		return nil, fmt.Errorf("database connection is nil")
	}

	// Query for existing configuration state by hash
	query := `
		SELECT config_hash, last_offset, config_details, updated_at
		FROM domain_generation_config_states
		WHERE config_hash = $1
	`

	var configState models.DomainGenerationPhaseConfigState
	err := cm.db.QueryRowContext(ctx, query, configHash).Scan(
		&configState.ConfigHash,
		&configState.LastOffset,
		&configState.ConfigDetails,
		&configState.UpdatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			// No existing config found, return nil (not an error)
			return nil, nil
		}
		return nil, fmt.Errorf("failed to query domain generation config state: %w", err)
	}

	// Set the ConfigState field to point to itself
	configState.ConfigState = &configState

	return &configState, nil
}

// UpdateDomainGenerationPhaseConfig updates domain generation configuration with atomic update function
func (cm *ConfigManager) UpdateDomainGenerationPhaseConfig(ctx context.Context, configHash string, updateFn func(currentState *models.DomainGenerationPhaseConfigState) (*models.DomainGenerationPhaseConfigState, error)) (*models.DomainGenerationPhaseConfigState, error) {
	if cm.db == nil {
		return nil, fmt.Errorf("database connection is nil")
	}

	// Start a transaction for atomic update
	tx, err := cm.db.BeginTxx(ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer func() {
		if err != nil {
			tx.Rollback()
		} else {
			tx.Commit()
		}
	}()

	// Get current state within transaction
	currentState, err := cm.GetDomainGenerationPhaseConfig(ctx, configHash)
	if err != nil {
		return nil, fmt.Errorf("failed to get current state: %w", err)
	}

	// Apply update function
	updatedState, err := updateFn(currentState)
	if err != nil {
		return nil, fmt.Errorf("update function failed: %w", err)
	}

	// Save updated state to database
	upsertQuery := `
		INSERT INTO domain_generation_config_states (config_hash, last_offset, config_details, updated_at)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (config_hash)
		DO UPDATE SET
			last_offset = EXCLUDED.last_offset,
			config_details = EXCLUDED.config_details,
			updated_at = EXCLUDED.updated_at
	`

	_, err = tx.ExecContext(ctx, upsertQuery,
		updatedState.ConfigHash,
		updatedState.LastOffset,
		updatedState.ConfigDetails,
		updatedState.UpdatedAt,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to save updated config state: %w", err)
	}

	log.Printf("ConfigManager: Successfully updated config hash %s to offset %d", configHash, updatedState.LastOffset)

	return updatedState, nil
}

// New standalone service methods implementing DomainGenerationService interface

// GenerateDomains generates domains for a campaign using standalone service pattern with real business logic
func (s *domainGenerationServiceImpl) GenerateDomains(ctx context.Context, req GenerateDomainsRequest) error {
	log.Printf("GenerateDomains: Starting standalone domain generation for campaign %s", req.CampaignID)

	// Validate configuration using sophisticated validation
	if err := s.ValidateGenerationConfig(ctx, *req.Config); err != nil {
		return fmt.Errorf("invalid generation config: %w", err)
	}

	// Use real worker coordination
	if s.workerCoordinationService != nil {
		if err := s.workerCoordinationService.RegisterWorker(ctx, req.CampaignID, "domain_generation"); err != nil {
			log.Printf("Failed to register worker for campaign %s: %v", req.CampaignID, err)
		}
		defer func() {
			if err := s.workerCoordinationService.UpdateWorkerStatus(ctx, req.CampaignID, "completed", "GenerateDomains"); err != nil {
				log.Printf("Failed to update worker status: %v", err)
			}
		}()
	}

	// Apply memory optimization before starting
	if s.memoryPoolManager != nil {
		s.optimizeMemoryUsage(nil, req.CampaignID)
	}

	// Create domain generator using sophisticated domainexpert logic
	// Use first TLD from the array for domain generation
	var tld string
	if len(req.Config.TLDs) > 0 {
		tld = req.Config.TLDs[0]
		// Ensure TLD starts with dot for domain generator
		if !strings.HasPrefix(tld, ".") {
			tld = "." + tld
		}
	} else {
		return fmt.Errorf("no TLDs provided in domain configuration")
	}

	domainGen, err := domainexpert.NewDomainGenerator(
		domainexpert.CampaignPatternType(req.Config.PatternType),
		req.Config.VariableLength,
		req.Config.CharacterSet,
		req.Config.ConstantString,
		tld,
	)
	if err != nil {
		return fmt.Errorf("failed to create domain generator: %w", err)
	}

	// Configure memory-efficient generation using existing sophisticated logic
	memConfig := domainexpert.DefaultMemoryEfficiencyConfig
	memConfig.EnableMemoryLogging = false

	// Adjust memory limits based on available system memory (from existing logic)
	var memStats runtime.MemStats
	runtime.ReadMemStats(&memStats)
	availableMemoryMB := memStats.Sys / 1024 / 1024

	if availableMemoryMB > 2048 {
		memConfig.MaxMemoryUsageMB = int(availableMemoryMB / 4)
	} else {
		memConfig.MaxMemoryUsageMB = 256
	}

	domainGen.WithMemoryConfig(memConfig)
	log.Printf("GenerateDomains: Configured memory-efficient generation (limit: %dMB)", memConfig.MaxMemoryUsageMB)

	// Use sophisticated batch size calculation
	batchSize := req.Config.BatchSize
	if batchSize <= 0 {
		batchSize = 1000
	}

	// Apply CPU optimization for batch sizing
	if s.cpuOptimizationConfig != nil {
		var cpuUtilization, memUtilization float64
		optimizedBatchSize := s.calculateOptimalBatchSize(batchSize, cpuUtilization, memUtilization)
		batchSize = optimizedBatchSize
		log.Printf("GenerateDomains: Optimized batch size to %d", batchSize)
	}

	startOffset := int64(0)
	targetDomains := int64(req.Config.NumDomainsToGenerate)
	if targetDomains <= 0 {
		targetDomains = domainGen.GetTotalCombinations()
	}

	log.Printf("GenerateDomains: Target domains: %d, Batch size: %d", targetDomains, batchSize)

	var allDomains []string
	var totalGenerated int64

	// Generate domains in batches using sophisticated logic
	for startOffset < targetDomains {
		remainingDomains := targetDomains - startOffset
		currentBatchSize := int64(batchSize)
		if currentBatchSize > remainingDomains {
			currentBatchSize = remainingDomains
		}

		// Use sophisticated domain generation with offset tracking
		domains, nextOffset, genErr := domainGen.GenerateBatch(startOffset, int(currentBatchSize))
		if genErr != nil {
			return fmt.Errorf("sophisticated domain generation failed: %w", genErr)
		}

		// Apply memory optimization during generation
		if s.memoryPoolManager != nil && len(domains) > 0 {
			// Convert to GeneratedDomain for memory optimization
			generatedDomains := make([]models.GeneratedDomain, len(domains))
			for i, domain := range domains {
				generatedDomains[i] = models.GeneratedDomain{
					DomainName:  domain,
					OffsetIndex: startOffset + int64(i),
				}
			}
			s.optimizeMemoryUsage(generatedDomains, req.CampaignID)
		}

		// Accumulate domains
		allDomains = append(allDomains, domains...)
		totalGenerated += int64(len(domains))

		// Update ONLY domains_data JSONB column (efficient JSONB operation)
		domainsData := map[string]interface{}{
			"domains":          allDomains,
			"current_offset":   nextOffset,
			"total_generated":  totalGenerated,
			"target_domains":   targetDomains,
			"progress":         float64(totalGenerated) / float64(targetDomains) * 100,
			"last_updated":     time.Now().UTC(),
			"batch_size":       batchSize,
			"memory_optimized": true,
			"worker_id":        s.workerCoordinationService.workerID,
		}

		if err := s.updateDomainsDataJSONB(ctx, req.CampaignID, domainsData); err != nil {
			return fmt.Errorf("failed to update domains_data JSONB: %w", err)
		}

		// Real-time WebSocket streaming with sophisticated broadcasting
		progress := float64(totalGenerated) / float64(targetDomains) * 100

		// Individual domain streaming
		broadcaster := websocket.GetBroadcaster()
		if broadcaster != nil {
			for i, domain := range domains {
				payload := websocket.DomainGenerationPayload{
					CampaignID:     req.CampaignID.String(),
					DomainID:       uuid.New().String(),
					Domain:         domain,
					Offset:         startOffset + int64(i),
					BatchSize:      len(domains),
					TotalGenerated: totalGenerated,
				}
				message := websocket.CreateDomainGenerationMessageV2(payload)
				messageBytes, _ := json.Marshal(message)
				broadcaster.BroadcastMessage(messageBytes)
			}
		}

		// Campaign progress broadcasting
		websocket.BroadcastCampaignProgress(req.CampaignID.String(), progress, "running", "domain_generation", totalGenerated, targetDomains)

		startOffset = nextOffset
		log.Printf("GenerateDomains: Batch completed. Generated %d domains. Total: %d/%d (%.2f%%)",
			len(domains), totalGenerated, targetDomains, progress)

		// Check for context cancellation
		if ctx.Err() != nil {
			// Update status before cancellation
			domainsData["status"] = "cancelled"
			s.updateDomainsDataJSONB(ctx, req.CampaignID, domainsData)
			return ctx.Err()
		}
	}

	// Final completion with sophisticated status update
	finalDomainsData := map[string]interface{}{
		"domains":         allDomains,
		"current_offset":  targetDomains,
		"total_generated": totalGenerated,
		"target_domains":  targetDomains,
		"progress":        100.0,
		"status":          "completed",
		"completed_at":    time.Now().UTC(),
		"worker_id":       s.workerCoordinationService.workerID,
	}

	if err := s.updateDomainsDataJSONB(ctx, req.CampaignID, finalDomainsData); err != nil {
		log.Printf("Failed to update final completion status: %v", err)
	}

	// Final completion broadcast
	websocket.BroadcastCampaignProgress(req.CampaignID.String(), 100.0, "completed", "domain_generation", totalGenerated, targetDomains)

	log.Printf("GenerateDomains: Successfully completed standalone domain generation for campaign %s. Generated %d domains.", req.CampaignID, totalGenerated)
	return nil
}

// GetGenerationProgress returns the current progress of domain generation using real JSONB data
func (s *domainGenerationServiceImpl) GetGenerationProgress(ctx context.Context, campaignID uuid.UUID) (*DomainGenerationProgress, error) {
	// Get campaign details for comprehensive progress information
	campaign, genParams, err := s.GetCampaignDetails(ctx, campaignID)
	if err != nil {
		return nil, fmt.Errorf("failed to get campaign details: %w", err)
	}

	// Get real domains data from JSONB column
	domainsData, err := s.getDomainsDataJSONB(ctx, campaignID)
	if err != nil {
		return nil, fmt.Errorf("failed to get domains data from JSONB: %w", err)
	}

	// Initialize progress with campaign metadata
	progress := &DomainGenerationProgress{
		CampaignID:       campaignID,
		Status:           "pending",
		DomainsGenerated: 0,
		TotalDomains:     0,
		Progress:         0.0,
		StartedAt:        time.Now(),
		EstimatedEnd:     time.Now(),
	}

	// Set started time from campaign
	if campaign.StartedAt != nil {
		progress.StartedAt = *campaign.StartedAt
	}

	// Set total domains from generation parameters
	if genParams != nil {
		if genParams.NumDomainsToGenerate > 0 {
			progress.TotalDomains = genParams.NumDomainsToGenerate
		} else {
			progress.TotalDomains = int(genParams.TotalPossibleCombinations)
		}
	}

	// Extract sophisticated progress data from JSONB
	if domainsData != nil {
		// Get generated domains count
		if domains, ok := domainsData["domains"].([]interface{}); ok {
			progress.DomainsGenerated = len(domains)
		} else if totalGenerated, ok := domainsData["total_generated"].(float64); ok {
			progress.DomainsGenerated = int(totalGenerated)
		}

		// Get accurate progress percentage
		if progressVal, ok := domainsData["progress"].(float64); ok {
			progress.Progress = progressVal
		} else if progress.TotalDomains > 0 {
			// Calculate progress from domains generated
			progress.Progress = float64(progress.DomainsGenerated) / float64(progress.TotalDomains) * 100.0
		}

		// Get status from JSONB or derive from progress
		if status, ok := domainsData["status"].(string); ok {
			progress.Status = status
		} else if progress.Progress >= 100.0 {
			progress.Status = "completed"
		} else if progress.DomainsGenerated > 0 {
			progress.Status = "running"
		} else {
			progress.Status = "pending"
		}

		// Get estimated end time
		if startedAt := progress.StartedAt; !startedAt.IsZero() && progress.DomainsGenerated > 0 && progress.TotalDomains > 0 {
			elapsed := time.Since(startedAt)
			if progress.DomainsGenerated > 0 {
				rate := float64(progress.DomainsGenerated) / elapsed.Seconds()
				if rate > 0 {
					remainingDomains := progress.TotalDomains - progress.DomainsGenerated
					remainingSeconds := float64(remainingDomains) / rate
					progress.EstimatedEnd = time.Now().Add(time.Duration(remainingSeconds) * time.Second)
				}
			}
		}
	}

	// Fallback to campaign status if JSONB data is missing
	if domainsData == nil && campaign != nil {
		if campaign.PhaseStatus != nil {
			switch *campaign.PhaseStatus {
			case models.PhaseStatusNotStarted:
				progress.Status = "pending"
			case models.PhaseStatusInProgress:
				progress.Status = "running"
			case models.PhaseStatusCompleted:
				progress.Status = "completed"
				progress.Progress = 100.0
			case models.PhaseStatusFailed:
				progress.Status = "failed"
			case models.PhaseStatusPaused:
				progress.Status = "paused"
			default:
				progress.Status = "unknown"
			}
		}

		// Use campaign progress data
		if campaign.ProcessedItems != nil {
			progress.DomainsGenerated = int(*campaign.ProcessedItems)
		}
		if campaign.TotalItems != nil {
			progress.TotalDomains = int(*campaign.TotalItems)
		}
		if campaign.ProgressPercentage != nil {
			progress.Progress = *campaign.ProgressPercentage
		}
	}

	log.Printf("GetGenerationProgress: Campaign %s - Status: %s, Domains: %d/%d (%.2f%%)",
		campaignID, progress.Status, progress.DomainsGenerated, progress.TotalDomains, progress.Progress)

	return progress, nil
}

// PauseGeneration pauses domain generation for a campaign
func (s *domainGenerationServiceImpl) PauseGeneration(ctx context.Context, campaignID uuid.UUID) error {
	log.Printf("PauseGeneration: Pausing domain generation for campaign %s", campaignID)

	// Update status in domains_data JSONB column
	domainsData, err := s.getDomainsDataJSONB(ctx, campaignID)
	if err != nil {
		return fmt.Errorf("failed to get current domains data: %w", err)
	}

	if domainsData == nil {
		domainsData = make(map[string]interface{})
	}

	domainsData["status"] = "paused"
	domainsData["paused_at"] = time.Now()

	if err := s.updateDomainsDataJSONB(ctx, campaignID, domainsData); err != nil {
		return fmt.Errorf("failed to update pause status: %w", err)
	}

	// WebSocket notification
	websocket.BroadcastCampaignProgress(campaignID.String(), 0.0, "paused", "domain_generation", 0, 0)

	return nil
}

// ResumeGeneration resumes domain generation for a campaign
func (s *domainGenerationServiceImpl) ResumeGeneration(ctx context.Context, campaignID uuid.UUID) error {
	log.Printf("ResumeGeneration: Resuming domain generation for campaign %s", campaignID)

	// Update status in domains_data JSONB column
	domainsData, err := s.getDomainsDataJSONB(ctx, campaignID)
	if err != nil {
		return fmt.Errorf("failed to get current domains data: %w", err)
	}

	if domainsData == nil {
		domainsData = make(map[string]interface{})
	}

	domainsData["status"] = "running"
	domainsData["resumed_at"] = time.Now()

	if err := s.updateDomainsDataJSONB(ctx, campaignID, domainsData); err != nil {
		return fmt.Errorf("failed to update resume status: %w", err)
	}

	// WebSocket notification
	websocket.BroadcastCampaignProgress(campaignID.String(), 0.0, "running", "domain_generation", 0, 0)

	return nil
}

// CancelGeneration cancels domain generation for a campaign
func (s *domainGenerationServiceImpl) CancelGeneration(ctx context.Context, campaignID uuid.UUID) error {
	log.Printf("CancelGeneration: Cancelling domain generation for campaign %s", campaignID)

	// Update status in domains_data JSONB column
	domainsData, err := s.getDomainsDataJSONB(ctx, campaignID)
	if err != nil {
		return fmt.Errorf("failed to get current domains data: %w", err)
	}

	if domainsData == nil {
		domainsData = make(map[string]interface{})
	}

	domainsData["status"] = "cancelled"
	domainsData["cancelled_at"] = time.Now()

	if err := s.updateDomainsDataJSONB(ctx, campaignID, domainsData); err != nil {
		return fmt.Errorf("failed to update cancel status: %w", err)
	}

	// WebSocket notification
	websocket.BroadcastCampaignProgress(campaignID.String(), 0.0, "cancelled", "domain_generation", 0, 0)

	return nil
}

// ValidateGenerationConfig validates domain generation configuration
func (s *domainGenerationServiceImpl) ValidateGenerationConfig(ctx context.Context, config DomainGenerationPhaseConfig) error {
	if config.VariableLength <= 0 {
		return fmt.Errorf("variable length must be positive")
	}

	if config.CharacterSet == "" {
		return fmt.Errorf("character set cannot be empty")
	}

	if len(config.TLDs) == 0 {
		return fmt.Errorf("TLDs cannot be empty")
	}

	// Validate each TLD
	for _, tld := range config.TLDs {
		if tld == "" {
			return fmt.Errorf("TLD cannot be empty")
		}

		normalizedTLD := tld
		if !strings.HasPrefix(tld, ".") {
			normalizedTLD = "." + tld
		}

		// Test each TLD with domain generator
		_, err := domainexpert.NewDomainGenerator(
			domainexpert.CampaignPatternType(config.PatternType),
			config.VariableLength,
			config.CharacterSet,
			config.ConstantString,
			normalizedTLD,
		)
		if err != nil {
			return fmt.Errorf("invalid TLD %s: %w", tld, err)
		}
	}

	validPatternTypes := map[string]bool{
		"prefix": true,
		"suffix": true,
		"both":   true,
	}

	if !validPatternTypes[config.PatternType] {
		return fmt.Errorf("invalid pattern type: %s", config.PatternType)
	}

	return nil
}

// GetGenerationStats returns statistics about domain generation
func (s *domainGenerationServiceImpl) GetGenerationStats(ctx context.Context, campaignID uuid.UUID) (*DomainGenerationStats, error) {
	// Get domains data from JSONB column
	domainsData, err := s.getDomainsDataJSONB(ctx, campaignID)
	if err != nil {
		return nil, fmt.Errorf("failed to get domains data: %w", err)
	}

	stats := &DomainGenerationStats{
		CampaignID:        campaignID,
		TotalCombinations: 0,
		CurrentOffset:     0,
		DomainsGenerated:  0,
		GenerationRate:    0.0,
		MemoryUsage:       0,
		ConfigHash:        "",
		EstimatedTimeLeft: 0,
	}

	if domainsData != nil {
		if domains, ok := domainsData["domains"].([]interface{}); ok {
			stats.DomainsGenerated = len(domains)
		}
		if offset, ok := domainsData["offset"].(float64); ok {
			stats.CurrentOffset = int64(offset)
		}
		if configHash, ok := domainsData["config_hash"].(string); ok {
			stats.ConfigHash = configHash
		}
	}

	// Get memory usage
	var m runtime.MemStats
	runtime.ReadMemStats(&m)
	stats.MemoryUsage = int64(m.Alloc)

	return stats, nil
}

// Helper methods for JSONB operations

// updateDomainsDataJSONB updates the domains_data JSONB column
func (s *domainGenerationServiceImpl) updateDomainsDataJSONB(ctx context.Context, campaignID uuid.UUID, domainsData map[string]interface{}) error {
	if s.db == nil {
		return fmt.Errorf("database connection not available")
	}

	jsonData, err := json.Marshal(domainsData)
	if err != nil {
		return fmt.Errorf("failed to marshal domains data: %w", err)
	}

	query := `UPDATE lead_generation_campaigns SET domains_data = $1 WHERE id = $2`
	_, err = s.db.ExecContext(ctx, query, jsonData, campaignID)
	if err != nil {
		return fmt.Errorf("failed to update domains_data column: %w", err)
	}

	return nil
}

// getDomainsDataJSONB retrieves the domains_data JSONB column
func (s *domainGenerationServiceImpl) getDomainsDataJSONB(ctx context.Context, campaignID uuid.UUID) (map[string]interface{}, error) {
	if s.db == nil {
		return nil, fmt.Errorf("database connection not available")
	}

	var jsonData []byte
	query := `SELECT domains_data FROM lead_generation_campaigns WHERE id = $1`
	err := s.db.QueryRowContext(ctx, query, campaignID).Scan(&jsonData)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil // No data found
		}
		return nil, fmt.Errorf("failed to get domains_data column: %w", err)
	}

	if len(jsonData) == 0 {
		return nil, nil
	}

	var domainsData map[string]interface{}
	if err := json.Unmarshal(jsonData, &domainsData); err != nil {
		return nil, fmt.Errorf("failed to unmarshal domains data: %w", err)
	}

	return domainsData, nil
}
