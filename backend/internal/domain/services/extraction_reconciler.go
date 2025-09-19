package services

import (
	"context"
	"fmt"
	"sync/atomic"
	"time"

	"github.com/fntelecomllc/studio/backend/internal/domain/metrics"
	"github.com/fntelecomllc/studio/backend/internal/infra/config"
	"github.com/jmoiron/sqlx"
)

// ExtractionReconciler handles reconciliation of stuck and failed extraction tasks
type ExtractionReconciler struct {
	db     *sqlx.DB
	config *config.PipelineConfig
	clock  config.Clock
	logger Logger

	// Single-flight protection
	running int32
}

// ReconcileSummary contains the results of a reconciliation pass
type ReconcileSummary struct {
	ExaminedCount map[string]int // examined counts by category
	AdjustedCount map[string]int // adjusted counts by action
}

// NewExtractionReconciler creates a new extraction reconciler
func NewExtractionReconciler(db *sqlx.DB, cfg *config.PipelineConfig, clock config.Clock, logger Logger) *ExtractionReconciler {
	return &ExtractionReconciler{
		db:     db,
		config: cfg,
		clock:  clock,
		logger: logger,
	}
}

// Start begins the reconciliation loop with the configured interval
func (r *ExtractionReconciler) Start(ctx context.Context) {
	if !r.config.ReconcileEnabled {
		if r.logger != nil {
			r.logger.Info(ctx, "extraction reconciler disabled", nil)
		}
		return
	}

	if r.logger != nil {
		r.logger.Info(ctx, "starting extraction reconciler", map[string]interface{}{
			"interval": r.config.ReconcileInterval.String(),
		})
	}

	ticker := time.NewTicker(r.config.ReconcileInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			if r.logger != nil {
				r.logger.Info(ctx, "extraction reconciler stopping", nil)
			}
			return
		case <-ticker.C:
			if _, err := r.RunOnce(ctx); err != nil && r.logger != nil {
				r.logger.Error(ctx, "reconciliation pass failed", err, nil)
			}
		}
	}
}

// RunOnce executes a single reconciliation pass, protected by single-flight
func (r *ExtractionReconciler) RunOnce(ctx context.Context) (*ReconcileSummary, error) {
	// Single-flight protection - prevent overlapping passes
	if !atomic.CompareAndSwapInt32(&r.running, 0, 1) {
		if r.logger != nil {
			r.logger.Debug(ctx, "reconciliation pass skipped - already running", nil)
		}
		metrics.ReconcilePassTotal().WithLabelValues("skipped").Inc()
		return nil, fmt.Errorf("reconciliation already in progress")
	}
	defer atomic.StoreInt32(&r.running, 0)

	// Create context with timeout for the entire pass
	passCtx, cancel := context.WithTimeout(ctx, 20*time.Second)
	defer cancel()

	start := r.clock.Now()
	summary := &ReconcileSummary{
		ExaminedCount: make(map[string]int),
		AdjustedCount: make(map[string]int),
	}

	if r.logger != nil {
		r.logger.Info(passCtx, "starting reconciliation pass", nil)
	}

	var passErr error

	// Process each category with limit of 500 per category
	categories := []struct {
		name string
		fn   func(context.Context) (examined, adjusted int, err error)
	}{
		{"stuck_running", r.reconcileStuckRunning},
		{"stuck_pending", r.reconcileStuckPending},
		{"error_retryable", r.reconcileErrorRetryable},
		{"missing_features", r.reconcileMissingFeatures},
	}

	for _, category := range categories {
		examined, adjusted, err := category.fn(passCtx)
		summary.ExaminedCount[category.name] = examined
		summary.AdjustedCount[category.name] = adjusted

		// Record metrics
		metrics.ReconcileRowsExaminedTotal().WithLabelValues(category.name).Add(float64(examined))
		if adjusted > 0 {
			metrics.ReconcileRowsAdjustedTotal().WithLabelValues(category.name).Add(float64(adjusted))
		}

		if err != nil {
			if r.logger != nil {
				r.logger.Error(passCtx, "reconciliation category failed", err, map[string]interface{}{
					"category": category.name,
				})
			}
			passErr = err // Remember error but continue with other categories
		}
	}

	duration := r.clock.Now().Sub(start)
	metrics.ReconcileLatencySeconds().Observe(duration.Seconds())

	// Record overall pass result
	if passErr != nil {
		metrics.ReconcilePassTotal().WithLabelValues("error").Inc()
	} else {
		metrics.ReconcilePassTotal().WithLabelValues("success").Inc()
	}

	if r.logger != nil {
		r.logger.Info(passCtx, "reconciliation pass completed", map[string]interface{}{
			"duration_ms": duration.Milliseconds(),
			"examined":    summary.ExaminedCount,
			"adjusted":    summary.AdjustedCount,
		})
	}

	return summary, passErr
}

// reconcileStuckRunning handles tasks stuck in running state
func (r *ExtractionReconciler) reconcileStuckRunning(ctx context.Context) (examined, adjusted int, err error) {
	cutoff := r.clock.Now().Add(-r.config.StuckRunningMaxAge)

	// Find stuck running tasks
	query := `
		SELECT id, campaign_id, domain_name, retry_count 
		FROM domain_extraction_tasks 
		WHERE state = 'running' 
		AND updated_at < $1 
		ORDER BY updated_at ASC 
		LIMIT 500
	`

	rows, err := r.db.QueryContext(ctx, query, cutoff)
	if err != nil {
		return 0, 0, fmt.Errorf("failed to query stuck running tasks: %w", err)
	}
	defer rows.Close()

	type task struct {
		ID         int64  `db:"id"`
		CampaignID string `db:"campaign_id"`
		DomainName string `db:"domain_name"`
		RetryCount int    `db:"retry_count"`
	}

	var tasks []task
	for rows.Next() {
		var t task
		if err := rows.Scan(&t.ID, &t.CampaignID, &t.DomainName, &t.RetryCount); err != nil {
			continue // Skip malformed rows
		}
		tasks = append(tasks, t)
	}
	examined = len(tasks)

	if examined == 0 {
		return examined, 0, nil
	}

	// Process tasks in transaction
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return examined, 0, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	for _, t := range tasks {
		if t.RetryCount < r.config.MaxRetries {
			// Reset to pending and increment retry count
			_, err := tx.ExecContext(ctx,
				`UPDATE domain_extraction_tasks 
				 SET state = 'pending', retry_count = retry_count + 1, updated_at = NOW() 
				 WHERE id = $1`,
				t.ID)
			if err == nil {
				adjusted++
			}
		} else {
			// Mark as fatal - exceeded retry limit
			_, err := tx.ExecContext(ctx,
				`UPDATE domain_extraction_tasks 
				 SET state = 'fatal', updated_at = NOW() 
				 WHERE id = $1`,
				t.ID)
			if err == nil {
				adjusted++
			}
		}
	}

	if err := tx.Commit(); err != nil {
		return examined, 0, fmt.Errorf("failed to commit stuck running updates: %w", err)
	}

	return examined, adjusted, nil
}

// reconcileStuckPending handles tasks stuck in pending state
func (r *ExtractionReconciler) reconcileStuckPending(ctx context.Context) (examined, adjusted int, err error) {
	cutoff := r.clock.Now().Add(-r.config.StuckPendingMaxAge)

	// Find stuck pending tasks
	query := `
		SELECT id, campaign_id, domain_name, retry_count 
		FROM domain_extraction_tasks 
		WHERE state = 'pending' 
		AND updated_at < $1 
		ORDER BY updated_at ASC 
		LIMIT 500
	`

	rows, err := r.db.QueryContext(ctx, query, cutoff)
	if err != nil {
		return 0, 0, fmt.Errorf("failed to query stuck pending tasks: %w", err)
	}
	defer rows.Close()

	type task struct {
		ID         int64  `db:"id"`
		CampaignID string `db:"campaign_id"`
		DomainName string `db:"domain_name"`
		RetryCount int    `db:"retry_count"`
	}

	var tasks []task
	for rows.Next() {
		var t task
		if err := rows.Scan(&t.ID, &t.CampaignID, &t.DomainName, &t.RetryCount); err != nil {
			continue
		}
		tasks = append(tasks, t)
	}
	examined = len(tasks)

	if examined == 0 {
		return examined, 0, nil
	}

	// Process tasks in transaction
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return examined, 0, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	for _, t := range tasks {
		if t.RetryCount < r.config.MaxRetries {
			// Reset to pending and increment retry count
			_, err := tx.ExecContext(ctx,
				`UPDATE domain_extraction_tasks 
				 SET retry_count = retry_count + 1, updated_at = NOW() 
				 WHERE id = $1`,
				t.ID)
			if err == nil {
				adjusted++
			}
		} else {
			// Mark as fatal - exceeded retry limit
			_, err := tx.ExecContext(ctx,
				`UPDATE domain_extraction_tasks 
				 SET state = 'fatal', updated_at = NOW() 
				 WHERE id = $1`,
				t.ID)
			if err == nil {
				adjusted++
			}
		}
	}

	if err := tx.Commit(); err != nil {
		return examined, 0, fmt.Errorf("failed to commit stuck pending updates: %w", err)
	}

	return examined, adjusted, nil
}

// reconcileErrorRetryable handles tasks in error state that can be retried
func (r *ExtractionReconciler) reconcileErrorRetryable(ctx context.Context) (examined, adjusted int, err error) {
	// Find error tasks that can be retried
	query := `
		SELECT id, campaign_id, domain_name, retry_count 
		FROM domain_extraction_tasks 
		WHERE state = 'error' 
		AND retry_count < $1 
		ORDER BY updated_at ASC 
		LIMIT 500
	`

	rows, err := r.db.QueryContext(ctx, query, r.config.MaxRetries)
	if err != nil {
		return 0, 0, fmt.Errorf("failed to query error retryable tasks: %w", err)
	}
	defer rows.Close()

	type task struct {
		ID         int64  `db:"id"`
		CampaignID string `db:"campaign_id"`
		DomainName string `db:"domain_name"`
		RetryCount int    `db:"retry_count"`
	}

	var tasks []task
	for rows.Next() {
		var t task
		if err := rows.Scan(&t.ID, &t.CampaignID, &t.DomainName, &t.RetryCount); err != nil {
			continue
		}
		tasks = append(tasks, t)
	}
	examined = len(tasks)

	if examined == 0 {
		return examined, 0, nil
	}

	// Process tasks in transaction
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return examined, 0, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	for _, t := range tasks {
		// Reset to pending and increment retry count
		_, err := tx.ExecContext(ctx,
			`UPDATE domain_extraction_tasks 
			 SET state = 'pending', retry_count = retry_count + 1, updated_at = NOW() 
			 WHERE id = $1`,
			t.ID)
		if err == nil {
			adjusted++
		}
	}

	if err := tx.Commit(); err != nil {
		return examined, 0, fmt.Errorf("failed to commit error retryable updates: %w", err)
	}

	return examined, adjusted, nil
}

// reconcileMissingFeatures handles tasks marked successful but features not materialized
func (r *ExtractionReconciler) reconcileMissingFeatures(ctx context.Context) (examined, adjusted int, err error) {
	gracePeriod := r.clock.Now().Add(-r.config.MissingFeatureGrace)

	// Find tasks marked successful but missing features after grace period
	query := `
		SELECT t.id, t.campaign_id, t.domain_name, t.retry_count
		FROM domain_extraction_tasks t
		LEFT JOIN domain_extraction_features f ON t.campaign_id = f.campaign_id AND t.domain_name = f.domain_name
		WHERE t.state = 'completed'
		AND t.updated_at < $1
		AND f.id IS NULL
		ORDER BY t.updated_at ASC
		LIMIT 500
	`

	rows, err := r.db.QueryContext(ctx, query, gracePeriod)
	if err != nil {
		return 0, 0, fmt.Errorf("failed to query missing features tasks: %w", err)
	}
	defer rows.Close()

	type task struct {
		ID         int64  `db:"id"`
		CampaignID string `db:"campaign_id"`
		DomainName string `db:"domain_name"`
		RetryCount int    `db:"retry_count"`
	}

	var tasks []task
	for rows.Next() {
		var t task
		if err := rows.Scan(&t.ID, &t.CampaignID, &t.DomainName, &t.RetryCount); err != nil {
			continue
		}
		tasks = append(tasks, t)
	}
	examined = len(tasks)

	if examined == 0 {
		return examined, 0, nil
	}

	// Process tasks in transaction
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return examined, 0, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	for _, t := range tasks {
		if t.RetryCount < r.config.MaxRetries {
			// Re-mark as pending to retry feature extraction
			_, err := tx.ExecContext(ctx,
				`UPDATE domain_extraction_tasks 
				 SET state = 'pending', retry_count = retry_count + 1, updated_at = NOW() 
				 WHERE id = $1`,
				t.ID)
			if err == nil {
				adjusted++
			}
		}
		// If retry limit exceeded, leave as completed but log the issue
	}

	if err := tx.Commit(); err != nil {
		return examined, 0, fmt.Errorf("failed to commit missing features updates: %w", err)
	}

	return examined, adjusted, nil
}