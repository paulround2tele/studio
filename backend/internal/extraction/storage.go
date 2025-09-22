package extraction

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"os"
	"strconv"
	"time"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

// StorageOptimizationService handles storage optimization and keyword pruning
type StorageOptimizationService struct {
	db      *sql.DB
	metrics *StorageMetrics
}

// StorageMetrics tracks storage optimization metrics
type StorageMetrics struct {
	storageGrowthGauge       *prometheus.GaugeVec
	keywordsPrunedTotal      *prometheus.CounterVec
	pruningDuration          *prometheus.HistogramVec
	compressionRatioGauge    *prometheus.GaugeVec
	storageReclaimedBytes    *prometheus.CounterVec
}

// PruningPolicy defines rules for keyword pruning
type PruningPolicy struct {
	Name                  string
	MinFrequency          int
	MinWeight             float64
	MaxAge                time.Duration
	ExcludeSourceTypes    []string
	PreserveTopN          int
	MaxKeywordsPerDomain  int
	CampaignAgeThreshold  time.Duration
}

// StorageStats represents storage usage statistics
type StorageStats struct {
	CampaignID           string    `json:"campaign_id"`
	DomainCount          int       `json:"domain_count"`
	KeywordCount         int       `json:"keyword_count"`
	FeatureRowsCount     int       `json:"feature_rows_count"`
	TotalStorageBytes    int64     `json:"total_storage_bytes"`
	KeywordStorageBytes  int64     `json:"keyword_storage_bytes"`
	FeatureStorageBytes  int64     `json:"feature_storage_bytes"`
	AverageKeywordsPerDomain float64 `json:"average_keywords_per_domain"`
	LastUpdated          time.Time `json:"last_updated"`
}

// CompressionStats represents compression effectiveness
type CompressionStats struct {
	CampaignID        string    `json:"campaign_id"`
	OriginalBytes     int64     `json:"original_bytes"`
	CompressedBytes   int64     `json:"compressed_bytes"`
	CompressionRatio  float64   `json:"compression_ratio"`
	SpaceSavedBytes   int64     `json:"space_saved_bytes"`
	CompressionMethod string    `json:"compression_method"`
	CompressedAt      time.Time `json:"compressed_at"`
}

// NewStorageOptimizationService creates a new storage optimization service
func NewStorageOptimizationService(db *sql.DB) *StorageOptimizationService {
	metrics := &StorageMetrics{
		storageGrowthGauge: promauto.NewGaugeVec(
			prometheus.GaugeOpts{
				Name: "extraction_storage_growth_bytes",
				Help: "Storage growth in bytes per campaign",
			},
			[]string{"campaign_id", "data_type"},
		),
		keywordsPrunedTotal: promauto.NewCounterVec(
			prometheus.CounterOpts{
				Name: "extraction_keywords_pruned_total",
				Help: "Total number of keywords pruned",
			},
			[]string{"campaign_id", "policy_name", "reason"},
		),
		pruningDuration: promauto.NewHistogramVec(
			prometheus.HistogramOpts{
				Name:    "extraction_pruning_duration_seconds",
				Help:    "Time spent in pruning operations",
				Buckets: prometheus.ExponentialBuckets(0.1, 2, 10),
			},
			[]string{"policy_name", "campaign_id"},
		),
		compressionRatioGauge: promauto.NewGaugeVec(
			prometheus.GaugeOpts{
				Name: "extraction_compression_ratio",
				Help: "Compression ratio achieved for archived campaigns",
			},
			[]string{"campaign_id", "compression_method"},
		),
		storageReclaimedBytes: promauto.NewCounterVec(
			prometheus.CounterOpts{
				Name: "extraction_storage_reclaimed_bytes_total",
				Help: "Total bytes reclaimed through optimization",
			},
			[]string{"campaign_id", "method"},
		),
	}

	return &StorageOptimizationService{
		db:      db,
		metrics: metrics,
	}
}

// DefaultPruningPolicies returns standard keyword pruning policies
func DefaultPruningPolicies() []PruningPolicy {
	return []PruningPolicy{
		{
			Name:                 "low_impact_removal",
			MinFrequency:         1,
			MinWeight:            0.01,
			MaxAge:               30 * 24 * time.Hour, // 30 days
			ExcludeSourceTypes:   []string{"title", "h1", "meta"},
			PreserveTopN:         20,
			MaxKeywordsPerDomain: 500,
		},
		{
			Name:                 "aggressive_cleanup",
			MinFrequency:         2,
			MinWeight:            0.05,
			MaxAge:               7 * 24 * time.Hour, // 7 days
			ExcludeSourceTypes:   []string{"title", "h1"},
			PreserveTopN:         50,
			MaxKeywordsPerDomain: 200,
			CampaignAgeThreshold: 90 * 24 * time.Hour, // Only for campaigns older than 90 days
		},
		{
			Name:                 "archive_preparation",
			MinFrequency:         3,
			MinWeight:            0.1,
			MaxAge:               24 * time.Hour, // 1 day
			ExcludeSourceTypes:   []string{"title"},
			PreserveTopN:         10,
			MaxKeywordsPerDomain: 50,
			CampaignAgeThreshold: 180 * 24 * time.Hour, // Only for campaigns older than 180 days
		},
	}
}

// MeasureStorageGrowth calculates and records storage growth patterns
func (s *StorageOptimizationService) MeasureStorageGrowth(ctx context.Context, campaignID string) (*StorageStats, error) {
	if s.db == nil {
		return nil, fmt.Errorf("database connection is nil")
	}

	stats := &StorageStats{
		CampaignID:  campaignID,
		LastUpdated: time.Now(),
	}

	// Query domain and feature counts
	err := s.db.QueryRowContext(ctx, `
		SELECT 
			COUNT(DISTINCT def.domain_id) as domain_count,
			COUNT(def.id) as feature_rows_count,
			COALESCE(pg_total_relation_size('domain_extraction_features'), 0) as feature_storage_bytes
		FROM domain_extraction_features def
		WHERE def.campaign_id = $1`,
		campaignID).Scan(&stats.DomainCount, &stats.FeatureRowsCount, &stats.FeatureStorageBytes)

	if err != nil {
		return nil, fmt.Errorf("failed to query feature stats: %w", err)
	}

	// Query keyword counts
	err = s.db.QueryRowContext(ctx, `
		SELECT 
			COUNT(id) as keyword_count,
			COALESCE(pg_total_relation_size('domain_extracted_keywords'), 0) as keyword_storage_bytes
		FROM domain_extracted_keywords
		WHERE campaign_id = $1`,
		campaignID).Scan(&stats.KeywordCount, &stats.KeywordStorageBytes)

	if err != nil {
		return nil, fmt.Errorf("failed to query keyword stats: %w", err)
	}

	// Calculate derived metrics
	stats.TotalStorageBytes = stats.FeatureStorageBytes + stats.KeywordStorageBytes
	if stats.DomainCount > 0 {
		stats.AverageKeywordsPerDomain = float64(stats.KeywordCount) / float64(stats.DomainCount)
	}

	// Record metrics
	s.metrics.storageGrowthGauge.WithLabelValues(campaignID, "keywords").Set(float64(stats.KeywordStorageBytes))
	s.metrics.storageGrowthGauge.WithLabelValues(campaignID, "features").Set(float64(stats.FeatureStorageBytes))
	s.metrics.storageGrowthGauge.WithLabelValues(campaignID, "total").Set(float64(stats.TotalStorageBytes))

	return stats, nil
}

// ApplyPruningPolicy applies a keyword pruning policy to a campaign
func (s *StorageOptimizationService) ApplyPruningPolicy(ctx context.Context, campaignID string, policy PruningPolicy) (int, error) {
	if s.db == nil {
		return 0, fmt.Errorf("database connection is nil")
	}

	start := time.Now()
	defer func() {
		duration := time.Since(start)
		s.metrics.pruningDuration.WithLabelValues(policy.Name, campaignID).Observe(duration.Seconds())
	}()

	// Check campaign age if threshold is set
	if policy.CampaignAgeThreshold > 0 {
		var createdAt time.Time
		err := s.db.QueryRowContext(ctx, `
			SELECT created_at FROM lead_generation_campaigns WHERE id = $1`,
			campaignID).Scan(&createdAt)
		if err != nil {
			return 0, fmt.Errorf("failed to check campaign age: %w", err)
		}
		if time.Since(createdAt) < policy.CampaignAgeThreshold {
			return 0, nil // Campaign too young for this policy
		}
	}

	totalPruned := 0

	// Apply frequency-based pruning
	if policy.MinFrequency > 1 {
		pruned, err := s.pruneByFrequency(ctx, campaignID, policy)
		if err != nil {
			return totalPruned, fmt.Errorf("frequency pruning failed: %w", err)
		}
		totalPruned += pruned
		s.metrics.keywordsPrunedTotal.WithLabelValues(campaignID, policy.Name, "low_frequency").Add(float64(pruned))
	}

	// Apply weight-based pruning
	if policy.MinWeight > 0 {
		pruned, err := s.pruneByWeight(ctx, campaignID, policy)
		if err != nil {
			return totalPruned, fmt.Errorf("weight pruning failed: %w", err)
		}
		totalPruned += pruned
		s.metrics.keywordsPrunedTotal.WithLabelValues(campaignID, policy.Name, "low_weight").Add(float64(pruned))
	}

	// Apply age-based pruning
	if policy.MaxAge > 0 {
		pruned, err := s.pruneByAge(ctx, campaignID, policy)
		if err != nil {
			return totalPruned, fmt.Errorf("age pruning failed: %w", err)
		}
		totalPruned += pruned
		s.metrics.keywordsPrunedTotal.WithLabelValues(campaignID, policy.Name, "old_age").Add(float64(pruned))
	}

	// Apply domain-level keyword count limits
	if policy.MaxKeywordsPerDomain > 0 {
		pruned, err := s.pruneByDomainLimit(ctx, campaignID, policy)
		if err != nil {
			return totalPruned, fmt.Errorf("domain limit pruning failed: %w", err)
		}
		totalPruned += pruned
		s.metrics.keywordsPrunedTotal.WithLabelValues(campaignID, policy.Name, "domain_limit").Add(float64(pruned))
	}

	return totalPruned, nil
}

// pruneByFrequency removes keywords below minimum frequency threshold
func (s *StorageOptimizationService) pruneByFrequency(ctx context.Context, campaignID string, policy PruningPolicy) (int, error) {
	excludeClause := ""
	args := []interface{}{campaignID, policy.MinFrequency}
	
	if len(policy.ExcludeSourceTypes) > 0 {
		excludeClause = "AND source_type NOT IN ("
		for i, sourceType := range policy.ExcludeSourceTypes {
			if i > 0 {
				excludeClause += ","
			}
			excludeClause += fmt.Sprintf("$%d", len(args)+1)
			args = append(args, sourceType)
		}
		excludeClause += ")"
	}

	query := fmt.Sprintf(`
		DELETE FROM domain_extracted_keywords 
		WHERE campaign_id = $1 
		  AND frequency < $2 
		  %s`, excludeClause)

	result, err := s.db.ExecContext(ctx, query, args...)
	if err != nil {
		return 0, err
	}

	rowsAffected, _ := result.RowsAffected()
	return int(rowsAffected), nil
}

// pruneByWeight removes keywords below minimum weight threshold
func (s *StorageOptimizationService) pruneByWeight(ctx context.Context, campaignID string, policy PruningPolicy) (int, error) {
	excludeClause := ""
	args := []interface{}{campaignID, policy.MinWeight}
	
	if len(policy.ExcludeSourceTypes) > 0 {
		excludeClause = "AND source_type NOT IN ("
		for i, sourceType := range policy.ExcludeSourceTypes {
			if i > 0 {
				excludeClause += ","
			}
			excludeClause += fmt.Sprintf("$%d", len(args)+1)
			args = append(args, sourceType)
		}
		excludeClause += ")"
	}

	query := fmt.Sprintf(`
		DELETE FROM domain_extracted_keywords 
		WHERE campaign_id = $1 
		  AND (weight IS NULL OR weight < $2)
		  %s`, excludeClause)

	result, err := s.db.ExecContext(ctx, query, args...)
	if err != nil {
		return 0, err
	}

	rowsAffected, _ := result.RowsAffected()
	return int(rowsAffected), nil
}

// pruneByAge removes keywords older than the maximum age
func (s *StorageOptimizationService) pruneByAge(ctx context.Context, campaignID string, policy PruningPolicy) (int, error) {
	cutoff := time.Now().Add(-policy.MaxAge)
	
	excludeClause := ""
	args := []interface{}{campaignID, cutoff}
	
	if len(policy.ExcludeSourceTypes) > 0 {
		excludeClause = "AND source_type NOT IN ("
		for i, sourceType := range policy.ExcludeSourceTypes {
			if i > 0 {
				excludeClause += ","
			}
			excludeClause += fmt.Sprintf("$%d", len(args)+1)
			args = append(args, sourceType)
		}
		excludeClause += ")"
	}

	query := fmt.Sprintf(`
		DELETE FROM domain_extracted_keywords 
		WHERE campaign_id = $1 
		  AND created_at < $2
		  %s`, excludeClause)

	result, err := s.db.ExecContext(ctx, query, args...)
	if err != nil {
		return 0, err
	}

	rowsAffected, _ := result.RowsAffected()
	return int(rowsAffected), nil
}

// pruneByDomainLimit removes excess keywords per domain, keeping only the highest weighted ones
func (s *StorageOptimizationService) pruneByDomainLimit(ctx context.Context, campaignID string, policy PruningPolicy) (int, error) {
	// Delete keywords beyond the limit, keeping the highest weighted ones
	query := `
		DELETE FROM domain_extracted_keywords 
		WHERE id IN (
			SELECT id FROM (
				SELECT id,
					ROW_NUMBER() OVER (PARTITION BY domain_id ORDER BY weight DESC NULLS LAST, frequency DESC) as rn
				FROM domain_extracted_keywords 
				WHERE campaign_id = $1
			) ranked
			WHERE rn > $2
		)`

	result, err := s.db.ExecContext(ctx, query, campaignID, policy.MaxKeywordsPerDomain)
	if err != nil {
		return 0, err
	}

	rowsAffected, _ := result.RowsAffected()
	return int(rowsAffected), nil
}

// CompressArchivedCampaign compresses data for archived campaigns
func (s *StorageOptimizationService) CompressArchivedCampaign(ctx context.Context, campaignID string) (*CompressionStats, error) {
	if s.db == nil {
		return nil, fmt.Errorf("database connection is nil")
	}

	// Measure original size
	var originalBytes int64
	err := s.db.QueryRowContext(ctx, `
		SELECT 
			COALESCE(pg_total_relation_size('domain_extraction_features'), 0) +
			COALESCE(pg_total_relation_size('domain_extracted_keywords'), 0) as total_size
		FROM lead_generation_campaigns 
		WHERE id = $1`,
		campaignID).Scan(&originalBytes)

	if err != nil {
		return nil, fmt.Errorf("failed to measure original size: %w", err)
	}

	// Apply aggressive pruning for archive preparation
	archivePolicy := PruningPolicy{
		Name:                 "archive_compression",
		MinFrequency:         2,
		MinWeight:            0.1,
		MaxAge:               24 * time.Hour,
		ExcludeSourceTypes:   []string{"title"},
		PreserveTopN:         10,
		MaxKeywordsPerDomain: 25,
	}

	pruned, err := s.ApplyPruningPolicy(ctx, campaignID, archivePolicy)
	if err != nil {
		return nil, fmt.Errorf("failed to apply archive pruning: %w", err)
	}

	// Measure compressed size
	var compressedBytes int64
	err = s.db.QueryRowContext(ctx, `
		SELECT 
			COALESCE(pg_total_relation_size('domain_extraction_features'), 0) +
			COALESCE(pg_total_relation_size('domain_extracted_keywords'), 0) as total_size
		FROM lead_generation_campaigns 
		WHERE id = $1`,
		campaignID).Scan(&compressedBytes)

	if err != nil {
		return nil, fmt.Errorf("failed to measure compressed size: %w", err)
	}

	// Calculate compression stats
	stats := &CompressionStats{
		CampaignID:        campaignID,
		OriginalBytes:     originalBytes,
		CompressedBytes:   compressedBytes,
		SpaceSavedBytes:   originalBytes - compressedBytes,
		CompressionMethod: fmt.Sprintf("keyword_pruning_%d_keywords", pruned),
		CompressedAt:      time.Now(),
	}

	if originalBytes > 0 {
		stats.CompressionRatio = float64(compressedBytes) / float64(originalBytes)
	}

	// Record metrics
	s.metrics.compressionRatioGauge.WithLabelValues(campaignID, "keyword_pruning").Set(stats.CompressionRatio)
	s.metrics.storageReclaimedBytes.WithLabelValues(campaignID, "compression").Add(float64(stats.SpaceSavedBytes))

	return stats, nil
}

// ScheduledOptimizationRunner runs storage optimization on a schedule
func (s *StorageOptimizationService) ScheduledOptimizationRunner(ctx context.Context, interval time.Duration) {
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			if err := s.runScheduledOptimization(ctx); err != nil {
				log.Printf("Scheduled optimization failed: %v", err)
			}
		}
	}
}

// runScheduledOptimization performs scheduled storage optimization
func (s *StorageOptimizationService) runScheduledOptimization(ctx context.Context) error {
	// Get list of campaigns that need optimization
	rows, err := s.db.QueryContext(ctx, `
		SELECT DISTINCT campaign_id 
		FROM domain_extraction_features 
		WHERE updated_at < NOW() - INTERVAL '7 days'`)
	if err != nil {
		return fmt.Errorf("failed to query campaigns for optimization: %w", err)
	}
	defer rows.Close()

	policies := DefaultPruningPolicies()
	
	for rows.Next() {
		var campaignID string
		if err := rows.Scan(&campaignID); err != nil {
			continue
		}

		// Apply low-impact pruning policy
		for _, policy := range policies {
			if policy.Name == "low_impact_removal" {
				pruned, err := s.ApplyPruningPolicy(ctx, campaignID, policy)
				if err != nil {
					log.Printf("Failed to apply pruning policy %s to campaign %s: %v", policy.Name, campaignID, err)
				} else if pruned > 0 {
					log.Printf("Pruned %d keywords from campaign %s using policy %s", pruned, campaignID, policy.Name)
				}
				break
			}
		}
	}

	return nil
}

// GetOptimizationRecommendations analyzes storage usage and provides optimization recommendations
func (s *StorageOptimizationService) GetOptimizationRecommendations(ctx context.Context, campaignID string) ([]string, error) {
	stats, err := s.MeasureStorageGrowth(ctx, campaignID)
	if err != nil {
		return nil, fmt.Errorf("failed to measure storage: %w", err)
	}

	var recommendations []string

	// Check keyword density
	if stats.AverageKeywordsPerDomain > 200 {
		recommendations = append(recommendations, "Consider applying keyword pruning - average keywords per domain is high")
	}

	// Check storage size
	if stats.TotalStorageBytes > 100*1024*1024 { // 100MB
		recommendations = append(recommendations, "Campaign storage size is large, consider compression or archival")
	}

	// Check keyword-to-domain ratio
	if stats.KeywordCount > stats.DomainCount*500 {
		recommendations = append(recommendations, "High keyword-to-domain ratio detected, aggressive pruning recommended")
	}

	return recommendations, nil
}

// GetStorageOptimizationConfig returns storage optimization configuration from environment
func GetStorageOptimizationConfig() map[string]interface{} {
	config := map[string]interface{}{
		"pruning_enabled":        getEnvBool("STORAGE_PRUNING_ENABLED", true),
		"compression_enabled":    getEnvBool("STORAGE_COMPRESSION_ENABLED", true),
		"max_keywords_per_domain": getEnvInt("STORAGE_MAX_KEYWORDS_PER_DOMAIN", 500),
		"min_keyword_frequency":   getEnvInt("STORAGE_MIN_KEYWORD_FREQUENCY", 1),
		"min_keyword_weight":      getEnvFloat("STORAGE_MIN_KEYWORD_WEIGHT", 0.01),
		"optimization_interval":   getEnvDuration("STORAGE_OPTIMIZATION_INTERVAL", 24*time.Hour),
	}
	return config
}

// Helper functions for environment variable parsing
func getEnvBool(key string, defaultValue bool) bool {
	if value := os.Getenv(key); value != "" {
		if parsed, err := strconv.ParseBool(value); err == nil {
			return parsed
		}
	}
	return defaultValue
}

func getEnvInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if parsed, err := strconv.Atoi(value); err == nil {
			return parsed
		}
	}
	return defaultValue
}

func getEnvFloat(key string, defaultValue float64) float64 {
	if value := os.Getenv(key); value != "" {
		if parsed, err := strconv.ParseFloat(value, 64); err == nil {
			return parsed
		}
	}
	return defaultValue
}

func getEnvDuration(key string, defaultValue time.Duration) time.Duration {
	if value := os.Getenv(key); value != "" {
		if parsed, err := time.ParseDuration(value); err == nil {
			return parsed
		}
	}
	return defaultValue
}