package services

import (
	"context"
	"fmt"
	"time"

	"github.com/fntelecomllc/studio/backend/internal/domain/metrics"
	"github.com/fntelecomllc/studio/backend/internal/infra/config"
	"github.com/jmoiron/sqlx"
)

// StaleScoreDetector identifies analysis scores that are stale compared to extraction timestamps
type StaleScoreDetector struct {
	db     *sqlx.DB
	config *config.PipelineConfig
	clock  config.Clock
	logger Logger
}

// StaleScoreResult contains information about detected stale scores
type StaleScoreResult struct {
	StaleCount int
	Domains    []string // Sample of stale domains for debugging
}

// NewStaleScoreDetector creates a new stale score detector
func NewStaleScoreDetector(db *sqlx.DB, cfg *config.PipelineConfig, clock config.Clock, logger Logger) *StaleScoreDetector {
	return &StaleScoreDetector{
		db:     db,
		config: cfg,
		clock:  clock,
		logger: logger,
	}
}

// DetectStaleScores finds analysis scores that are older than the configured threshold
// while corresponding extraction data is newer
func (d *StaleScoreDetector) DetectStaleScores(ctx context.Context) (*StaleScoreResult, error) {
	if !d.config.StaleScoreDetectionEnabled {
		return &StaleScoreResult{}, nil
	}

	staleThreshold := d.clock.Now().Add(-d.config.StaleScoreMaxAge)

	// Query to find stale scores:
	// - analysis_scores.updated_at is older than threshold
	// - corresponding domain_extraction_features.updated_at is newer than the score
	query := `
		SELECT s.campaign_id, s.domain_name, s.updated_at as score_updated, f.updated_at as feature_updated
		FROM analysis_scores s
		JOIN domain_extraction_features f ON s.campaign_id = f.campaign_id AND s.domain_name = f.domain_name
		WHERE s.updated_at < $1
		AND f.updated_at > s.updated_at
		AND f.processing_state = 'ready'
		ORDER BY s.updated_at ASC
		LIMIT 1000
	`

	rows, err := d.db.QueryContext(ctx, query, staleThreshold)
	if err != nil {
		return nil, fmt.Errorf("failed to query stale scores: %w", err)
	}
	defer rows.Close()

	var staleDomains []string
	staleCount := 0

	for rows.Next() {
		var campaignID, domainName string
		var scoreUpdated, featureUpdated time.Time

		if err := rows.Scan(&campaignID, &domainName, &scoreUpdated, &featureUpdated); err != nil {
			continue // Skip malformed rows
		}

		staleCount++

		// Collect sample domain names for debugging (limit to first 10)
		if len(staleDomains) < 10 {
			staleDomains = append(staleDomains, domainName)
		}

		// Log individual stale scores for debugging
		if d.logger != nil {
			d.logger.Debug(ctx, "stale score detected", map[string]interface{}{
				"campaign_id":      campaignID,
				"domain_name":      domainName,
				"score_updated":    scoreUpdated,
				"feature_updated":  featureUpdated,
				"age_seconds":      d.clock.Now().Sub(scoreUpdated).Seconds(),
			})
		}
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating stale scores: %w", err)
	}

	result := &StaleScoreResult{
		StaleCount: staleCount,
		Domains:    staleDomains,
	}

	// Record metrics
	if staleCount > 0 {
		metrics.StaleScoresDetectedTotal().Add(float64(staleCount))
	}

	if staleCount > 0 && d.logger != nil {
		d.logger.Info(ctx, "stale scores detected", map[string]interface{}{
			"stale_count":     staleCount,
			"sample_domains":  staleDomains,
			"threshold_age":   d.config.StaleScoreMaxAge.String(),
		})
	}

	return result, nil
}

// EnqueueRescoreJobs attempts to enqueue rescore jobs for stale scores
// Returns the number of jobs enqueued or error
func (d *StaleScoreDetector) EnqueueRescoreJobs(ctx context.Context, result *StaleScoreResult) (int, error) {
	if result.StaleCount == 0 {
		return 0, nil
	}

	// For now, we'll log the intention to rescore since job queue infrastructure
	// may not be available. In a future implementation, this would interface
	// with a job queue system.
	if d.logger != nil {
		d.logger.Info(ctx, "would enqueue rescore jobs", map[string]interface{}{
			"job_count":      result.StaleCount,
			"sample_domains": result.Domains,
		})
	}

	// NOTE: As of June 2024, actual job enqueueing is not implemented; this method only logs the intention to enqueue rescore jobs.
	// TODO: Integrate with job queue infrastructure (e.g., when available in Q3 2024 or tracked in issue #123) to enqueue rescore jobs here.
	// Example future implementation:
	//   for each stale score:
	//     jobQueue.Enqueue(&RescoreJob{CampaignID: campaignID, DomainName: domainName})
	return result.StaleCount, nil
}

// RunDetection runs stale score detection and enqueueing in one operation
func (d *StaleScoreDetector) RunDetection(ctx context.Context) (*StaleScoreResult, error) {
	result, err := d.DetectStaleScores(ctx)
	if err != nil {
		return nil, err
	}

	if result.StaleCount > 0 {
		_, err := d.EnqueueRescoreJobs(ctx, result)
		if err != nil && d.logger != nil {
			d.logger.Error(ctx, "failed to enqueue rescore jobs", err, map[string]interface{}{
				"stale_count": result.StaleCount,
			})
		}
	}

	return result, nil
}