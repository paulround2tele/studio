package services

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

	"github.com/fntelecomllc/studio/backend/internal/extraction"
	"github.com/fntelecomllc/studio/backend/internal/featureflags"
)

// KeywordExtractionService handles writing detailed keyword extraction results to the new domain_extracted_keywords table
// This implements Phase P2 of the Extraction → Analysis redesign.
type KeywordExtractionService struct {
	db     *sqlx.DB
	logger Logger
}

// NewKeywordExtractionService creates a new keyword extraction service
func NewKeywordExtractionService(db *sqlx.DB, logger Logger) *KeywordExtractionService {
	return &KeywordExtractionService{
		db:     db,
		logger: logger,
	}
}

// ExtractedKeyword represents the data structure for domain_extracted_keywords table
type ExtractedKeyword struct {
	ID              uuid.UUID `db:"id"`
	DomainID        uuid.UUID `db:"domain_id"`
	CampaignID      uuid.UUID `db:"campaign_id"`
	ProcessingState string    `db:"processing_state"`
	
	// Keyword data
	KeywordID       string             `db:"keyword_id"`
	KeywordText     string             `db:"keyword_text"`
	Frequency       int                `db:"frequency"`
	Weight          sql.NullFloat64    `db:"weight"`
	PositionAvg     sql.NullFloat64    `db:"position_avg"`
	SentimentScore  sql.NullFloat64    `db:"sentiment_score"`
	RelevanceScore  sql.NullFloat64    `db:"relevance_score"`
	SourceType      sql.NullString     `db:"source_type"`
	
	// Processing metadata
	ExtractedAt     sql.NullTime       `db:"extracted_at"`
	ErrorMessage    sql.NullString     `db:"error_message"`
	RetryCount      int                `db:"retry_count"`
	
	// Audit fields
	CreatedAt       time.Time          `db:"created_at"`
	UpdatedAt       time.Time          `db:"updated_at"`
}

// SaveKeywords saves detailed keyword extraction results to the domain_extracted_keywords table
func (s *KeywordExtractionService) SaveKeywords(ctx context.Context, domainID uuid.UUID, campaignID uuid.UUID, keywordHits []extraction.KeywordHit) error {
	// Check if feature flag is enabled
	if !featureflags.IsExtractionKeywordDetailEnabled() {
		if s.logger != nil {
			s.logger.Debug(ctx, "Keyword extraction detail disabled, skipping save", map[string]interface{}{
				"domain_id":   domainID,
				"campaign_id": campaignID,
			})
		}
		return nil
	}

	if len(keywordHits) == 0 {
		return nil // Nothing to save
	}

	// Start transaction for batch insert
	tx, err := s.db.BeginTxx(ctx, nil)
	if err != nil {
		return fmt.Errorf("failed to start transaction: %w", err)
	}
	defer tx.Rollback()

	// Clear existing keywords for this domain/campaign combination
	deleteQuery := `DELETE FROM domain_extracted_keywords WHERE domain_id = $1 AND campaign_id = $2`
	_, err = tx.ExecContext(ctx, deleteQuery, domainID, campaignID)
	if err != nil {
		return fmt.Errorf("failed to delete existing keywords: %w", err)
	}

	// Group hits by keyword_id to aggregate data
	keywordAggregates := make(map[string]*ExtractedKeyword)
	
	for _, hit := range keywordHits {
		keywordID := hit.KeywordID
		if keywordID == "" {
			keywordID = strings.ToLower(hit.SurfaceForm) // Fallback to surface form
		}

		// Get or create aggregate for this keyword
		agg, exists := keywordAggregates[keywordID]
		if !exists {
			agg = &ExtractedKeyword{
				ID:              uuid.New(),
				DomainID:        domainID,
				CampaignID:      campaignID,
				ProcessingState: "ready",
				KeywordID:       keywordID,
				KeywordText:     hit.SurfaceForm,
				Frequency:       0,
				Weight:          sql.NullFloat64{Float64: 0, Valid: true},
				ExtractedAt:     sql.NullTime{Time: time.Now(), Valid: true},
				RetryCount:      0,
			}
			keywordAggregates[keywordID] = agg
		}

		// Aggregate frequency and weight
		agg.Frequency++
		if agg.Weight.Valid {
			agg.Weight.Float64 += hit.BaseWeight * hit.ValueScore
		}

		// Track position (simple average for now)
		if hit.Position > 0 {
			if agg.PositionAvg.Valid {
				// Update running average
				count := float64(agg.Frequency)
				agg.PositionAvg.Float64 = ((agg.PositionAvg.Float64 * (count - 1)) + float64(hit.Position)) / count
			} else {
				agg.PositionAvg = sql.NullFloat64{Float64: float64(hit.Position), Valid: true}
			}
		}

		// Set source type (prioritize certain types)
		newSource := hit.SignalType
		if !agg.SourceType.Valid || shouldPrioritizeSource(newSource, agg.SourceType.String) {
			agg.SourceType = sql.NullString{String: newSource, Valid: true}
		}

		// Compute basic sentiment and relevance scores
		if !agg.SentimentScore.Valid {
			agg.SentimentScore = sql.NullFloat64{Float64: s.computeSentimentScore(hit), Valid: true}
		}
		if !agg.RelevanceScore.Valid {
			agg.RelevanceScore = sql.NullFloat64{Float64: s.computeRelevanceScore(hit), Valid: true}
		}
	}

	// Insert aggregated keywords
	insertQuery := `
		INSERT INTO domain_extracted_keywords (
			id, domain_id, campaign_id, processing_state, keyword_id, keyword_text,
			frequency, weight, position_avg, sentiment_score, relevance_score, source_type,
			extracted_at, retry_count
		) VALUES (
			:id, :domain_id, :campaign_id, :processing_state, :keyword_id, :keyword_text,
			:frequency, :weight, :position_avg, :sentiment_score, :relevance_score, :source_type,
			:extracted_at, :retry_count
		)
	`

	for _, keyword := range keywordAggregates {
		_, err = tx.NamedExecContext(ctx, insertQuery, keyword)
		if err != nil {
			return fmt.Errorf("failed to insert keyword %s: %w", keyword.KeywordID, err)
		}
	}

	// Commit transaction
	err = tx.Commit()
	if err != nil {
		return fmt.Errorf("failed to commit keyword extraction: %w", err)
	}

	if s.logger != nil {
		s.logger.Info(ctx, "Keyword extraction results saved", map[string]interface{}{
			"domain_id":      domainID,
			"campaign_id":    campaignID,
			"keywords_count": len(keywordAggregates),
			"total_hits":     len(keywordHits),
		})
	}

	return nil
}

// shouldPrioritizeSource determines if a new source type should override the current one
func shouldPrioritizeSource(newSource, currentSource string) bool {
	// Priority order: title > h1 > meta > body > anchor > microcrawl
	priority := map[string]int{
		"title":      6,
		"h1":         5,
		"meta":       4,
		"body":       3,
		"anchor":     2,
		"microcrawl": 1,
	}

	newPriority, newExists := priority[newSource]
	currentPriority, currentExists := priority[currentSource]

	if !newExists {
		return false // Unknown source type, don't prioritize
	}
	if !currentExists {
		return true // Any known source is better than unknown
	}

	return newPriority > currentPriority
}

// computeSentimentScore provides a basic sentiment score for keywords
// This is a placeholder implementation that can be enhanced with proper NLP
func (s *KeywordExtractionService) computeSentimentScore(hit extraction.KeywordHit) float64 {
	// Simple heuristic based on keyword surface form
	text := strings.ToLower(hit.SurfaceForm)
	
	// Positive indicators
	positiveWords := []string{"free", "premium", "best", "top", "excellent", "quality", "secure", "trusted"}
	for _, word := range positiveWords {
		if strings.Contains(text, word) {
			return 0.7 + (hit.ValueScore * 0.3) // Positive sentiment
		}
	}

	// Negative indicators
	negativeWords := []string{"spam", "scam", "fake", "expired", "error", "failed"}
	for _, word := range negativeWords {
		if strings.Contains(text, word) {
			return 0.2 - (hit.ValueScore * 0.1) // Negative sentiment
		}
	}

	// Neutral default
	return 0.5
}

// computeRelevanceScore calculates how relevant a keyword is to the domain content
func (s *KeywordExtractionService) computeRelevanceScore(hit extraction.KeywordHit) float64 {
	// Base relevance on signal type and position
	signalWeight := map[string]float64{
		"title":      1.0,
		"h1":         0.9,
		"meta":       0.7,
		"body":       0.5,
		"anchor":     0.6,
		"microcrawl": 0.4,
	}

	weight, exists := signalWeight[hit.SignalType]
	if !exists {
		weight = 0.3 // Default for unknown signal types
	}

	// Incorporate position (earlier positions are more relevant)
	positionFactor := 1.0
	if hit.Position > 0 {
		// Diminish relevance for later positions
		positionFactor = 1.0 / (1.0 + float64(hit.Position)/1000.0)
	}

	// Incorporate value score from dictionary/semantic analysis
	relevance := weight * positionFactor * hit.ValueScore

	// Normalize to [0, 1] range
	if relevance > 1.0 {
		relevance = 1.0
	}
	if relevance < 0.0 {
		relevance = 0.0
	}

	return relevance
}

// MarkKeywordExtractionError marks keyword extraction as failed
func (s *KeywordExtractionService) MarkKeywordExtractionError(ctx context.Context, domainID uuid.UUID, campaignID uuid.UUID, errorMsg string, retryCount int) error {
	if !featureflags.IsExtractionKeywordDetailEnabled() {
		return nil
	}

	// Insert a single error record
	query := `
		DELETE FROM domain_extracted_keywords WHERE domain_id = $1 AND campaign_id = $2;
		INSERT INTO domain_extracted_keywords (
			id, domain_id, campaign_id, processing_state, keyword_id, keyword_text,
			frequency, error_message, retry_count
		) VALUES (
			$3, $1, $2, 'error', 'ERROR', 'EXTRACTION_FAILED', 0, $4, $5
		)
	`

	_, err := s.db.ExecContext(ctx, query, domainID, campaignID, uuid.New(), errorMsg, retryCount)
	if err != nil {
		return fmt.Errorf("failed to mark keyword extraction error: %w", err)
	}

	if s.logger != nil {
		s.logger.Error(ctx, "Keyword extraction marked as error", fmt.Errorf("%s", errorMsg), map[string]interface{}{
			"domain_id":   domainID,
			"campaign_id": campaignID,
			"retry_count": retryCount,
		})
	}

	return nil
}

// GetKeywordExtractionStatus retrieves keyword extraction status for a domain
func (s *KeywordExtractionService) GetKeywordExtractionStatus(ctx context.Context, domainID uuid.UUID, campaignID uuid.UUID) ([]ExtractedKeyword, error) {
	if !featureflags.IsExtractionKeywordDetailEnabled() {
		return nil, fmt.Errorf("keyword extraction detail disabled")
	}

	var keywords []ExtractedKeyword
	query := `
		SELECT * FROM domain_extracted_keywords 
		WHERE domain_id = $1 AND campaign_id = $2 
		ORDER BY frequency DESC, weight DESC
	`

	err := s.db.SelectContext(ctx, &keywords, query, domainID, campaignID)
	if err != nil {
		return nil, fmt.Errorf("failed to get keyword extraction status: %w", err)
	}

	return keywords, nil
}