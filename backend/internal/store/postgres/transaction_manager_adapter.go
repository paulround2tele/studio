// File: backend/internal/store/postgres/transaction_manager_adapter.go
package postgres

import (
	"context"
	"time"

	"github.com/fntelecomllc/studio/backend/internal/store"
	"github.com/jmoiron/sqlx"
)

// TransactionManagerAdapter adapts postgres.TransactionManager to store.TransactionManager interface
type TransactionManagerAdapter struct {
	impl *TransactionManager
}

// NewTransactionManagerAdapter creates a new adapter for store compatibility
func NewTransactionManagerAdapter(db *sqlx.DB) store.TransactionManager {
	return &TransactionManagerAdapter{
		impl: NewTransactionManager(db),
	}
}

// SafeCampaignTransaction implements store.TransactionManager interface
func (a *TransactionManagerAdapter) SafeCampaignTransaction(ctx context.Context, opts *store.CampaignTransactionOptions, fn func(*sqlx.Tx) error) error {
	// Convert store types to postgres types
	var pgOpts *CampaignTransactionOptions
	if opts != nil {
		pgOpts = &CampaignTransactionOptions{
			Operation:      opts.Operation,
			CampaignID:     opts.CampaignID,
			Timeout:        opts.Timeout,
			IsolationLevel: opts.IsolationLevel,
			ReadOnly:       opts.ReadOnly,
			MaxRetries:     opts.MaxRetries,
			RetryDelay:     opts.RetryDelay,
		}
	}

	return a.impl.SafeCampaignTransaction(ctx, pgOpts, fn)
}

// ExecuteTransactionBoundary implements store.TransactionManager interface
func (a *TransactionManagerAdapter) ExecuteTransactionBoundary(ctx context.Context, boundary *store.TransactionBoundary, campaignID string, executor func(*sqlx.Tx, []store.TransactionStep) error) error {
	// Convert store types to postgres types
	var pgBoundary *TransactionBoundary
	if boundary != nil {
		pgSteps := make([]TransactionStep, len(boundary.Steps))
		for i, step := range boundary.Steps {
			pgSteps[i] = TransactionStep{
				Name:        step.Name,
				Description: step.Description,
				Required:    step.Required,
				Rollback:    step.Rollback,
			}
		}

		pgBoundary = &TransactionBoundary{
			Name:        boundary.Name,
			Description: boundary.Description,
			Steps:       pgSteps,
		}
	}

	// Create executor adapter that converts postgres types back to store types
	pgExecutor := func(tx *sqlx.Tx, pgSteps []TransactionStep) error {
		// Convert postgres steps back to store steps for the executor
		storeSteps := make([]store.TransactionStep, len(pgSteps))
		for i, pgStep := range pgSteps {
			storeSteps[i] = store.TransactionStep{
				Name:        pgStep.Name,
				Description: pgStep.Description,
				Required:    pgStep.Required,
				Rollback:    pgStep.Rollback,
			}
		}
		return executor(tx, storeSteps)
	}

	return a.impl.ExecuteTransactionBoundary(ctx, pgBoundary, campaignID, pgExecutor)
}

// GetActiveTransactionCount implements store.TransactionManager interface
func (a *TransactionManagerAdapter) GetActiveTransactionCount() int64 {
	return a.impl.GetActiveTransactionCount()
}

// DetectLeaks implements store.TransactionManager interface
func (a *TransactionManagerAdapter) DetectLeaks(maxDuration time.Duration) []string {
	return a.impl.DetectLeaks(maxDuration)
}