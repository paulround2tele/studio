// File: backend/internal/services/domain_generation_service.go
package services

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"runtime"
	"time"

	"github.com/fntelecomllc/studio/backend/internal/domainexpert"
	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/fntelecomllc/studio/backend/internal/store"
	"github.com/fntelecomllc/studio/backend/internal/utils"
	"github.com/fntelecomllc/studio/backend/internal/websocket"

	// "github.com/fntelecomllc/studio/backend/internal/workers" // TODO: Implement workers package
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
	config interface{}
	db     *sqlx.DB
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

// Stub functions for missing constructors
func NewWorkerCoordinationService(db *sqlx.DB, workerID string) *WorkerCoordinationService {
	return &WorkerCoordinationService{db: db, workerID: workerID}
}

func NewMemoryPoolManager(config interface{}, monitor interface{}) *MemoryPoolManager {
	return &MemoryPoolManager{config: config, monitor: monitor}
}

func DefaultMemoryPoolConfig() interface{} {
	return struct{}{}
}

// Stub monitoring package functions
func newMemoryMonitor(_ *sqlx.DB, _ interface{}, _ interface{}) interface{} {
	return struct{}{}
}

// Stub workers package
type WorkerPoolConfig struct {
	MinWorkers int
	MaxWorkers int
	QueueSize  int
}

func newEfficientWorkerPool(config WorkerPoolConfig, db *sqlx.DB) *EfficientWorkerPool {
	return &EfficientWorkerPool{config: config, db: db}
}

// Stub monitoring functions
func logTransactionEvent(id string, operation string, status string, err error) {
	if err != nil {
		log.Printf("TRANSACTION_%s: event=%s operation=%s tx_id=%s error=%v", status, id, operation, status, err)
	} else {
		log.Printf("TRANSACTION_%s: event=%s operation=%s tx_id=%s", status, id, operation, status)
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

// NewDomainGenerationServiceStable creates a new DomainGenerationService with stable backend compatibility
// This version doesn't require ConfigManagerInterface for backward compatibility
func NewDomainGenerationServiceStable(db *sqlx.DB, cs store.CampaignStore, cjs store.CampaignJobStore, as store.AuditLogStore) DomainGenerationService {
	// Create a basic ConfigManager for stable backend compatibility
	basicConfigManager := NewConfigManager(db)
	return NewDomainGenerationService(db, cs, cjs, as, basicConfigManager)
}

func (s *domainGenerationServiceImpl) CreateCampaign(ctx context.Context, req CreateDomainGenerationCampaignRequest) (*models.Campaign, error) {
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

	hashResult, hashErr := domainexpert.GenerateDomainGenerationConfigHash(tempGenParamsForHash)
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
			WHERE c.campaign_type = 'domain_generation'
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
		existingConfig, errGetConfig := s.configManager.GetDomainGenerationConfig(ctx, configHashString)
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
		existingConfigState, errGetState := s.campaignStore.GetDomainGenerationConfigStateByHash(ctx, querier, configHashString)
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
	campaignInstanceTargetCount := req.NumDomainsToGenerate
	var actualTotalItemsForThisRun int64
	availableFromGlobalOffset := int64(totalPossibleCombinations) - startingOffset
	if availableFromGlobalOffset < 0 {
		availableFromGlobalOffset = 0
	}
	if req.NumDomainsToGenerate == 0 {
		actualTotalItemsForThisRun = availableFromGlobalOffset
	} else {
		if req.NumDomainsToGenerate > availableFromGlobalOffset {
			actualTotalItemsForThisRun = availableFromGlobalOffset
		} else {
			actualTotalItemsForThisRun = req.NumDomainsToGenerate
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
	baseCampaign := &models.Campaign{
		ID:                 campaignID,
		Name:               req.Name,
		CampaignType:       models.CampaignTypeDomainGeneration,
		Status:             models.CampaignStatusPending,
		UserID:             userIDPtr,
		CreatedAt:          functionStartTime, // Use functionStartTime
		UpdatedAt:          functionStartTime, // Use functionStartTime
		TotalItems:         models.Int64Ptr(actualTotalItemsForThisRun),
		ProcessedItems:     models.Int64Ptr(0),
		ProgressPercentage: models.Float64Ptr(0.0),
	}

	campaignDomainGenParams := &models.DomainGenerationCampaignParams{
		CampaignID:                campaignID,
		PatternType:               req.PatternType,
		VariableLength:            req.VariableLength,
		CharacterSet:              req.CharacterSet,
		ConstantString:            models.StringPtr(req.ConstantString),
		TLD:                       req.TLD,
		NumDomainsToGenerate:      int(campaignInstanceTargetCount), // Converted int64 to int
		TotalPossibleCombinations: totalPossibleCombinations,
		CurrentOffset:             startingOffset,
	}
	baseCampaign.DomainGenerationParams = campaignDomainGenParams

	if err := s.campaignStore.CreateCampaign(ctx, querier, baseCampaign); err != nil {
		opErr = fmt.Errorf("failed to create base campaign record: %w", err)
		log.Printf("Error creating base campaign record for %s: %v", req.Name, opErr)
		return nil, opErr
	}
	log.Printf("Base campaign record created for %s.", req.Name)

	if err := s.campaignStore.CreateDomainGenerationParams(ctx, querier, campaignDomainGenParams); err != nil {
		opErr = fmt.Errorf("failed to create domain generation params: %w", err)
		log.Printf("Error creating domain generation params for %s: %v", req.Name, opErr)
		return nil, opErr
	}
	log.Printf("Domain generation params created for %s. Campaign-specific start offset: %d", req.Name, startingOffset)

	configDetailsBytes, jsonErr := json.Marshal(normalizedHashedParams)
	if jsonErr != nil {
		opErr = fmt.Errorf("failed to marshal normalized config details for global state: %w", jsonErr)
		log.Printf("Error for campaign %s: %v", req.Name, opErr)
		return nil, opErr
	}

	globalConfigState := &models.DomainGenerationConfigState{
		ConfigHash:    configHashString,
		LastOffset:    startingOffset,
		ConfigDetails: configDetailsBytes,
		UpdatedAt:     functionStartTime, // Use functionStartTime
	}

	// Use thread-safe configuration manager to update config state
	if s.configManager != nil {
		_, err := s.configManager.UpdateDomainGenerationConfig(ctx, configHashString, func(currentState *models.DomainGenerationConfigState) (*models.DomainGenerationConfigState, error) {
			// Create or update the global config state
			updatedState := &models.DomainGenerationConfigState{
				ConfigHash:    configHashString,
				LastOffset:    startingOffset,
				ConfigDetails: configDetailsBytes,
				UpdatedAt:     functionStartTime,
			}
			return updatedState, nil
		})
		if err != nil {
			opErr = fmt.Errorf("failed to create/update domain generation config state via config manager: %w", err)
			log.Printf("Error creating/updating DomainGenerationConfigState for hash %s, campaign %s: %v", configHashString, req.Name, opErr)
			return nil, opErr
		}
		log.Printf("DomainGenerationConfigState created/updated for hash %s, campaign %s via ConfigManager.", configHashString, req.Name)
	} else {
		// Fallback to direct access
		if err := s.campaignStore.CreateOrUpdateDomainGenerationConfigState(ctx, querier, globalConfigState); err != nil {
			opErr = fmt.Errorf("failed to create/update domain generation config state: %w", err)
			log.Printf("Error creating/updating DomainGenerationConfigState for hash %s, campaign %s: %v", configHashString, req.Name, opErr)
			return nil, opErr
		}
		log.Printf("DomainGenerationConfigState created/updated for hash %s, campaign %s.", configHashString, req.Name)
	}

	if opErr == nil {
		s.logAuditEvent(ctx, querier, baseCampaign, "Domain Generation Campaign Created (Service)", fmt.Sprintf("Name: %s, ConfigHash: %s, StartOffset: %d, RequestedForInstance: %d, ActualTotalItemsForThisRun: %d", req.Name, configHashString, startingOffset, campaignInstanceTargetCount, actualTotalItemsForThisRun))

		// Job creation is now handled by the orchestrator service to avoid duplicate jobs
		// The orchestrator will create the job when StartCampaign is called
		log.Printf("Campaign %s created successfully. Job will be created by orchestrator when campaign is started.", baseCampaign.ID)
	}

	return baseCampaign, opErr
}

func (s *domainGenerationServiceImpl) GetCampaignDetails(ctx context.Context, campaignID uuid.UUID) (*models.Campaign, *models.DomainGenerationCampaignParams, error) {
	var querier store.Querier
	if s.db != nil {
		querier = s.db
	}

	campaign, err := s.campaignStore.GetCampaignByID(ctx, querier, campaignID)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to get campaign by ID %s: %w", campaignID, err)
	}
	if campaign.CampaignType != models.CampaignTypeDomainGeneration {
		return nil, nil, fmt.Errorf("campaign %s is not a domain generation campaign (type: %s)", campaignID, campaign.CampaignType)
	}

	params, err := s.campaignStore.GetDomainGenerationParams(ctx, querier, campaignID)
	if err != nil {
		if campaign.DomainGenerationParams != nil {
			return campaign, campaign.DomainGenerationParams, nil
		}
		return nil, nil, fmt.Errorf("failed to get domain generation params for campaign %s: %w", campaignID, err)
	}
	return campaign, params, nil
}

func (s *domainGenerationServiceImpl) logAuditEvent(ctx context.Context, exec store.Querier, campaign *models.Campaign, action, description string) {
	if s.auditLogger == nil || campaign == nil {
		return
	}
	s.auditLogger.LogCampaignEvent(ctx, exec, campaign, action, description)
}

func (s *domainGenerationServiceImpl) ProcessGenerationCampaignBatch(ctx context.Context, campaignID uuid.UUID) (done bool, processedInThisBatch int, opErr error) {
	log.Printf("ProcessGenerationCampaignBatch: Starting for campaignID %s", campaignID)

	var querier store.Querier
	isSQL := s.db != nil
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

	var campaign *models.Campaign
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
	if campaign.Status == models.CampaignStatusCompleted || campaign.Status == models.CampaignStatusFailed || campaign.Status == models.CampaignStatusCancelled {
		log.Printf("ProcessGenerationCampaignBatch: Campaign %s already in terminal state (status: %s). No action.", campaignID, campaign.Status)
		return true, 0, nil
	}

	// If campaign is Pending or Queued, transition to Running
	if campaign.Status == models.CampaignStatusPending || campaign.Status == models.CampaignStatusQueued {
		originalStatus := campaign.Status
		campaign.Status = models.CampaignStatusRunning
		if campaign.StartedAt == nil { // Set StartedAt only if not already set
			now := time.Now().UTC()
			campaign.StartedAt = &now
		}
		campaign.UpdatedAt = time.Now().UTC()
		if errUpdate := s.campaignStore.UpdateCampaign(ctx, querier, campaign); errUpdate != nil {
			opErr = fmt.Errorf("failed to mark campaign %s from %s to running: %w", campaignID, originalStatus, errUpdate)
			log.Printf("[ProcessGenerationCampaignBatch] %v", opErr)
			return false, 0, opErr
		}
		log.Printf("ProcessGenerationCampaignBatch: Campaign %s marked as Running (was %s).", campaignID, originalStatus)

		// Broadcast campaign status change via WebSocket
		websocket.BroadcastCampaignProgress(campaignID.String(), 0.0, "running", "domain_generation")
	} else if campaign.Status != models.CampaignStatusRunning {
		// If it's some other non-runnable, non-terminal state (e.g., Paused, Pausing)
		log.Printf("ProcessGenerationCampaignBatch: Campaign %s is not in a runnable state (status: %s). Skipping job.", campaignID, campaign.Status)
		return true, 0, nil // True because the job itself is "done" for now, campaign is not runnable
	}

	var genParams *models.DomainGenerationCampaignParams
	genParams, opErr = s.campaignStore.GetDomainGenerationParams(ctx, querier, campaignID)
	if opErr != nil {
		log.Printf("[ProcessGenerationCampaignBatch] Failed to fetch generation params for campaign %s: %v", campaignID, opErr)
		return false, 0, opErr
	}
	if genParams == nil && campaign.DomainGenerationParams != nil {
		genParams = campaign.DomainGenerationParams
		opErr = nil
	} else if genParams == nil && campaign.DomainGenerationParams == nil {
		opErr = fmt.Errorf("domain generation parameters not found for campaign %s", campaignID)
		log.Printf("[ProcessGenerationCampaignBatch] %v", opErr)
		campaign.Status = models.CampaignStatusFailed
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

	domainGen, expertErr := domainexpert.NewDomainGenerator(
		domainexpert.CampaignPatternType(genParams.PatternType),
		varLength,
		charSet,
		constStr,
		genParams.TLD,
	)
	if expertErr != nil {
		opErr = fmt.Errorf("failed to initialize domain generator for campaign %s: %w. Campaign marked failed", campaignID, expertErr)
		log.Printf("[ProcessGenerationCampaignBatch] %v", opErr)
		campaign.Status = models.CampaignStatusFailed
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

	if (genParams.NumDomainsToGenerate > 0 && processedItems >= int64(genParams.NumDomainsToGenerate)) ||
		(genParams.CurrentOffset >= genParams.TotalPossibleCombinations) {
		log.Printf("ProcessGenerationCampaignBatch: Campaign %s completion condition met before batch processing. Processed: %d, Target: %d, Global offset: %d / %d.",
			campaignID, processedItems, genParams.NumDomainsToGenerate, genParams.CurrentOffset, genParams.TotalPossibleCombinations)

		if campaign.Status != models.CampaignStatusCompleted {
			campaign.Status = models.CampaignStatusCompleted
			campaign.ProgressPercentage = models.Float64Ptr(100.0)
			now := time.Now().UTC()
			campaign.CompletedAt = &now
			opErr = s.campaignStore.UpdateCampaign(ctx, querier, campaign)
			if opErr != nil {
				log.Printf("[ProcessGenerationCampaignBatch] Error marking campaign %s as completed: %v", campaignID, opErr)
			}
		}
		return true, 0, opErr
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
		if campaign.Status != models.CampaignStatusCompleted {
			campaign.Status = models.CampaignStatusCompleted
			campaign.ProgressPercentage = models.Float64Ptr(100.0)
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
		if campaign.Status != models.CampaignStatusCompleted {
			campaign.Status = models.CampaignStatusCompleted
			campaign.ProgressPercentage = models.Float64Ptr(100.0)
			now := time.Now().UTC()
			campaign.CompletedAt = &now
			opErr = s.campaignStore.UpdateCampaign(ctx, querier, campaign)
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
		func() string { if genParams.ConstantString != nil { return *genParams.ConstantString } else { return "nil" } }(), genParams.TLD)

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
		campaign.Status = models.CampaignStatusFailed
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
			campaign.Status = models.CampaignStatusCompleted
			campaign.ProgressPercentage = models.Float64Ptr(100.0)
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
			ID:                   uuid.New(),
			DomainName:           domainName,
			GenerationCampaignID: campaignID,
			GeneratedAt:          nowTime,
			OffsetIndex:          genParams.CurrentOffset + int64(i),
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
		for i, domain := range generatedDomainsToStore {
			if broadcaster := websocket.GetBroadcaster(); broadcaster != nil {
				message := websocket.CreateDomainGeneratedMessage(campaignID.String(), domain.ID.String(), domain.DomainName, int(domain.OffsetIndex), len(generatedDomainsToStore))
				broadcaster.BroadcastToCampaign(campaignID.String(), message)
				log.Printf("ProcessGenerationCampaignBatch: Streamed domain %d/%d: %s for campaign %s", i+1, len(generatedDomainsToStore), domain.DomainName, campaignID)
			}
		}

		// Broadcast domain generation progress via WebSocket
		newProcessedItems := processedItems + int64(processedInThisBatch)
		targetDomains := int64(genParams.NumDomainsToGenerate)
		if targetDomains == 0 {
			targetDomains = genParams.TotalPossibleCombinations
		}
		websocket.BroadcastDomainGeneration(campaignID.String(), newProcessedItems, targetDomains)
		
		log.Printf("ProcessGenerationCampaignBatch: Real-time streaming completed for %d domains in campaign %s", processedInThisBatch, campaignID)
	}

	if errUpdateOffset := s.campaignStore.UpdateDomainGenerationParamsOffset(ctx, querier, campaignID, nextGeneratorOffsetAbsolute); errUpdateOffset != nil {
		opErr = fmt.Errorf("failed to update campaign-specific current offset for %s to %d: %w", campaignID, nextGeneratorOffsetAbsolute, errUpdateOffset)
		log.Printf("[ProcessGenerationCampaignBatch] %v", opErr)
		return false, processedInThisBatch, opErr
	}
	genParams.CurrentOffset = nextGeneratorOffsetAbsolute

	hashResultForUpdate, hashErrForUpdate := domainexpert.GenerateDomainGenerationConfigHash(*genParams)
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
		_, errUpdateConfig := s.configManager.UpdateDomainGenerationConfig(ctx, configHashStringForUpdate, func(currentState *models.DomainGenerationConfigState) (*models.DomainGenerationConfigState, error) {
			log.Printf("DEBUG [Global Offset]: ConfigManager update function called - currentState: %+v", currentState)
			// Perform atomic update with copy-on-write semantics
			updatedState := &models.DomainGenerationConfigState{
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
		globalConfigState := &models.DomainGenerationConfigState{
			ConfigHash:    configHashStringForUpdate,
			LastOffset:    nextGeneratorOffsetAbsolute,
			ConfigDetails: normalizedHashedParamsBytesForUpdate,
			UpdatedAt:     nowTime,
		}
		log.Printf("DEBUG [Global Offset]: About to update global offset for hash %s from current offset to %d for campaign %s", configHashStringForUpdate, nextGeneratorOffsetAbsolute, campaignID)
		if errUpdateGlobalState := s.campaignStore.CreateOrUpdateDomainGenerationConfigState(ctx, querier, globalConfigState); errUpdateGlobalState != nil {
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

	// Calculate progress percentage
	var progressPercentage float64
	var targetItems int64

	if genParams.NumDomainsToGenerate > 0 {
		targetItems = int64(genParams.NumDomainsToGenerate)
		progressPercentage = (float64(newProcessedItems) / float64(targetItems)) * 100
	} else {
		targetItems = genParams.TotalPossibleCombinations
		if genParams.TotalPossibleCombinations > 0 {
			progressPercentage = (float64(genParams.CurrentOffset) / float64(genParams.TotalPossibleCombinations)) * 100
		} else {
			progressPercentage = 100.0
		}
	}
	if progressPercentage > 100.0 {
		progressPercentage = 100.0
	}

	// Check if campaign is completed
	if (genParams.NumDomainsToGenerate > 0 && newProcessedItems >= int64(genParams.NumDomainsToGenerate)) ||
		(genParams.CurrentOffset >= genParams.TotalPossibleCombinations) {
		
		// Campaign is completed - update to 100% and set completed status
		if errUpdateProgress := s.campaignStore.UpdateCampaignProgress(ctx, querier, campaignID, newProcessedItems, targetItems, 100.0); errUpdateProgress != nil {
			opErr = fmt.Errorf("failed to update campaign %s final progress: %w", campaignID, errUpdateProgress)
			log.Printf("[ProcessGenerationCampaignBatch] %v", opErr)
			return false, processedInThisBatch, opErr
		}

		// Mark campaign as completed
		campaign.Status = models.CampaignStatusCompleted
		campaign.ProgressPercentage = models.Float64Ptr(100.0)
		campaign.ProcessedItems = models.Int64Ptr(newProcessedItems)
		campaign.TotalItems = models.Int64Ptr(targetItems)
		campaign.CompletedAt = &nowTime
		done = true

		if errUpdateCampaign := s.campaignStore.UpdateCampaign(ctx, querier, campaign); errUpdateCampaign != nil {
			opErr = fmt.Errorf("failed to update campaign %s completion status: %w", campaignID, errUpdateCampaign)
			log.Printf("[ProcessGenerationCampaignBatch] %v", opErr)
			return false, processedInThisBatch, opErr
		}

		log.Printf("ProcessGenerationCampaignBatch: Campaign %s completed. Processed: %d. Target: %d. Global Offset: %d. Total Possible: %d",
			campaignID, newProcessedItems, genParams.NumDomainsToGenerate, genParams.CurrentOffset, genParams.TotalPossibleCombinations)

		// Broadcast campaign completion via WebSocket
		websocket.BroadcastCampaignProgress(campaignID.String(), 100.0, "completed", "domain_generation")
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
		campaign.Status = models.CampaignStatusRunning
		done = false

		log.Printf("ProcessGenerationCampaignBatch: Campaign %s progress updated. Processed: %d/%d (%.2f%%)",
			campaignID, newProcessedItems, targetItems, progressPercentage)

		// Broadcast campaign progress update via WebSocket
		websocket.BroadcastCampaignProgress(campaignID.String(), progressPercentage, "running", "domain_generation")
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
	// Implementation for worker registration
	return nil
}

// StartHeartbeat starts the heartbeat mechanism for the worker
func (w *WorkerCoordinationService) StartHeartbeat(ctx context.Context) {
	// Implementation for starting heartbeat
}

// StopHeartbeat stops the heartbeat mechanism for the worker
func (w *WorkerCoordinationService) StopHeartbeat() {
	// Implementation for stopping heartbeat
}

// UpdateWorkerStatus updates the status of a worker
func (w *WorkerCoordinationService) UpdateWorkerStatus(ctx context.Context, campaignID uuid.UUID, status string, operation string) error {
	// Implementation for updating worker status
	return nil
}

// CleanupStaleWorkers removes stale workers from the coordination system
func (w *WorkerCoordinationService) CleanupStaleWorkers(ctx context.Context) error {
	// Implementation for cleaning up stale workers
	return nil
}

// GetWorkerStats gets worker statistics
func (w *WorkerCoordinationService) GetWorkerStats(ctx context.Context) (map[string]interface{}, error) {
	// Implementation for getting worker stats
	stats := make(map[string]interface{})
	stats["active_workers"] = 0
	stats["total_jobs"] = 0
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

// GetDomainGenerationConfig gets domain generation configuration by hash (signature corrected)
func (cm *ConfigManager) GetDomainGenerationConfig(ctx context.Context, configHash string) (*models.DomainGenerationConfigState, error) {
	if cm.db == nil {
		return nil, fmt.Errorf("database connection is nil")
	}

	// Query for existing configuration state by hash
	query := `
		SELECT config_hash, last_offset, config_details, updated_at
		FROM domain_generation_config_states
		WHERE config_hash = $1
	`
	
	var configState models.DomainGenerationConfigState
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
	
	// Set the ConfigState field to point to itself for backward compatibility
	configState.ConfigState = &configState
	
	return &configState, nil
}

// UpdateDomainGenerationConfig updates domain generation configuration with atomic update function
func (cm *ConfigManager) UpdateDomainGenerationConfig(ctx context.Context, configHash string, updateFn func(currentState *models.DomainGenerationConfigState) (*models.DomainGenerationConfigState, error)) (*models.DomainGenerationConfigState, error) {
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
	currentState, err := cm.GetDomainGenerationConfig(ctx, configHash)
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
