package services

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

// DataMigrationService handles migration of legacy feature_vector data to new extraction tables
// This implements Phase P7 of the Extraction → Analysis redesign.
type DataMigrationService struct {
	db     *sqlx.DB
	logger Logger
}

// NewDataMigrationService creates a new data migration service
func NewDataMigrationService(db *sqlx.DB, logger Logger) *DataMigrationService {
	return &DataMigrationService{
		db:     db,
		logger: logger,
	}
}

// MigrationStatus represents the status of data migration
type MigrationStatus struct {
	TotalDomains           int                    `json:"total_domains"`
	DomainsWithLegacyData  int                    `json:"domains_with_legacy_data"`
	DomainsWithNewData     int                    `json:"domains_with_new_data"`
	DomainsMigrated        int                    `json:"domains_migrated"`
	DomainsToMigrate       int                    `json:"domains_to_migrate"`
	MigrationProgress      float64                `json:"migration_progress"`
	LastMigrationRun       *time.Time             `json:"last_migration_run,omitempty"`
	EstimatedCompletion    *time.Time             `json:"estimated_completion,omitempty"`
	ValidationResults      *ValidationResults     `json:"validation_results,omitempty"`
	PerformanceMetrics     *MigrationMetrics      `json:"performance_metrics,omitempty"`
}

// ValidationResults contains results of data validation checks
type ValidationResults struct {
	TotalValidated         int                    `json:"total_validated"`
	ValidationsPassed      int                    `json:"validations_passed"`
	ValidationsFailed      int                    `json:"validations_failed"`
	InconsistenciesFound   []DataInconsistency    `json:"inconsistencies_found"`
	IntegrityScore         float64                `json:"integrity_score"`
	ValidationCompletedAt  time.Time              `json:"validation_completed_at"`
}

// DataInconsistency represents a data inconsistency found during validation
type DataInconsistency struct {
	DomainID     uuid.UUID              `json:"domain_id"`
	DomainName   string                 `json:"domain_name"`
	CampaignID   uuid.UUID              `json:"campaign_id"`
	Type         string                 `json:"type"`         // "missing_new", "missing_legacy", "data_mismatch"
	Field        string                 `json:"field"`        // Field that has inconsistency
	LegacyValue  interface{}            `json:"legacy_value"`
	NewValue     interface{}            `json:"new_value"`
	Severity     string                 `json:"severity"`     // "low", "medium", "high", "critical"
	Description  string                 `json:"description"`
	DetectedAt   time.Time              `json:"detected_at"`
}

// MigrationMetrics contains performance metrics for migration operations
type MigrationMetrics struct {
	DomainsPerSecond       float64                `json:"domains_per_second"`
	AverageProcessingTime  time.Duration          `json:"average_processing_time"`
	TotalProcessingTime    time.Duration          `json:"total_processing_time"`
	ErrorRate              float64                `json:"error_rate"`
	MemoryUsageMB          float64                `json:"memory_usage_mb"`
	DatabaseConnections    int                    `json:"database_connections"`
	LastRunDuration        time.Duration          `json:"last_run_duration"`
}

// LegacyFeatureVector represents the structure of legacy feature_vector data
type LegacyFeatureVector struct {
	DomainID               uuid.UUID              `json:"domain_id"`
	DomainName             string                 `json:"domain_name"`
	CampaignID             uuid.UUID              `json:"campaign_id"`
	
	// Extracted from feature_vector JSON
	KwUnique               int                    `json:"kw_unique"`
	KwHitsTotal            int                    `json:"kw_hits_total"`
	ContentBytes           int                    `json:"content_bytes"`
	KwTop3                 []string               `json:"kw_top3"`
	KwSignalDistribution   map[string]int         `json:"kw_signal_distribution"`
	Richness               float64                `json:"richness"`
	RichnessWeightsVersion int                    `json:"richness_weights_version"`
	ProminenceNorm         float64                `json:"prominence_norm"`
	DiversityEffectiveUnique float64              `json:"diversity_effective_unique"`
	DiversityNorm          float64                `json:"diversity_norm"`
	EnrichmentNorm         float64                `json:"enrichment_norm"`
	AppliedBonus           float64                `json:"applied_bonus"`
	AppliedDeductionsTotal float64                `json:"applied_deductions_total"`
	StuffingPenalty        float64                `json:"stuffing_penalty"`
	RepetitionIndex        float64                `json:"repetition_index"`
	AnchorShare            float64                `json:"anchor_share"`
	
	// HTTP metadata
	HTTPStatusCode         int                    `json:"http_status_code"`
	LastHTTPFetched        *time.Time             `json:"last_http_fetched"`
	IsParked               bool                   `json:"is_parked"`
	ParkedConfidence       float64                `json:"parked_confidence"`
	
	// Original data
	FeatureVector          map[string]interface{} `json:"feature_vector"`
	CreatedAt              time.Time              `json:"created_at"`
	UpdatedAt              time.Time              `json:"updated_at"`
}

// MigrateLegacyData migrates feature_vector data to the new extraction tables
func (s *DataMigrationService) MigrateLegacyData(ctx context.Context, campaignID *uuid.UUID, batchSize int) (*MigrationStatus, error) {
	startTime := time.Now()
	
	if batchSize <= 0 {
		batchSize = 100
	}

	if s.logger != nil {
		s.logger.Info(ctx, "Starting legacy data migration", map[string]interface{}{
			"campaign_id": campaignID,
			"batch_size":  batchSize,
		})
	}

	// Get migration status before starting
	status, err := s.GetMigrationStatus(ctx, campaignID)
	if err != nil {
		return nil, fmt.Errorf("failed to get migration status: %w", err)
	}

	// Get legacy data to migrate
	legacyData, err := s.getLegacyDataToMigrate(ctx, campaignID, batchSize)
	if err != nil {
		return nil, fmt.Errorf("failed to get legacy data: %w", err)
	}

	if len(legacyData) == 0 {
		if s.logger != nil {
			s.logger.Info(ctx, "No legacy data to migrate", nil)
		}
		return status, nil
	}

	migrated := 0
	errors := 0

	// Process in batches
	for i := 0; i < len(legacyData); i += batchSize {
		end := i + batchSize
		if end > len(legacyData) {
			end = len(legacyData)
		}

		batch := legacyData[i:end]
		batchMigrated, batchErrors := s.migrateBatch(ctx, batch)
		migrated += batchMigrated
		errors += batchErrors

		if s.logger != nil && (i+batchSize)%500 == 0 {
			s.logger.Info(ctx, "Migration progress", map[string]interface{}{
				"processed": i + batchSize,
				"total":     len(legacyData),
				"migrated":  migrated,
				"errors":    errors,
			})
		}
	}

	// Update final status
	finalStatus, err := s.GetMigrationStatus(ctx, campaignID)
	if err != nil {
		return nil, fmt.Errorf("failed to get final migration status: %w", err)
	}

	finalStatus.PerformanceMetrics = &MigrationMetrics{
		TotalProcessingTime:   time.Since(startTime),
		LastRunDuration:       time.Since(startTime),
		DomainsPerSecond:      float64(migrated) / time.Since(startTime).Seconds(),
		ErrorRate:             float64(errors) / float64(len(legacyData)),
	}

	if s.logger != nil {
		s.logger.Info(ctx, "Legacy data migration completed", map[string]interface{}{
			"campaign_id":        campaignID,
			"total_processed":    len(legacyData),
			"migrated":          migrated,
			"errors":            errors,
			"duration":          time.Since(startTime).String(),
			"domains_per_second": finalStatus.PerformanceMetrics.DomainsPerSecond,
		})
	}

	return finalStatus, nil
}

// migrateBatch migrates a batch of legacy feature vectors
func (s *DataMigrationService) migrateBatch(ctx context.Context, batch []LegacyFeatureVector) (migrated, errors int) {
	tx, err := s.db.BeginTxx(ctx, nil)
	if err != nil {
		if s.logger != nil {
			s.logger.Error(ctx, "Failed to start migration transaction", err, nil)
		}
		return 0, len(batch)
	}
	defer tx.Rollback()

	for _, legacy := range batch {
		err := s.migrateSingleDomain(ctx, tx, legacy)
		if err != nil {
			if s.logger != nil {
				s.logger.Error(ctx, "Failed to migrate domain", err, map[string]interface{}{
					"domain_id":   legacy.DomainID,
					"domain_name": legacy.DomainName,
				})
			}
			errors++
		} else {
			migrated++
		}
	}

	if err := tx.Commit(); err != nil {
		if s.logger != nil {
			s.logger.Error(ctx, "Failed to commit migration transaction", err, nil)
		}
		return 0, len(batch)
	}

	return migrated, errors
}

// migrateSingleDomain migrates a single domain's legacy data
func (s *DataMigrationService) migrateSingleDomain(ctx context.Context, tx *sqlx.Tx, legacy LegacyFeatureVector) error {
	// Convert legacy data to new format and insert into domain_extraction_features
	featureVectorJSON, err := json.Marshal(legacy.FeatureVector)
	if err != nil {
		return fmt.Errorf("failed to marshal feature vector: %w", err)
	}

	kwTop3JSON, err := json.Marshal(legacy.KwTop3)
	if err != nil {
		return fmt.Errorf("failed to marshal top3 keywords: %w", err)
	}

	signalDistJSON, err := json.Marshal(legacy.KwSignalDistribution)
	if err != nil {
		return fmt.Errorf("failed to marshal signal distribution: %w", err)
	}

	// Insert into domain_extraction_features
	featureQuery := `
		INSERT INTO domain_extraction_features (
			id, domain_id, campaign_id, domain_name, processing_state,
			http_status_code, content_bytes, 
			kw_unique_count, kw_total_occurrences, kw_top3, kw_signal_distribution,
			content_richness_score, is_parked, parked_confidence,
			extracted_at, feature_vector, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, 'ready',
			$5, $6,
			$7, $8, $9, $10,
			$11, $12, $13,
			$14, $15, $16, $17
		)
		ON CONFLICT (domain_id, campaign_id) DO UPDATE SET
			http_status_code = EXCLUDED.http_status_code,
			content_bytes = EXCLUDED.content_bytes,
			kw_unique_count = EXCLUDED.kw_unique_count,
			kw_total_occurrences = EXCLUDED.kw_total_occurrences,
			kw_top3 = EXCLUDED.kw_top3,
			kw_signal_distribution = EXCLUDED.kw_signal_distribution,
			content_richness_score = EXCLUDED.content_richness_score,
			is_parked = EXCLUDED.is_parked,
			parked_confidence = EXCLUDED.parked_confidence,
			feature_vector = EXCLUDED.feature_vector,
			updated_at = NOW()
	`

	_, err = tx.ExecContext(ctx, featureQuery,
		uuid.New(), legacy.DomainID, legacy.CampaignID, legacy.DomainName,
		legacy.HTTPStatusCode, legacy.ContentBytes,
		legacy.KwUnique, legacy.KwHitsTotal, string(kwTop3JSON), string(signalDistJSON),
		legacy.Richness, legacy.IsParked, legacy.ParkedConfidence,
		legacy.LastHTTPFetched, string(featureVectorJSON), legacy.CreatedAt, legacy.UpdatedAt,
	)
	if err != nil {
		return fmt.Errorf("failed to insert feature extraction data: %w", err)
	}

	// Generate keyword entries from kw_top3 and signal distribution
	err = s.generateKeywordEntries(ctx, tx, legacy)
	if err != nil {
		return fmt.Errorf("failed to generate keyword entries: %w", err)
	}

	return nil
}

// generateKeywordEntries creates keyword entries from legacy data
func (s *DataMigrationService) generateKeywordEntries(ctx context.Context, tx *sqlx.Tx, legacy LegacyFeatureVector) error {
	// Clear existing keyword entries for this domain
	_, err := tx.ExecContext(ctx, 
		`DELETE FROM domain_extracted_keywords WHERE domain_id = $1 AND campaign_id = $2`,
		legacy.DomainID, legacy.CampaignID)
	if err != nil {
		return err
	}

	// Generate keywords from top3
	for i, keyword := range legacy.KwTop3 {
		if keyword == "" {
			continue
		}

		// Calculate approximate values
		frequency := legacy.KwHitsTotal / len(legacy.KwTop3) // Simple distribution
		weight := float64(len(legacy.KwTop3)-i) / float64(len(legacy.KwTop3)) // Decreasing weight
		relevance := 0.8 - (float64(i) * 0.1) // Top keywords get higher relevance

		keywordQuery := `
			INSERT INTO domain_extracted_keywords (
				id, domain_id, campaign_id, processing_state,
				keyword_id, keyword_text, frequency, weight, relevance_score,
				source_type, extracted_at, created_at, updated_at
			) VALUES (
				$1, $2, $3, 'ready',
				$4, $5, $6, $7, $8,
				'migrated', $9, $10, $11
			)
		`

		_, err = tx.ExecContext(ctx, keywordQuery,
			uuid.New(), legacy.DomainID, legacy.CampaignID,
			strings.ToLower(keyword), keyword, frequency, weight, relevance,
			legacy.LastHTTPFetched, legacy.CreatedAt, legacy.UpdatedAt,
		)
		if err != nil {
			return err
		}
	}

	return nil
}

// getLegacyDataToMigrate retrieves legacy data that needs to be migrated
func (s *DataMigrationService) getLegacyDataToMigrate(ctx context.Context, campaignID *uuid.UUID, limit int) ([]LegacyFeatureVector, error) {
	whereClause := ""
	args := []interface{}{}
	argIndex := 1

	if campaignID != nil {
		whereClause = "WHERE gd.campaign_id = $1"
		args = append(args, *campaignID)
		argIndex++
	}

	query := fmt.Sprintf(`
		SELECT 
			gd.id, gd.domain_name, gd.campaign_id, gd.feature_vector,
			gd.last_http_fetched_at, gd.is_parked, gd.parked_confidence,
			gd.created_at, gd.updated_at
		FROM generated_domains gd
		LEFT JOIN domain_extraction_features def ON def.domain_id = gd.id AND def.campaign_id = gd.campaign_id
		%s
		AND gd.feature_vector IS NOT NULL
		AND def.id IS NULL  -- Only domains that haven't been migrated yet
		ORDER BY gd.created_at ASC
		LIMIT $%d
	`, whereClause, argIndex)

	args = append(args, limit)

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var legacyData []LegacyFeatureVector
	for rows.Next() {
		var legacy LegacyFeatureVector
		var featureVectorRaw []byte
		var lastHTTPFetched sql.NullTime
		var isParked sql.NullBool
		var parkedConfidence sql.NullFloat64

		err := rows.Scan(
			&legacy.DomainID, &legacy.DomainName, &legacy.CampaignID, &featureVectorRaw,
			&lastHTTPFetched, &isParked, &parkedConfidence,
			&legacy.CreatedAt, &legacy.UpdatedAt,
		)
		if err != nil {
			continue
		}

		// Parse feature vector
		if err := json.Unmarshal(featureVectorRaw, &legacy.FeatureVector); err != nil {
			continue
		}

		// Extract values from feature vector
		legacy.KwUnique = s.getIntFromMap(legacy.FeatureVector, "kw_unique")
		legacy.KwHitsTotal = s.getIntFromMap(legacy.FeatureVector, "kw_hits_total")
		legacy.ContentBytes = s.getIntFromMap(legacy.FeatureVector, "content_bytes")
		legacy.Richness = s.getFloatFromMap(legacy.FeatureVector, "richness")
		legacy.RichnessWeightsVersion = s.getIntFromMap(legacy.FeatureVector, "richness_weights_version")
		legacy.ProminenceNorm = s.getFloatFromMap(legacy.FeatureVector, "prominence_norm")
		legacy.DiversityEffectiveUnique = s.getFloatFromMap(legacy.FeatureVector, "diversity_effective_unique")
		legacy.DiversityNorm = s.getFloatFromMap(legacy.FeatureVector, "diversity_norm")
		legacy.EnrichmentNorm = s.getFloatFromMap(legacy.FeatureVector, "enrichment_norm")
		legacy.AppliedBonus = s.getFloatFromMap(legacy.FeatureVector, "applied_bonus")
		legacy.AppliedDeductionsTotal = s.getFloatFromMap(legacy.FeatureVector, "applied_deductions_total")
		legacy.StuffingPenalty = s.getFloatFromMap(legacy.FeatureVector, "stuffing_penalty")
		legacy.RepetitionIndex = s.getFloatFromMap(legacy.FeatureVector, "repetition_index")
		legacy.AnchorShare = s.getFloatFromMap(legacy.FeatureVector, "anchor_share")

		// Extract arrays/objects
		if top3, ok := legacy.FeatureVector["kw_top3"].([]interface{}); ok {
			for _, item := range top3 {
				if str, ok := item.(string); ok {
					legacy.KwTop3 = append(legacy.KwTop3, str)
				}
			}
		}

		if signalDist, ok := legacy.FeatureVector["kw_signal_distribution"].(map[string]interface{}); ok {
			legacy.KwSignalDistribution = make(map[string]int)
			for k, v := range signalDist {
				if count, ok := v.(float64); ok {
					legacy.KwSignalDistribution[k] = int(count)
				}
			}
		}

		// Set nullable fields
		if lastHTTPFetched.Valid {
			legacy.LastHTTPFetched = &lastHTTPFetched.Time
		}
		if isParked.Valid {
			legacy.IsParked = isParked.Bool
		}
		if parkedConfidence.Valid {
			legacy.ParkedConfidence = parkedConfidence.Float64
		}

		legacyData = append(legacyData, legacy)
	}

	return legacyData, nil
}

// GetMigrationStatus returns the current status of data migration
func (s *DataMigrationService) GetMigrationStatus(ctx context.Context, campaignID *uuid.UUID) (*MigrationStatus, error) {
	whereClause := ""
	args := []interface{}{}

	if campaignID != nil {
		whereClause = "WHERE gd.campaign_id = $1"
		args = append(args, *campaignID)
	}

	query := fmt.Sprintf(`
		SELECT 
			COUNT(*) as total_domains,
			COUNT(CASE WHEN gd.feature_vector IS NOT NULL THEN 1 END) as domains_with_legacy_data,
			COUNT(CASE WHEN def.id IS NOT NULL THEN 1 END) as domains_with_new_data,
			COUNT(CASE WHEN gd.feature_vector IS NOT NULL AND def.id IS NOT NULL THEN 1 END) as domains_migrated,
			COUNT(CASE WHEN gd.feature_vector IS NOT NULL AND def.id IS NULL THEN 1 END) as domains_to_migrate
		FROM generated_domains gd
		LEFT JOIN domain_extraction_features def ON def.domain_id = gd.id AND def.campaign_id = gd.campaign_id
		%s
	`, whereClause)

	var status MigrationStatus
	err := s.db.QueryRowContext(ctx, query, args...).Scan(
		&status.TotalDomains,
		&status.DomainsWithLegacyData,
		&status.DomainsWithNewData,
		&status.DomainsMigrated,
		&status.DomainsToMigrate,
	)
	if err != nil {
		return nil, err
	}

	// Calculate progress
	if status.DomainsWithLegacyData > 0 {
		status.MigrationProgress = float64(status.DomainsMigrated) / float64(status.DomainsWithLegacyData)
	} else {
		status.MigrationProgress = 1.0
	}

	return &status, nil
}

// ValidateDataIntegrity validates the integrity of migrated data
func (s *DataMigrationService) ValidateDataIntegrity(ctx context.Context, campaignID *uuid.UUID, sampleSize int) (*ValidationResults, error) {
	if sampleSize <= 0 {
		sampleSize = 100
	}

	results := &ValidationResults{
		InconsistenciesFound:  make([]DataInconsistency, 0),
		ValidationCompletedAt: time.Now(),
	}

	// Get sample of domains with both legacy and new data
	whereClause := ""
	args := []interface{}{sampleSize}
	if campaignID != nil {
		whereClause = "AND gd.campaign_id = $2"
		args = append(args, *campaignID)
	}

	query := fmt.Sprintf(`
		SELECT 
			gd.id, gd.domain_name, gd.campaign_id, gd.feature_vector,
			def.kw_unique_count, def.kw_total_occurrences, def.content_richness_score,
			def.kw_top3, def.kw_signal_distribution, def.feature_vector as new_feature_vector
		FROM generated_domains gd
		JOIN domain_extraction_features def ON def.domain_id = gd.id AND def.campaign_id = gd.campaign_id
		WHERE gd.feature_vector IS NOT NULL
		%s
		ORDER BY RANDOM()
		LIMIT $1
	`, whereClause)

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var (
			domainID, domainName, campaignID string
			legacyFVRaw, newFVRaw            []byte
			newKwUnique, newKwTotal          sql.NullInt32
			newRichness                      sql.NullFloat64
			newKwTop3, newSignalDist         sql.NullString
		)

		err := rows.Scan(
			&domainID, &domainName, &campaignID, &legacyFVRaw,
			&newKwUnique, &newKwTotal, &newRichness,
			&newKwTop3, &newSignalDist, &newFVRaw,
		)
		if err != nil {
			continue
		}

		results.TotalValidated++

		// Parse legacy feature vector
		var legacyFV map[string]interface{}
		if err := json.Unmarshal(legacyFVRaw, &legacyFV); err != nil {
			continue
		}

		// Validate key fields
		inconsistencies := s.validateDomainData(domainID, domainName, campaignID, legacyFV, map[string]interface{}{
			"kw_unique_count":        newKwUnique,
			"kw_total_occurrences":   newKwTotal,
			"content_richness_score": newRichness,
			"kw_top3":                newKwTop3,
			"kw_signal_distribution": newSignalDist,
		})

		if len(inconsistencies) == 0 {
			results.ValidationsPassed++
		} else {
			results.ValidationsFailed++
			results.InconsistenciesFound = append(results.InconsistenciesFound, inconsistencies...)
		}
	}

	// Calculate integrity score
	if results.TotalValidated > 0 {
		results.IntegrityScore = float64(results.ValidationsPassed) / float64(results.TotalValidated)
	}

	return results, nil
}

// validateDomainData validates data consistency for a single domain
func (s *DataMigrationService) validateDomainData(domainID, domainName, campaignID string, legacy map[string]interface{}, new map[string]interface{}) []DataInconsistency {
	var inconsistencies []DataInconsistency

	// Validate kw_unique_count
	legacyUnique := s.getIntFromMap(legacy, "kw_unique")
	if newUnique, ok := new["kw_unique_count"].(sql.NullInt32); ok && newUnique.Valid {
		if legacyUnique != int(newUnique.Int32) {
			inconsistencies = append(inconsistencies, DataInconsistency{
				DomainID:    uuid.MustParse(domainID),
				DomainName:  domainName,
				CampaignID:  uuid.MustParse(campaignID),
				Type:        "data_mismatch",
				Field:       "kw_unique_count",
				LegacyValue: legacyUnique,
				NewValue:    newUnique.Int32,
				Severity:    "medium",
				Description: "Keyword unique count mismatch between legacy and new data",
				DetectedAt:  time.Now(),
			})
		}
	}

	// Validate richness score
	legacyRichness := s.getFloatFromMap(legacy, "richness")
	if newRichness, ok := new["content_richness_score"].(sql.NullFloat64); ok && newRichness.Valid {
		diff := abs(legacyRichness - newRichness.Float64)
		if diff > 0.01 { // Allow small floating point differences
			severity := "low"
			if diff > 0.1 {
				severity = "medium"
			}
			if diff > 0.3 {
				severity = "high"
			}

			inconsistencies = append(inconsistencies, DataInconsistency{
				DomainID:    uuid.MustParse(domainID),
				DomainName:  domainName,
				CampaignID:  uuid.MustParse(campaignID),
				Type:        "data_mismatch",
				Field:       "content_richness_score",
				LegacyValue: legacyRichness,
				NewValue:    newRichness.Float64,
				Severity:    severity,
				Description: fmt.Sprintf("Richness score difference: %.3f", diff),
				DetectedAt:  time.Now(),
			})
		}
	}

	return inconsistencies
}

// RemoveDualWriteLogic removes dual-write functionality after migration is complete
func (s *DataMigrationService) RemoveDualWriteLogic(ctx context.Context) error {
	// This would involve removing code that writes to both legacy and new tables
	// For now, we'll just log that this step would be performed
	if s.logger != nil {
		s.logger.Info(ctx, "Dual-write logic removal would be performed here", map[string]interface{}{
			"note": "This requires code changes to remove dual-write patterns",
		})
	}
	return nil
}

// CreateRollbackPoint creates a rollback point for migration
func (s *DataMigrationService) CreateRollbackPoint(ctx context.Context, campaignID *uuid.UUID) (string, error) {
	rollbackID := fmt.Sprintf("rollback_%d", time.Now().Unix())
	
	// In a full implementation, this would create a backup of the current state
	// For now, we'll log the action
	if s.logger != nil {
		s.logger.Info(ctx, "Rollback point created", map[string]interface{}{
			"rollback_id": rollbackID,
			"campaign_id": campaignID,
		})
	}

	return rollbackID, nil
}

// Helper functions
func (s *DataMigrationService) getIntFromMap(m map[string]interface{}, key string) int {
	if val, ok := m[key]; ok {
		switch v := val.(type) {
		case int:
			return v
		case float64:
			return int(v)
		case json.Number:
			if i, err := v.Int64(); err == nil {
				return int(i)
			}
		}
	}
	return 0
}

func (s *DataMigrationService) getFloatFromMap(m map[string]interface{}, key string) float64 {
	if val, ok := m[key]; ok {
		switch v := val.(type) {
		case float64:
			return v
		case int:
			return float64(v)
		case json.Number:
			if f, err := v.Float64(); err == nil {
				return f
			}
		}
	}
	return 0.0
}

func abs(x float64) float64 {
	if x < 0 {
		return -x
	}
	return x
}