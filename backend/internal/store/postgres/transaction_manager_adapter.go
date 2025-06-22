// File: backend/internal/store/postgres/transaction_manager_adapter.go
package postgres

import (
	"context"
	"time"

	"github.com/fntelecomllc/studio/backend/internal/config"
	"github.com/fntelecomllc/studio/backend/internal/monitoring"
	"github.com/fntelecomllc/studio/backend/internal/store"
	"github.com/jmoiron/sqlx"
)

// TransactionManagerAdapter adapts postgres.TransactionManager to store.TransactionManager interface
type TransactionManagerAdapter struct {
	impl                *TransactionManager
	poolMonitor         *monitoring.ConnectionPoolMonitor
	leakDetector        *monitoring.ConnectionLeakDetector
	poolConfig          *config.DatabasePoolConfig
}

// NewTransactionManagerAdapter creates a new adapter for store compatibility with SI-004 monitoring
func NewTransactionManagerAdapter(db *sqlx.DB) store.TransactionManager {
	// Apply optimized pool configuration
	poolConfig := config.OptimizedDatabasePoolConfig()
	poolConfig.ConfigureDatabase(db)
	
	// Create connection pool monitor
	poolMonitor := monitoring.NewConnectionPoolMonitor(db, poolConfig.MetricsInterval)
	
	// Create connection leak detector
	leakDetector := monitoring.NewConnectionLeakDetector(db)
	leakDetector.SetLeakTimeout(poolConfig.LeakDetectionTimeout)
	
	return &TransactionManagerAdapter{
		impl:         NewTransactionManager(db),
		poolMonitor:  poolMonitor,
		leakDetector: leakDetector,
		poolConfig:   poolConfig,
	}
}

// StartMonitoring starts the SI-004 monitoring systems
func (a *TransactionManagerAdapter) StartMonitoring(ctx context.Context) error {
	if err := a.poolMonitor.Start(ctx); err != nil {
		return err
	}
	return a.leakDetector.Start(ctx)
}

// StopMonitoring stops the SI-004 monitoring systems
func (a *TransactionManagerAdapter) StopMonitoring() {
	a.poolMonitor.Stop()
	a.leakDetector.Stop()
}

// GetPoolMetrics returns current connection pool metrics
func (a *TransactionManagerAdapter) GetPoolMetrics() *monitoring.PoolMetrics {
	return a.poolMonitor.GetLastMetrics()
}

// GetConnectionLeaks returns recent connection leaks
func (a *TransactionManagerAdapter) GetConnectionLeaks(since time.Time) ([]*monitoring.ConnectionLeak, error) {
	return a.leakDetector.GetLeakHistory(since)
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
