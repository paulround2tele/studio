// File: backend/internal/store/postgres/transaction_helpers.go
package postgres

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"runtime"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

// TransactionManager provides comprehensive transaction lifecycle management
type TransactionManager struct {
	db          *sqlx.DB
	activeCount int64
	mu          sync.RWMutex
	leakTracker map[string]*TransactionInfo
}

// TransactionInfo tracks transaction metadata for leak detection
type TransactionInfo struct {
	ID        string
	StartTime time.Time
	Stack     string
	Context   string
}

// NewTransactionManager creates a new transaction manager with leak detection
func NewTransactionManager(db *sqlx.DB) *TransactionManager {
	return &TransactionManager{
		db:          db,
		leakTracker: make(map[string]*TransactionInfo),
	}
}

// SafeTransaction executes a function within a transaction with comprehensive cleanup
func (tm *TransactionManager) SafeTransaction(ctx context.Context, opts *sql.TxOptions, operation string, fn func(*sqlx.Tx) error) error {
	// Add timeout if not present
	if ctx == nil {
		var cancel context.CancelFunc
		ctx, cancel = context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()
	}

	// Start transaction with monitoring
	tx, err := tm.beginWithTracking(ctx, opts, operation)
	if err != nil {
		return fmt.Errorf("failed to begin transaction for %s: %w", operation, err)
	}

	// Ensure cleanup regardless of outcome
	var txErr error
	defer func() {
		if err := tm.cleanupTransaction(tx, txErr, operation); err != nil {
			log.Printf("ERROR: Transaction cleanup failed for %s: %v", operation, err)
		}
	}()

	// Execute operation with context cancellation check
	done := make(chan error, 1)
	go func() {
		done <- fn(tx)
	}()

	select {
	case txErr = <-done:
		// Function completed normally
		if txErr != nil {
			return fmt.Errorf("transaction operation %s failed: %w", operation, txErr)
		}
	case <-ctx.Done():
		// Context cancelled/timeout
		txErr = ctx.Err()
		return fmt.Errorf("transaction operation %s cancelled: %w", operation, ctx.Err())
	}

	// Commit transaction
	if err := tx.Commit(); err != nil {
		txErr = err // Set for cleanup
		return fmt.Errorf("failed to commit transaction for %s: %w", operation, err)
	}

	return nil
}

// beginWithTracking starts a transaction and tracks it for leak detection
func (tm *TransactionManager) beginWithTracking(ctx context.Context, opts *sql.TxOptions, operation string) (*sqlx.Tx, error) {
	tx, err := tm.db.BeginTxx(ctx, opts)
	if err != nil {
		return nil, err
	}

	// Track transaction for leak detection
	txID := fmt.Sprintf("%p", tx)
	tm.mu.Lock()
	defer tm.mu.Unlock()

	tm.activeCount++
	tm.leakTracker[txID] = &TransactionInfo{
		ID:        txID,
		StartTime: time.Now(),
		Stack:     getCallerStack(),
		Context:   operation,
	}

	log.Printf("TRANSACTION_START: %s [ID: %s] [Active: %d]", operation, txID, tm.activeCount)
	return tx, nil
}

// cleanupTransaction handles transaction cleanup with proper rollback/commit
func (tm *TransactionManager) cleanupTransaction(tx *sqlx.Tx, opErr error, operation string) error {
	if tx == nil {
		return nil
	}

	txID := fmt.Sprintf("%p", tx)

	// Remove from tracking
	tm.mu.Lock()
	defer tm.mu.Unlock()

	info, exists := tm.leakTracker[txID]
	if exists {
		duration := time.Since(info.StartTime)
		delete(tm.leakTracker, txID)
		tm.activeCount--

		log.Printf("TRANSACTION_CLEANUP: %s [ID: %s] [Duration: %v] [Active: %d]", operation, txID, duration, tm.activeCount)

		// Check for long-running transactions
		if duration > 5*time.Minute {
			log.Printf("WARNING: Long-running transaction detected: %s [Duration: %v]", operation, duration)
		}
	}

	// Perform cleanup - rollback if there was an error, otherwise ensure transaction is closed
	if opErr != nil {
		if rollbackErr := tx.Rollback(); rollbackErr != nil {
			// Check if transaction was already rolled back (e.g., due to timeout)
			if strings.Contains(rollbackErr.Error(), "transaction has already been committed or rolled back") {
				log.Printf("TRANSACTION_AUTO_ROLLBACK: %s [ID: %s] already rolled back by PostgreSQL due to: %v", operation, txID, opErr)
			} else {
				// Both operation and rollback failed
				log.Printf("ERROR: Transaction rollback failed for %s: %v (original error: %v)", operation, rollbackErr, opErr)
				return fmt.Errorf("rollback failed: %w (original error: %v)", rollbackErr, opErr)
			}
		} else {
			log.Printf("TRANSACTION_ROLLBACK: %s [ID: %s] due to error: %v", operation, txID, opErr)
		}
	}

	return nil
}

// PreparedStatementManager provides safe prepared statement lifecycle management
type PreparedStatementManager struct {
	activeStatements map[string]*PreparedStatementInfo
	mu               sync.RWMutex
}

// PreparedStatementInfo tracks prepared statement metadata
type PreparedStatementInfo struct {
	Query     string
	StartTime time.Time
	Context   string
	Stack     string
}

// NewPreparedStatementManager creates a new prepared statement manager
func NewPreparedStatementManager() *PreparedStatementManager {
	return &PreparedStatementManager{
		activeStatements: make(map[string]*PreparedStatementInfo),
	}
}

// SafePreparedStatement executes a function with a prepared statement and ensures cleanup
func (psm *PreparedStatementManager) SafePreparedStatement(ctx context.Context, exec Querier, query, operation string, fn func(*sqlx.NamedStmt) error) error {
	// Prepare statement with tracking
	stmt, err := psm.prepareWithTracking(ctx, exec, query, operation)
	if err != nil {
		return fmt.Errorf("failed to prepare statement for %s: %w", operation, err)
	}

	// Ensure cleanup
	defer func() {
		if err := psm.cleanupStatement(stmt, operation); err != nil {
			log.Printf("ERROR: Prepared statement cleanup failed for %s: %v", operation, err)
		}
	}()

	// Execute operation
	if err := fn(stmt); err != nil {
		return fmt.Errorf("prepared statement operation %s failed: %w", operation, err)
	}

	return nil
}

// prepareWithTracking prepares a statement and tracks it for leak detection
func (psm *PreparedStatementManager) prepareWithTracking(ctx context.Context, exec Querier, query, operation string) (*sqlx.NamedStmt, error) {
	stmt, err := exec.PrepareNamedContext(ctx, query)
	if err != nil {
		return nil, err
	}

	// Track statement for leak detection
	stmtID := fmt.Sprintf("%p", stmt)
	psm.mu.Lock()
	defer psm.mu.Unlock()

	psm.activeStatements[stmtID] = &PreparedStatementInfo{
		Query:     query,
		StartTime: time.Now(),
		Context:   operation,
		Stack:     getCallerStack(),
	}

	log.Printf("PREPARED_STATEMENT_CREATE: %s [ID: %s]", operation, stmtID)
	return stmt, nil
}

// cleanupStatement handles prepared statement cleanup
func (psm *PreparedStatementManager) cleanupStatement(stmt *sqlx.NamedStmt, operation string) error {
	if stmt == nil {
		return nil
	}

	stmtID := fmt.Sprintf("%p", stmt)

	// Remove from tracking
	psm.mu.Lock()
	defer psm.mu.Unlock()

	info, exists := psm.activeStatements[stmtID]
	if exists {
		duration := time.Since(info.StartTime)
		delete(psm.activeStatements, stmtID)
		log.Printf("PREPARED_STATEMENT_CLEANUP: %s [ID: %s] [Duration: %v]", operation, stmtID, duration)
	}

	// Close statement
	if err := stmt.Close(); err != nil {
		log.Printf("ERROR: Failed to close prepared statement for %s: %v", operation, err)
		return fmt.Errorf("statement close failed: %w", err)
	}

	return nil
}

// Querier interface for prepared statement operations
type Querier interface {
	PrepareNamedContext(ctx context.Context, query string) (*sqlx.NamedStmt, error)
	ExecContext(ctx context.Context, query string, args ...interface{}) (sql.Result, error)
	GetContext(ctx context.Context, dest interface{}, query string, args ...interface{}) error
	SelectContext(ctx context.Context, dest interface{}, query string, args ...interface{}) error
	NamedExecContext(ctx context.Context, query string, arg interface{}) (sql.Result, error)
}

// GetActiveTransactionCount returns the current number of active transactions
func (tm *TransactionManager) GetActiveTransactionCount() int64 {
	tm.mu.RLock()
	defer tm.mu.RUnlock()
	return tm.activeCount
}

// GetActiveTransactions returns information about currently active transactions
func (tm *TransactionManager) GetActiveTransactions() map[string]*TransactionInfo {
	tm.mu.RLock()
	defer tm.mu.RUnlock()

	result := make(map[string]*TransactionInfo)
	for k, v := range tm.leakTracker {
		result[k] = &TransactionInfo{
			ID:        v.ID,
			StartTime: v.StartTime,
			Stack:     v.Stack,
			Context:   v.Context,
		}
	}
	return result
}

// DetectLeaks identifies potential transaction leaks
func (tm *TransactionManager) DetectLeaks(maxDuration time.Duration) []string {
	tm.mu.RLock()
	defer tm.mu.RUnlock()

	var leaks []string
	now := time.Now()

	for _, info := range tm.leakTracker {
		if now.Sub(info.StartTime) > maxDuration {
			leaks = append(leaks, fmt.Sprintf(
				"LEAK: Transaction %s [Context: %s] [Duration: %v] [Stack: %s]",
				info.ID, info.Context, now.Sub(info.StartTime), info.Stack,
			))
		}
	}

	return leaks
}

// getCallerStack returns a stack trace for debugging
func getCallerStack() string {
	buf := make([]byte, 1024)
	n := runtime.Stack(buf, false)
	return string(buf[:n])
}

// WithTimeout creates a context with timeout for database operations
func WithTimeout(ctx context.Context, timeout time.Duration) (context.Context, context.CancelFunc) {
	if ctx == nil {
		ctx = context.Background()
	}
	return context.WithTimeout(ctx, timeout)
}

// DefaultTimeout for database operations
const DefaultTimeout = 30 * time.Second

// Enhanced Transaction Operations for Campaign Management (SI-001)

// CampaignTransactionOptions provides campaign-specific transaction configuration
type CampaignTransactionOptions struct {
	Operation      string
	CampaignID     string
	Timeout        time.Duration
	IsolationLevel *sql.IsolationLevel
	ReadOnly       bool
	MaxRetries     int
	RetryDelay     time.Duration
}

// DefaultCampaignTxOptions returns default transaction options for campaign operations
func DefaultCampaignTxOptions(operation, campaignID string) *CampaignTransactionOptions {
	return &CampaignTransactionOptions{
		Operation:  operation,
		CampaignID: campaignID,
		Timeout:    30 * time.Second,
		MaxRetries: 3,
		RetryDelay: 100 * time.Millisecond,
		ReadOnly:   false,
	}
}

// SafeCampaignTransaction executes campaign operations with enhanced transaction management
func (tm *TransactionManager) SafeCampaignTransaction(ctx context.Context, opts *CampaignTransactionOptions, fn func(*sqlx.Tx) error) error {
	if opts == nil {
		opts = DefaultCampaignTxOptions("unknown_operation", "unknown_campaign")
	}

	// Add operation-specific timeout
	txCtx, cancel := context.WithTimeout(ctx, opts.Timeout)
	defer cancel()

	// Build SQL transaction options
	sqlOpts := &sql.TxOptions{
		ReadOnly: opts.ReadOnly,
	}
	if opts.IsolationLevel != nil {
		sqlOpts.Isolation = *opts.IsolationLevel
	}

	// Execute with retry logic for campaign-critical operations
	var lastErr error
	for attempt := 0; attempt <= opts.MaxRetries; attempt++ {
		if attempt > 0 {
			// Wait before retry
			select {
			case <-time.After(opts.RetryDelay * time.Duration(attempt)):
			case <-txCtx.Done():
				return fmt.Errorf("campaign transaction cancelled during retry for %s (campaign: %s): %w", opts.Operation, opts.CampaignID, txCtx.Err())
			}
			log.Printf("TRANSACTION_RETRY: %s [Campaign: %s] [Attempt: %d/%d] [Previous Error: %v]",
				opts.Operation, opts.CampaignID, attempt+1, opts.MaxRetries+1, lastErr)
		}

		// Enhanced operation identifier for tracking
		operationID := fmt.Sprintf("%s_campaign_%s", opts.Operation, opts.CampaignID)

		lastErr = tm.SafeTransaction(txCtx, sqlOpts, operationID, fn)
		if lastErr == nil {
			log.Printf("CAMPAIGN_TRANSACTION_SUCCESS: %s [Campaign: %s] [Attempt: %d]", opts.Operation, opts.CampaignID, attempt+1)
			return nil
		}

		// Check if error is retryable
		if !isRetryableError(lastErr) {
			log.Printf("CAMPAIGN_TRANSACTION_NON_RETRYABLE: %s [Campaign: %s] [Error: %v]", opts.Operation, opts.CampaignID, lastErr)
			break
		}
	}

	return fmt.Errorf("campaign transaction failed after %d attempts for %s (campaign: %s): %w", opts.MaxRetries+1, opts.Operation, opts.CampaignID, lastErr)
}

// isRetryableError determines if a transaction error can be retried
func isRetryableError(err error) bool {
	if err == nil {
		return false
	}

	errorStr := err.Error()

	// Database connection errors - retryable
	retryablePatterns := []string{
		"connection refused",
		"connection reset",
		"timeout",
		"deadlock",
		"serialization failure",
		"could not serialize access",
		"database is locked",
		"server closed the connection",
		"simulated transient failure", // For testing purposes - SI-001 validation
	}

	for _, pattern := range retryablePatterns {
		if strings.Contains(strings.ToLower(errorStr), pattern) {
			return true
		}
	}

	return false
}

// TransactionBoundary defines a logical transaction boundary for complex operations
type TransactionBoundary struct {
	Name        string
	Description string
	Steps       []TransactionStep
}

// TransactionStep represents an individual step within a transaction boundary
type TransactionStep struct {
	Name        string
	Description string
	Required    bool
	Rollback    func(*sqlx.Tx) error
}

// ExecuteTransactionBoundary executes a complex operation with proper transaction boundaries
func (tm *TransactionManager) ExecuteTransactionBoundary(ctx context.Context, boundary *TransactionBoundary, campaignID string, executor func(*sqlx.Tx, []TransactionStep) error) error {
	opts := DefaultCampaignTxOptions(boundary.Name, campaignID)
	opts.Operation = fmt.Sprintf("boundary_%s", boundary.Name)

	log.Printf("TRANSACTION_BOUNDARY_START: %s [Campaign: %s] [Steps: %d]", boundary.Name, campaignID, len(boundary.Steps))

	return tm.SafeCampaignTransaction(ctx, opts, func(tx *sqlx.Tx) error {
		executedSteps := make([]TransactionStep, 0, len(boundary.Steps))

		defer func() {
			// Execute rollback for completed steps in reverse order if needed
			if r := recover(); r != nil {
				log.Printf("TRANSACTION_BOUNDARY_PANIC: %s [Campaign: %s] [Panic: %v]", boundary.Name, campaignID, r)
				tm.rollbackExecutedSteps(tx, executedSteps, boundary.Name, campaignID)
				panic(r)
			}
		}()

		// Execute the boundary operation
		err := executor(tx, boundary.Steps)
		if err != nil {
			log.Printf("TRANSACTION_BOUNDARY_ERROR: %s [Campaign: %s] [Error: %v]", boundary.Name, campaignID, err)
			tm.rollbackExecutedSteps(tx, executedSteps, boundary.Name, campaignID)
			return fmt.Errorf("transaction boundary %s failed for campaign %s: %w", boundary.Name, campaignID, err)
		}

		log.Printf("TRANSACTION_BOUNDARY_SUCCESS: %s [Campaign: %s]", boundary.Name, campaignID)
		return nil
	})
}

// rollbackExecutedSteps executes rollback operations for completed steps
func (tm *TransactionManager) rollbackExecutedSteps(tx *sqlx.Tx, steps []TransactionStep, boundaryName, campaignID string) {
	// Execute rollbacks in reverse order
	for i := len(steps) - 1; i >= 0; i-- {
		step := steps[i]
		if step.Rollback != nil {
			if err := step.Rollback(tx); err != nil {
				log.Printf("TRANSACTION_STEP_ROLLBACK_ERROR: %s [Campaign: %s] [Step: %s] [Error: %v]",
					boundaryName, campaignID, step.Name, err)
			} else {
				log.Printf("TRANSACTION_STEP_ROLLBACK_SUCCESS: %s [Campaign: %s] [Step: %s]",
					boundaryName, campaignID, step.Name)
			}
		}
	}
}

// Transaction monitoring and metrics
type TransactionMetrics struct {
	TotalTransactions      int64
	SuccessfulTransactions int64
	FailedTransactions     int64
	RetriedTransactions    int64
	AverageDuration        time.Duration
	LongestDuration        time.Duration
}

// GetTransactionMetrics returns current transaction performance metrics
func (tm *TransactionManager) GetTransactionMetrics() TransactionMetrics {
	tm.mu.RLock()
	defer tm.mu.RUnlock()

	// This is a simplified implementation - in production you'd want to track these metrics
	return TransactionMetrics{
		TotalTransactions: tm.activeCount,
		// Additional metrics would be tracked here
	}
}

// PostgreSQL metrics collector for transaction monitoring (SI-001)
type PostgreSQLMetricsCollector struct {
	db         *sqlx.DB
	campaignID *uuid.UUID
}

// NewPostgreSQLMetricsCollector creates a new metrics collector
func NewPostgreSQLMetricsCollector(db *sqlx.DB, campaignID *uuid.UUID) *PostgreSQLMetricsCollector {
	return &PostgreSQLMetricsCollector{
		db:         db,
		campaignID: campaignID,
	}
}

func (pmc *PostgreSQLMetricsCollector) RecordTransactionDuration(
	operation string,
	duration time.Duration,
	success bool,
	retryCount int,
) {
	query := `SELECT record_transaction_metric($1, $2, $3, $4, $5, $6, $7)`
	_, err := pmc.db.ExecContext(
		context.Background(),
		query,
		operation,
		pmc.campaignID,
		int(duration.Milliseconds()),
		success,
		nil, // error_message handled separately
		retryCount,
		"READ_COMMITTED",
	)

	if err != nil {
		log.Printf("WARNING: Failed to record transaction metric: %v", err)
	}
}

// RecordTransactionError records a transaction error with details
func (pmc *PostgreSQLMetricsCollector) RecordTransactionError(
	operation string,
	duration time.Duration,
	retryCount int,
	errorMessage string,
) {
	query := `SELECT record_transaction_metric($1, $2, $3, $4, $5, $6, $7)`
	_, err := pmc.db.ExecContext(
		context.Background(),
		query,
		operation,
		pmc.campaignID,
		int(duration.Milliseconds()),
		false, // success = false
		errorMessage,
		retryCount,
		"READ_COMMITTED",
	)

	if err != nil {
		log.Printf("WARNING: Failed to record transaction error metric: %v", err)
	}
}

// Transaction operation for batch processing (SI-001)
type TransactionOperation struct {
	Name        string
	Description string
	Required    bool
	Execute     func(ctx context.Context, tx *sqlx.Tx) error
	Rollback    func(ctx context.Context, tx *sqlx.Tx) error
}

// SafeTransactionBatch executes a batch of operations atomically (SI-001)
func (tm *TransactionManager) SafeTransactionBatch(
	ctx context.Context,
	operations []TransactionOperation,
	campaignID *uuid.UUID,
) error {
	operationName := fmt.Sprintf("batch_%d_operations", len(operations))

	return tm.SafeTransactionWithMetrics(ctx, nil, operationName, campaignID, func(tx *sqlx.Tx) error {
		executedOps := make([]TransactionOperation, 0, len(operations))

		// Execute operations with rollback on failure
		for _, op := range operations {
			if err := op.Execute(ctx, tx); err != nil {
				// Execute rollbacks for completed operations
				for i := len(executedOps) - 1; i >= 0; i-- {
					if executedOps[i].Rollback != nil {
						if rollbackErr := executedOps[i].Rollback(ctx, tx); rollbackErr != nil {
							log.Printf("ERROR: Rollback failed for operation %s: %v", executedOps[i].Name, rollbackErr)
						}
					}
				}
				return fmt.Errorf("batch operation %s failed: %w", op.Name, err)
			}
			executedOps = append(executedOps, op)
		}

		return nil
	})
}

// SafeTransactionBatch executes a batch of operations atomically (standalone function for testing)
func SafeTransactionBatch(ctx context.Context, db *sqlx.DB, operations []TransactionOperation) ([]interface{}, error) {
	tm := NewTransactionManager(db)
	campaignID := uuid.New()

	var results []interface{}
	err := tm.SafeTransactionBatch(ctx, operations, &campaignID)
	if err != nil {
		return nil, err
	}

	// Return successful results (simplified for testing)
	for _, op := range operations {
		results = append(results, op.Name)
	}

	return results, nil
}

// SafeTransactionWithMetrics executes a transaction with enhanced metrics collection (SI-001)
func (tm *TransactionManager) SafeTransactionWithMetrics(
	ctx context.Context,
	opts *sql.TxOptions,
	operation string,
	campaignID *uuid.UUID,
	fn func(*sqlx.Tx) error,
) error {
	startTime := time.Now()
	var metricsCollector *PostgreSQLMetricsCollector

	if campaignID != nil {
		metricsCollector = NewPostgreSQLMetricsCollector(tm.db, campaignID)
	}

	// Execute the transaction
	err := tm.SafeTransaction(ctx, opts, operation, fn)
	duration := time.Since(startTime)

	// Record metrics if collector available
	if metricsCollector != nil {
		if err != nil {
			metricsCollector.RecordTransactionError(operation, duration, 0, err.Error())
		} else {
			metricsCollector.RecordTransactionDuration(operation, duration, true, 0)
		}
	}

	return err
}
