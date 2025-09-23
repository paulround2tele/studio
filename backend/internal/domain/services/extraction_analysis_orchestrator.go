package services

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

	"github.com/fntelecomllc/studio/backend/internal/extraction"
	"github.com/fntelecomllc/studio/backend/internal/featureflags"
)

// ExtractionAnalysisOrchestrator provides a unified interface for the complete extraction-analysis pipeline
// This implements the final integration of all phases (P1-P8) of the Extraction → Analysis redesign.
type ExtractionAnalysisOrchestrator struct {
	db                        *sqlx.DB
	logger                    Logger
	
	// Core services
	featureExtractionSvc     *FeatureExtractionService
	keywordExtractionSvc     *KeywordExtractionService
	adaptiveCrawlingSvc      *AdaptiveCrawlingService
	advancedScoringSvc       *AdvancedScoringService
	batchExtractionSvc       *BatchExtractionService
	dataMigrationSvc         *DataMigrationService
	
	// Configuration
	config                   OrchestratorConfig
}

// OrchestratorConfig contains configuration for the extraction-analysis orchestrator
type OrchestratorConfig struct {
	EnableBatchProcessing     bool          `json:"enable_batch_processing"`
	EnableAdaptiveCrawling    bool          `json:"enable_adaptive_crawling"`
	EnableAdvancedScoring     bool          `json:"enable_advanced_scoring"`
	BatchSize                 int           `json:"batch_size"`
	WorkerCount               int           `json:"worker_count"`
	ProcessingTimeout         time.Duration `json:"processing_timeout"`
	RetryAttempts             int           `json:"retry_attempts"`
	RetryDelay                time.Duration `json:"retry_delay"`
}

// PipelineResult represents the result of running the complete extraction-analysis pipeline
type PipelineResult struct {
	DomainID              uuid.UUID                      `json:"domain_id"`
	DomainName            string                         `json:"domain_name"`
	CampaignID            uuid.UUID                      `json:"campaign_id"`
	
	// Processing stages
	FeatureExtractionComplete  bool                      `json:"feature_extraction_complete"`
	KeywordExtractionComplete bool                      `json:"keyword_extraction_complete"`
	AdaptiveCrawlingComplete   bool                      `json:"adaptive_crawling_complete"`
	AdvancedScoringComplete    bool                      `json:"advanced_scoring_complete"`
	
	// Results
	FeatureProfile            *ExtractionFeatures       `json:"feature_profile,omitempty"`
	KeywordProfile            *KeywordRelevanceAnalysis `json:"keyword_profile,omitempty"`
	CrawlProfile              *SiteComplexityProfile    `json:"crawl_profile,omitempty"`
	ScoringProfile            *ScoringProfile           `json:"scoring_profile,omitempty"`
	
	// Pipeline metadata
	ProcessingTime            time.Duration             `json:"processing_time"`
	StartedAt                 time.Time                 `json:"started_at"`
	CompletedAt               time.Time                 `json:"completed_at"`
	Success                   bool                      `json:"success"`
	ErrorMessage              string                    `json:"error_message,omitempty"`
	
	// Performance metrics
	PhaseTimings              map[string]time.Duration  `json:"phase_timings"`
	ResourceUsage             map[string]interface{}    `json:"resource_usage"`
}

// PipelineStatus represents the current status of the extraction-analysis pipeline
type PipelineStatus struct {
	TotalDomains              int                       `json:"total_domains"`
	ProcessedDomains          int                       `json:"processed_domains"`
	SuccessfulDomains         int                       `json:"successful_domains"`
	FailedDomains             int                       `json:"failed_domains"`
	PendingDomains            int                       `json:"pending_domains"`
	
	// Feature flags status
	FeatureFlagsEnabled       ExtractionAnalysisFeatureFlags `json:"feature_flags_enabled"`
	
	// Performance metrics
	AverageProcessingTime     time.Duration             `json:"average_processing_time"`
	ThroughputPerSecond       float64                   `json:"throughput_per_second"`
	ErrorRate                 float64                   `json:"error_rate"`
	
	// Migration status
	MigrationStatus           *MigrationStatus          `json:"migration_status,omitempty"`
	
	// Last updated
	LastUpdated               time.Time                 `json:"last_updated"`
}

// ExtractionAnalysisFeatureFlags represents the current state of all feature flags
type ExtractionAnalysisFeatureFlags struct {
	ExtractionFeatureTableEnabled  bool `json:"extraction_feature_table_enabled"`
	ExtractionKeywordDetailEnabled bool `json:"extraction_keyword_detail_enabled"`
	AnalysisReadsFeatureTable      bool `json:"analysis_reads_feature_table"`
	MicrocrawlAdaptiveMode         bool `json:"microcrawl_adaptive_mode"`
	AnalysisRescoringEnabled       bool `json:"analysis_rescoring_enabled"`
}

// NewExtractionAnalysisOrchestrator creates a new orchestrator for the extraction-analysis pipeline
func NewExtractionAnalysisOrchestrator(
	db *sqlx.DB,
	logger Logger,
	featureExtractionSvc *FeatureExtractionService,
	keywordExtractionSvc *KeywordExtractionService,
	adaptiveCrawlingSvc *AdaptiveCrawlingService,
	advancedScoringSvc *AdvancedScoringService,
	batchExtractionSvc *BatchExtractionService,
	dataMigrationSvc *DataMigrationService,
	config OrchestratorConfig,
) *ExtractionAnalysisOrchestrator {
	// Set defaults
	if config.BatchSize <= 0 {
		config.BatchSize = 50
	}
	if config.WorkerCount <= 0 {
		config.WorkerCount = 10
	}
	if config.ProcessingTimeout <= 0 {
		config.ProcessingTimeout = 5 * time.Minute
	}
	if config.RetryAttempts <= 0 {
		config.RetryAttempts = 3
	}
	if config.RetryDelay <= 0 {
		config.RetryDelay = 30 * time.Second
	}

	return &ExtractionAnalysisOrchestrator{
		db:                   db,
		logger:               logger,
		featureExtractionSvc: featureExtractionSvc,
		keywordExtractionSvc: keywordExtractionSvc,
		adaptiveCrawlingSvc:  adaptiveCrawlingSvc,
		advancedScoringSvc:   advancedScoringSvc,
		batchExtractionSvc:   batchExtractionSvc,
		dataMigrationSvc:     dataMigrationSvc,
		config:               config,
	}
}

// ProcessDomain runs the complete extraction-analysis pipeline for a single domain
func (o *ExtractionAnalysisOrchestrator) ProcessDomain(ctx context.Context, domainID uuid.UUID, campaignID uuid.UUID, domainName string, signals extraction.RawSignals) (*PipelineResult, error) {
	startTime := time.Now()
	
	result := &PipelineResult{
		DomainID:      domainID,
		DomainName:    domainName,
		CampaignID:    campaignID,
		StartedAt:     startTime,
		PhaseTimings:  make(map[string]time.Duration),
		ResourceUsage: make(map[string]interface{}),
	}

	if o.logger != nil {
		o.logger.Info(ctx, "Starting extraction-analysis pipeline", map[string]interface{}{
			"domain_id":   domainID,
			"domain_name": domainName,
			"campaign_id": campaignID,
		})
	}

	// Phase 1: Feature Extraction
	if err := o.runFeatureExtraction(ctx, result, signals); err != nil {
		result.Success = false
		result.ErrorMessage = fmt.Sprintf("Feature extraction failed: %v", err)
		result.CompletedAt = time.Now()
		result.ProcessingTime = result.CompletedAt.Sub(result.StartedAt)
		return result, err
	}

	// Phase 2: Keyword Extraction
	if err := o.runKeywordExtraction(ctx, result, signals); err != nil {
		result.Success = false
		result.ErrorMessage = fmt.Sprintf("Keyword extraction failed: %v", err)
		result.CompletedAt = time.Now()
		result.ProcessingTime = result.CompletedAt.Sub(result.StartedAt)
		return result, err
	}

	// Phase 3: Adaptive Crawling (if enabled)
	if o.config.EnableAdaptiveCrawling && featureflags.IsMicrocrawlAdaptiveModeEnabled() {
		if err := o.runAdaptiveCrawling(ctx, result, signals); err != nil {
			o.logger.Warn(ctx, "Adaptive crawling failed, continuing", map[string]interface{}{
				"domain_id": domainID,
				"error":     err.Error(),
			})
		}
	}

	// Phase 4: Advanced Scoring (if enabled)
	if o.config.EnableAdvancedScoring && featureflags.IsAnalysisRescoringEnabled() {
		if err := o.runAdvancedScoring(ctx, result); err != nil {
			o.logger.Warn(ctx, "Advanced scoring failed, continuing", map[string]interface{}{
				"domain_id": domainID,
				"error":     err.Error(),
			})
		}
	}

	result.Success = true
	result.CompletedAt = time.Now()
	result.ProcessingTime = result.CompletedAt.Sub(result.StartedAt)

	if o.logger != nil {
		o.logger.Info(ctx, "Extraction-analysis pipeline completed", map[string]interface{}{
			"domain_id":        domainID,
			"domain_name":      domainName,
			"processing_time":  result.ProcessingTime.String(),
			"success":          result.Success,
			"phases_completed": len(result.PhaseTimings),
		})
	}

	return result, nil
}

// ProcessCampaign runs the extraction-analysis pipeline for all domains in a campaign
func (o *ExtractionAnalysisOrchestrator) ProcessCampaign(ctx context.Context, campaignID uuid.UUID) (*BatchResult, error) {
	if o.config.EnableBatchProcessing && o.batchExtractionSvc != nil {
		return o.batchExtractionSvc.ProcessCampaignBatch(ctx, campaignID)
	}

	// Fallback to individual processing
	return o.processIndividualDomains(ctx, campaignID)
}

// GetPipelineStatus returns the current status of the extraction-analysis pipeline
func (o *ExtractionAnalysisOrchestrator) GetPipelineStatus(ctx context.Context, campaignID *uuid.UUID) (*PipelineStatus, error) {
	status := &PipelineStatus{
		LastUpdated: time.Now(),
	}

	// Get feature flags status
	status.FeatureFlagsEnabled = ExtractionAnalysisFeatureFlags{
		ExtractionFeatureTableEnabled:  featureflags.IsExtractionFeatureTableEnabled(),
		ExtractionKeywordDetailEnabled: featureflags.IsExtractionKeywordDetailEnabled(),
		AnalysisReadsFeatureTable:      featureflags.IsAnalysisReadsFeatureTableEnabled(),
		MicrocrawlAdaptiveMode:         featureflags.IsMicrocrawlAdaptiveModeEnabled(),
		AnalysisRescoringEnabled:       featureflags.IsAnalysisRescoringEnabled(),
	}

	// Get domain processing status
	whereClause := ""
	args := []interface{}{}
	if campaignID != nil {
		whereClause = "WHERE gd.campaign_id = $1"
		args = append(args, *campaignID)
	}

	query := fmt.Sprintf(`
		SELECT 
			COUNT(*) as total_domains,
			COUNT(CASE WHEN def.processing_state = 'ready' THEN 1 END) as successful_domains,
			COUNT(CASE WHEN def.processing_state = 'error' THEN 1 END) as failed_domains,
			COUNT(CASE WHEN def.processing_state = 'pending' OR def.processing_state IS NULL THEN 1 END) as pending_domains,
			AVG(CASE WHEN def.processing_state = 'ready' THEN EXTRACT(EPOCH FROM (def.updated_at - def.created_at)) END) as avg_processing_time_seconds
		FROM generated_domains gd
		LEFT JOIN domain_extraction_features def ON def.domain_id = gd.id AND def.campaign_id = gd.campaign_id
		%s
	`, whereClause)

	var avgProcessingTimeSeconds sql.NullFloat64
	err := o.db.QueryRowContext(ctx, query, args...).Scan(
		&status.TotalDomains,
		&status.SuccessfulDomains,
		&status.FailedDomains,
		&status.PendingDomains,
		&avgProcessingTimeSeconds,
	)
	if err != nil {
		return nil, err
	}

	status.ProcessedDomains = status.SuccessfulDomains + status.FailedDomains

	// Calculate metrics
	if status.ProcessedDomains > 0 {
		status.ErrorRate = float64(status.FailedDomains) / float64(status.ProcessedDomains)
	}

	if avgProcessingTimeSeconds.Valid {
		status.AverageProcessingTime = time.Duration(avgProcessingTimeSeconds.Float64) * time.Second
		if status.AverageProcessingTime > 0 {
			status.ThroughputPerSecond = 1.0 / status.AverageProcessingTime.Seconds()
		}
	}

	// Get migration status if migration service is available
	if o.dataMigrationSvc != nil {
		migrationStatus, err := o.dataMigrationSvc.GetMigrationStatus(ctx, campaignID)
		if err == nil {
			status.MigrationStatus = migrationStatus
		}
	}

	return status, nil
}

// MigrateLegacyData migrates legacy feature_vector data to new tables
func (o *ExtractionAnalysisOrchestrator) MigrateLegacyData(ctx context.Context, campaignID *uuid.UUID) (*MigrationStatus, error) {
	if o.dataMigrationSvc == nil {
		return nil, fmt.Errorf("data migration service not available")
	}

	return o.dataMigrationSvc.MigrateLegacyData(ctx, campaignID, o.config.BatchSize)
}

// ValidateDataIntegrity validates the integrity of migrated data
func (o *ExtractionAnalysisOrchestrator) ValidateDataIntegrity(ctx context.Context, campaignID *uuid.UUID) (*ValidationResults, error) {
	if o.dataMigrationSvc == nil {
		return nil, fmt.Errorf("data migration service not available")
	}

	return o.dataMigrationSvc.ValidateDataIntegrity(ctx, campaignID, 100)
}

// Phase execution methods

func (o *ExtractionAnalysisOrchestrator) runFeatureExtraction(ctx context.Context, result *PipelineResult, signals extraction.RawSignals) error {
	phaseStart := time.Now()

	// Build features from signals
	features := extraction.BuildFeatures(signals, extraction.BuilderParams{
		ExtractionVersion:        1,
		KeywordDictionaryVersion: 1,
		Now:                      time.Now(),
	})

	// Save features if feature table is enabled
	if featureflags.IsExtractionFeatureTableEnabled() {
		err := o.featureExtractionSvc.SaveFeatures(ctx, result.DomainID, result.CampaignID, result.DomainName, signals, features)
		if err != nil {
			return fmt.Errorf("failed to save features: %w", err)
		}

		// Get the saved feature profile
		profile, err := o.featureExtractionSvc.GetExtractionStatus(ctx, result.DomainID, result.CampaignID)
		if err == nil {
			result.FeatureProfile = profile
		}
	}

	result.FeatureExtractionComplete = true
	result.PhaseTimings["feature_extraction"] = time.Since(phaseStart)

	return nil
}

func (o *ExtractionAnalysisOrchestrator) runKeywordExtraction(ctx context.Context, result *PipelineResult, signals extraction.RawSignals) error {
	phaseStart := time.Now()

	// Save keywords if keyword detail is enabled
	if featureflags.IsExtractionKeywordDetailEnabled() {
		err := o.keywordExtractionSvc.SaveKeywords(ctx, result.DomainID, result.CampaignID, signals.ParsedKeywordHits)
		if err != nil {
			return fmt.Errorf("failed to save keywords: %w", err)
		}

		// Get the saved keyword analysis
		keywords, err := o.keywordExtractionSvc.GetKeywordExtractionStatus(ctx, result.DomainID, result.CampaignID)
		if err == nil && len(keywords) > 0 {
			// Convert to keyword analysis format
			analysis := &KeywordRelevanceAnalysis{
				TotalKeywords:         len(keywords),
				UniqueKeywords:        len(keywords),
				SentimentDistribution: make(map[string]int),
				SemanticClusters:      make([]SemanticCluster, 0),
			}

			// Calculate basic metrics
			totalRelevance := 0.0
			for _, kw := range keywords {
				if kw.RelevanceScore.Valid {
					relevance := kw.RelevanceScore.Float64
					totalRelevance += relevance

					switch {
					case relevance >= 0.7:
						analysis.HighRelevanceKeywords++
					case relevance >= 0.4:
						analysis.MediumRelevanceKeywords++
					default:
						analysis.LowRelevanceKeywords++
					}
				}

				if kw.SentimentScore.Valid {
					sentiment := kw.SentimentScore.Float64
					switch {
					case sentiment >= 0.6:
						analysis.SentimentDistribution["positive"]++
					case sentiment <= 0.4:
						analysis.SentimentDistribution["negative"]++
					default:
						analysis.SentimentDistribution["neutral"]++
					}
				}
			}

			if len(keywords) > 0 {
				analysis.AverageRelevance = totalRelevance / float64(len(keywords))
			}

			result.KeywordProfile = analysis
		}
	}

	result.KeywordExtractionComplete = true
	result.PhaseTimings["keyword_extraction"] = time.Since(phaseStart)

	return nil
}

func (o *ExtractionAnalysisOrchestrator) runAdaptiveCrawling(ctx context.Context, result *PipelineResult, signals extraction.RawSignals) error {
	phaseStart := time.Now()

	// Analyze site complexity
	profile, err := o.adaptiveCrawlingSvc.AnalyzeSiteComplexity(ctx, result.DomainID, result.CampaignID, result.DomainName, signals)
	if err != nil {
		return fmt.Errorf("failed to analyze site complexity: %w", err)
	}

	result.CrawlProfile = profile

	// Generate and execute crawl strategy
	strategy, err := o.adaptiveCrawlingSvc.GenerateCrawlStrategy(ctx, profile, result.CampaignID)
	if err != nil {
		return fmt.Errorf("failed to generate crawl strategy: %w", err)
	}

	_, _, err = o.adaptiveCrawlingSvc.ExecuteAdaptiveCrawl(ctx, result.DomainID, result.CampaignID, result.DomainName, strategy)
	if err != nil {
		return fmt.Errorf("failed to execute adaptive crawl: %w", err)
	}

	result.AdaptiveCrawlingComplete = true
	result.PhaseTimings["adaptive_crawling"] = time.Since(phaseStart)

	return nil
}

func (o *ExtractionAnalysisOrchestrator) runAdvancedScoring(ctx context.Context, result *PipelineResult) error {
	phaseStart := time.Now()

	profile, err := o.advancedScoringSvc.ComputeAdvancedScore(ctx, result.DomainID, result.CampaignID, result.DomainName)
	if err != nil {
		return fmt.Errorf("failed to compute advanced score: %w", err)
	}

	result.ScoringProfile = profile
	result.AdvancedScoringComplete = true
	result.PhaseTimings["advanced_scoring"] = time.Since(phaseStart)

	return nil
}

// processIndividualDomains processes domains individually when batch processing is not available
func (o *ExtractionAnalysisOrchestrator) processIndividualDomains(ctx context.Context, campaignID uuid.UUID) (*BatchResult, error) {
	// This is a simplified implementation
	// In practice, this would fetch domains and process them individually
	
	result := &BatchResult{
		CampaignID:        campaignID,
		BatchID:           fmt.Sprintf("individual_%s_%d", campaignID.String()[:8], time.Now().Unix()),
		DomainsProcessed:  0,
		DomainsSuccessful: 0,
		DomainsFailed:     0,
		StartedAt:         time.Now(),
		CompletedAt:       time.Now(),
		Errors:            make([]BatchItemError, 0),
	}

	if o.logger != nil {
		o.logger.Info(ctx, "Individual domain processing not fully implemented", map[string]interface{}{
			"campaign_id": campaignID,
			"note":        "Use batch processing service for full functionality",
		})
	}

	return result, nil
}

// GetHealthCheck returns the health status of all services
func (o *ExtractionAnalysisOrchestrator) GetHealthCheck(ctx context.Context) map[string]interface{} {
	health := map[string]interface{}{
		"timestamp": time.Now(),
		"services":  map[string]bool{},
		"feature_flags": ExtractionAnalysisFeatureFlags{
			ExtractionFeatureTableEnabled:  featureflags.IsExtractionFeatureTableEnabled(),
			ExtractionKeywordDetailEnabled: featureflags.IsExtractionKeywordDetailEnabled(),
			AnalysisReadsFeatureTable:      featureflags.IsAnalysisReadsFeatureTableEnabled(),
			MicrocrawlAdaptiveMode:         featureflags.IsMicrocrawlAdaptiveModeEnabled(),
			AnalysisRescoringEnabled:       featureflags.IsAnalysisRescoringEnabled(),
		},
	}

	services := health["services"].(map[string]bool)
	services["feature_extraction"] = o.featureExtractionSvc != nil
	services["keyword_extraction"] = o.keywordExtractionSvc != nil
	services["adaptive_crawling"] = o.adaptiveCrawlingSvc != nil
	services["advanced_scoring"] = o.advancedScoringSvc != nil
	services["batch_processing"] = o.batchExtractionSvc != nil
	services["data_migration"] = o.dataMigrationSvc != nil

	// Test database connectivity
	if err := o.db.PingContext(ctx); err != nil {
		health["database_status"] = "unhealthy"
		health["database_error"] = err.Error()
	} else {
		health["database_status"] = "healthy"
	}

	return health
}

// GetConfiguration returns the current configuration
func (o *ExtractionAnalysisOrchestrator) GetConfiguration() map[string]interface{} {
	return map[string]interface{}{
		"orchestrator_config": o.config,
		"feature_flags": ExtractionAnalysisFeatureFlags{
			ExtractionFeatureTableEnabled:  featureflags.IsExtractionFeatureTableEnabled(),
			ExtractionKeywordDetailEnabled: featureflags.IsExtractionKeywordDetailEnabled(),
			AnalysisReadsFeatureTable:      featureflags.IsAnalysisReadsFeatureTableEnabled(),
			MicrocrawlAdaptiveMode:         featureflags.IsMicrocrawlAdaptiveModeEnabled(),
			AnalysisRescoringEnabled:       featureflags.IsAnalysisRescoringEnabled(),
		},
		"feature_flag_helpers": map[string]interface{}{
			"min_coverage_threshold": featureflags.GetAnalysisFeatureTableMinCoverage(),
			"dual_read_variance_threshold": featureflags.GetDualReadVarianceThreshold(),
		},
	}
}