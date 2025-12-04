package services

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

	"github.com/fntelecomllc/studio/backend/internal/extraction"
)

// FeatureExtractionService handles writing feature extraction results to the new domain_extraction_features table
// This implements Phase P1 of the Extraction → Analysis redesign.
type FeatureExtractionService struct {
	db     *sqlx.DB
	logger Logger
}

// NewFeatureExtractionService creates a new feature extraction service
func NewFeatureExtractionService(db *sqlx.DB, logger Logger) *FeatureExtractionService {
	return &FeatureExtractionService{
		db:     db,
		logger: logger,
	}
}

// ExtractionFeatures represents the data structure for domain_extraction_features table
type ExtractionFeatures struct {
	ID         uuid.UUID `db:"id"`
	DomainID   uuid.UUID `db:"domain_id"`
	CampaignID uuid.UUID `db:"campaign_id"`
	DomainName string    `db:"domain_name"`

	// Processing state
	ProcessingState string         `db:"processing_state"`
	AttemptCount    int            `db:"attempt_count"`
	LastError       sql.NullString `db:"last_error"`

	// HTTP fetch metrics
	HTTPStatus     sql.NullString `db:"http_status"`
	HTTPStatusCode sql.NullInt32  `db:"http_status_code"`
	FetchTimeMs    sql.NullInt32  `db:"fetch_time_ms"`
	ContentHash    sql.NullString `db:"content_hash"`
	ContentBytes   sql.NullInt32  `db:"content_bytes"`
	PageLang       sql.NullString `db:"page_lang"`

	// Feature extraction results
	KwUniqueCount        sql.NullInt32   `db:"kw_unique_count"`
	KwTotalOccurrences   sql.NullInt32   `db:"kw_total_occurrences"`
	KwWeightSum          sql.NullFloat64 `db:"kw_weight_sum"`
	KwTop3               sql.NullString  `db:"kw_top3"`                // JSONB
	KwSignalDistribution sql.NullString  `db:"kw_signal_distribution"` // JSONB
	ContentRichnessScore sql.NullFloat64 `db:"content_richness_score"`

	// Microcrawl features
	MicrocrawlEnabled      sql.NullBool    `db:"microcrawl_enabled"`
	MicrocrawlPages        sql.NullInt32   `db:"microcrawl_pages"`
	MicrocrawlBaseKwCount  sql.NullInt32   `db:"microcrawl_base_kw_count"`
	MicrocrawlAddedKwCount sql.NullInt32   `db:"microcrawl_added_kw_count"`
	MicrocrawlGainRatio    sql.NullFloat64 `db:"microcrawl_gain_ratio"`
	DiminishingReturns     sql.NullBool    `db:"diminishing_returns"`

	// Parking detection
	IsParked         sql.NullBool    `db:"is_parked"`
	ParkedConfidence sql.NullFloat64 `db:"parked_confidence"`

	// Scoring
	IsStaleScore sql.NullBool `db:"is_stale_score"`

	// Processing metadata
	ExtractedAt   sql.NullTime   `db:"extracted_at"`
	FeatureVector sql.NullString `db:"feature_vector"` // JSONB

	// Audit fields
	CreatedAt time.Time `db:"created_at"`
	UpdatedAt time.Time `db:"updated_at"`
}

// SaveFeatures saves feature extraction results to the domain_extraction_features table
// This is the core method for Phase P1 implementation.
func (s *FeatureExtractionService) SaveFeatures(ctx context.Context, domainID uuid.UUID, campaignID uuid.UUID, domainName string, signals extraction.RawSignals, features extraction.FeatureAggregate) error {
	// Prepare JSONB data
	kwTop3JSON, err := json.Marshal(features.Top3)
	if err != nil {
		return fmt.Errorf("failed to marshal top3 keywords: %w", err)
	}

	signalDistJSON, err := json.Marshal(features.SignalDistribution)
	if err != nil {
		return fmt.Errorf("failed to marshal signal distribution: %w", err)
	}

	featureVectorJSON, err := json.Marshal(features.FeatureVector)
	if err != nil {
		return fmt.Errorf("failed to marshal feature vector: %w", err)
	}

	// Create the extraction features record
	record := ExtractionFeatures{
		ID:                   uuid.New(),
		DomainID:             domainID,
		CampaignID:           campaignID,
		DomainName:           domainName,
		ProcessingState:      "ready",
		AttemptCount:         1,
		HTTPStatus:           sql.NullString{String: fmt.Sprintf("%d", signals.HTTPStatusCode), Valid: signals.HTTPStatusCode > 0},
		HTTPStatusCode:       sql.NullInt32{Int32: int32(signals.HTTPStatusCode), Valid: signals.HTTPStatusCode > 0},
		FetchTimeMs:          sql.NullInt32{Int32: int32(signals.FetchLatencyMs), Valid: signals.FetchLatencyMs > 0},
		ContentHash:          sql.NullString{String: signals.ContentHash, Valid: signals.ContentHash != ""},
		ContentBytes:         sql.NullInt32{Int32: int32(signals.ContentBytes), Valid: signals.ContentBytes > 0},
		PageLang:             sql.NullString{String: signals.Language, Valid: signals.Language != ""},
		KwUniqueCount:        sql.NullInt32{Int32: int32(features.KwUniqueCount), Valid: true},
		KwTotalOccurrences:   sql.NullInt32{Int32: int32(features.KwTotalOccurrences), Valid: true},
		KwWeightSum:          sql.NullFloat64{Float64: features.KwWeightSum, Valid: true},
		KwTop3:               sql.NullString{String: string(kwTop3JSON), Valid: len(features.Top3) > 0},
		KwSignalDistribution: sql.NullString{String: string(signalDistJSON), Valid: len(features.SignalDistribution) > 0},
		ContentRichnessScore: sql.NullFloat64{Float64: features.ContentRichnessScore, Valid: true},
		IsParked:             sql.NullBool{Bool: features.IsParked, Valid: true},
		ParkedConfidence:     sql.NullFloat64{Float64: features.ParkedConfidence, Valid: features.ParkedConfidence > 0},
		IsStaleScore:         sql.NullBool{Bool: false, Valid: true},
		ExtractedAt:          sql.NullTime{Time: time.Now(), Valid: true},
		FeatureVector:        sql.NullString{String: string(featureVectorJSON), Valid: len(features.FeatureVector) > 0},
	}

	// Add microcrawl data if available
	if signals.Microcrawl != nil {
		record.MicrocrawlEnabled = sql.NullBool{Bool: true, Valid: true}
		record.MicrocrawlPages = sql.NullInt32{Int32: int32(signals.Microcrawl.PagesVisited), Valid: true}
		record.MicrocrawlBaseKwCount = sql.NullInt32{Int32: int32(signals.Microcrawl.BaseUniqueBefore), Valid: true}
		record.MicrocrawlAddedKwCount = sql.NullInt32{Int32: int32(signals.Microcrawl.AddedUniqueKeywords), Valid: true}
		record.MicrocrawlGainRatio = sql.NullFloat64{Float64: signals.Microcrawl.GainRatio, Valid: true}
		record.DiminishingReturns = sql.NullBool{Bool: signals.Microcrawl.DiminishingReturns, Valid: true}
	} else {
		record.MicrocrawlEnabled = sql.NullBool{Bool: false, Valid: true}
	}

	// First, check if an existing record exists and delete it for simplicity
	// (In production, we might want a more sophisticated upsert strategy)
	deleteQuery := `DELETE FROM domain_extraction_features WHERE domain_id = $1 AND campaign_id = $2`
	_, err = s.db.ExecContext(ctx, deleteQuery, domainID, campaignID)
	if err != nil {
		return fmt.Errorf("failed to delete existing extraction record: %w", err)
	}

	// Insert the new record
	query := `
		INSERT INTO domain_extraction_features (
			id, domain_id, campaign_id, domain_name, processing_state, attempt_count,
			http_status, http_status_code, fetch_time_ms, content_hash, content_bytes, page_lang,
			kw_unique_count, kw_total_occurrences, kw_weight_sum, kw_top3, kw_signal_distribution, content_richness_score,
			microcrawl_enabled, microcrawl_pages, microcrawl_base_kw_count, microcrawl_added_kw_count, 
			microcrawl_gain_ratio, diminishing_returns,
			is_parked, parked_confidence, is_stale_score, extracted_at, feature_vector
		) VALUES (
			:id, :domain_id, :campaign_id, :domain_name, :processing_state, :attempt_count,
			:http_status, :http_status_code, :fetch_time_ms, :content_hash, :content_bytes, :page_lang,
			:kw_unique_count, :kw_total_occurrences, :kw_weight_sum, :kw_top3, :kw_signal_distribution, :content_richness_score,
			:microcrawl_enabled, :microcrawl_pages, :microcrawl_base_kw_count, :microcrawl_added_kw_count,
			:microcrawl_gain_ratio, :diminishing_returns,
			:is_parked, :parked_confidence, :is_stale_score, :extracted_at, :feature_vector
		)
	`

	_, err = s.db.NamedExecContext(ctx, query, record)
	if err != nil {
		return fmt.Errorf("failed to save feature extraction results: %w", err)
	}

	if s.logger != nil {
		s.logger.Info(ctx, "Feature extraction results saved", map[string]interface{}{
			"domain_id":   domainID,
			"campaign_id": campaignID,
			"domain_name": domainName,
			"kw_unique":   features.KwUniqueCount,
			"kw_total":    features.KwTotalOccurrences,
			"richness":    features.ContentRichnessScore,
			"microcrawl":  signals.Microcrawl != nil,
			"parked":      features.IsParked,
		})
	}

	return nil
}

// MarkExtractionError marks a domain extraction as failed with error details
func (s *FeatureExtractionService) MarkExtractionError(ctx context.Context, domainID uuid.UUID, campaignID uuid.UUID, domainName string, errorMsg string, attemptCount int) error {
	query := `
		DELETE FROM domain_extraction_features WHERE domain_id = $1 AND campaign_id = $2;
		INSERT INTO domain_extraction_features (
			id, domain_id, campaign_id, domain_name, processing_state, attempt_count, last_error
		) VALUES (
			$3, $1, $2, $4, 'error', $5, $6
		)
	`

	_, err := s.db.ExecContext(ctx, query, domainID, campaignID, uuid.New(), domainName, attemptCount, errorMsg)
	if err != nil {
		return fmt.Errorf("failed to mark extraction error: %w", err)
	}

	if s.logger != nil {
		s.logger.Error(ctx, "Extraction marked as error", fmt.Errorf("%s", errorMsg), map[string]interface{}{
			"domain_id":     domainID,
			"campaign_id":   campaignID,
			"domain_name":   domainName,
			"attempt_count": attemptCount,
		})
	}

	return nil
}

// GetExtractionStatus retrieves the current extraction status for a domain
func (s *FeatureExtractionService) GetExtractionStatus(ctx context.Context, domainID uuid.UUID, campaignID uuid.UUID) (*ExtractionFeatures, error) {
	var record ExtractionFeatures
	query := `
		SELECT * FROM domain_extraction_features 
		WHERE domain_id = $1 AND campaign_id = $2 
		ORDER BY updated_at DESC 
		LIMIT 1
	`

	err := s.db.GetContext(ctx, &record, query, domainID, campaignID)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil // No extraction record found
		}
		return nil, fmt.Errorf("failed to get extraction status: %w", err)
	}

	return &record, nil
}
