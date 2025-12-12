package services

import (
	"context"
	"database/sql"
	"fmt"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

	"github.com/fntelecomllc/studio/backend/internal/extraction"
	"github.com/fntelecomllc/studio/backend/internal/models"
)

// BatchExtractionService handles high-performance batch processing for large domain sets
// This implements Phase P6 of the Extraction → Analysis redesign.
type BatchExtractionService struct {
	db                   *sqlx.DB
	logger               Logger
	featureExtractionSvc *FeatureExtractionService
	keywordExtractionSvc *KeywordExtractionService
	adaptiveCrawlingSvc  *AdaptiveCrawlingService
	advancedScoringSvc   *AdvancedScoringService

	// Configuration
	batchSize   int
	workerCount int
	maxRetries  int
	retryDelay  time.Duration

	// Worker pool management
	workerPool        chan struct{}
	results           chan BatchResult
	errors            chan error
	shutdown          chan struct{}
	wg                sync.WaitGroup
	mu                sync.RWMutex
	executions        map[uuid.UUID]*batchExtractionExecution
	ctrlMu            sync.Mutex
	controlWatchers   map[uuid.UUID]extractionControlWatcher
	controlWatcherSeq uint64
}

// BatchProcessingConfig contains configuration for batch processing operations
type BatchProcessingConfig struct {
	BatchSize      int           `json:"batch_size"`       // Number of domains to process in each batch
	WorkerCount    int           `json:"worker_count"`     // Number of concurrent workers
	MaxRetries     int           `json:"max_retries"`      // Maximum retry attempts for failed items
	RetryDelay     time.Duration `json:"retry_delay"`      // Delay between retry attempts
	TimeoutPerItem time.Duration `json:"timeout_per_item"` // Timeout for processing each domain
}

// BatchResult represents the result of processing a batch of domains
type BatchResult struct {
	CampaignID        uuid.UUID              `json:"campaign_id"`
	BatchID           string                 `json:"batch_id"`
	DomainsProcessed  int                    `json:"domains_processed"`
	DomainsSuccessful int                    `json:"domains_successful"`
	DomainsFailed     int                    `json:"domains_failed"`
	ProcessingTime    time.Duration          `json:"processing_time"`
	Errors            []BatchItemError       `json:"errors,omitempty"`
	StartedAt         time.Time              `json:"started_at"`
	CompletedAt       time.Time              `json:"completed_at"`
	Metrics           BatchProcessingMetrics `json:"metrics"`
}

// BatchItemError represents an error that occurred while processing a specific domain
type BatchItemError struct {
	DomainID   uuid.UUID `json:"domain_id"`
	DomainName string    `json:"domain_name"`
	Error      string    `json:"error"`
	Retries    int       `json:"retries"`
	Phase      string    `json:"phase"` // "extraction", "keyword", "scoring", "crawling"
}

// BatchProcessingMetrics contains performance metrics for batch processing
type BatchProcessingMetrics struct {
	AverageProcessingTime time.Duration `json:"average_processing_time"`
	ThroughputPerSecond   float64       `json:"throughput_per_second"`
	ErrorRate             float64       `json:"error_rate"`
	RetryRate             float64       `json:"retry_rate"`
	MemoryUsageMB         float64       `json:"memory_usage_mb"`
	CPUUsagePercent       float64       `json:"cpu_usage_percent"`
}

// DomainBatchItem represents a single domain to be processed in a batch
type DomainBatchItem struct {
	DomainID      uuid.UUID `json:"domain_id"`
	CampaignID    uuid.UUID `json:"campaign_id"`
	DomainName    string    `json:"domain_name"`
	Priority      int       `json:"priority"` // Higher numbers = higher priority
	RetryCount    int       `json:"retry_count"`
	LastAttempt   time.Time `json:"last_attempt"`
	FailureReason string    `json:"failure_reason,omitempty"`
}

const extractionControlBuffer = 8

type batchExtractionExecution struct {
	campaignID     uuid.UUID
	Status         models.PhaseStatusEnum
	StartedAt      time.Time
	CompletedAt    *time.Time
	ItemsTotal     int
	ItemsProcessed int
	Progress       float64
	LastError      string
	controlCh      chan ControlCommand
	cancelCtx      context.Context
	cancel         context.CancelFunc
	paused         bool
	stopRequested  bool
	pauseMu        sync.Mutex
	pauseCond      *sync.Cond
}

type extractionControlWatcher struct {
	cancel   context.CancelFunc
	token    uint64
	commands chan ControlCommand
}

// NewBatchExtractionService creates a new batch extraction service
func NewBatchExtractionService(
	db *sqlx.DB,
	logger Logger,
	featureExtractionSvc *FeatureExtractionService,
	keywordExtractionSvc *KeywordExtractionService,
	adaptiveCrawlingSvc *AdaptiveCrawlingService,
	advancedScoringSvc *AdvancedScoringService,
	config BatchProcessingConfig,
) *BatchExtractionService {
	// Set defaults if not provided
	if config.BatchSize <= 0 {
		config.BatchSize = 50
	}
	if config.WorkerCount <= 0 {
		config.WorkerCount = 10
	}
	if config.MaxRetries <= 0 {
		config.MaxRetries = 3
	}
	if config.RetryDelay <= 0 {
		config.RetryDelay = 30 * time.Second
	}

	return &BatchExtractionService{
		db:                   db,
		logger:               logger,
		featureExtractionSvc: featureExtractionSvc,
		keywordExtractionSvc: keywordExtractionSvc,
		adaptiveCrawlingSvc:  adaptiveCrawlingSvc,
		advancedScoringSvc:   advancedScoringSvc,
		batchSize:            config.BatchSize,
		workerCount:          config.WorkerCount,
		maxRetries:           config.MaxRetries,
		retryDelay:           config.RetryDelay,
		workerPool:           make(chan struct{}, config.WorkerCount),
		results:              make(chan BatchResult, 100),
		errors:               make(chan error, 100),
		shutdown:             make(chan struct{}),
		executions:           make(map[uuid.UUID]*batchExtractionExecution),
		controlWatchers:      make(map[uuid.UUID]extractionControlWatcher),
	}
}

// Capabilities exposes supported runtime controls for the batch extraction phase.
func (s *BatchExtractionService) Capabilities() PhaseControlCapabilities {
	return PhaseControlCapabilities{
		CanPause:   true,
		CanResume:  true,
		CanStop:    true,
		CanRestart: true,
	}
}

// AttachControlChannel wires the orchestrator control bus into batch extraction execution.
func (s *BatchExtractionService) AttachControlChannel(ctx context.Context, campaignID uuid.UUID, phase models.PhaseTypeEnum, commands <-chan ControlCommand) {
	if phase != models.PhaseTypeExtraction || commands == nil {
		return
	}
	controlCtx, cancel := context.WithCancel(context.Background())
	downstream := make(chan ControlCommand, extractionControlBuffer)
	token := s.registerControlWatcher(campaignID, cancel, downstream)
	go s.consumeControlSignals(controlCtx, campaignID, token, commands, downstream)
}

// ProcessCampaignBatch processes all domains in a campaign using batch processing
func (s *BatchExtractionService) ProcessCampaignBatch(ctx context.Context, campaignID uuid.UUID) (*BatchResult, error) {
	startTime := time.Now()
	batchID := fmt.Sprintf("batch_%s_%d", campaignID.String()[:8], startTime.Unix())

	domains, err := s.getPendingDomains(ctx, campaignID)
	if err != nil {
		return nil, fmt.Errorf("failed to get pending domains: %w", err)
	}

	execution := s.ensureExecution(campaignID)
	result := &BatchResult{
		CampaignID:       campaignID,
		BatchID:          batchID,
		DomainsProcessed: len(domains),
		StartedAt:        startTime,
		Errors:           make([]BatchItemError, 0),
	}

	if len(domains) == 0 {
		s.startExecution(ctx, execution, 0, startTime)
		s.finishExecution(execution, models.PhaseStatusCompleted, "no pending domains for extraction")
		result.CompletedAt = time.Now()
		result.ProcessingTime = result.CompletedAt.Sub(result.StartedAt)
		result.Metrics = s.calculateMetrics(result, 0)
		return result, nil
	}

	s.startExecution(ctx, execution, len(domains), startTime)
	execCtx := execution.cancelCtx
	if execCtx == nil {
		execCtx = ctx
	}

	if s.logger != nil {
		s.logger.Info(execCtx, "Starting batch processing", map[string]interface{}{
			"campaign_id":  campaignID,
			"batch_id":     batchID,
			"domain_count": len(domains),
			"worker_count": s.workerCount,
			"batch_size":   s.batchSize,
		})
	}

	successful, failed, processingErr := s.executeDomainBatches(execCtx, execution, domains, result)
	result.DomainsSuccessful = successful
	result.DomainsFailed = failed
	result.CompletedAt = time.Now()
	result.ProcessingTime = result.CompletedAt.Sub(result.StartedAt)
	result.Metrics = s.calculateMetrics(result, len(domains))

	switch {
	case processingErr != nil:
		s.finishExecution(execution, models.PhaseStatusFailed, processingErr.Error())
	case s.isStopRequested(execution):
		s.finishExecution(execution, models.PhaseStatusFailed, "batch extraction stopped")
		processingErr = fmt.Errorf("batch extraction stopped for campaign %s", campaignID)
	default:
		s.finishExecution(execution, models.PhaseStatusCompleted, "")
	}

	if s.logger != nil {
		s.logger.Info(execCtx, "Batch processing completed", map[string]interface{}{
			"campaign_id":        campaignID,
			"batch_id":           batchID,
			"domains_processed":  result.DomainsProcessed,
			"domains_successful": result.DomainsSuccessful,
			"domains_failed":     result.DomainsFailed,
			"processing_time":    result.ProcessingTime.String(),
			"throughput":         result.Metrics.ThroughputPerSecond,
			"error_rate":         result.Metrics.ErrorRate,
			"stopped":            s.isStopRequested(execution),
		})
	}

	return result, processingErr
}

// processBatch processes a single batch of domains using worker pool
func (s *BatchExtractionService) processBatch(ctx context.Context, execution *batchExtractionExecution, batch []DomainBatchItem) ([]BatchItemError, error) {
	resultsChan := make(chan BatchItemError, len(batch))
	var wg sync.WaitGroup

	for _, domain := range batch {
		if ctx.Err() != nil || s.isStopRequested(execution) {
			break
		}
		wg.Add(1)
		go func(item DomainBatchItem) {
			defer wg.Done()
			select {
			case <-ctx.Done():
				return
			default:
			}
			if s.isStopRequested(execution) {
				return
			}

			s.workerPool <- struct{}{}
			defer func() { <-s.workerPool }()

			result := s.processSingleDomain(ctx, item)
			resultsChan <- result
		}(domain)
	}

	go func() {
		wg.Wait()
		close(resultsChan)
	}()

	var results []BatchItemError
	for {
		select {
		case <-ctx.Done():
			return results, ctx.Err()
		case result, ok := <-resultsChan:
			if !ok {
				return results, nil
			}
			results = append(results, result)
		}
	}
}

// processSingleDomain processes a single domain through the complete extraction pipeline
func (s *BatchExtractionService) processSingleDomain(ctx context.Context, item DomainBatchItem) BatchItemError {
	// Create a timeout context for this domain
	domainCtx, cancel := context.WithTimeout(ctx, 60*time.Second)
	defer cancel()

	result := BatchItemError{
		DomainID:   item.DomainID,
		DomainName: item.DomainName,
		Retries:    item.RetryCount,
	}

	// Phase 1: Feature Extraction
	err := s.processFeatureExtraction(domainCtx, item)
	if err != nil {
		result.Error = err.Error()
		result.Phase = "extraction"
		return result
	}

	// Phase 2: Keyword Extraction
	err = s.processKeywordExtraction(domainCtx, item)
	if err != nil {
		result.Error = err.Error()
		result.Phase = "keyword"
		return result
	}

	// Phase 3: Adaptive Crawling (if enabled)
	err = s.processAdaptiveCrawling(domainCtx, item)
	if err != nil {
		result.Error = err.Error()
		result.Phase = "crawling"
		return result
	}

	// Phase 4: Advanced Scoring (if enabled)
	err = s.processAdvancedScoring(domainCtx, item)
	if err != nil {
		result.Error = err.Error()
		result.Phase = "scoring"
		return result
	}

	// Success
	return result
}

// Phase processing methods

func (s *BatchExtractionService) processFeatureExtraction(ctx context.Context, item DomainBatchItem) error {
	// This would typically integrate with the existing HTTP validation phase
	// For now, we'll simulate the feature extraction process

	// Get basic signals (this would come from HTTP validation in practice)
	signals := extraction.RawSignals{
		HTML:              []byte("<html><body>Sample content</body></html>"),
		HTTPStatusCode:    200,
		FetchLatencyMs:    100,
		ContentHash:       "sample_hash",
		ContentBytes:      1000,
		Language:          "en",
		ParsedKeywordHits: []extraction.KeywordHit{},
		IsParked:          false,
		ParkedConfidence:  0.1,
	}

	// Build features
	features := extraction.BuildFeatures(signals, extraction.BuilderParams{
		ExtractionVersion:        1,
		KeywordDictionaryVersion: 1,
		Now:                      time.Now(),
	})

	// Save features using the FeatureExtractionService
	return s.featureExtractionSvc.SaveFeatures(ctx, item.DomainID, item.CampaignID, item.DomainName, signals, features)
}

func (s *BatchExtractionService) processKeywordExtraction(ctx context.Context, item DomainBatchItem) error {
	// Get keyword hits (this would come from actual keyword extraction in practice)
	keywordHits := []extraction.KeywordHit{
		{KeywordID: "business", SurfaceForm: "business", SignalType: "title", Position: 1, BaseWeight: 1.0, ValueScore: 0.8},
		{KeywordID: "service", SurfaceForm: "service", SignalType: "body", Position: 50, BaseWeight: 0.5, ValueScore: 0.7},
	}

	// Save keywords using the KeywordExtractionService
	return s.keywordExtractionSvc.SaveKeywords(ctx, item.DomainID, item.CampaignID, keywordHits)
}

func (s *BatchExtractionService) processAdaptiveCrawling(ctx context.Context, item DomainBatchItem) error {
	// Skip if adaptive crawling is not enabled
	if s.adaptiveCrawlingSvc == nil {
		return nil
	}

	// Get basic signals for complexity analysis
	signals := extraction.RawSignals{
		HTML:         []byte("<html><body>Sample content with links <a href='/page1'>Page 1</a></body></html>"),
		ContentBytes: 1500,
	}

	// Analyze site complexity
	profile, err := s.adaptiveCrawlingSvc.AnalyzeSiteComplexity(ctx, item.DomainID, item.CampaignID, item.DomainName, signals)
	if err != nil {
		return err
	}

	// Generate crawl strategy
	strategy, err := s.adaptiveCrawlingSvc.GenerateCrawlStrategy(ctx, profile, item.CampaignID)
	if err != nil {
		return err
	}

	// Execute adaptive crawl
	_, _, err = s.adaptiveCrawlingSvc.ExecuteAdaptiveCrawl(ctx, item.DomainID, item.CampaignID, item.DomainName, strategy)
	return err
}

func (s *BatchExtractionService) processAdvancedScoring(ctx context.Context, item DomainBatchItem) error {
	// Skip if advanced scoring is not enabled
	if s.advancedScoringSvc == nil {
		return nil
	}

	// Compute advanced score
	_, err := s.advancedScoringSvc.ComputeAdvancedScore(ctx, item.DomainID, item.CampaignID, item.DomainName)
	return err
}

// Data access methods

func (s *BatchExtractionService) getPendingDomains(ctx context.Context, campaignID uuid.UUID) ([]DomainBatchItem, error) {
	query := `
		SELECT 
			gd.id, gd.campaign_id, gd.domain_name,
			COALESCE(def.attempt_count, 0) as retry_count,
			COALESCE(def.updated_at, gd.created_at) as last_attempt
		FROM generated_domains gd
		LEFT JOIN domain_extraction_features def ON def.domain_id = gd.id AND def.campaign_id = gd.campaign_id
		WHERE gd.campaign_id = $1
		AND (def.processing_state IS NULL OR def.processing_state = 'pending' OR def.processing_state = 'error')
		ORDER BY 
			COALESCE(def.attempt_count, 0) ASC,  -- Prioritize domains with fewer retry attempts
			gd.created_at ASC                   -- Then by creation order
		LIMIT 1000
	`

	rows, err := s.db.QueryContext(ctx, query, campaignID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var domains []DomainBatchItem
	for rows.Next() {
		var item DomainBatchItem
		var lastAttempt time.Time

		err := rows.Scan(
			&item.DomainID,
			&item.CampaignID,
			&item.DomainName,
			&item.RetryCount,
			&lastAttempt,
		)
		if err != nil {
			continue
		}

		item.LastAttempt = lastAttempt
		item.Priority = s.calculatePriority(item)
		domains = append(domains, item)
	}

	return domains, nil
}

func (s *BatchExtractionService) calculatePriority(item DomainBatchItem) int {
	// Higher priority for:
	// - Fewer retry attempts
	// - Older domains that haven't been processed
	// - Domains that haven't been attempted recently

	basePriority := 100

	// Reduce priority for each retry attempt
	basePriority -= item.RetryCount * 10

	// Increase priority for older domains
	age := time.Since(item.LastAttempt)
	if age > 24*time.Hour {
		basePriority += 20
	} else if age > time.Hour {
		basePriority += 10
	}

	return basePriority
}

func (s *BatchExtractionService) calculateMetrics(result *BatchResult, totalDomains int) BatchProcessingMetrics {
	metrics := BatchProcessingMetrics{}

	if result.ProcessingTime > 0 && result.DomainsProcessed > 0 {
		metrics.AverageProcessingTime = result.ProcessingTime / time.Duration(result.DomainsProcessed)
		metrics.ThroughputPerSecond = float64(result.DomainsProcessed) / result.ProcessingTime.Seconds()
	}

	if result.DomainsProcessed > 0 {
		metrics.ErrorRate = float64(result.DomainsFailed) / float64(result.DomainsProcessed)

		// Count retries
		retryCount := 0
		for _, err := range result.Errors {
			retryCount += err.Retries
		}
		metrics.RetryRate = float64(retryCount) / float64(result.DomainsProcessed)
	}

	// TODO: Implement actual memory and CPU monitoring
	metrics.MemoryUsageMB = 0.0
	metrics.CPUUsagePercent = 0.0

	return metrics
}

// GetBatchStatus retrieves the status of batch processing for a campaign
func (s *BatchExtractionService) GetBatchStatus(ctx context.Context, campaignID uuid.UUID) (map[string]interface{}, error) {
	query := `
		SELECT 
			COUNT(*) as total_domains,
			COUNT(CASE WHEN def.processing_state = 'ready' THEN 1 END) as completed_domains,
			COUNT(CASE WHEN def.processing_state = 'pending' THEN 1 END) as pending_domains,
			COUNT(CASE WHEN def.processing_state = 'error' THEN 1 END) as error_domains,
			AVG(CASE WHEN def.processing_state = 'ready' THEN EXTRACT(EPOCH FROM (def.updated_at - def.created_at)) END) as avg_processing_time_seconds
		FROM generated_domains gd
		LEFT JOIN domain_extraction_features def ON def.domain_id = gd.id AND def.campaign_id = gd.campaign_id
		WHERE gd.campaign_id = $1
	`

	var (
		totalDomains      int
		completedDomains  int
		pendingDomains    int
		errorDomains      int
		avgProcessingTime sql.NullFloat64
	)

	err := s.db.QueryRowContext(ctx, query, campaignID).Scan(
		&totalDomains, &completedDomains, &pendingDomains, &errorDomains, &avgProcessingTime,
	)
	if err != nil {
		return nil, err
	}

	status := map[string]interface{}{
		"campaign_id":         campaignID,
		"total_domains":       totalDomains,
		"completed_domains":   completedDomains,
		"pending_domains":     pendingDomains,
		"error_domains":       errorDomains,
		"completion_rate":     0.0,
		"avg_processing_time": 0.0,
	}

	if totalDomains > 0 {
		status["completion_rate"] = float64(completedDomains) / float64(totalDomains)
	}

	if avgProcessingTime.Valid {
		status["avg_processing_time"] = avgProcessingTime.Float64
	}

	return status, nil
}

// RetryFailedDomains retries domains that failed during batch processing
func (s *BatchExtractionService) RetryFailedDomains(ctx context.Context, campaignID uuid.UUID) (*BatchResult, error) {
	// Get failed domains that are eligible for retry
	query := `
		SELECT gd.id, gd.campaign_id, gd.domain_name, def.attempt_count, def.last_error
		FROM generated_domains gd
		JOIN domain_extraction_features def ON def.domain_id = gd.id AND def.campaign_id = gd.campaign_id
		WHERE gd.campaign_id = $1
		AND def.processing_state = 'error'
		AND def.attempt_count < $2
		AND def.updated_at < NOW() - INTERVAL '%d seconds'
		ORDER BY def.attempt_count ASC, def.updated_at ASC
		LIMIT 100
	`

	retryDelaySeconds := int(s.retryDelay.Seconds())
	rows, err := s.db.QueryContext(ctx, fmt.Sprintf(query, retryDelaySeconds), campaignID, s.maxRetries)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var retryDomains []DomainBatchItem
	for rows.Next() {
		var item DomainBatchItem
		var lastError sql.NullString

		err := rows.Scan(&item.DomainID, &item.CampaignID, &item.DomainName, &item.RetryCount, &lastError)
		if err != nil {
			continue
		}

		if lastError.Valid {
			item.FailureReason = lastError.String
		}

		retryDomains = append(retryDomains, item)
	}

	if len(retryDomains) == 0 {
		return &BatchResult{
			CampaignID:        campaignID,
			BatchID:           fmt.Sprintf("retry_%s_%d", campaignID.String()[:8], time.Now().Unix()),
			DomainsProcessed:  0,
			DomainsSuccessful: 0,
			DomainsFailed:     0,
			StartedAt:         time.Now(),
			CompletedAt:       time.Now(),
		}, nil
	}

	if s.logger != nil {
		s.logger.Info(ctx, "Retrying failed domains", map[string]interface{}{
			"campaign_id": campaignID,
			"retry_count": len(retryDomains),
		})
	}

	// Process retry domains using the same batch processing logic
	return s.processBatchDomains(ctx, campaignID, retryDomains)
}

// processBatchDomains processes a specific set of domains
func (s *BatchExtractionService) processBatchDomains(ctx context.Context, campaignID uuid.UUID, domains []DomainBatchItem) (*BatchResult, error) {
	startTime := time.Now()
	batchID := fmt.Sprintf("custom_%s_%d", campaignID.String()[:8], startTime.Unix())

	result := &BatchResult{
		CampaignID:       campaignID,
		BatchID:          batchID,
		DomainsProcessed: len(domains),
		StartedAt:        startTime,
		Errors:           make([]BatchItemError, 0),
	}

	execution := s.ensureExecution(campaignID)
	s.startExecution(ctx, execution, len(domains), startTime)
	execCtx := execution.cancelCtx
	if execCtx == nil {
		execCtx = ctx
	}

	successful, failed, processingErr := s.executeDomainBatches(execCtx, execution, domains, result)
	result.DomainsSuccessful = successful
	result.DomainsFailed = failed
	result.CompletedAt = time.Now()
	result.ProcessingTime = result.CompletedAt.Sub(result.StartedAt)
	result.Metrics = s.calculateMetrics(result, len(domains))

	switch {
	case processingErr != nil:
		s.finishExecution(execution, models.PhaseStatusFailed, processingErr.Error())
	case s.isStopRequested(execution):
		s.finishExecution(execution, models.PhaseStatusFailed, "batch extraction stopped")
	default:
		s.finishExecution(execution, models.PhaseStatusCompleted, "")
	}

	return result, processingErr
}

func (s *BatchExtractionService) executeDomainBatches(ctx context.Context, execution *batchExtractionExecution, domains []DomainBatchItem, result *BatchResult) (int, int, error) {
	successful := 0
	failed := 0
	var processingErr error

	for i := 0; i < len(domains); i += s.batchSize {
		if s.processPendingControlSignals(ctx, execution) {
			break
		}
		s.waitWhilePaused(execution)
		select {
		case <-ctx.Done():
			processingErr = ctx.Err()
			break
		default:
		}
		if s.isStopRequested(execution) {
			break
		}

		end := i + s.batchSize
		if end > len(domains) {
			end = len(domains)
		}

		batch := domains[i:end]
		batchResults, err := s.processBatch(ctx, execution, batch)
		if err != nil {
			processingErr = err
			if s.logger != nil {
				s.logger.Error(ctx, "Batch processing failed", err, map[string]interface{}{
					"batch_start": i,
					"batch_end":   end,
				})
			}
			failed += len(batch)
			continue
		}

		for _, batchResult := range batchResults {
			if batchResult.Error != "" {
				failed++
				result.Errors = append(result.Errors, batchResult)
			} else {
				successful++
			}
		}

		s.recordProgress(execution, len(batch))
	}

	return successful, failed, processingErr
}

func (s *BatchExtractionService) ensureExecution(campaignID uuid.UUID) *batchExtractionExecution {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.executions == nil {
		s.executions = make(map[uuid.UUID]*batchExtractionExecution)
	}
	execution, ok := s.executions[campaignID]
	if !ok {
		execution = &batchExtractionExecution{
			campaignID: campaignID,
			Status:     models.PhaseStatusNotStarted,
		}
		s.executions[campaignID] = execution
	}
	return execution
}

func (s *BatchExtractionService) startExecution(ctx context.Context, execution *batchExtractionExecution, totalItems int, started time.Time) {
	if execution == nil {
		return
	}
	if execution.cancel != nil {
		execution.cancel()
	}
	execCtx, cancel := context.WithCancel(ctx)
	execution.cancelCtx = execCtx
	execution.cancel = cancel
	execution.StartedAt = started
	execution.CompletedAt = nil
	execution.ItemsTotal = totalItems
	execution.ItemsProcessed = 0
	execution.Progress = 0
	execution.LastError = ""
	execution.stopRequested = false
	execution.paused = false
	execution.Status = models.PhaseStatusInProgress
	s.ensurePauseControl(execution)
	s.ctrlMu.Lock()
	if watcher, ok := s.controlWatchers[execution.campaignID]; ok {
		execution.controlCh = watcher.commands
	}
	s.ctrlMu.Unlock()
	s.updateExecutionStatus(execution.campaignID, models.PhaseStatusInProgress, "")
}

func (s *BatchExtractionService) finishExecution(execution *batchExtractionExecution, status models.PhaseStatusEnum, message string) {
	if execution == nil {
		return
	}
	now := time.Now()
	execution.CompletedAt = &now
	execution.Status = status
	if status == models.PhaseStatusFailed {
		execution.LastError = message
	} else if status == models.PhaseStatusCompleted {
		execution.LastError = ""
	}
	s.updateExecutionStatus(execution.campaignID, status, message)
	if execution.cancel != nil {
		execution.cancel()
		execution.cancel = nil
	}
}

func (s *BatchExtractionService) recordProgress(execution *batchExtractionExecution, count int) {
	if execution == nil || count == 0 {
		return
	}
	s.mu.Lock()
	execution.ItemsProcessed += count
	if execution.ItemsTotal > 0 {
		execution.Progress = float64(execution.ItemsProcessed) / float64(execution.ItemsTotal) * 100
	}
	s.mu.Unlock()
}

func (s *BatchExtractionService) updateExecutionStatus(campaignID uuid.UUID, status models.PhaseStatusEnum, message string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	exec, ok := s.executions[campaignID]
	if !ok {
		return
	}
	exec.Status = status
	if status == models.PhaseStatusFailed {
		exec.LastError = message
	}
}

func (s *BatchExtractionService) ensurePauseControl(execution *batchExtractionExecution) {
	if execution == nil {
		return
	}
	if execution.pauseCond == nil {
		execution.pauseCond = sync.NewCond(&execution.pauseMu)
	}
}

func (s *BatchExtractionService) waitWhilePaused(execution *batchExtractionExecution) {
	if execution == nil {
		return
	}
	s.ensurePauseControl(execution)
	execution.pauseMu.Lock()
	for execution.paused {
		execution.pauseCond.Wait()
	}
	execution.pauseMu.Unlock()
}

func (s *BatchExtractionService) isPaused(execution *batchExtractionExecution) bool {
	if execution == nil {
		return false
	}
	execution.pauseMu.Lock()
	defer execution.pauseMu.Unlock()
	return execution.paused
}

func (s *BatchExtractionService) requestStop(execution *batchExtractionExecution) {
	if execution == nil {
		return
	}
	execution.pauseMu.Lock()
	execution.paused = false
	if execution.pauseCond != nil {
		execution.pauseCond.Broadcast()
	}
	execution.stopRequested = true
	execution.pauseMu.Unlock()
	if execution.cancel != nil {
		execution.cancel()
	}
}

func (s *BatchExtractionService) isStopRequested(execution *batchExtractionExecution) bool {
	if execution == nil {
		return false
	}
	execution.pauseMu.Lock()
	defer execution.pauseMu.Unlock()
	return execution.stopRequested
}

func (s *BatchExtractionService) processPendingControlSignals(ctx context.Context, execution *batchExtractionExecution) bool {
	if execution == nil || execution.controlCh == nil {
		return false
	}
	for {
		select {
		case <-ctx.Done():
			return true
		case cmd, ok := <-execution.controlCh:
			if !ok {
				return s.isStopRequested(execution)
			}
			s.handleControlCommand(ctx, execution, cmd)
			if cmd.Signal == ControlSignalStop {
				return true
			}
		default:
			return false
		}
	}
}

func (s *BatchExtractionService) handleControlCommand(ctx context.Context, execution *batchExtractionExecution, cmd ControlCommand) {
	if execution == nil {
		s.ackControl(cmd, fmt.Errorf("no extraction execution bound"))
		return
	}
	s.ensurePauseControl(execution)
	switch cmd.Signal {
	case ControlSignalPause:
		execution.pauseMu.Lock()
		alreadyPaused := execution.paused
		execution.paused = true
		execution.pauseMu.Unlock()
		if !alreadyPaused {
			s.updateExecutionStatus(execution.campaignID, models.PhaseStatusPaused, "pause requested")
			if s.logger != nil {
				s.logger.Info(ctx, "batch_extraction.pause", map[string]interface{}{
					"campaign_id": execution.campaignID,
				})
			}
		}
		s.ackControl(cmd, nil)
	case ControlSignalResume:
		execution.pauseMu.Lock()
		wasPaused := execution.paused
		execution.paused = false
		execution.pauseCond.Broadcast()
		execution.pauseMu.Unlock()
		if wasPaused {
			s.updateExecutionStatus(execution.campaignID, models.PhaseStatusInProgress, "resumed")
			if s.logger != nil {
				s.logger.Info(ctx, "batch_extraction.resume", map[string]interface{}{
					"campaign_id": execution.campaignID,
				})
			}
		}
		s.ackControl(cmd, nil)
	case ControlSignalStop:
		alreadyStopped := s.isStopRequested(execution)
		s.requestStop(execution)
		if !alreadyStopped {
			s.updateExecutionStatus(execution.campaignID, models.PhaseStatusFailed, "stop requested")
			if s.logger != nil {
				s.logger.Info(ctx, "batch_extraction.stop", map[string]interface{}{
					"campaign_id": execution.campaignID,
				})
			}
		}
		s.ackControl(cmd, nil)
	default:
		s.ackControl(cmd, fmt.Errorf("unknown control signal: %s", cmd.Signal))
	}
}

func (s *BatchExtractionService) ackControl(cmd ControlCommand, err error) {
	if cmd.Ack == nil {
		return
	}
	select {
	case cmd.Ack <- err:
	default:
	}
}

func (s *BatchExtractionService) registerControlWatcher(campaignID uuid.UUID, cancel context.CancelFunc, downstream chan ControlCommand) uint64 {
	s.ctrlMu.Lock()
	defer s.ctrlMu.Unlock()
	s.controlWatcherSeq++
	token := s.controlWatcherSeq
	if existing, ok := s.controlWatchers[campaignID]; ok {
		if existing.cancel != nil {
			existing.cancel()
		}
	}
	s.controlWatchers[campaignID] = extractionControlWatcher{cancel: cancel, token: token, commands: downstream}
	s.mu.Lock()
	if exec, ok := s.executions[campaignID]; ok {
		exec.controlCh = downstream
	}
	s.mu.Unlock()
	return token
}

func (s *BatchExtractionService) clearControlWatcher(campaignID uuid.UUID, token uint64, downstream chan ControlCommand) {
	s.ctrlMu.Lock()
	if current, ok := s.controlWatchers[campaignID]; ok && current.token == token {
		delete(s.controlWatchers, campaignID)
	}
	s.ctrlMu.Unlock()
	s.mu.Lock()
	if exec, ok := s.executions[campaignID]; ok {
		if exec.controlCh == downstream {
			exec.controlCh = nil
		}
	}
	s.mu.Unlock()
}

func (s *BatchExtractionService) consumeControlSignals(ctx context.Context, campaignID uuid.UUID, token uint64, upstream <-chan ControlCommand, downstream chan ControlCommand) {
	defer func() {
		close(downstream)
		s.clearControlWatcher(campaignID, token, downstream)
	}()
	for {
		select {
		case <-ctx.Done():
			return
		case cmd, ok := <-upstream:
			if !ok {
				return
			}
			if err := s.dispatchControlCommand(campaignID, downstream, cmd); err != nil {
				s.ackControl(cmd, err)
			}
		}
	}
}

func (s *BatchExtractionService) dispatchControlCommand(campaignID uuid.UUID, downstream chan ControlCommand, cmd ControlCommand) error {
	s.mu.RLock()
	execution, exists := s.executions[campaignID]
	var status models.PhaseStatusEnum
	var controlCh chan ControlCommand
	if execution != nil {
		status = execution.Status
		controlCh = execution.controlCh
	}
	s.mu.RUnlock()
	if !exists || execution == nil {
		return fmt.Errorf("%w: no extraction execution found for campaign %s", ErrPhaseExecutionMissing, campaignID)
	}
	if controlCh != downstream {
		return fmt.Errorf("extraction control channel not bound for campaign %s", campaignID)
	}
	if status != models.PhaseStatusInProgress && status != models.PhaseStatusPaused {
		return ErrPhaseNotRunning
	}
	select {
	case downstream <- cmd:
		return nil
	default:
		return fmt.Errorf("extraction control channel backpressure for campaign %s", campaignID)
	}
}

// StopCampaign cooperatively stops the in-flight extraction execution for the given campaign.
func (s *BatchExtractionService) StopCampaign(campaignID uuid.UUID) error {
	s.mu.RLock()
	execution, exists := s.executions[campaignID]
	status := models.PhaseStatusNotStarted
	if exists && execution != nil {
		status = execution.Status
	}
	s.mu.RUnlock()
	if !exists || execution == nil {
		return fmt.Errorf("%w: no extraction execution found for campaign %s", ErrPhaseExecutionMissing, campaignID)
	}
	if status != models.PhaseStatusInProgress && status != models.PhaseStatusPaused {
		return ErrPhaseNotRunning
	}
	s.requestStop(execution)
	return nil
}

// Shutdown gracefully shuts down the batch processing service
func (s *BatchExtractionService) Shutdown(ctx context.Context) error {
	close(s.shutdown)

	// Wait for all workers to complete with timeout
	done := make(chan struct{})
	go func() {
		s.wg.Wait()
		close(done)
	}()

	select {
	case <-done:
		if s.logger != nil {
			s.logger.Info(ctx, "Batch extraction service shutdown completed", nil)
		}
		return nil
	case <-ctx.Done():
		if s.logger != nil {
			s.logger.Warn(ctx, "Batch extraction service shutdown timed out", map[string]interface{}{
				"timeout": ctx.Err(),
			})
		}
		return ctx.Err()
	}
}
