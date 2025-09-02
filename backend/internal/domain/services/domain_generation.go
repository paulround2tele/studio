// Domain Generation Service - orchestrates domainexpert.DomainGenerator engine
package services

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"
	"time"

	"github.com/fntelecomllc/studio/backend/internal/domain/services/infra"
	"github.com/fntelecomllc/studio/backend/internal/domainexpert"
	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/fntelecomllc/studio/backend/internal/store"
	"github.com/google/uuid"
)

// DomainGenerationConfig represents the configuration for domain generation
type DomainGenerationConfig struct {
	PatternType    string `json:"pattern_type"` // prefix, suffix, both
	VariableLength int    `json:"variable_length"`
	CharacterSet   string `json:"character_set"`
	ConstantString string `json:"constant_string"`
	TLD            string `json:"tld"`
	NumDomains     int64  `json:"num_domains"`
	BatchSize      int    `json:"batch_size"`
	OffsetStart    int64  `json:"offset_start"`
}

// domainGenerationService implements DomainGenerationService
// Orchestrates the existing domainexpert.DomainGenerator engine
type domainGenerationService struct {
	store store.CampaignStore
	deps  Dependencies

	// Infrastructure Adapters
	auditLogger AuditLogger
	metrics     MetricsRecorder
	txManager   TxManager
	cache       Cache

	// Execution state tracking
	mu         sync.RWMutex
	executions map[uuid.UUID]*domainExecution
}

// domainExecution tracks the state of a domain generation execution
type domainExecution struct {
	campaignID     uuid.UUID
	config         DomainGenerationConfig
	generator      *domainexpert.DomainGenerator
	configHash     string
	normalized     models.NormalizedDomainGenerationParams
	status         models.PhaseStatusEnum
	startedAt      time.Time
	completedAt    *time.Time
	progressCh     chan PhaseProgress
	cancelCtx      context.Context
	cancelFunc     context.CancelFunc
	itemsTotal     int64
	itemsProcessed int64
	lastError      string
}

// NewDomainGenerationService creates a new domain generation service
func NewDomainGenerationService(
	store store.CampaignStore,
	deps Dependencies,
) DomainGenerationService {
	svc := &domainGenerationService{
		store:      store,
		deps:       deps,
		executions: make(map[uuid.UUID]*domainExecution),
	}
	// Prefer provided deps; fall back to minimal no-ops
	if deps.AuditLogger != nil {
		svc.auditLogger = deps.AuditLogger
	} else {
		svc.auditLogger = infra.NewAuditService()
	}
	if deps.MetricsRecorder != nil {
		svc.metrics = deps.MetricsRecorder
	} else {
		svc.metrics = infra.NewMetricsSQLX(nil)
	}
	if deps.TxManager != nil {
		svc.txManager = deps.TxManager
	} else {
		svc.txManager = infra.NewTxSQLX(nil)
	}
	if deps.Cache != nil {
		svc.cache = deps.Cache
	} else {
		svc.cache = infra.NewCacheRedis(nil)
	}
	return svc
}

// GetPhaseType returns the phase type this service handles
func (s *domainGenerationService) GetPhaseType() models.PhaseTypeEnum {
	return models.PhaseTypeDomainGeneration
}

// Configure sets up the domain generation phase
func (s *domainGenerationService) Configure(ctx context.Context, campaignID uuid.UUID, config interface{}) error {
	s.deps.Logger.Info(ctx, "Configuring domain generation phase", map[string]interface{}{
		"campaign_id": campaignID,
	})

	// Audit the configuration event
	if s.auditLogger != nil {
		s.auditLogger.LogEvent(fmt.Sprintf("Domain generation phase configured for campaign %s", campaignID))
	}

	// Accept either a typed config or a generic map and convert
	var domainConfig DomainGenerationConfig
	switch v := config.(type) {
	case DomainGenerationConfig:
		domainConfig = v
	case map[string]interface{}:
		// Convert common keys (camelCase and snake_case)
		getString := func(key string) string {
			if val, ok := v[key]; ok {
				if s, ok2 := val.(string); ok2 {
					return s
				}
			}
			return ""
		}
		getInt := func(key string) int {
			if val, ok := v[key]; ok {
				switch t := val.(type) {
				case float64:
					return int(t)
				case int:
					return t
				case int32:
					return int(t)
				case int64:
					return int(t)
				}
			}
			return 0
		}
		getInt64 := func(key string) int64 {
			if val, ok := v[key]; ok {
				switch t := val.(type) {
				case float64:
					return int64(t)
				case int:
					return int64(t)
				case int32:
					return int64(t)
				case int64:
					return t
				}
			}
			return 0
		}
		// TLD: accept tld string or first of tlds array
		getTLD := func() string {
			if s := getString("tld"); s != "" {
				return s
			}
			if raw, ok := v["tlds"]; ok {
				if arr, ok2 := raw.([]interface{}); ok2 && len(arr) > 0 {
					if s, ok3 := arr[0].(string); ok3 {
						return s
					}
				}
				if arrS, ok2 := raw.([]string); ok2 && len(arrS) > 0 {
					return arrS[0]
				}
			}
			return ""
		}

		domainConfig = DomainGenerationConfig{
			PatternType:    getString("patternType"),
			VariableLength: getInt("variableLength"),
			CharacterSet:   getString("characterSet"),
			ConstantString: getString("constantString"),
			TLD:            getTLD(),
			NumDomains:     getInt64("numDomainsToGenerate"),
			BatchSize:      getInt("batchSize"),
			OffsetStart:    getInt64("offsetStart"),
		}
		// fallbacks for snake_case
		if domainConfig.PatternType == "" {
			domainConfig.PatternType = getString("pattern_type")
		}
		if domainConfig.VariableLength == 0 {
			domainConfig.VariableLength = getInt("variable_length")
		}
		if domainConfig.CharacterSet == "" {
			domainConfig.CharacterSet = getString("character_set")
		}
		if domainConfig.ConstantString == "" {
			domainConfig.ConstantString = getString("constant_string")
		}
		if domainConfig.NumDomains == 0 {
			domainConfig.NumDomains = getInt64("num_domains")
		}
		if domainConfig.BatchSize == 0 {
			domainConfig.BatchSize = getInt("batch_size")
		}
		if domainConfig.OffsetStart == 0 {
			domainConfig.OffsetStart = getInt64("offset_start")
		}
		if domainConfig.PatternType == "" {
			domainConfig.PatternType = "prefix"
		}
	default:
		return fmt.Errorf("invalid configuration type for domain generation")
	}

	// Validate configuration
	if err := s.Validate(ctx, domainConfig); err != nil {
		return fmt.Errorf("invalid domain generation configuration: %w", err)
	}

	// Create domain generator using existing domainexpert engine
	generator, err := domainexpert.NewDomainGenerator(
		domainexpert.CampaignPatternType(domainConfig.PatternType),
		domainConfig.VariableLength,
		domainConfig.CharacterSet,
		domainConfig.ConstantString,
		domainConfig.TLD,
	)
	if err != nil {
		return fmt.Errorf("failed to create domain generator: %w", err)
	}

	// Compute config hash for authoritative global offset management
	// Map to models.DomainGenerationCampaignParams for hashing utility
	cs := domainConfig.ConstantString
	var csPtr *string
	if cs != "" {
		csPtr = &cs
	}
	hashInput := models.DomainGenerationCampaignParams{
		PatternType:    domainConfig.PatternType,
		VariableLength: domainConfig.VariableLength,
		CharacterSet:   domainConfig.CharacterSet,
		ConstantString: csPtr,
		TLD:            domainConfig.TLD,
	}
	hashRes, herr := domainexpert.GenerateDomainGenerationPhaseConfigHash(hashInput)
	if herr != nil {
		return fmt.Errorf("failed to compute config hash: %w", herr)
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	// Store execution state
	s.executions[campaignID] = &domainExecution{
		campaignID:     campaignID,
		config:         domainConfig,
		generator:      generator,
		configHash:     hashRes.HashString,
		normalized:     hashRes.NormalizedParams,
		status:         models.PhaseStatusConfigured,
		itemsTotal:     domainConfig.NumDomains,
		itemsProcessed: 0,
	}

	s.deps.Logger.Info(ctx, "Domain generation phase configured successfully", map[string]interface{}{
		"campaign_id":  campaignID,
		"pattern_type": domainConfig.PatternType,
		"num_domains":  domainConfig.NumDomains,
	})

	// Persist configuration in campaign phases
	if s.store != nil {
		if raw, mErr := json.Marshal(domainConfig); mErr == nil {
			var exec store.Querier
			if q, ok := s.deps.DB.(store.Querier); ok {
				exec = q
			}
			_ = s.store.UpdatePhaseConfiguration(ctx, exec, campaignID, models.PhaseTypeDomainGeneration, raw)
		}
	}

	return nil
}

// Execute runs the domain generation phase
func (s *domainGenerationService) Execute(ctx context.Context, campaignID uuid.UUID) (<-chan PhaseProgress, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	execution, exists := s.executions[campaignID]
	if !exists {
		return nil, fmt.Errorf("domain generation not configured for campaign %s", campaignID)
	}
	// Allow execution to start when the phase has been configured but not yet running
	if execution.status == models.PhaseStatusInProgress {
		return nil, fmt.Errorf("domain generation already started for campaign %s", campaignID)
	}

	// Create cancellable context for execution
	execution.cancelCtx, execution.cancelFunc = context.WithCancel(ctx)
	execution.progressCh = make(chan PhaseProgress, 100)
	// Transition from Configured (or NotStarted) to InProgress
	execution.status = models.PhaseStatusInProgress
	execution.startedAt = time.Now()

	s.deps.Logger.Info(execution.cancelCtx, "Starting domain generation execution", map[string]interface{}{
		"campaign_id": campaignID,
		"config":      execution.config,
	})

	// Mark phase started in store
	if s.store != nil {
		var exec store.Querier
		if q, ok := s.deps.DB.(store.Querier); ok {
			exec = q
		}
		_ = s.store.StartPhase(ctx, exec, campaignID, models.PhaseTypeDomainGeneration)
	}

	// Start execution in goroutine
	go s.executeGeneration(execution)

	return execution.progressCh, nil
}

// executeGeneration performs the actual domain generation using domainexpert engine
func (s *domainGenerationService) executeGeneration(execution *domainExecution) {
	defer close(execution.progressCh)

	ctx := execution.cancelCtx
	campaignID := execution.campaignID
	config := execution.config

	// Use existing domainexpert engine for generation
	batchSize := config.BatchSize
	if batchSize <= 0 {
		batchSize = 1000 // Default batch size
	}

	var processedCount int64
	// Authoritative starting offset: max(client offsetStart, global last_offset+1)
	offset := config.OffsetStart
	var exec store.Querier
	if q, ok := s.deps.DB.(store.Querier); ok {
		exec = q
	}
	if s.store != nil {
		// Try read current global config state; ignore not found
		if state, err := s.store.GetDomainGenerationPhaseConfigStateByHash(ctx, exec, execution.configHash); err == nil && state != nil {
			if state.LastOffset+1 > offset {
				offset = state.LastOffset + 1
			}
		}
	}

	for processedCount < config.NumDomains {
		select {
		case <-ctx.Done():
			// Treat external cancellation as a graceful pause; do not mark as failed
			s.updateExecutionStatus(campaignID, models.PhaseStatusPaused, "Execution cancelled by caller context")
			return
		default:
		}

		// Calculate batch size for this iteration
		remaining := config.NumDomains - processedCount
		currentBatch := int64(batchSize)
		if remaining < currentBatch {
			currentBatch = remaining
		}

		// Generate domains using domainexpert engine
		domains, nextOffset, err := execution.generator.GenerateBatch(offset, int(currentBatch))
		if err != nil {
			s.updateExecutionStatus(campaignID, models.PhaseStatusFailed, fmt.Sprintf("Domain generation failed: %v", err))
			return
		}

		// Store generated domains and update global last_offset atomically
		if err := s.persistBatchWithGlobalOffset(ctx, campaignID, execution, domains, offset, nextOffset); err != nil {
			s.updateExecutionStatus(campaignID, models.PhaseStatusFailed, fmt.Sprintf("Failed to store domains: %v", err))
			return
		}

		// Update progress
		processedCount += int64(len(domains))
		offset = nextOffset

		// Record metrics for domain generation
		if s.metrics != nil {
			s.metrics.RecordMetric("domains_generated_batch", float64(len(domains)))
			s.metrics.RecordMetric("domains_generated_total", float64(processedCount))
		}

		// Cache progress information
		if s.cache != nil {
			cacheKey := fmt.Sprintf("domain_generation_progress_%s", campaignID)
			cacheValue := fmt.Sprintf("processed:%d,total:%d", processedCount, config.NumDomains)
			s.cache.Set(ctx, cacheKey, cacheValue, 0) // No TTL for progress
		}

		s.mu.Lock()
		execution.itemsProcessed = processedCount
		s.mu.Unlock()

		// Persist progress in store
		if s.store != nil {
			var exec store.Querier
			if q, ok := s.deps.DB.(store.Querier); ok {
				exec = q
			}
			total := execution.itemsTotal
			processed := processedCount
			progressPct := float64(processed) / float64(total) * 100
			_ = s.store.UpdatePhaseProgress(ctx, exec, campaignID, models.PhaseTypeDomainGeneration, progressPct, &total, &processed, nil, nil)
		}

		// Send progress update
		progress := PhaseProgress{
			CampaignID:     campaignID,
			Phase:          models.PhaseTypeDomainGeneration,
			Status:         models.PhaseStatusInProgress,
			ProgressPct:    float64(processedCount) / float64(config.NumDomains) * 100,
			ItemsTotal:     config.NumDomains,
			ItemsProcessed: processedCount,
			Message:        fmt.Sprintf("Generated %d domains", processedCount),
			Timestamp:      time.Now(),
		}

		select {
		case execution.progressCh <- progress:
		case <-ctx.Done():
			return
		}

		// Publish progress event (guard EventBus)
		if s.deps.EventBus != nil {
			if err := s.deps.EventBus.PublishProgress(ctx, progress); err != nil {
				if s.deps.Logger != nil {
					s.deps.Logger.Warn(ctx, "Failed to publish progress event", map[string]interface{}{
						"campaign_id": campaignID,
						"error":       err.Error(),
					})
				}
			}
		}
	}

	// Mark as completed
	s.updateExecutionStatus(campaignID, models.PhaseStatusCompleted, "Domain generation completed successfully")

	s.deps.Logger.Info(ctx, "Domain generation completed", map[string]interface{}{
		"campaign_id":       campaignID,
		"domains_generated": processedCount,
	})
}

// GetStatus returns the current status of domain generation
func (s *domainGenerationService) GetStatus(ctx context.Context, campaignID uuid.UUID) (*PhaseStatus, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	execution, exists := s.executions[campaignID]
	if !exists {
		return &PhaseStatus{
			CampaignID: campaignID,
			Phase:      models.PhaseTypeDomainGeneration,
			Status:     models.PhaseStatusNotStarted,
		}, nil
	}

	status := &PhaseStatus{
		CampaignID:     campaignID,
		Phase:          models.PhaseTypeDomainGeneration,
		Status:         execution.status,
		StartedAt:      &execution.startedAt,
		CompletedAt:    execution.completedAt,
		ItemsTotal:     execution.itemsTotal,
		ItemsProcessed: execution.itemsProcessed,
		LastError:      execution.lastError,
	}

	if execution.itemsTotal > 0 {
		status.ProgressPct = float64(execution.itemsProcessed) / float64(execution.itemsTotal) * 100
	}

	return status, nil
}

// Cancel stops the domain generation execution
func (s *domainGenerationService) Cancel(ctx context.Context, campaignID uuid.UUID) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	execution, exists := s.executions[campaignID]
	if !exists {
		return fmt.Errorf("no domain generation execution found for campaign %s", campaignID)
	}

	if execution.cancelFunc != nil {
		execution.cancelFunc()
	}

	s.deps.Logger.Info(ctx, "Domain generation cancelled", map[string]interface{}{
		"campaign_id": campaignID,
	})

	return nil
}

// Validate validates the domain generation configuration
func (s *domainGenerationService) Validate(ctx context.Context, config interface{}) error {
	domainConfig, ok := config.(DomainGenerationConfig)
	if !ok {
		return fmt.Errorf("invalid configuration type")
	}

	if domainConfig.VariableLength <= 0 {
		return fmt.Errorf("variable length must be positive")
	}

	if domainConfig.CharacterSet == "" {
		return fmt.Errorf("character set cannot be empty")
	}

	if domainConfig.TLD == "" {
		return fmt.Errorf("TLD cannot be empty")
	}

	if domainConfig.NumDomains <= 0 {
		return fmt.Errorf("number of domains must be positive")
	}

	// Use domainexpert engine to validate configuration
	_, err := domainexpert.NewDomainGenerator(
		domainexpert.CampaignPatternType(domainConfig.PatternType),
		domainConfig.VariableLength,
		domainConfig.CharacterSet,
		domainConfig.ConstantString,
		domainConfig.TLD,
	)

	return err
}

// Helper methods

func (s *domainGenerationService) updateExecutionStatus(campaignID uuid.UUID, status models.PhaseStatusEnum, errorMsg string) {
	s.mu.Lock()
	defer s.mu.Unlock()

	execution, exists := s.executions[campaignID]
	if !exists {
		return
	}

	execution.status = status
	if status == models.PhaseStatusCompleted || status == models.PhaseStatusFailed {
		now := time.Now()
		execution.completedAt = &now
	}

	if errorMsg != "" {
		execution.lastError = errorMsg
	}

	// Publish status change event
	phaseStatus := PhaseStatus{
		CampaignID:     campaignID,
		Phase:          models.PhaseTypeDomainGeneration,
		Status:         status,
		StartedAt:      &execution.startedAt,
		CompletedAt:    execution.completedAt,
		ItemsTotal:     execution.itemsTotal,
		ItemsProcessed: execution.itemsProcessed,
		LastError:      errorMsg,
	}

	if execution.itemsTotal > 0 {
		phaseStatus.ProgressPct = float64(execution.itemsProcessed) / float64(execution.itemsTotal) * 100
	}

	ctx := context.Background()
	// Persist terminal status in store
	if s.store != nil {
		var exec store.Querier
		if q, ok := s.deps.DB.(store.Querier); ok {
			exec = q
		}
		switch status {
		case models.PhaseStatusCompleted:
			_ = s.store.CompletePhase(ctx, exec, campaignID, models.PhaseTypeDomainGeneration)
		case models.PhaseStatusFailed:
			_ = s.store.FailPhase(ctx, exec, campaignID, models.PhaseTypeDomainGeneration, errorMsg)
		case models.PhaseStatusPaused:
			_ = s.store.PausePhase(ctx, exec, campaignID, models.PhaseTypeDomainGeneration)
		}
	}
	if s.deps.EventBus != nil {
		if err := s.deps.EventBus.PublishStatusChange(ctx, phaseStatus); err != nil {
			if s.deps.Logger != nil {
				s.deps.Logger.Warn(ctx, "Failed to publish status change event", map[string]interface{}{
					"campaign_id": campaignID,
					"error":       err.Error(),
				})
			}
		}
	}
}

func (s *domainGenerationService) storeGeneratedDomains(ctx context.Context, campaignID uuid.UUID, domains []string, baseOffset int64) error {
	// Persist generated domains to the database and update domains_data JSONB so the REST endpoint returns them
	s.deps.Logger.Debug(ctx, "Storing generated domains", map[string]interface{}{
		"campaign_id":    campaignID,
		"domain_count":   len(domains),
		"sample_domains": domains[:min(len(domains), 5)],
	})

	if len(domains) == 0 {
		return nil
	}

	// Attempt to use the provided DB querier if available
	var exec store.Querier
	if q, ok := s.deps.DB.(store.Querier); ok {
		exec = q
	} else {
		// If we cannot obtain a querier, we can't persist; log and exit gracefully
		s.deps.Logger.Warn(ctx, "No DB querier available; skipping domain persistence", map[string]interface{}{"campaign_id": campaignID})
		return nil
	}

	// Build GeneratedDomain models for persistence
	now := time.Now().UTC()
	genModels := make([]*models.GeneratedDomain, len(domains))
	for i, d := range domains {
		genModels[i] = &models.GeneratedDomain{
			ID:          uuid.New(),
			CampaignID:  campaignID,
			DomainName:  d,
			GeneratedAt: now,
			CreatedAt:   now,
			OffsetIndex: baseOffset + int64(i),
			// OffsetIndex is best-effort here; precise offset is maintained inside JSONB/page data by caller
		}
	}

	if err := s.store.CreateGeneratedDomains(ctx, exec, genModels); err != nil {
		return fmt.Errorf("failed to persist generated domains: %w", err)
	}

	// Also mirror into domains_data JSONB used by GET /campaigns/{id}/domains
	// Prepare payload in the expected shape and append to existing array (not overwrite)
	items := make([]map[string]interface{}, len(genModels))
	for i, gd := range genModels {
		items[i] = map[string]interface{}{
			"id":          gd.ID.String(),
			"domain_name": gd.DomainName,
			"offset":      gd.OffsetIndex,
			"created_at":  now.Format(time.RFC3339),
		}
	}
	payload := map[string]interface{}{
		"domains":      items,
		"batch_size":   len(items),
		"last_updated": now.Format(time.RFC3339),
	}
	// Append to existing JSONB to accumulate domains across batches
	if err := s.store.AppendDomainsData(ctx, exec, campaignID, payload); err != nil {
		// Not fatal for persistence, but important for frontend visibility
		s.deps.Logger.Warn(ctx, "Failed to update JSONB domains_data", map[string]interface{}{
			"campaign_id": campaignID,
			"error":       err.Error(),
		})
	}

	return nil
}

// Note: transactional insert + offset upsert is implemented in persistBatchWithGlobalOffset
// using store.BeginTxx and passing the *sqlx.Tx as the store.Querier to all store methods.

// persistBatchWithGlobalOffset writes generated domains and updates global last_offset in a single SQL transaction
func (s *domainGenerationService) persistBatchWithGlobalOffset(ctx context.Context, campaignID uuid.UUID, execution *domainExecution, domains []string, baseOffset int64, nextOffset int64) error {
	if len(domains) == 0 {
		return nil
	}
	// Start a sqlx transaction via store to obtain a Querier compatible exec

	// Attempt to open a transaction through the store.Transactor if available
	if s.store != nil {
		if t, ok := s.store.(store.Transactor); ok {
			tx, err := t.BeginTxx(ctx, nil)
			if err != nil {
				return fmt.Errorf("begin tx: %w", err)
			}
			// Ensure commit/rollback semantics
			committed := false
			defer func() {
				if !committed {
					_ = tx.Rollback()
				}
			}()

			var txq store.Querier = tx
			// Persist domains
			if err := s.storeGeneratedDomainsWithExec(ctx, txq, campaignID, domains, baseOffset); err != nil {
				return err
			}

			// Upsert global config state last_offset
			now := time.Now().UTC()
			details, _ := json.Marshal(execution.normalized)
			newLast := nextOffset - 1 // nextOffset is exclusive
			state := &models.DomainGenerationPhaseConfigState{
				ConfigHash:    execution.configHash,
				LastOffset:    newLast,
				ConfigDetails: details,
				UpdatedAt:     now,
			}
			if err := s.store.CreateOrUpdateDomainGenerationPhaseConfigState(ctx, txq, state); err != nil {
				return fmt.Errorf("upsert config state: %w", err)
			}

			if err := tx.Commit(); err != nil {
				return fmt.Errorf("commit tx: %w", err)
			}
			committed = true
			return nil
		}
	}

	// Fallback: no transaction, do best-effort separate operations
	if err := s.storeGeneratedDomains(ctx, campaignID, domains, baseOffset); err != nil {
		return err
	}
	if s.store != nil {
		now := time.Now().UTC()
		details, _ := json.Marshal(execution.normalized)
		newLast := nextOffset - 1
		state := &models.DomainGenerationPhaseConfigState{
			ConfigHash:    execution.configHash,
			LastOffset:    newLast,
			ConfigDetails: details,
			UpdatedAt:     now,
		}
		var exec store.Querier
		if q, ok := s.deps.DB.(store.Querier); ok {
			exec = q
		}
		if err := s.store.CreateOrUpdateDomainGenerationPhaseConfigState(ctx, exec, state); err != nil {
			s.deps.Logger.Warn(ctx, "Failed to upsert config state without tx", map[string]interface{}{"error": err.Error()})
		}
	}
	return nil
}

// storeGeneratedDomainsWithExec persists domains using the provided Querier (e.g., within a transaction)
func (s *domainGenerationService) storeGeneratedDomainsWithExec(ctx context.Context, exec store.Querier, campaignID uuid.UUID, domains []string, baseOffset int64) error {
	s.deps.Logger.Debug(ctx, "Storing generated domains (exec)", map[string]interface{}{
		"campaign_id":    campaignID,
		"domain_count":   len(domains),
		"sample_domains": domains[:min(len(domains), 5)],
	})
	if len(domains) == 0 {
		return nil
	}

	now := time.Now().UTC()
	genModels := make([]*models.GeneratedDomain, len(domains))
	for i, d := range domains {
		genModels[i] = &models.GeneratedDomain{
			ID:          uuid.New(),
			CampaignID:  campaignID,
			DomainName:  d,
			GeneratedAt: now,
			CreatedAt:   now,
			OffsetIndex: baseOffset + int64(i),
		}
	}
	if err := s.store.CreateGeneratedDomains(ctx, exec, genModels); err != nil {
		return fmt.Errorf("failed to persist generated domains: %w", err)
	}
	items := make([]map[string]interface{}, len(genModels))
	for i, gd := range genModels {
		items[i] = map[string]interface{}{
			"id":          gd.ID.String(),
			"domain_name": gd.DomainName,
			"offset":      gd.OffsetIndex,
			"created_at":  now.Format(time.RFC3339),
		}
	}
	payload := map[string]interface{}{
		"domains":      items,
		"batch_size":   len(items),
		"last_updated": now.Format(time.RFC3339),
	}
	if err := s.store.AppendDomainsData(ctx, exec, campaignID, payload); err != nil {
		s.deps.Logger.Warn(ctx, "Failed to update JSONB domains_data", map[string]interface{}{
			"campaign_id": campaignID,
			"error":       err.Error(),
		})
	}
	return nil
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
